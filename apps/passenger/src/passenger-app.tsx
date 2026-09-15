import { createMockEncoreApiClient } from '@encore/api-client';
import { formatCurrency, formatDateLabel, formatTimeLabel } from '@encore/domain';
import type { Booking, BookingPassenger, Trip, TripSearchFilters, TripSearchResult } from '@encore/types';
import { Badge, Button, Card, EmptyState, Progress, SkeletonCard } from '@encore/ui';
import { Fragment, type FormEvent, useMemo, useRef, useState } from 'react';

type Screen = 'home' | 'results' | 'details' | 'seats' | 'passengers' | 'review' | 'payment' | 'confirmation' | 'ticket';
type PaymentState = 'idle' | 'processing' | 'pending' | 'success' | 'failed';
type PassengerTrip = Trip & {
  vehicle: { id: string; name: string; plate: string; features: string[]; capacity: number; status: string };
  driver: { id: string; name: string; license: string; status: string };
  availableSeats: Trip['seatMap'];
  priceLabel: string;
  boardingPoint: string;
  dropoffPoint: string;
  serviceClass: string;
};

const screens: Screen[] = ['home', 'results', 'details', 'seats', 'passengers', 'review', 'payment', 'confirmation', 'ticket'];
const api = createMockEncoreApiClient();

const defaultSearch: TripSearchFilters = {
  origin: 'Santo Domingo',
  destination: 'Santiago',
  date: '2026-09-14',
  passengers: 2,
};

