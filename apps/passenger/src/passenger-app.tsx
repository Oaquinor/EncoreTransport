import { createMockEncoreApiClient } from '@encore/api-client';
import { formatDateLabel, formatTimeLabel } from '@encore/domain';
import type { Booking, BookingPassenger, TripSearchFilters, TripSearchResult, Trip } from '@encore/types';
import { Badge, Button, Card, EmptyState, Progress, SkeletonCard } from '@encore/ui';
import { Fragment, type FormEvent, type MouseEvent, useMemo, useRef, useState } from 'react';

type Screen = 'search' | 'results' | 'seat' | 'passenger' | 'summary' | 'payment' | 'confirmation';
type PassengerTrip = Trip & { availableSeats: Trip['seatMap']; priceLabel: string };

const screens: Screen[] = ['search', 'results', 'seat', 'passenger', 'summary', 'payment', 'confirmation'];
const api = createMockEncoreApiClient();

const defaultSearch: TripSearchFilters = {
  origin: 'Ciudad de México',
  destination: 'Puebla',
  date: '2026-09-12',
  passengers: 2
};

const defaultPassenger: BookingPassenger = {
  name: 'María Torres',
  email: 'maria.torres@mail.com',
  phone: '55 2088 3399',
  documentId: 'MX-748211'
};

