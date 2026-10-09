import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { SeatMap, type SeatDto } from './seat-map';
import {
  destroyRealMap,
  renderJourneyMap,
} from '../../../packages/shared/real-map.mjs';

type Screen = 'home' | 'results' | 'trip' | 'seats' | 'passengers' | 'review' | 'status';

type ApiTrip = {
  id: number | string;
  origin: string;
  destination: string;
  date: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  baseFare: number;
  busId?: string;
  busCode?: string;
  driverName?: string;
  status: string;
  availableSeats: number;
};

type Passenger = {
  full_name: string;
  document_number: string;
  email: string;
  phone: string;
};

type Booking = {
  id: number;
  reference?: string;
  status: string;
  total_amount?: number;
  expires_at?: string;
  seat_numbers?: string[];
};

type Quote = {
  currency: string;
  base_fare: number;
  passengers: number;
  fees: number;
  discounts: number;
  taxes: number;
  subtotal: number;
  total: number;
};

const API = '/api/v1';
const TOKEN = 'encore_api_token';
const DRAFT = 'encore_booking_draft';

const money = (value: number, currency = 'DOP') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

async function api(path: string, options: RequestInit = {}) {
  const token =
    sessionStorage.getItem(TOKEN) ??
    localStorage.getItem(TOKEN);

  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');

  if (options.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API}${path}`, {
    ...options,
    headers,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = payload.errors
      ? Object.values(payload.errors).flat().join(' ')
      : payload.message;

    const error = new Error(
      String(detail || `Request failed (${response.status})`),
    );

    (error as Error & { status?: number }).status = response.status;
    throw error;
  }

  return payload;
}

function initialFilters() {
  const query = new URLSearchParams(location.search);

  return {
    origin: query.get('origin') ?? '',
    destination: query.get('destination') ?? '',
    date: query.get('date') ?? '',
    passengers: Math.max(
      1,
      Number(query.get('passengers') ?? 1) || 1,
    ),
  };
}

export function PassengerApp() {
  const [start] = useState(initialFilters);
  const [screen, setScreen] = useState<Screen>('home');
  const [history, setHistory] = useState<Screen[]>([]);
  const [filters, setFilters] = useState(start);
  const [trips, setTrips] = useState<ApiTrip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<ApiTrip | null>(null);
  const [seats, setSeats] = useState<SeatDto[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [passengers, setPassengers] = useState<Passenger[]>(
    () => Array.from(
      { length: start.passengers },
      () => ({
        full_name: '',
        document_number: '',
        email: '',
        phone: '',
      }),
    ),
  );
  const [booking, setBooking] = useState<Booking | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const go = (next: Screen) => {
    setHistory((value) => [...value, screen]);
    setScreen(next);
    scrollTo({ top: 0, behavior: 'smooth' });
  };

  const back = () => {
    setHistory((value) => {
      const next = [...value];
      const previous = next.pop();
      if (previous) setScreen(previous);
      return next;
    });
  };

  const search = async (next = filters) => {
    setLoading(true);
    setError('');

    try {
      const query = new URLSearchParams();

      if (next.origin) query.set('origin', next.origin);
      if (next.destination) query.set('destination', next.destination);
      if (next.date) query.set('date', next.date);
      query.set('passengers', String(next.passengers));

      const payload = await api(`/trips/search?${query}`);

      setTrips(payload.data ?? []);
      setPassengers(
        Array.from(
          { length: next.passengers },
          (_, index) => passengers[index] ?? {
            full_name: '',
            document_number: '',
            email: '',
            phone: '',
          },
        ),
      );

      if (screen !== 'results') go('results');
    } catch (caught) {
      setError((caught as Error).message);
      setTrips([]);

      if (screen !== 'results') go('results');
    } finally {
      setLoading(false);
    }
  };

  const choose = async (trip: ApiTrip) => {
    setLoading(true);
    setError('');

    try {
      const [detail, seatPayload, quotePayload] = await Promise.all([
        api(`/trips/${trip.id}`),
        api(`/trips/${trip.id}/seats`),
        api(`/trips/${trip.id}/quote?passengers=${filters.passengers}`),
      ]);

      setSelectedTrip(detail.data ?? detail);
      setSeats(seatPayload.data ?? []);
      setQuote(quotePayload.data ?? quotePayload);
      setSelected([]);
      go('trip');
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const toggle = (id: number) => {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : current.length < filters.passengers
          ? [...current, id]
          : current,
    );
  };

  const reserve = async () => {
    if (!selectedTrip) return;

    if (!sessionStorage.getItem(TOKEN) && !localStorage.getItem(TOKEN)) {
      sessionStorage.setItem(
        DRAFT,
        JSON.stringify({
          filters,
          tripId: selectedTrip.id,
          selected,
          passengers,
        }),
      );

      location.href =
        '/login/?return=' +
        encodeURIComponent('/passenger/?resume=1');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = await api('/bookings', {
        method: 'POST',
        body: JSON.stringify({
          trip_id: Number(selectedTrip.id),
          seat_ids: selected,
          passengers,
        }),
      });

      setBooking(payload.data ?? payload);
      sessionStorage.removeItem(DRAFT);
      go('status');
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const query = new URLSearchParams(location.search);

    if (query.get('resume') === '1') {
      const raw = sessionStorage.getItem(DRAFT);

      if (raw) {
        void (async () => {
          try {
            const draft = JSON.parse(raw);

            setFilters(draft.filters);
            setPassengers(draft.passengers);

            const [tripPayload, seatPayload, quotePayload] = await Promise.all([
              api(`/trips/${draft.tripId}`),
              api(`/trips/${draft.tripId}/seats`),
              api(`/trips/${draft.tripId}/quote?passengers=${draft.filters.passengers}`),
            ]);

            setSelectedTrip(tripPayload.data ?? tripPayload);
            setSeats(seatPayload.data ?? []);
            setQuote(quotePayload.data ?? quotePayload);
            setSelected(draft.selected);
            setScreen('review');
          } catch (caught) {
            setError((caught as Error).message);
          }
        })();

        return;
      }
    }

    if (start.origin || start.destination) {
      void search(start);
    }
  }, []);

  const selectedLabels = useMemo(
    () =>
      seats
        .filter((seat) => selected.includes(seat.id))
        .map((seat) => seat.seat_number),
    [seats, selected],
  );

  const step = [
    'home',
    'results',
    'trip',
    'seats',
    'passengers',
    'review',
    'status',
  ].indexOf(screen);

  return (
    <div className="app-shell">
      <Topbar />

      <div className="passenger-wrap">
        <Journey step={step} />

        {error && (
          <div className="smart-banner smart-banner--error">
            <b>Could not complete the action</b>
            <span>{error}</span>
          </div>
        )}

        <main className="screen-animate">
          {screen === 'home' && (
            <Home
              filters={filters}
              setFilters={setFilters}
              onSearch={() => search(filters)}
              loading={loading}
            />
          )}

          {screen === 'results' && (
            <Results
              trips={trips}
              loading={loading}
              onBack={back}
              onSelect={choose}
            />
          )}

          {screen === 'trip' && selectedTrip && (
            <TripScreen
              trip={selectedTrip}
              onBack={back}
              onNext={() => go('seats')}
            />
          )}

          {screen === 'seats' && (
            <SeatScreen
              seats={seats}
              selected={selected}
              passengerCount={filters.passengers}
              toggle={toggle}
              quote={quote}
              onBack={back}
              onNext={() => go('passengers')}
            />
          )}

          {screen === 'passengers' && (
            <Passengers
              values={passengers}
              setValues={setPassengers}
              onBack={back}
              onNext={() => go('review')}
            />
          )}

          {screen === 'review' && selectedTrip && (
            <Review
              trip={selectedTrip}
              seatLabels={selectedLabels}
              passengers={passengers}
              quote={quote}
              loading={loading}
              onBack={back}
              onReserve={reserve}
            />
          )}

          {screen === 'status' && (
            <Status
              booking={booking}
              trip={selectedTrip}
              seats={selectedLabels}
              onNew={() => {
                setBooking(null);
                setSelected([]);
                setScreen('home');
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function Topbar() {
  return (
    <header className="topbar">
      <a className="brand passenger-brand" href="/website/" aria-label="Encore Transport">
        <img src="/logo.svg" alt="" aria-hidden="true" />
        <div>
          <strong>encore</strong>
          <span>transport · passenger</span>
        </div>
      </a>

      <nav>
        <button onClick={() => { location.href = '/website/'; }}>
          Website
        </button>
        <button onClick={() => { location.href = '/login/'; }}>
          Account
        </button>
      </nav>

      <div className="user">
        <span>Passenger</span>
        <b>ET</b>
      </div>
    </header>
  );
}

function Journey({ step }: { step: number }) {
  const labels = [
    'Search',
    'Results',
    'Trip',
    'Seats',
    'Passengers',
    'Review',
    'Status',
  ];

  const percent = Math.max(
    0,
    Math.round(step / (labels.length - 1) * 100),
  );

  return (
    <section className="journey">
      <div className="journey-top">
        <span>BOOKING JOURNEY</span>
        <strong>{percent}%</strong>
      </div>

      <div className="journey-bar">
        <i style={{ width: `${percent}%` }} />
      </div>

      <div className="journey-steps">
        {labels.map((label, index) => (
          <button
            key={label}
            disabled
            className={index <= step ? 'active' : ''}
          >
            <em>{String(index + 1).padStart(2, '0')}</em>
            {label}
          </button>
        ))}
      </div>
    </section>
  );
}

function Home({
  filters,
  setFilters,
  onSearch,
  loading,
}: {
  filters: any;
  setFilters: (value: any) => void;
  onSearch: () => void;
  loading: boolean;
}) {
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSearch();
  };

  return (
    <>
      <section className="hero">
        <div>
          <span className="eyebrow">INTERCITY, REFINED</span>
          <h1>Choose a real trip. Keep every step clear.</h1>
          <p>
            Search current departures, inspect the assigned vehicle and choose
            seats that are still available at the time of booking.
          </p>
        </div>
        <div className="orbit" aria-hidden="true">
          <i />
          <b>ENCORE</b>
          <span>FROM</span>
          <span>TO</span>
        </div>
      </section>

      <form className="search-console" onSubmit={submit}>
        <Field
          label="From"
          value={filters.origin}
          onChange={(value) => setFilters({ ...filters, origin: value })}
        />

        <button
          type="button"
          aria-label="Swap origin and destination"
          onClick={() => setFilters({
            ...filters,
            origin: filters.destination,
            destination: filters.origin,
          })}
        >
          ⇄
        </button>

        <Field
          label="To"
          value={filters.destination}
          onChange={(value) => setFilters({ ...filters, destination: value })}
        />

        <Field
          label="Date"
          value={filters.date}
          type="date"
          onChange={(value) => setFilters({ ...filters, date: value })}
        />

        <Field
          label="Passengers"
          value={String(filters.passengers)}
          type="number"
          onChange={(value) => setFilters({
            ...filters,
            passengers: Math.max(1, Number(value) || 1),
          })}
        />

        <button className="primary" disabled={loading}>
          {loading ? 'SEARCHING…' : 'SEARCH DEPARTURES →'}
        </button>
      </form>
    </>
  );
}

function Field({
  label,
  value,
  type = 'text',
  onChange,
}: {
  label: string;
  value: string;
  type?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <label>
      <span>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
      />
    </label>
  );
}

function PageHead({
  eyebrow,
  title,
  onBack,
}: {
  eyebrow: string;
  title: string;
  onBack: () => void;
}) {
  return (
    <div className="page-head">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
      </div>
      <button className="ghost" onClick={onBack}>
        ← BACK
      </button>
    </div>
  );
}

function Results({
  trips,
  loading,
  onBack,
  onSelect,
}: {
  trips: ApiTrip[];
  loading: boolean;
  onBack: () => void;
  onSelect: (trip: ApiTrip) => void;
}) {
  return (
    <>
      <PageHead
        eyebrow="AVAILABLE DEPARTURES"
        title="Choose your departure."
        onBack={onBack}
      />

      {loading ? (
        <div className="smart-banner"><b>Searching trips…</b></div>
      ) : !trips.length ? (
        <div className="smart-banner">
          <b>No departures found.</b>
          <span>Change route, date or passenger count.</span>
        </div>
      ) : (
        <div className="departures">
          {trips.map((trip) => (
            <article key={trip.id} className="departure">
              <div>
                <span>TRIP {trip.id}</span>
                <h3>{trip.origin} → {trip.destination}</h3>
                <div className="times">
                  <b>{trip.departureTime?.slice(0, 5)}</b>
                  <i />
                  <small>{trip.durationMinutes} min</small>
                  <i />
                  <b>{trip.arrivalTime?.slice(0, 5)}</b>
                </div>
                <p>
                  {trip.busCode ?? `Bus ${trip.busId ?? ''}`} ·{' '}
                  {trip.availableSeats} seats available · {trip.status}
                </p>
              </div>
              <aside>
                <strong>{money(trip.baseFare)}</strong>
                <button
                  className="primary"
                  onClick={() => onSelect(trip)}
                >
                  SELECT →
                </button>
              </aside>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

function JourneyMap({ trip }: { trip: ApiTrip }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [mapError, setMapError] = useState('');

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (!ref.current) return;

      try {
        const query = new URLSearchParams({
          origin: trip.origin,
          destination: trip.destination,
        });

        const payload = await api(`/maps/journey?${query}`);
        if (cancelled || !ref.current) return;

        await renderJourneyMap(ref.current, payload.data ?? payload);
      } catch (caught) {
        if (!cancelled) setMapError((caught as Error).message);
      }
    })();

    return () => {
      cancelled = true;
      if (ref.current) destroyRealMap(ref.current);
    };
  }, [trip.id, trip.origin, trip.destination]);

  return (
    <section className="trip-map-card">
      <div className="trip-map-card__head">
        <div>
          <span className="eyebrow">ROUTE MAP</span>
          <h2>Actual streets and route geometry</h2>
        </div>
        <span className="trip-map-card__provider">TomTom</span>
      </div>

      {mapError && (
        <div className="smart-banner smart-banner--error">
          <b>Route map unavailable</b>
          <span>{mapError}</span>
        </div>
      )}

      <div ref={ref} className="passenger-real-map" />
    </section>
  );
}

function TripScreen({
  trip,
  onBack,
  onNext,
}: {
  trip: ApiTrip;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <>
      <PageHead
        eyebrow={`TRIP ${trip.id}`}
        title={`${trip.origin} to ${trip.destination}`}
        onBack={onBack}
      />

      <div className="facts">
        <Fact
          label="Departure"
          value={`${trip.date} · ${trip.departureTime?.slice(0, 5)}`}
        />
        <Fact
          label="Vehicle"
          value={trip.busCode ?? `Bus ${trip.busId ?? ''}`}
        />
        <Fact
          label="Driver"
          value={trip.driverName ?? 'Assigned by operations'}
        />
        <Fact label="Status" value={trip.status} />
      </div>

      <JourneyMap trip={trip} />

      <div className="action-band">
        <div>
          <span>FARE PER PASSENGER</span>
          <strong>{money(trip.baseFare)}</strong>
        </div>
        <button className="primary" onClick={onNext}>
          CHOOSE SEATS →
        </button>
      </div>
    </>
  );
}

function Fact({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <article>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function SeatScreen({
  seats,
  selected,
  passengerCount,
  toggle,
  quote,
  onBack,
  onNext,
}: {
  seats: SeatDto[];
  selected: number[];
  passengerCount: number;
  toggle: (id: number) => void;
  quote: Quote | null;
  onBack: () => void;
  onNext: () => void;
}) {
  const selectedSeats = seats.filter((seat) => selected.includes(seat.id));

  return (
    <>
      <PageHead
        eyebrow="CABIN SELECTION"
        title="Choose your place on board."
        onBack={onBack}
      />

      <div className="seat-layout">
        <SeatMap
          seats={seats}
          selected={selected}
          maxSelection={passengerCount}
          onToggle={toggle}
        />

        <aside className="seat-summary">
          <span className="eyebrow">YOUR SELECTION</span>
          <h2>{selected.length}/{passengerCount} seats</h2>

          <div className="seat-tags">
            {selectedSeats.map((seat) => (
              <b key={seat.id}>
                {seat.seat_number}
                {seat.accessible ? ' ♿' : ''}
              </b>
            ))}
          </div>

          <div className="seat-price-summary">
            <span>Server quote</span>
            <strong>
              {money(
                quote?.total ?? 0,
                quote?.currency ?? 'DOP',
              )}
            </strong>
            <small>
              Final availability and total are validated again when the booking is created.
            </small>
          </div>

          <button
            className="primary"
            disabled={selected.length !== passengerCount}
            onClick={onNext}
          >
            CONTINUE →
          </button>
        </aside>
      </div>
    </>
  );
}

function Passengers({
  values,
  setValues,
  onBack,
  onNext,
}: {
  values: Passenger[];
  setValues: (value: Passenger[]) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const update = (
    index: number,
    key: keyof Passenger,
    value: string,
  ) => {
    setValues(
      values.map((passenger, current) =>
        current === index
          ? { ...passenger, [key]: value }
          : passenger,
      ),
    );
  };

  const valid = values.every(
    (passenger) => passenger.full_name.trim(),
  );

  return (
    <>
      <PageHead
        eyebrow="PASSENGER DETAILS"
        title="Who is travelling?"
        onBack={onBack}
      />

      <form
        className="passenger-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (valid) onNext();
        }}
      >
        {values.map((passenger, index) => (
          <article className="passenger-card" key={index}>
            <div className="passenger-no">
              {String(index + 1).padStart(2, '0')}
            </div>

            <div className="fields">
              <Field
                label="Full name"
                value={passenger.full_name}
                onChange={(value) => update(index, 'full_name', value)}
              />
              <Field
                label="Document"
                value={passenger.document_number}
                onChange={(value) => update(index, 'document_number', value)}
              />
              <Field
                label="Phone"
                value={passenger.phone}
                onChange={(value) => update(index, 'phone', value)}
              />
              <Field
                label="Email"
                value={passenger.email}
                type="email"
                onChange={(value) => update(index, 'email', value)}
              />
            </div>
          </article>
        ))}

        <button className="primary wide" disabled={!valid}>
          REVIEW TRIP →
        </button>
      </form>
    </>
  );
}

function Review({
  trip,
  seatLabels,
  passengers,
  quote,
  loading,
  onBack,
  onReserve,
}: {
  trip: ApiTrip;
  seatLabels: string[];
  passengers: Passenger[];
  quote: Quote | null;
  loading: boolean;
  onBack: () => void;
  onReserve: () => void;
}) {
  const signed = Boolean(
    sessionStorage.getItem(TOKEN) ??
    localStorage.getItem(TOKEN),
  );

  return (
    <>
      <PageHead
        eyebrow="REVIEW"
        title="Everything in one clear view."
        onBack={onBack}
      />

      <div className="review-grid">
        <div className="review-card">
          <Fact label="Route" value={`${trip.origin} → ${trip.destination}`} />
          <Fact
            label="Passengers"
            value={passengers.map((passenger) => passenger.full_name).join(' · ')}
          />
          <Fact label="Seats" value={seatLabels.join(', ')} />
          <Fact
            label="Vehicle"
            value={trip.busCode ?? `Bus ${trip.busId ?? ''}`}
          />

          {!signed && (
            <div className="smart-banner">
              <b>Sign in required</b>
              <span>
                Your booking selections will be preserved while you sign in.
              </span>
            </div>
          )}
        </div>

        <aside className="total-panel">
          <span>SERVER TOTAL</span>
          <strong>
            {money(
              quote?.total ?? 0,
              quote?.currency ?? 'DOP',
            )}
          </strong>
          <small>
            Calculated and validated before the reservation is created.
          </small>

          <button
            className="primary"
            disabled={loading}
            onClick={onReserve}
          >
            {loading
              ? 'RESERVING…'
              : signed
                ? 'HOLD SEATS / CREATE BOOKING →'
                : 'SIGN IN AND CONTINUE →'}
          </button>
        </aside>
      </div>
    </>
  );
}

function Status({
  booking,
  trip,
  seats,
  onNew,
}: {
  booking: Booking | null;
  trip: ApiTrip | null;
  seats: string[];
  onNew: () => void;
}) {
  return (
    <>
      <div className="confirmation">
        <div>✓</div>
        <h2>
          {booking?.status === 'pending_payment'
            ? 'Your seats are being held.'
            : 'Booking status updated.'}
        </h2>
        <p>
          No payment success is simulated. A final ticket is issued only after
          a configured provider verifies payment.
        </p>
      </div>

      <div className="facts">
        <Fact
          label="Booking"
          value={booking?.reference ?? String(booking?.id ?? '')}
        />
        <Fact
          label="Route"
          value={trip ? `${trip.origin} → ${trip.destination}` : ''}
        />
        <Fact label="Seats" value={seats.join(', ')} />
        <Fact label="Status" value={booking?.status ?? 'unknown'} />
      </div>

      <div className="action-band">
        <div>
          <span>SERVER TOTAL</span>
          <strong>{money(Number(booking?.total_amount ?? 0))}</strong>
        </div>
        <button className="primary" onClick={onNew}>
          NEW SEARCH
        </button>
      </div>
    </>
  );
}