const defaultPassenger: BookingPassenger = {
  name: 'Maria Torres',
  email: 'maria.torres@mail.com',
  phone: '+1 809 555 1842',
  documentId: '001-7482110-4',
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
    documentId: index === 0 ? firstPassenger.documentId : '',
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
  const [transitionKey, setTransitionKey] = useState(0);

  const stepIndex = Math.max(0, screens.indexOf(screen));
  const progress = Math.round((stepIndex / (screens.length - 1)) * 100);
  const subtotal = selectedTrip ? selectedTrip.baseFare * search.passengers : 0;
  const fees = selectedTrip ? selectedTrip.serviceFee : 0;
  const total = selectedTrip ? Math.round(selectedTrip.baseFare * search.passengers * selectedTrip.demandMultiplier + fees) : 0;

  function move(next: Screen) {
    setScreen(next);
    setTransitionKey((value) => value + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submitSearch(nextSearch: TripSearchFilters) {
    setSearch(nextSearch);
    setPassengers(makePassengers(nextSearch.passengers, passengers[0] ?? defaultPassenger));
    setLoading(true);
    move('results');
    const response = await api.fetchPassengerSearch(nextSearch);
    setResults(response.trips);
    setLoading(false);
  }

  async function openTrip(tripId: string) {
    const response = await api.fetchTripDetails(tripId);
    setSelectedTrip(response.trip);
    setSelectedSeats([]);
    move('details');
  }

  function toggleSeat(seatId: string) {
    setSelectedSeats((currentSeats) => {
      if (currentSeats.includes(seatId)) return currentSeats.filter((currentSeat) => currentSeat !== seatId);
      if (currentSeats.length >= search.passengers) return currentSeats;
      return [...currentSeats, seatId];
    });
  }

  function submitPassengers(nextPassengers: BookingPassenger[]) {
    setPassengers(nextPassengers);
    move('review');
  }

  async function startPayment(nextState: PaymentState) {
    if (!selectedTrip) return;
    setPaymentState('processing');
    move('payment');
    await new Promise((resolve) => window.setTimeout(resolve, 720));
    const response = await api.reserveTripSeats(selectedTrip.id, selectedSeats, search.passengers);
    setBooking({ ...response.booking, passengers, total, totalLabel: formatCurrency(total) });
    setPaymentState(nextState);
    move('confirmation');
  }

  function reset() {
    setResults([]);
    setSelectedTrip(null);
    setSelectedSeats([]);
    setBooking(null);
    setPaymentState('idle');
    move('home');
  }

  return (
    <div className="passenger-screen">
      <div className="passenger-shell">
        <div className="passenger-app">
          <Header date={search.date} />
          <BookingProgress progress={progress} stepIndex={stepIndex} />
          <main className="screen-transition" key={transitionKey}>
            {screen === 'home' && <HomeScreen search={search} onSubmit={submitSearch} />}
            {screen === 'results' && <ResultsScreen loading={loading} results={results} onBack={() => move('home')} onOpenTrip={openTrip} />}
            {screen === 'details' && selectedTrip && <TripDetailsScreen trip={selectedTrip} onBack={() => move('results')} onSelect={() => move('seats')} />}
            {screen === 'seats' && selectedTrip && <SeatScreen passengerCount={search.passengers} selectedSeats={selectedSeats} trip={selectedTrip} onBack={() => move('details')} onContinue={() => move('passengers')} onToggleSeat={toggleSeat} />}
            {screen === 'passengers' && <PassengerDetailsScreen count={search.passengers} passengers={passengers} onBack={() => move('seats')} onSubmit={submitPassengers} />}
            {screen === 'review' && selectedTrip && <ReviewScreen fees={fees} passengers={passengers} selectedSeats={selectedSeats} subtotal={subtotal} total={total} trip={selectedTrip} onBack={() => move('passengers')} onPay={startPayment} />}
            {screen === 'payment' && <PaymentPreview state={paymentState} />}
            {screen === 'confirmation' && selectedTrip && <ConfirmationScreen booking={booking} paymentState={paymentState} selectedSeats={selectedSeats} trip={selectedTrip} onNewSearch={reset} onTicket={() => move('ticket')} />}
            {screen === 'ticket' && selectedTrip && booking && <TicketScreen booking={booking} passengers={passengers} selectedSeats={selectedSeats} trip={selectedTrip} onBack={() => move('confirmation')} />}
          </main>
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
        <div><strong>Encore Passenger</strong><small>Book, board, and travel</small></div>
      </div>
      <div className="passenger-topbar__status"><span>Travel date</span><strong>{formatDateLabel(date)}</strong></div>
    </header>
  );
}

function BookingProgress({ progress, stepIndex }: { progress: number; stepIndex: number }) {
  const labels = ['Home', 'Results', 'Trip', 'Seats', 'Passengers', 'Review', 'Pay', 'Ticket'];
  return (
    <section className="booking-progress">
      <div className="progress-wrap"><strong>Booking progress</strong><span>{progress}%</span></div>
      <Progress value={progress} />
      <div className="stepper__items">{labels.map((label, index) => <div key={label} className={`stepper__item ${index <= Math.min(stepIndex, 7) ? 'stepper__item--active' : ''}`}>{label}</div>)}</div>
    </section>
  );
}

function HomeScreen({ search, onSubmit }: { search: TripSearchFilters; onSubmit: (search: TripSearchFilters) => void }) {
  const originInputRef = useRef<HTMLInputElement>(null);
  const destinationInputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    onSubmit({ origin: String(formData.get('origin') ?? ''), destination: String(formData.get('destination') ?? ''), date: String(formData.get('date') ?? ''), passengers: Number(formData.get('passengers') ?? 1) });
  }

  function swapRoute() {
    if (!originInputRef.current || !destinationInputRef.current) return;
    const origin = originInputRef.current.value;
    originInputRef.current.value = destinationInputRef.current.value;
    destinationInputRef.current.value = origin;
  }

  return (
    <section className="search-screen">
      <div className="search-hero">
        <div><span className="search-chip">Encore Move</span><h1>Find the right trip in a few clear steps.</h1><p>Search routes, compare departures, choose real seats, and keep a digital boarding pass ready for the day of travel.</p></div>
        <div className="search-hero__route" aria-hidden="true"><span></span><strong>SDQ</strong><i></i><b>🚌</b><i></i><strong>STI</strong><span></span></div>
      </div>
      <form className="search-form" onSubmit={handleSubmit}>
        <div className="search-panel">
          <label className="field-card"><span>Origin</span><input className="field" name="origin" defaultValue={search.origin} ref={originInputRef} /></label>
          <button className="swap-button" type="button" aria-label="Swap origin and destination" onClick={swapRoute}>⇅</button>
          <label className="field-card"><span>Destination</span><input className="field" name="destination" defaultValue={search.destination} ref={destinationInputRef} /></label>
        </div>
        <div className="search-form__grid"><label className="field-card"><span>Date</span><input className="field" type="date" name="date" defaultValue={search.date} /></label><label className="field-card"><span>Passengers</span><input className="field" type="number" min="1" max="8" name="passengers" defaultValue={search.passengers} /></label></div>
        <Button type="submit" className="button--block">Search trips</Button>
      </form>
      <div className="home-preview-grid">
        <article><small>Upcoming trip</small><strong>EN-001 · Santo Domingo → Santiago</strong><span>Sep 14 · 08:30 · Bus 203</span></article>
        <article><small>Popular destination</small><strong>Punta Cana</strong><span>From DOP 1,048</span></article>
      </div>
    </section>
  );
}

function ResultsScreen({ loading, results, onBack, onOpenTrip }: { loading: boolean; results: TripSearchResult[]; onBack: () => void; onOpenTrip: (tripId: string) => void }) {
  if (loading) return <section className="grid loading-grid"><SkeletonCard lines={4} /><SkeletonCard lines={4} /></section>;
  if (!results.length) return <EmptyState title="No departures matched those filters." detail="Try another route, date, or passenger count." action={<Button onClick={onBack}>Search again</Button>} />;
  return (
    <section className="results-screen">
      <RouteMap compact />
      <div className="screen-heading"><div><span className="eyebrow">Available departures</span><h2>Select the trip that fits your day.</h2></div><Button tone="ghost" onClick={onBack}>Edit search</Button></div>
      <div className="trip-list">{results.map((trip) => <Card key={trip.id} className={`trip-card ${trip.featured ? 'trip-card--featured' : ''}`}><div className="trip-card__header"><div><Badge tone={trip.status === 'boarding' ? 'info' : 'neutral'}>{trip.status.replace('_', ' ')}</Badge><h3>{trip.origin} <span>→</span> {trip.destination}</h3></div><strong className="trip-price">{trip.priceLabel}</strong></div><div className="route-rail"><span></span><div><strong>{formatTimeLabel(trip.departureTime)}</strong><small>Departure</small></div><i></i><div><strong>{formatTimeLabel(trip.arrivalTime)}</strong><small>Arrival</small></div></div><div className="trip-card__meta"><small>{minutesToLabel(trip.durationMinutes)}</small><small>{trip.availableSeats} seats available</small><small>{trip.highlights[0] ?? 'Standard'}</small></div><div className="trip-card__footer"><div className="trip-tags">{trip.highlights.map((highlight) => <Badge key={highlight}>{highlight}</Badge>)}</div><div className="trip-actions"><Button tone="ghost" onClick={() => onOpenTrip(trip.id)}>View details</Button><Button onClick={() => onOpenTrip(trip.id)}>Select trip</Button></div></div></Card>)}</div>
    </section>
  );
}

function RouteMap({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`real-map ${compact ? 'real-map--compact' : ''}`}>
      <iframe title="Encore route map" src="https://www.openstreetmap.org/export/embed.html?bbox=-70.85%2C18.35%2C-69.80%2C19.60&layer=mapnik&marker=18.4822%2C-69.9369" loading="lazy"></iframe>
      <svg viewBox="0 0 1000 620" preserveAspectRatio="none" aria-hidden="true"><path d="M160,470 C330,390 380,240 520,270 S700,180 840,120" /></svg>
      <span className="map-pin map-pin--start">Agora Mall</span><span className="map-pin map-pin--end">Monumento</span><span className="map-bus">🚌</span>
      <div className="map-status"><i></i><strong>Bus 203</strong><span>On schedule · ETA 10:45</span></div>
      <small className="map-credit">Map © OpenStreetMap contributors</small>
    </div>
  );
}