function minutesToLabel(minutes: number) {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours} h ${remainder.toString().padStart(2, '0')} min`;
}

export function PassengerApp() {
  const [screen, setScreen] = useState<Screen>('search');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState(defaultSearch);
  const [results, setResults] = useState<TripSearchResult[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<PassengerTrip | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [passenger, setPassenger] = useState(defaultPassenger);
  const [booking, setBooking] = useState<Booking | null>(null);

  const stepIndex = Math.max(0, screens.indexOf(screen));
  const progress = Math.round((stepIndex / (screens.length - 1)) * 100);

  async function submitSearch(nextSearch: TripSearchFilters) {
    setSearch(nextSearch);
    setLoading(true);
    setScreen('results');
    const response = await api.fetchPassengerSearch(nextSearch);
    setResults(response.trips);
    setLoading(false);
  }

  async function selectTrip(tripId: string) {
    const response = await api.fetchTripDetails(tripId);
    setSelectedTrip(response.trip);
    setSelectedSeats([]);
    setScreen('seat');
  }

  function toggleSeat(seatId: string) {
    setSelectedSeats((currentSeats) => {
      if (currentSeats.includes(seatId)) {
        return currentSeats.filter((currentSeat) => currentSeat !== seatId);
      }

      if (currentSeats.length >= search.passengers) {
        return currentSeats;
      }

      return [...currentSeats, seatId];
    });
  }

  async function startPayment() {
    if (!selectedTrip) return;
    setScreen('payment');
    const response = await api.reserveTripSeats(selectedTrip.id, selectedSeats, search.passengers);
    setBooking(response.booking);
    setScreen('confirmation');
  }

  return (
    <div className="passenger-screen">
      <div className="passenger-shell">
        <div className="passenger-app motion-enter">
          <Header date={search.date} />
          <BookingProgress progress={progress} stepIndex={stepIndex} />
          {screen === 'search' && <SearchScreen search={search} onSubmit={submitSearch} />}
          {screen === 'results' && <ResultsScreen loading={loading} results={results} onSelectTrip={selectTrip} onBack={() => setScreen('search')} />}
          {screen === 'seat' && selectedTrip && (
            <SeatScreen
              passengerCount={search.passengers}
              selectedSeats={selectedSeats}
              trip={selectedTrip}
              onBack={() => setScreen('results')}
              onContinue={() => setScreen('passenger')}
              onToggleSeat={toggleSeat}
            />
          )}
          {screen === 'passenger' && <PassengerScreen passenger={passenger} onBack={() => setScreen('seat')} onSubmit={(nextPassenger) => {
            setPassenger(nextPassenger);
            setScreen('summary');
          }} />}
          {screen === 'summary' && selectedTrip && (
            <SummaryScreen passenger={passenger} search={search} selectedSeats={selectedSeats} trip={selectedTrip} onBack={() => setScreen('passenger')} onPay={startPayment} />
          )}
          {screen === 'payment' && <PaymentScreen />}
          {screen === 'confirmation' && <ConfirmationScreen booking={booking} selectedSeats={selectedSeats} onNewSearch={() => {
            setScreen('search');
            setResults([]);
            setSelectedTrip(null);
            setSelectedSeats([]);
            setBooking(null);
          }} />}
          <BottomNav screen={screen} />
        </div>
      </div>
    </div>
  );
}

function Header({ date }: { date: string }) {
  return (
    <header className="passenger-topbar">
      <div className="passenger-topbar__brand">
        <img className="passenger-logo" src="/logo.svg" alt="Encore Transport" />
        <div>
          <strong>Encore Move</strong>
          <small>Reserva de viajes</small>
        </div>
      </div>
      <div className="passenger-topbar__status">
        <span>Salida</span>
        <strong>{formatDateLabel(date)}</strong>
      </div>
    </header>
  );
}

function BookingProgress({ progress, stepIndex }: { progress: number; stepIndex: number }) {
  return (
    <section className="booking-progress">
      <div className="progress-wrap">
        <strong>Progreso de la reserva</strong>
        <span>{progress}%</span>
      </div>
      <Progress value={progress} />
      <div className="stepper__items">
        {['Inicio', 'Resultados', 'Asiento', 'Datos', 'Resumen', 'Pago', 'Estado'].map((label, index) => (
          <div key={label} className={`stepper__item ${index <= stepIndex ? 'stepper__item--active' : ''}`}>
            {label}
          </div>
        ))}
      </div>
    </section>
  );
}

function SearchScreen({ search, onSubmit }: { search: TripSearchFilters; onSubmit: (search: TripSearchFilters) => void }) {
  const originInputRef = useRef<HTMLInputElement>(null);
  const destinationInputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    onSubmit({
      origin: String(formData.get('origin') ?? ''),
      destination: String(formData.get('destination') ?? ''),
      date: String(formData.get('date') ?? ''),
      passengers: Number(formData.get('passengers') ?? 1)
    });
  }

  function swapRoute(event: MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;
    const originInput = form?.elements.namedItem('origin') as HTMLInputElement | null;
    const destinationInput = form?.elements.namedItem('destination') as HTMLInputElement | null;

    if (!originInput || !destinationInput) {
      return;
    }

    const origin = originInput.value;
    originInput.value = destinationInput.value;
    destinationInput.value = origin;
  }

  function applyRecentSearch(origin: string, destination: string) {
    if (originInputRef.current) {
      originInputRef.current.value = origin;
    }

    if (destinationInputRef.current) {
      destinationInputRef.current.value = destination;
    }
  }

  return (
    <section className="search-screen motion-enter">
      <div className="search-hero">
        <div>
          <span className="search-chip">Encore Move</span>
          <h1>Reserva tu próximo trayecto con claridad.</h1>
          <p>Elige ruta, asiento y pasajero en un flujo continuo, preparado para conectar con la operación real.</p>
        </div>
        <div className="search-hero__route" aria-hidden="true">
          <span />
          <strong>CDMX</strong>
          <i />
          <strong>PUE</strong>
          <span />
        </div>
      </div>
      <form className="search-form" onSubmit={handleSubmit}>
        <div className="search-panel">
          <label className="field-card">
            <span className="muted-copy">Origen</span>
            <input className="field" name="origin" defaultValue={search.origin} ref={originInputRef} />
          </label>
          <button className="swap-button" type="button" aria-label="Intercambiar origen y destino" onClick={swapRoute}>⇄</button>
          <label className="field-card">
            <span className="muted-copy">Destino</span>
            <input className="field" name="destination" defaultValue={search.destination} ref={destinationInputRef} />
          </label>
        </div>
        <div className="search-form__grid search-form__grid--2">
          <label className="field-card">
            <span className="muted-copy">Fecha</span>
            <input className="field" type="date" name="date" defaultValue={search.date} />
          </label>
          <label className="field-card">
            <span className="muted-copy">Pasajeros</span>
            <input className="field" type="number" min="1" max="8" name="passengers" defaultValue={search.passengers} />
          </label>
        </div>
        <Button type="submit" className="button--block">Buscar viaje</Button>
      </form>
      <div className="recent-searches" aria-label="Búsquedas recientes">
        <span>Recientes</span>
        <button type="button" onClick={() => applyRecentSearch('Ciudad de México', 'Puebla')}>Ciudad de México a Puebla</button>
        <button type="button" onClick={() => applyRecentSearch('Guadalajara', 'Puerto Vallarta')}>Guadalajara a Puerto Vallarta</button>
      </div>
    </section>
  );
}

function ResultsScreen({ loading, results, onBack, onSelectTrip }: { loading: boolean; results: TripSearchResult[]; onBack: () => void; onSelectTrip: (tripId: string) => void }) {
  if (loading) {
    return (
      <section className="grid" style={{ gap: 12 }}>
        <SkeletonCard lines={4} />
        <SkeletonCard lines={4} />
      </section>
    );
  }

  if (!results.length) {
    return <EmptyState title="No encontramos salidas para esos filtros." detail="Prueba otra ruta, fecha o número de pasajeros." action={<Button onClick={onBack}>Buscar de nuevo</Button>} />;
  }

  return (
    <section className="results-screen">
      <div className="screen-heading">
        <div>
          <span className="eyebrow">Salidas disponibles</span>
          <h2>Elige el viaje que mejor encaja contigo.</h2>
        </div>
        <Button tone="ghost" onClick={onBack}>Editar</Button>
      </div>
      <div className="trip-list">
      {results.map((trip) => (
        <Card key={trip.id} className={`trip-card ${trip.featured ? 'trip-card--featured' : ''}`}>
          <div className="trip-card__header">
            <div>
              <Badge tone={trip.status === 'boarding' ? 'info' : 'neutral'}>{trip.status.replace('_', ' ')}</Badge>
              <h3>{trip.origin} <span>→</span> {trip.destination}</h3>
            </div>
            <strong className="trip-price">{trip.priceLabel}</strong>
          </div>
          <div className="route-rail">
            <span />
            <div>
              <strong>{formatTimeLabel(trip.departureTime)}</strong>
              <small>{trip.origin}</small>
            </div>
            <i />
            <div>
              <strong>{formatTimeLabel(trip.arrivalTime)}</strong>
              <small>{trip.destination}</small>
            </div>
          </div>
          <div className="trip-card__meta">
            <small>{minutesToLabel(trip.durationMinutes)} de viaje</small>
            <small>{trip.availableSeats} asientos disponibles</small>
          </div>
          <div className="trip-card__footer">
            <div className="trip-tags">{trip.highlights.map((highlight) => <Badge key={highlight}>{highlight}</Badge>)}</div>
            <Button onClick={() => onSelectTrip(trip.id)}>Elegir</Button>
          </div>
        </Card>
      ))}
      </div>
    </section>
  );
}

function SeatScreen({ passengerCount, selectedSeats, trip, onBack, onContinue, onToggleSeat }: {
  passengerCount: number;
  selectedSeats: string[];
  trip: PassengerTrip;
  onBack: () => void;
  onContinue: () => void;
  onToggleSeat: (seatId: string) => void;
}) {
  const rows = useMemo(() => {
    const nextRows: Trip['seatMap'][] = [];
    for (let index = 0; index < trip.seatMap.length; index += 4) {
      nextRows.push(trip.seatMap.slice(index, index + 4));
    }
    return nextRows;
  }, [trip.seatMap]);

  return (
    <section className="seat-screen motion-enter">
      <div className="seat-header">
        <div>
          <Badge tone="info">Selecciona asiento</Badge>
          <h2>{trip.origin} → {trip.destination}</h2>
        </div>
        <strong className="seat-count">{selectedSeats.length}/{passengerCount}</strong>
      </div>
      <div className="seat-legend" aria-label="Leyenda de asientos">
        <span><i className="seat-sample seat-sample--available" /> Disponible</span>
        <span><i className="seat-sample seat-sample--selected" /> Seleccionado</span>
        <span><i className="seat-sample seat-sample--unavailable" /> No disponible</span>
      </div>
      <div className="seat-map">
        <div className="bus-front">
          <span>Conductor</span>
          <span>Puerta</span>
        </div>
        <div className="seat-rows">
          {rows.map((row, rowIndex) => (
            <div className="seat-row" key={rowIndex}>
              <div className="seat-row__label">{rowIndex + 1}</div>
              {row.map((seat, seatIndex) => (
                <Fragment key={seat.id}>
                  {seatIndex === 2 && <div className="seat-aisle" aria-hidden="true" />}
                  <button
                    className={`seat ${seat.reserved ? 'seat--reserved' : ''} ${seat.blocked ? 'seat--blocked' : ''} ${selectedSeats.includes(seat.id) ? 'seat--selected' : ''}`}
                    disabled={seat.reserved || seat.blocked}
                    onClick={() => onToggleSeat(seat.id)}
                    type="button"
                  >
                    {seat.id}
                  </button>
                </Fragment>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="sticky-summary">
        <div>
          <span>Asientos</span>
          <strong>{selectedSeats.length ? selectedSeats.join(', ') : 'Pendiente'}</strong>
        </div>
        <div className="seat-actions">
          <Button tone="ghost" onClick={onBack}>Volver</Button>
          <Button disabled={selectedSeats.length !== passengerCount} onClick={onContinue}>Continuar</Button>
        </div>
      </div>
    </section>
  );
}

function PassengerScreen({ passenger, onBack, onSubmit }: { passenger: BookingPassenger; onBack: () => void; onSubmit: (passenger: BookingPassenger) => void }) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    onSubmit({
      name: String(formData.get('name') ?? ''),
      email: String(formData.get('email') ?? ''),
      phone: String(formData.get('phone') ?? ''),
      documentId: String(formData.get('documentId') ?? '')
    });
  }

  return (
    <section className="form-screen motion-enter">
      <div className="payment-header">
        <div>
          <Badge>Datos del pasajero</Badge>
          <h2>Completa tu información</h2>
          <p className="muted-copy">Estos datos se usarán para emitir el comprobante y contactar ante cambios de operación.</p>
        </div>
        <Badge tone="success">Seguro</Badge>
      </div>
      <form className="form-grid" onSubmit={handleSubmit}>
        <label><span className="muted-copy">Nombre</span><input className="field" name="name" defaultValue={passenger.name} required /></label>
        <label><span className="muted-copy">Correo</span><input className="field" type="email" name="email" defaultValue={passenger.email} required /></label>
        <label><span className="muted-copy">Teléfono</span><input className="field" name="phone" defaultValue={passenger.phone} required /></label>
        <label><span className="muted-copy">Documento</span><input className="field" name="documentId" defaultValue={passenger.documentId} required /></label>
        <div className="payment-actions">
          <Button tone="ghost" type="button" onClick={onBack}>Volver</Button>
          <Button type="submit">Ver resumen</Button>
        </div>
      </form>
    </section>
  );
}

function SummaryScreen({ passenger, search, selectedSeats, trip, onBack, onPay }: {
  passenger: BookingPassenger;
  search: TripSearchFilters;
  selectedSeats: string[];
  trip: PassengerTrip;
  onBack: () => void;
  onPay: () => void;
}) {
  return (
    <section className="summary-screen motion-enter">
      <div className="summary-row">
        <div>
          <Badge tone="primary">Resumen</Badge>
          <h2>Revisa antes de pagar</h2>
        </div>
        <strong className="summary-total">{trip.priceLabel}</strong>
      </div>
      <div className="summary-list">
        <div className="summary-list__item"><span>Viaje</span><strong>{trip.origin} → {trip.destination}</strong></div>
        <div className="summary-list__item"><span>Fecha</span><strong>{formatDateLabel(search.date)}</strong></div>
        <div className="summary-list__item"><span>Asientos</span><strong>{selectedSeats.join(', ')}</strong></div>
        <div className="summary-list__item"><span>Pasajero</span><strong>{passenger.name}</strong></div>
      </div>
      <div className="policy-note">
        <strong>Pago seguro</strong>
        <span>La confirmación final debe venir del servicio de pagos. El frontend solo refleja el estado recibido.</span>
      </div>
      <div className="confirmation-actions">
        <Button tone="ghost" onClick={onBack}>Editar datos</Button>
        <Button onClick={onPay}>Procesar pago</Button>
      </div>
    </section>
  );
}

function PaymentScreen() {
  return (
    <section className="payment-flow motion-enter">
      <div className="payment-screen">
        <div className="loading-pulse" />
        <div className="text-center">
          <Badge tone="warning">Procesando</Badge>
          <h2>Estamos asegurando tu reserva</h2>
          <p className="muted-copy">Validando asientos, confirmando disponibilidad y preparando el comprobante.</p>
        </div>
      </div>
    </section>
  );
}

function ConfirmationScreen({ booking, selectedSeats, onNewSearch }: { booking: Booking | null; selectedSeats: string[]; onNewSearch: () => void }) {
  const isPendingPayment = booking?.status === 'pending_payment';
  const statusLabel = isPendingPayment ? 'Pago pendiente' : 'Confirmada';
  return (
    <section className="confirmation-screen motion-enter">
      <div className="confirmation-hero">
        <div className="confirmation-hero__icon">✓</div>
        <div>
          <Badge tone={isPendingPayment ? 'warning' : 'success'}>{statusLabel}</Badge>
          <h2>{isPendingPayment ? 'Tu reserva está apartada.' : 'Tu viaje está listo.'}</h2>
          <p className="muted-copy">Recibirás los detalles por correo y podrás revisar el estado desde esta misma app.</p>
        </div>
      </div>
      <div className="summary-list">
        <div className="summary-list__item"><span>Reserva</span><strong>{booking?.id ?? 'Reserva en proceso'}</strong></div>
        <div className="summary-list__item"><span>Pago</span><strong>{booking?.totalLabel ?? ''}</strong></div>
        <div className="summary-list__item"><span>Asientos</span><strong>{selectedSeats.join(', ')}</strong></div>
        <div className="summary-list__item"><span>Estado</span><strong>{statusLabel}</strong></div>
      </div>
      <div className="confirmation-actions">
        <Button tone="ghost" onClick={onNewSearch}>Nueva búsqueda</Button>
      </div>
    </section>
  );
}

function BottomNav({ screen }: { screen: Screen }) {
  const items = [
    ['Buscar', screen === 'search'],
    ['Viaje', screen === 'results' || screen === 'seat'],
    ['Reserva', screen === 'passenger' || screen === 'summary'],
    ['Estado', screen === 'payment' || screen === 'confirmation']
  ] as const;

  return (
    <nav className="bottom-nav" aria-label="Navegación rápida">
      {items.map(([label, active]) => (
        <div key={label} className={`bottom-nav__item ${active ? 'bottom-nav__item--active' : ''}`}>
          {label}
        </div>
      ))}
    </nav>
  );
}
