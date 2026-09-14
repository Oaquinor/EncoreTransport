import { createMockEncoreApiClient } from '@encore/api-client';
import { formatCurrency, formatDateLabel, formatTimeLabel } from '@encore/domain';
import type { Booking, BookingPassenger, TripSearchFilters, TripSearchResult, Trip } from '@encore/types';
import { Badge, Button, Card, EmptyState, Progress, SkeletonCard } from '@encore/ui';
import { Fragment, type FormEvent, useMemo, useRef, useState } from 'react';

type Screen = 'home' | 'results' | 'details' | 'seats' | 'passengers' | 'review' | 'payment' | 'confirmation' | 'ticket';
type PassengerTrip = Trip & {
  availableSeats: Trip['seatMap'];
  priceLabel: string;
  vehicle: { name: string; plate: string; features: string[]; capacity: number };
  driver: { name: string };
  boardingPoint: string;
  dropoffPoint: string;
  serviceClass: string;
};
type PaymentState = 'idle' | 'processing' | 'pending' | 'success' | 'failed';

const screens: Screen[] = ['home', 'results', 'details', 'seats', 'passengers', 'review', 'payment', 'confirmation', 'ticket'];
const api = createMockEncoreApiClient();

const defaultSearch: TripSearchFilters = {
  origin: 'Santo Domingo',
  destination: 'Santiago',
  date: '2026-09-14',
  passengers: 2
};

const defaultPassenger: BookingPassenger = {
  name: 'Maria Torres',
  email: 'maria.torres@mail.com',
  phone: '+1 809 555 1842',
  documentId: '001-7482110-4'
};

function minutesToLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours ? `${hours}h ${remainder.toString().padStart(2, '0')}m` : `${minutes}m`;
}

function makePassengers(count: number, firstPassenger = defaultPassenger) {
  return Array.from({ length: count }, (_, index) => ({
    ...firstPassenger,
    name: index === 0 ? firstPassenger.name : '',
    email: index === 0 ? firstPassenger.email : '',
    phone: index === 0 ? firstPassenger.phone : '',
    documentId: index === 0 ? firstPassenger.documentId : ''
  }));
}