function TripDetailsScreen({ trip, onBack, onSelect }: { trip: PassengerTrip; onBack: () => void; onSelect: () => void }) {
  return (
    <section className="details-screen">
      <div className="screen-heading"><div><Badge tone="primary">{trip.id}</Badge><h2>{trip.origin} to {trip.destination}</h2><p className="muted-copy">{trip.serviceClass} · {minutesToLabel(trip.durationMinutes)} · {trip.vehicle.name}</p></div><Button tone="ghost" onClick={onBack}>Back</Button></div>
      <RouteMap />
      <div className="details-grid">
        <Card className="details-card"><span>Boarding</span><strong>{trip.boardingPoint}</strong><small>{formatDateLabel(trip.date)} · {formatTimeLabel(trip.departureTime)}</small></Card>
        <Card className="details-card"><span>Drop-off</span><strong>{trip.dropoffPoint}</strong><small>{formatTimeLabel(trip.arrivalTime)} expected</small></Card>
        <Card className="details-card"><span>Vehicle</span><strong>{trip.vehicle.name} · {trip.vehicle.plate}</strong><small>{trip.vehicle.features.join(' · ')}</small></Card>
        <Card className="details-card"><span>Driver</span><strong>{trip.driver.name}</strong><small>Assigned to {trip.id}</small></Card>
      </div>
      <div className="sticky-booking-bar"><div><small>Fare from</small><strong>{trip.priceLabel}</strong></div><div><small>Availability</small><strong>{trip.seatsAvailable} seats</strong></div><Button onClick={onSelect}>Choose seats</Button></div>
    </section>
  );
}

function SeatScreen({ passengerCount, selectedSeats, trip, onBack, onContinue, onToggleSeat }: { passengerCount: number; selectedSeats: string[]; trip: PassengerTrip; onBack: () => void; onContinue: () => void; onToggleSeat: (seatId: string) => void }) {
  const rows = useMemo(() => {
    const grouped = new Map<number, typeof trip.seatMap>();
    trip.seatMap.forEach((seat) => {
      const row = Number(seat.label.match(/^\d+/)?.[0] ?? 0);
      grouped.set(row, [...(grouped.get(row) ?? []), seat]);
    });
    return [...grouped.entries()];
  }, [trip.seatMap]);
  return (
    <section className="seat-screen">
      <div className="screen-heading"><div><span className="eyebrow">Seat selection</span><h2>Choose {passengerCount} seats inside {trip.vehicle.name}.</h2><p className="muted-copy">The layout matches the bus cabin: front door, driver zone, aisle, rows, and rear zone.</p></div><Button tone="ghost" onClick={onBack}>Back</Button></div>
      <div className="seat-legend"><span><i className="is-available"></i>Available</span><span><i className="is-selected"></i>Selected</span><span><i className="is-reserved"></i>Reserved</span><span><i className="is-blocked"></i>Unavailable</span></div>
      <div className="bus-layout">
        <svg className="bus-layout__shell" viewBox="0 0 650 1150" preserveAspectRatio="none" aria-hidden="true"><rect x="18" y="14" width="614" height="1120" rx="130" /><rect className="bus-layout__glass" x="130" y="38" width="390" height="88" rx="44" /><path d="M95 210 C170 150 230 150 310 150 L340 150 C420 150 480 150 555 210" /><line x1="325" y1="220" x2="325" y2="1020" /><rect className="bus-layout__rear" x="115" y="1030" width="420" height="56" rx="28" /></svg>
        <div className="bus-layout__cockpit"><div><span className="steering">◉</span><small>Driver</small></div><div><span className="door-icon">↗</span><small>Front door</small></div></div>
        <div className="bus-layout__rows">{rows.map(([row, seats]) => <div className="bus-row" key={row}><em>{row}</em><div className="seat-pair">{seats.slice(0, 2).map((seat) => <SeatButton key={seat.id} seat={seat} selected={selectedSeats.includes(seat.id)} onToggle={() => onToggleSeat(seat.id)} />)}</div><span className="aisle-label">AISLE</span><div className="seat-pair">{seats.slice(2, 4).map((seat) => <SeatButton key={seat.id} seat={seat} selected={selectedSeats.includes(seat.id)} onToggle={() => onToggleSeat(seat.id)} />)}</div></div>)}</div>
        <div className="bus-layout__rear-label">Rear zone · Emergency exit</div>
      </div>
      <div className="sticky-booking-bar"><div><small>Selected</small><strong>{selectedSeats.join(', ') || 'None'}</strong></div><div><small>Seats required</small><strong>{selectedSeats.length}/{passengerCount}</strong></div><Button disabled={selectedSeats.length !== passengerCount} onClick={onContinue}>Continue</Button></div>
    </section>
  );
}