export function PassengerApp() {
  const [screen, setScreen] = useState<Screen>('home');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState(defaultSearch);
  const [results, setResults] = useState<TripSearchResult[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<PassengerTrip | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [passengers, setPassengers] = useState<BookingPassenger[]>(makePassengers(defaultSearch.passengers));
  const [booking, setBooking] = useState<Booking | null>(null);
  const [paymentState, setPaymentState] = useState<PaymentState>('idle');

  const stepIndex = Math.max(0, screens.indexOf(screen));
  const progress = Math.round((stepIndex / (screens.length - 1)) * 100);
  const subtotal = selectedTrip ? selectedTrip.baseFare * search.passengers : 0;
  const fees = selectedTrip ? selectedTrip.serviceFee : 0;
  const total = selectedTrip ? Math.round(selectedTrip.baseFare * search.passengers * selectedTrip.demandMultiplier + fees) : 0;

  async function submitSearch(nextSearch: TripSearchFilters) {
    setSearch(nextSearch);
    setPassengers(makePassengers(nextSearch.passengers, passengers[0] ?? defaultPassenger));
    setLoading(true);
    setScreen('results');
    const response = await api.fetchPassengerSearch(nextSearch);
    setResults(response.trips);
    setLoading(false);
  }

  async function openTrip(tripId: string) {
    const response = await api.fetchTripDetails(tripId);
    setSelectedTrip(response.trip);
    setSelectedSeats([]);
    setScreen('details');
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

  function submitPassengers(nextPassengers: BookingPassenger[]) {
    setPassengers(nextPassengers);
    setScreen('review');
  }

  async function startPayment(nextState: PaymentState) {
    if (!selectedTrip) return;
    setPaymentState('processing');
    setScreen('payment');
    await new Promise((resolve) => window.setTimeout(resolve, 620));
    const response = await api.reserveTripSeats(selectedTrip.id, selectedSeats, search.passengers);
    setBooking({ ...response.booking, passengers, total, totalLabel: formatCurrency(total) });
    setPaymentState(nextState);
    setScreen('confirmation');
  }

  function reset() {
    setScreen('home');
    setResults([]);
    setSelectedTrip(null);
    setSelectedSeats([]);
    setBooking(null);
    setPaymentState('idle');
  }

  return (
    <div className="passenger-screen">
      <div className="passenger-shell">
        <div className="passenger-app motion-enter">
          <Header date={search.date} />
          <BookingProgress progress={progress} stepIndex={stepIndex} />
          {screen === 'home' && <HomeScreen search={search} onSubmit={submitSearch} />}
          {screen === 'results' && <ResultsScreen loading={loading} results={results} onBack={() => setScreen('home')} onOpenTrip={openTrip} />}
          {screen === 'details' && selectedTrip && <TripDetailsScreen trip={selectedTrip} onBack={() => setScreen('results')} onSelect={() => setScreen('seats')} />}
          {screen === 'seats' && selectedTrip && (
            <SeatScreen
              passengerCount={search.passengers}
              selectedSeats={selectedSeats}
              trip={selectedTrip}
              onBack={() => setScreen('details')}
              onContinue={() => setScreen('passengers')}
              onToggleSeat={toggleSeat}
            />
          )}
          {screen === 'passengers' && <PassengerDetailsScreen count={search.passengers} passengers={passengers} onBack={() => setScreen('seats')} onSubmit={submitPassengers} />}
          {screen === 'review' && selectedTrip && (
            <ReviewScreen
              fees={fees}
              passengers={passengers}
              search={search}
              selectedSeats={selectedSeats}
              subtotal={subtotal}
              total={total}
              trip={selectedTrip}
              onBack={() => setScreen('passengers')}
              onPay={startPayment}
            />
          )}
          {screen === 'payment' && <PaymentPreview state={paymentState} />}
          {screen === 'confirmation' && selectedTrip && (
            <ConfirmationScreen
              booking={booking}
              paymentState={paymentState}
              selectedSeats={selectedSeats}
              trip={selectedTrip}
              onNewSearch={reset}
              onTicket={() => setScreen('ticket')}
            />
          )}
          {screen === 'ticket' && selectedTrip && booking && <TicketScreen booking={booking} passengers={passengers} selectedSeats={selectedSeats} trip={selectedTrip} onBack={() => setScreen('confirmation')} />}
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
          <strong>Encore Passenger</strong>
          <small>Book, board, and travel</small>
        </div>
      </div>
      <div className="passenger-topbar__status">
        <span>Travel date</span>
        <strong>{formatDateLabel(date)}</strong>
      </div>
    </header>
  );
}

function BookingProgress({ progress, stepIndex }: { progress: number; stepIndex: number }) {
  return (
    <section className="booking-progress">
      <div className="progress-wrap">
        <strong>Booking progress</strong>
        <span>{progress}%</span>
      </div>
      <Progress value={progress} />
      <div className="stepper__items">
        {['Home', 'Results', 'Trip', 'Seats', 'Passengers', 'Review', 'Pay', 'Ticket'].map((label, index) => (
          <div key={label} className={`stepper__item ${index <= Math.min(stepIndex, 7) ? 'stepper__item--active' : ''}`}>
            {label}
          </div>
        ))}
      </div>
    </section>
  );
}

function HomeScreen({ search, onSubmit }: { search: TripSearchFilters; onSubmit: (search: TripSearchFilters) => void }) {
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

  function swapRoute() {
    if (!originInputRef.current || !destinationInputRef.current) return;
    const origin = originInputRef.current.value;
    originInputRef.current.value = destinationInputRef.current.value;
    destinationInputRef.current.value = origin;
  }

  function applyRoute(origin: string, destination: string) {
    if (originInputRef.current) originInputRef.current.value = origin;
    if (destinationInputRef.current) destinationInputRef.current.value = destination;
  }

  return (
    <section className="search-screen motion-enter">
      <div className="search-hero">
        <div>
          <span className="search-chip">Encore Move</span>
          <h1>Choose your route. Reserve your seat. Travel clearly.</h1>
          <p>A polished passenger booking flow prepared for real inventory, payments, maps, and notifications.</p>
        </div>
        <div className="search-hero__route" aria-hidden="true">
          <span />
          <strong>SDQ</strong>
          <i />
          <strong>STI</strong>
          <span />
        </div>
      </div>
      <form className="search-form" onSubmit={handleSubmit}>
        <div className="search-panel">
          <label className="field-card">
            <span className="muted-copy">Origin</span>
            <input className="field" name="origin" defaultValue={search.origin} ref={originInputRef} />
          </label>
          <button className="swap-button" type="button" aria-label="Swap origin and destination" onClick={swapRoute}>⇄</button>
          <label className="field-card">
            <span className="muted-copy">Destination</span>
            <input className="field" name="destination" defaultValue={search.destination} ref={destinationInputRef} />
          </label>
        </div>
        <div className="search-form__grid search-form__grid--2">
          <label className="field-card">
            <span className="muted-copy">Date</span>
            <input className="field" type="date" name="date" defaultValue={search.date} />
          </label>
          <label className="field-card">
            <span className="muted-copy">Passengers</span>
            <input className="field" type="number" min="1" max="8" name="passengers" defaultValue={search.passengers} />
          </label>
        </div>
        <Button type="submit" className="button--block">Search trips</Button>
      </form>
      <div className="recent-searches" aria-label="Recent searches">
        <span>Popular routes</span>
        <button type="button" onClick={() => applyRoute('Santo Domingo', 'Santiago')}>Santo Domingo to Santiago</button>
        <button type="button" onClick={() => applyRoute('Santo Domingo', 'Punta Cana')}>Santo Domingo to Punta Cana</button>
      </div>
    </section>
  );
}

function ResultsScreen({ loading, results, onBack, onOpenTrip }: { loading: boolean; results: TripSearchResult[]; onBack: () => void; onOpenTrip: (tripId: string) => void }) {
  if (loading) {
    return (
      <section className="grid" style={{ gap: 12 }}>
        <SkeletonCard lines={4} />
        <SkeletonCard lines={4} />
      </section>
    );
  }

  if (!results.length) {
    return <EmptyState title="No departures matched those filters." detail="Try another route, date, or passenger count." action={<Button onClick={onBack}>Search again</Button>} />;
  }

  return (
    <section className="results-screen">
      <div className="screen-heading">
        <div>
          <span className="eyebrow">Available departures</span>
          <h2>Select the trip that fits your day.</h2>
        </div>
        <Button tone="ghost" onClick={onBack}>Edit</Button>
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
                <small>Departure</small>
              </div>
              <i />
              <div>
                <strong>{formatTimeLabel(trip.arrivalTime)}</strong>
                <small>Arrival</small>
              </div>
            </div>
            <div className="trip-card__meta">
              <small>{minutesToLabel(trip.durationMinutes)}</small>
              <small>{trip.availableSeats} seats available</small>
              <small>{trip.highlights[0] ?? 'Standard'}</small>
            </div>
            <div className="trip-card__footer">
              <div className="trip-tags">{trip.highlights.map((highlight) => <Badge key={highlight}>{highlight}</Badge>)}</div>
              <div className="trip-actions">
                <Button tone="ghost" onClick={() => onOpenTrip(trip.id)}>View details</Button>
                <Button onClick={() => onOpenTrip(trip.id)}>Select trip</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

function TripDetailsScreen({ trip, onBack, onSelect }: { trip: PassengerTrip; onBack: () => void; onSelect: () => void }) {
  return (
    <section className="details-screen motion-enter">
      <div className="screen-heading">
        <div>
          <Badge tone="primary">{trip.id}</Badge>
          <h2>{trip.origin} to {trip.destination}</h2>
          <p className="muted-copy">{trip.serviceClass} · {minutesToLabel(trip.durationMinutes)} · {trip.vehicle.name}</p>
        </div>
        <Button tone="ghost" onClick={onBack}>Back</Button>
      </div>
      <div className="map-preview">
        <div className="map-route-line" />
        <span className="map-pin map-pin--start">Origin</span>
        <span className="map-pin map-pin--end">Destination</span>
      </div>
      <div className="detail-grid">
        <div><span>Departure</span><strong>{formatDateLabel(trip.date)} · {formatTimeLabel(trip.departureTime)}</strong></div>
        <div><span>Arrival</span><strong>{formatTimeLabel(trip.arrivalTime)}</strong></div>
        <div><span>Boarding point</span><strong>{trip.boardingPoint}</strong></div>
        <div><span>Drop-off</span><strong>{trip.dropoffPoint}</strong></div>
        <div><span>Vehicle</span><strong>{trip.vehicle.name} · {trip.vehicle.plate}</strong></div>
        <div><span>Driver</span><strong>{trip.driver.name}</strong></div>
      </div>
      <div className="trip-tags">{trip.highlights.map((highlight) => <Badge key={highlight}>{highlight}</Badge>)}</div>
      <div className="sticky-summary">
        <div>
          <span>Starting at</span>
          <strong>{trip.priceLabel}</strong>
        </div>
        <Button onClick={onSelect}>Choose seats</Button>
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
          <Badge tone="info">Seat selection</Badge>
          <h2>{trip.vehicle.name}</h2>
          <p className="muted-copy">{trip.origin} → {trip.destination}</p>
        </div>
        <strong className="seat-count">{selectedSeats.length}/{passengerCount}</strong>
      </div>
      <div className="seat-legend" aria-label="Seat legend">
        <span><i className="seat-sample seat-sample--available" /> Available</span>
        <span><i className="seat-sample seat-sample--selected" /> Selected</span>
        <span><i className="seat-sample seat-sample--reserved" /> Reserved</span>
        <span><i className="seat-sample seat-sample--unavailable" /> Unavailable</span>
      </div>
      <div className="seat-map">
        <div className="bus-front">
          <span>Driver</span>
          <span>Front door</span>
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
          <span>Selected seats</span>
          <strong>{selectedSeats.length ? selectedSeats.join(', ') : 'Choose seats'}</strong>
        </div>
        <div className="seat-actions">
          <Button tone="ghost" onClick={onBack}>Back</Button>
          <Button disabled={selectedSeats.length !== passengerCount} onClick={onContinue}>Continue</Button>
        </div>
      </div>
    </section>
  );
}

function PassengerDetailsScreen({ count, passengers, onBack, onSubmit }: { count: number; passengers: BookingPassenger[]; onBack: () => void; onSubmit: (passengers: BookingPassenger[]) => void }) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextPassengers = Array.from({ length: count }, (_, index) => ({
      name: String(formData.get(`name-${index}`) ?? ''),
      email: String(formData.get(`email-${index}`) ?? ''),
      phone: String(formData.get(`phone-${index}`) ?? ''),
      documentId: String(formData.get(`documentId-${index}`) ?? '')
    }));
    onSubmit(nextPassengers);
  }

  return (
    <section className="form-screen motion-enter">
      <div className="payment-header">
        <div>
          <Badge>Passenger details</Badge>
          <h2>Who is traveling?</h2>
          <p className="muted-copy">Each passenger gets a ticket-ready profile for future check-in and notifications.</p>
        </div>
        <Badge tone="success">Secure</Badge>
      </div>
      <form className="form-grid" onSubmit={handleSubmit}>
        {Array.from({ length: count }, (_, index) => {
          const passenger = passengers[index] ?? defaultPassenger;
          return (
            <fieldset className="passenger-fieldset" key={index}>
              <legend>Passenger {index + 1}</legend>
              <label><span className="muted-copy">Full name</span><input className="field" name={`name-${index}`} defaultValue={passenger.name} required /></label>
              <label><span className="muted-copy">Document</span><input className="field" name={`documentId-${index}`} defaultValue={passenger.documentId} required /></label>
              <label><span className="muted-copy">Phone</span><input className="field" name={`phone-${index}`} defaultValue={passenger.phone} required /></label>
              <label><span className="muted-copy">Email</span><input className="field" type="email" name={`email-${index}`} defaultValue={passenger.email} required /></label>
            </fieldset>
          );
        })}
        <div className="payment-actions">
          <Button tone="ghost" type="button" onClick={onBack}>Back</Button>
          <Button type="submit">Review trip</Button>
        </div>
      </form>
    </section>
  );
}

function ReviewScreen({ fees, passengers, search, selectedSeats, subtotal, total, trip, onBack, onPay }: {
  fees: number;
  passengers: BookingPassenger[];
  search: TripSearchFilters;
  selectedSeats: string[];
  subtotal: number;
  total: number;
  trip: PassengerTrip;
  onBack: () => void;
  onPay: (state: PaymentState) => void;
}) {
  return (
    <section className="summary-screen motion-enter">
      <div className="summary-row">
        <div>
          <Badge tone="primary">Review</Badge>
          <h2>Confirm your trip before payment.</h2>
        </div>
        <strong className="summary-total">{formatCurrency(total)}</strong>
      </div>
      <div className="summary-list">
        <div className="summary-list__item"><span>Trip</span><strong>{trip.id} · {trip.origin} → {trip.destination}</strong></div>
        <div className="summary-list__item"><span>Date and time</span><strong>{formatDateLabel(search.date)} · {formatTimeLabel(trip.departureTime)}</strong></div>
        <div className="summary-list__item"><span>Passengers</span><strong>{passengers.map((passenger) => passenger.name).join(', ')}</strong></div>
        <div className="summary-list__item"><span>Seats</span><strong>{selectedSeats.join(', ')}</strong></div>
        <div className="summary-list__item"><span>Subtotal</span><strong>{formatCurrency(subtotal)}</strong></div>
        <div className="summary-list__item"><span>Service fees</span><strong>{formatCurrency(fees)}</strong></div>
        <div className="summary-list__item"><span>Total</span><strong>{formatCurrency(total)}</strong></div>
      </div>
      <div className="policy-note">
        <strong>Payment preview</strong>
        <span>CardNet, VisaNet, and card processors are represented as mock states for this preview.</span>
      </div>
      <div className="confirmation-actions">
        <Button tone="ghost" onClick={onBack}>Edit passengers</Button>
        <Button tone="ghost" onClick={() => onPay('failed')}>Preview failed</Button>
        <Button onClick={() => onPay('pending')}>Continue to payment</Button>
      </div>
    </section>
  );
}

function PaymentPreview({ state }: { state: PaymentState }) {
  const label = state === 'processing' ? 'Processing' : state === 'failed' ? 'Failed' : state === 'success' ? 'Success' : state === 'pending' ? 'Pending' : 'Ready';
  return (
    <section className="payment-flow motion-enter">
      <div className="payment-screen">
        <div className="loading-pulse" />
        <div className="text-center">
          <Badge tone="warning">{label}</Badge>
          <h2>Preparing a secure payment handoff</h2>
          <p className="muted-copy">This preview simulates the gateway handoff without charging a real card.</p>
        </div>
        <div className="payment-methods">
          <span>Card</span>
          <span>CardNet</span>
          <span>VisaNet</span>
        </div>
      </div>
    </section>
  );
}

function ConfirmationScreen({ booking, paymentState, selectedSeats, trip, onNewSearch, onTicket }: {
  booking: Booking | null;
  paymentState: PaymentState;
  selectedSeats: string[];
  trip: PassengerTrip;
  onNewSearch: () => void;
  onTicket: () => void;
}) {
  const isPendingPayment = paymentState === 'pending' || booking?.status === 'pending_payment';
  const isFailed = paymentState === 'failed';
  const statusLabel = isFailed ? 'Payment failed' : isPendingPayment ? 'Payment pending' : 'Booking confirmed';
  return (
    <section className="confirmation-screen motion-enter">
      <div className="confirmation-hero">
        <div className="confirmation-hero__icon">{isFailed ? '!' : '✓'}</div>
        <div>
          <Badge tone={isFailed ? 'warning' : isPendingPayment ? 'warning' : 'success'}>{statusLabel}</Badge>
          <h2>{isFailed ? 'The reservation is not complete.' : isPendingPayment ? 'Your seats are being held.' : 'Your trip is ready.'}</h2>
          <p className="muted-copy">The preview never claims payment success while the mock gateway is pending.</p>
        </div>
      </div>
      <div className="summary-list">
        <div className="summary-list__item"><span>Booking</span><strong>{booking?.id ?? 'Pending booking'}</strong></div>
        <div className="summary-list__item"><span>Trip</span><strong>{trip.id}</strong></div>
        <div className="summary-list__item"><span>Payment</span><strong>{booking?.totalLabel ?? ''}</strong></div>
        <div className="summary-list__item"><span>Seats</span><strong>{selectedSeats.join(', ')}</strong></div>
        <div className="summary-list__item"><span>Status</span><strong>{statusLabel}</strong></div>
      </div>
      <div className="confirmation-actions">
        <Button tone="ghost" onClick={onNewSearch}>New search</Button>
        {!isFailed && <Button onClick={onTicket}>View digital ticket</Button>}
      </div>
    </section>
  );
}

function TicketScreen({ booking, passengers, selectedSeats, trip, onBack }: { booking: Booking; passengers: BookingPassenger[]; selectedSeats: string[]; trip: PassengerTrip; onBack: () => void }) {
  return (
    <section className="ticket-screen motion-enter">
      <div className="digital-ticket">
        <div className="ticket-brand">
          <img src="/logo.svg" alt="Encore" />
          <div>
            <strong>Encore Transport</strong>
            <span>Digital Ticket</span>
          </div>
        </div>
        <div className="ticket-qr" aria-label="QR code preview">
          {Array.from({ length: 49 }, (_, index) => <span key={index} className={index % 2 === 0 || index % 5 === 0 ? 'is-dark' : ''} />)}
        </div>
        <div className="ticket-route">
          <div><span>From</span><strong>{trip.origin}</strong></div>
          <i />
          <div><span>To</span><strong>{trip.destination}</strong></div>
        </div>
        <div className="detail-grid">
          <div><span>Booking code</span><strong>{booking.id}</strong></div>
          <div><span>Passenger</span><strong>{passengers[0]?.name}</strong></div>
          <div><span>Date</span><strong>{formatDateLabel(trip.date)}</strong></div>
          <div><span>Time</span><strong>{formatTimeLabel(trip.departureTime)}</strong></div>
          <div><span>Seat</span><strong>{selectedSeats.join(', ')}</strong></div>
          <div><span>Vehicle</span><strong>{trip.vehicle.name}</strong></div>
          <div><span>Status</span><strong>{booking.status.replace('_', ' ')}</strong></div>
        </div>
      </div>
      <Button tone="ghost" onClick={onBack}>Back to confirmation</Button>
    </section>
  );
}

function BottomNav({ screen }: { screen: Screen }) {
  const items = [
    ['Home', screen === 'home'],
    ['Trips', screen === 'results' || screen === 'details' || screen === 'seats'],
    ['Booking', screen === 'passengers' || screen === 'review' || screen === 'payment'],
    ['Tickets', screen === 'confirmation' || screen === 'ticket']
  ] as const;

  return (
    <nav className="bottom-nav" aria-label="Quick navigation">
      {items.map(([label, active]) => (
        <div key={label} className={`bottom-nav__item ${active ? 'bottom-nav__item--active' : ''}`}>
          {label}
        </div>
      ))}
    </nav>
  );
}