function SeatButton({ seat, selected, onToggle }: { seat: PassengerTrip['seatMap'][number]; selected: boolean; onToggle: () => void }) {
  const unavailable = seat.reserved || seat.blocked;
  const state = selected ? 'selected' : seat.blocked ? 'blocked' : seat.reserved ? 'reserved' : 'available';
  return <button className={`real-seat real-seat--${state}`} type="button" disabled={unavailable} onClick={onToggle} aria-label={`Seat ${seat.label}`}><span className="seat-head"></span><b>◢</b><strong>{seat.label}</strong></button>;
}

function PassengerDetailsScreen({ count, passengers, onBack, onSubmit }: { count: number; passengers: BookingPassenger[]; onBack: () => void; onSubmit: (passengers: BookingPassenger[]) => void }) {
  const [draft, setDraft] = useState(passengers);
  function update(index: number, key: keyof BookingPassenger, value: string) { setDraft((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item)); }
  return <section className="passenger-form-screen"><div className="screen-heading"><div><span className="eyebrow">Passenger details</span><h2>Who is traveling?</h2></div><Button tone="ghost" onClick={onBack}>Back</Button></div><div className="passenger-form-grid">{Array.from({ length: count }, (_, index) => <Card key={index} className="passenger-form-card"><span className="passenger-number">Passenger {index + 1}</span><label>Name<input value={draft[index]?.name ?? ''} onChange={(event) => update(index, 'name', event.target.value)} /></label><label>Document<input value={draft[index]?.documentId ?? ''} onChange={(event) => update(index, 'documentId', event.target.value)} /></label><label>Phone<input value={draft[index]?.phone ?? ''} onChange={(event) => update(index, 'phone', event.target.value)} /></label><label>Email<input value={draft[index]?.email ?? ''} onChange={(event) => update(index, 'email', event.target.value)} /></label></Card>)}</div><Button className="button--block" onClick={() => onSubmit(draft)}>Review trip</Button></section>;
}

function ReviewScreen({ fees, passengers, selectedSeats, subtotal, total, trip, onBack, onPay }: { fees: number; passengers: BookingPassenger[]; selectedSeats: string[]; subtotal: number; total: number; trip: PassengerTrip; onBack: () => void; onPay: (state: PaymentState) => void }) {
  return <section className="review-screen"><div className="screen-heading"><div><span className="eyebrow">Review</span><h2>Everything before payment.</h2></div><Button tone="ghost" onClick={onBack}>Back</Button></div><div className="review-grid"><Card className="review-trip"><Badge tone="primary">{trip.id}</Badge><h3>{trip.origin} → {trip.destination}</h3><p>{formatDateLabel(trip.date)} · {formatTimeLabel(trip.departureTime)} · {trip.vehicle.name}</p><div className="review-passengers">{passengers.map((passenger, index) => <span key={index}>{passenger.name || `Passenger ${index + 1}`}</span>)}</div><strong>Seats {selectedSeats.join(', ')}</strong></Card><Card className="price-summary"><SummaryRow label="Subtotal" value={formatCurrency(subtotal)} /><SummaryRow label="Service fee" value={formatCurrency(fees)} /><SummaryRow label="Total" value={formatCurrency(total)} strong /><Button className="button--block" onClick={() => onPay('pending')}>Continue to payment</Button></Card></div></section>;
}

function PaymentPreview({ state }: { state: PaymentState }) {
  return <section className="payment-screen"><div className="payment-orb"><span>💳</span></div><span className="eyebrow">Secure handoff</span><h2>{state === 'processing' ? 'Preparing payment…' : 'Payment state'}</h2><p>The preview represents gateway handoff and keeps the booking pending until a provider confirms the transaction.</p><div className="payment-methods"><button className="is-active">Card</button><button>CardNet</button><button>VisaNet</button></div><div className="payment-card-preview"><span>ENCORE</span><strong>•••• •••• •••• 4821</strong><div><small>MARIA TORRES</small><small>09/29</small></div></div></section>;
}

function ConfirmationScreen({ booking, paymentState, selectedSeats, trip, onNewSearch, onTicket }: { booking: Booking | null; paymentState: PaymentState; selectedSeats: string[]; trip: PassengerTrip; onNewSearch: () => void; onTicket: () => void }) {
  return <section className="confirmation-screen"><div className="confirmation-icon">✓</div><span className="eyebrow">{paymentState === 'pending' ? 'Payment pending' : 'Booking update'}</span><h2>Your seats are being held.</h2><p>{trip.id} · {trip.origin} → {trip.destination} · Seats {selectedSeats.join(', ')}</p><div className="hold-timer">Seat hold expires in <strong>08:00</strong></div><div className="confirmation-actions"><Button onClick={onTicket}>View boarding pass</Button><Button tone="ghost" onClick={onNewSearch}>New search</Button></div><small>Booking {booking?.id ?? 'in progress'}</small></section>;
}

function TicketScreen({ booking, passengers, selectedSeats, trip, onBack }: { booking: Booking; passengers: BookingPassenger[]; selectedSeats: string[]; trip: PassengerTrip; onBack: () => void }) {
  return <section className="ticket-screen"><div className="screen-heading"><div><span className="eyebrow">Boarding pass</span><h2>Ready for check-in.</h2></div><Button tone="ghost" onClick={onBack}>Back</Button></div><div className="boarding-pass"><div className="boarding-pass__top"><div><small>Encore Transport</small><h3>Digital Boarding Pass</h3></div><span>Pending</span></div><div className="boarding-pass__route"><div><strong>{formatTimeLabel(trip.departureTime)}</strong><small>SDQ</small></div><i></i><b>🚌</b><i></i><div><strong>{formatTimeLabel(trip.arrivalTime)}</strong><small>STI</small></div></div><div className="boarding-pass__cut"></div><div className="boarding-pass__body"><QrCode /><div className="boarding-pass__details"><SummaryRow label="Booking" value={booking.id} light /><SummaryRow label="Passenger" value={passengers[0]?.name ?? 'Passenger'} light /><SummaryRow label="Seat" value={selectedSeats.join(', ')} light /><SummaryRow label="Bus" value={`${trip.vehicle.name} · ${trip.vehicle.plate}`} light /></div></div></div></section>;
}

function QrCode() {
  const dark = new Set([0,1,2,4,5,6,7,8,10,12,13,14,16,17,19,21,22,23,24,26,28,29,30,31,33,35,36,38,39,40,42,44,45,47,48,49,51,53,55,56,57,58,60,62,63]);
  return <div className="web-qr">{Array.from({ length: 64 }, (_, index) => <i key={index} className={dark.has(index) ? 'is-dark' : ''}></i>)}</div>;
}

function SummaryRow({ label, value, strong = false, light = false }: { label: string; value: string; strong?: boolean; light?: boolean }) {
  return <div className={`summary-row ${strong ? 'summary-row--strong' : ''} ${light ? 'summary-row--light' : ''}`}><span>{label}</span><strong>{value}</strong></div>;
}

function BottomNav({ screen }: { screen: Screen }) {
  return <nav className="passenger-bottom-nav" aria-label="Passenger app"><a href="/passenger/" className={screen === 'home' ? 'is-active' : ''}>Home</a><button type="button">Trips</button><button type="button">Tickets</button><button type="button">Profile</button></nav>;
}
