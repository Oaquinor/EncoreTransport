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
import { formatMoney } from '../../../packages/shared/formatters.mjs';
import { requestJson } from '@encore/api-client';

type Screen = 'home' | 'results' | 'trip' | 'seats' | 'passengers' | 'review' | 'status' | 'account';

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
  requested_origin?: string;
  requested_destination?: string;
};

type ApiRoute = {
  origin: string;
  destination: string;
  stops?: { name: string; sequence: number }[];
  segments?: { origin: string; destination: string; active?: boolean }[];
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

type RegistrationDetails = {
  name: string;
  email: string;
  phone: string;
  password: string;
  password_confirmation: string;
};

function ActionIcon({ name }: { name: 'arrow' | 'back' | 'search' | 'swap' | 'account' | 'route' | 'settings' }) {
  const paths = {
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    back: <><path d="M19 12H5" /><path d="m11 6-6 6 6 6" /></>,
    search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
    swap: <><path d="M7 7h11l-3-3M17 17H6l3 3" /><path d="M18 4v5M6 15v5" /></>,
    account: <><circle cx="12" cy="8" r="3.5" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></>,
    route: <><circle cx="6" cy="18" r="2" /><circle cx="18" cy="6" r="2" /><path d="M8 18h3a4 4 0 0 0 4-4V10a4 4 0 0 1 4-4" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.7 1.7-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2h-2.4v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1L8 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H6.7v-2.4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9L8 8.6l1.7-1.7.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5v-.2h2.4v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.7 1.7-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2V14h-.2a1.7 1.7 0 0 0-1.5 1Z" /></>,
  };
  return <svg className="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

const API = '/api/v1';
const TOKEN = 'encore_api_token';
const AUTH_USER = 'encore_auth_user';
const GUEST_TOKEN = 'encore_guest_booking_token';
const DRAFT = 'encore_booking_draft';

function localCalendarDate() {
  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  return today.toISOString().slice(0, 10);
}

const money = (value: number, currency?: string) => formatMoney(value, currency);

function api<T = any>(path: string, options: RequestInit = {}) {
  return requestJson<T>(API, path, options, {
    token: sessionStorage.getItem(TOKEN),
    guestToken: sessionStorage.getItem(GUEST_TOKEN),
  });
}

function initialFilters() {
  const query = new URLSearchParams(location.search);

  return {
    origin: query.get('origin') ?? '',
    destination: query.get('destination') ?? '',
    date: query.get('date') ?? localCalendarDate(),
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
  const [routes, setRoutes] = useState<ApiRoute[]>([]);
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
  const [accountUser, setAccountUser] = useState<{ name: string; email?: string; phone?: string | null; role?: string | null; avatar_url?: string | null } | null>(() => {
    try { return JSON.parse(sessionStorage.getItem(AUTH_USER) || 'null'); } catch { return null; }
  });
  const [accountBookings, setAccountBookings] = useState<any[]>([]);
  const [booting, setBooting] = useState(true);

  const go = (next: Screen) => {
    setHistory((value) => [...value, screen]);
    setScreen(next);
    // Keep step changes immediate; smooth scrolling made each API response
    // feel like a second page reload on slower devices.
    scrollTo({ top: 0, behavior: 'auto' });
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

  const signInWithGoogle = async (credential: string) => {
    setLoading(true);
    setError('');
    try {
      const result = await requestJson<any>(API, '/auth/google', { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ credential }) });
      sessionStorage.setItem(TOKEN, result.token);
      sessionStorage.setItem(AUTH_USER, JSON.stringify(result.user ?? null));
      setAccountUser(result.user ?? null);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const openAccount = async () => {
    if (!sessionStorage.getItem(TOKEN)) {
      location.href = '/login/?return=/passenger/';
      return;
    }
    setLoading(true);
    try {
      const payload = await api('/bookings');
      setAccountBookings(payload.data ?? payload ?? []);
      setScreen('account');
      scrollTo({ top: 0, behavior: 'auto' });
    } catch (caught) {
      setError((caught as Error).message);
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
        api(`/trips/${trip.id}/seats?origin=${encodeURIComponent(filters.origin)}&destination=${encodeURIComponent(filters.destination)}`),
        api(`/trips/${trip.id}/quote?passengers=${filters.passengers}&origin=${encodeURIComponent(filters.origin)}&destination=${encodeURIComponent(filters.destination)}`),
      ]);

      const tripDetail = detail.data ?? detail;
      setSelectedTrip({
        ...tripDetail,
        origin: trip.requested_origin ?? filters.origin ?? tripDetail.origin,
        destination: trip.requested_destination ?? filters.destination ?? tripDetail.destination,
        availableSeats: trip.availableSeats,
        baseFare: trip.baseFare,
      });
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

  const reserve = async (registration?: RegistrationDetails) => {
    if (!selectedTrip) return;

    setLoading(true);
    setError('');

    try {
      let bookingPassengers = passengers;
      if (registration) {
        const registered = await requestJson<any>(API, '/auth/register', {
          method: 'POST',
          body: JSON.stringify(registration),
        }, {});
        sessionStorage.setItem(TOKEN, registered.token);
        sessionStorage.setItem(AUTH_USER, JSON.stringify(registered.user ?? null));
        sessionStorage.removeItem(GUEST_TOKEN);
        setAccountUser(registered.user ?? { name: registration.name, email: registration.email });
        bookingPassengers = passengers.map((passenger, index) => index === 0
          ? { ...passenger, full_name: registration.name, email: registration.email, phone: registration.phone || passenger.phone }
          : passenger);
        setPassengers(bookingPassengers);
      }
      const payload = await api('/bookings', {
        method: 'POST',
        body: JSON.stringify({
          trip_id: Number(selectedTrip.id),
          seat_ids: selected,
          origin: filters.origin,
          destination: filters.destination,
          passengers: bookingPassengers,
        }),
      });

      setBooking(payload.data ?? payload);
      if (payload.guest_access_token) {
        sessionStorage.setItem(GUEST_TOKEN, payload.guest_access_token);
      }
      sessionStorage.removeItem(DRAFT);
      go('status');
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    void (async () => {
      const query = new URLSearchParams(location.search);
      const token = sessionStorage.getItem(TOKEN);
      const routeRequest = api('/routes');
      const sessionRequest = token ? api('/auth/me') : Promise.resolve(null);
      const [routeResult, sessionResult] = await Promise.allSettled([routeRequest, sessionRequest]);
      if (!active) return;
      if (routeResult.status === 'fulfilled') setRoutes(routeResult.value.data ?? routeResult.value ?? []);
      else setError((routeResult.reason as Error).message);
      if (token && sessionResult.status === 'fulfilled' && sessionResult.value) {
        const user = sessionResult.value.user ?? null;
        setAccountUser(user);
        sessionStorage.setItem(AUTH_USER, JSON.stringify(user));
      } else if (token && sessionResult.status === 'rejected') {
        sessionStorage.removeItem(TOKEN);
        sessionStorage.removeItem(AUTH_USER);
      }

      if (query.get('screen') === 'account' && token && sessionResult.status === 'fulfilled') {
        setLoading(true);
        try {
          const payload = await api('/bookings');
          if (active) { setAccountBookings(payload.data ?? payload ?? []); setScreen('account'); }
        } catch (caught) { if (active) setError((caught as Error).message); }
        finally { if (active) setLoading(false); }
      } else if (query.get('resume') === '1') {
        const raw = sessionStorage.getItem(DRAFT);
        if (raw) {
          try {
            const draft = JSON.parse(raw);
            setFilters(draft.filters); setPassengers(draft.passengers);
            const [tripPayload, seatPayload, quotePayload] = await Promise.all([
              api(`/trips/${draft.tripId}`),
              api(`/trips/${draft.tripId}/seats?origin=${encodeURIComponent(draft.filters.origin)}&destination=${encodeURIComponent(draft.filters.destination)}`),
              api(`/trips/${draft.tripId}/quote?passengers=${draft.filters.passengers}&origin=${encodeURIComponent(draft.filters.origin)}&destination=${encodeURIComponent(draft.filters.destination)}`),
            ]);
            if (active) { setSelectedTrip(tripPayload.data ?? tripPayload); setSeats(seatPayload.data ?? []); setQuote(quotePayload.data ?? quotePayload); setSelected(draft.selected); setScreen('review'); }
          } catch (caught) { if (active) setError((caught as Error).message); }
        }
      } else if (start.origin || start.destination) {
        setBooting(false);
        void search(start);
      }
      if (active) setBooting(false);
    })();
    return () => { active = false; };
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

  if (booting) return <div className="passenger-boot-screen" role="status" aria-live="polite"><span className="passenger-boot-screen__spinner" aria-hidden="true" /><strong>Preparing your journey…</strong><span>Checking your session and available routes.</span></div>;

  return (
    <div className="app-shell">
      <Topbar user={accountUser} onAccount={openAccount} />

      <div className="passenger-wrap">
        {screen !== 'account' && <Journey step={step} />}

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
              routes={routes}
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
              accountUser={accountUser}
              onBack={back}
              onReserve={reserve}
              onGoogleSignIn={signInWithGoogle}
            />
          )}

          {screen === 'status' && (
            <Status
              booking={booking}
              trip={selectedTrip}
              seats={selectedLabels}
              loading={loading}
              onCancel={async () => {
                if (!booking) return;
                setLoading(true);
                setError('');
                try {
                  const guestToken = sessionStorage.getItem(GUEST_TOKEN);
                  const headers: Record<string, string> = { accept: 'application/json' };
                  if (guestToken) {
                    headers['X-Guest-Booking-Token'] = guestToken;
                  }
                  await api(`/bookings/${booking.id}/cancel`, {
                    method: 'POST',
                    headers,
                  });
                  setBooking(null);
                  setSelected([]);
                  sessionStorage.removeItem(GUEST_TOKEN);
                  sessionStorage.removeItem(DRAFT);
                  go('home');
                } catch (caught) {
                  setError((caught as Error).message);
                } finally {
                  setLoading(false);
                }
              }}
              onNew={() => {
                setBooking(null);
                setSelected([]);
                setScreen('home');
              }}
            />
          )}

          {screen === 'account' && (
            <AccountScreen user={accountUser} bookings={accountBookings} loading={loading} onBack={() => setScreen('home')} onNewTrip={() => setScreen('home')} onProfileUpdated={(next) => setAccountUser((current) => ({ ...current, ...next }))} />
          )}
        </main>
      </div>
    </div>
  );
}

function Topbar({ user, onAccount }: { user: { name: string; avatar_url?: string | null } | null; onAccount: () => void }) {
  const initials = (user?.name ?? 'Passenger')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'P';

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
          <ActionIcon name="route" />Website
        </button>
        <button onClick={onAccount} aria-label={user?.name ? 'Open account for ' + user.name : 'Open passenger account'}>
          <ActionIcon name="account" />Account
        </button>
      </nav>

      <div className="user user--account" aria-label={user?.name ? `Signed in as ${user.name}` : 'Passenger account'}>
        <span className="user__avatar">{user?.avatar_url ? <img src={user.avatar_url} alt="" className="user__photo" onLoad={(event) => { event.currentTarget.style.opacity = '1'; const fallback = event.currentTarget.nextElementSibling as HTMLElement | null; if (fallback) fallback.hidden = true; }} onError={(event) => { event.currentTarget.hidden = true; const fallback = event.currentTarget.nextElementSibling as HTMLElement | null; if (fallback) fallback.hidden = false; }} /> : null}<b aria-hidden="true">{initials}</b></span>
        {user?.name && <strong>{user.name}</strong>}
      </div>
    </header>
  );
}

function AccountScreen({ user, bookings, loading, onBack, onNewTrip, onProfileUpdated }: { user: { name: string; email?: string; phone?: string | null; role?: string | null; avatar_url?: string | null } | null; bookings: any[]; loading: boolean; onBack: () => void; onNewTrip: () => void; onProfileUpdated: (user: any) => void }) {
  const [tripTab, setTripTab] = useState<'upcoming' | 'used' | 'expired' | 'cancelled'>(() => {
    const tab = new URLSearchParams(location.search).get('tab');
    return tab === 'used' || tab === 'expired' || tab === 'cancelled' ? tab : 'upcoming';
  });
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [accountAction, setAccountAction] = useState('');
  const [bookingAction, setBookingAction] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsDialogRef = useRef<HTMLDialogElement | null>(null);
  useEffect(() => {
    const dialog = settingsDialogRef.current;
    if (!dialog) return;
    if (settingsOpen && !dialog.open) dialog.showModal();
    if (!settingsOpen && dialog.open) dialog.close();
  }, [settingsOpen]);
  const profileDirty = name.trim() !== (user?.name ?? '') || phone !== (user?.phone ?? '');
  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) { setMessage('Enter your full name.'); return; }
    if (phone && !/^[+\d\s().-]{7,40}$/.test(phone)) { setMessage('Enter a valid phone number.'); return; }
    if (!profileDirty) return;
    setSaving(true); setMessage('Saving profile…');
    try {
      const payload = await api('/auth/profile', { method: 'PATCH', body: JSON.stringify({ name, phone }) });
      const next = payload.user ?? payload.data?.user ?? payload;
      onProfileUpdated(next); setMessage('Profile saved.');
    } catch (caught) { setMessage((caught as Error).message); } finally { setSaving(false); }
  };
  const uploadPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const photo = event.target.files?.[0]; if (!photo) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(photo.type) || photo.size > 5 * 1024 * 1024) { setMessage('Choose a JPG, PNG or WebP image under 5 MB.'); return; }
    setSaving(true); setMessage('Uploading photo…');
    try { const form = new FormData(); form.append('photo', photo); const payload = await api('/auth/profile/photo', { method: 'POST', body: form }); onProfileUpdated(payload.data?.user ?? payload.user ?? payload); setMessage('Photo saved.'); }
    catch (caught) { setMessage((caught as Error).message); } finally { setSaving(false); }
  };
  const signOut = () => {
    sessionStorage.removeItem(TOKEN);
    sessionStorage.removeItem(AUTH_USER);
    sessionStorage.removeItem(GUEST_TOKEN);
    location.href = '/website/';
  };
  const deleteAccount = async () => {
    if (!window.confirm('Delete your Encore Transport account? This cannot be undone.')) return;
    setAccountAction('Deleting account…');
    try {
      await api('/auth/profile', { method: 'DELETE' });
      sessionStorage.removeItem(TOKEN);
      sessionStorage.removeItem(AUTH_USER);
      location.href = '/website/';
    } catch (caught) {
      setAccountAction((caught as Error).message || 'Unable to delete the account.');
    }
  };
  return (
    <div className="account-screen">
      <PageHead eyebrow="MY TRIP" title="Your bookings in one place." onBack={onBack} />
      <section className="account-hero">
        <div className="account-identity">
          <span className="account-avatar">{user?.avatar_url ? <img src={user.avatar_url} alt="" onLoad={(event) => { event.currentTarget.style.opacity = '1'; const fallback = event.currentTarget.nextElementSibling as HTMLElement | null; if (fallback) fallback.hidden = true; }} onError={(event) => { event.currentTarget.hidden = true; const fallback = event.currentTarget.nextElementSibling as HTMLElement | null; if (fallback) fallback.hidden = false; }} /> : null}<b>{(user?.name ?? 'Passenger').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</b></span>
          <div><span>Signed in as</span><strong>{user?.name ?? 'Passenger'}</strong><small>{user?.email ?? 'Verified account'}</small></div>
        </div>
        <p>Review tickets you have bought, trips already used and reservations still waiting for travel.</p>
        <button type="button" className="account-settings-trigger" onClick={() => { const update = () => setSettingsOpen(true); if ('startViewTransition' in document) (document as Document & { startViewTransition?: (callback: () => void) => unknown }).startViewTransition?.(update); else update(); }} aria-label="Open account settings" aria-haspopup="dialog"><ActionIcon name="settings" /><span>Settings</span></button>
      </section>
      {<dialog ref={settingsDialogRef} className="account-settings-dialog" aria-labelledby="profileSettingsTitle" onClose={() => setSettingsOpen(false)} onCancel={() => setSettingsOpen(false)}>
          <div className="account-settings-dialog__head"><div><span className="account-panel-label">ACCOUNT SETTINGS</span><h2 id="profileSettingsTitle">Make your account yours.</h2></div><button type="button" className="account-settings-close" onClick={() => setSettingsOpen(false)} aria-label="Close account settings">×</button></div>
          <section className="account-profile-panel" aria-label="Profile settings">
            <div className="settings-photo-card">
              <div className="settings-card-heading"><span className="account-panel-label">PROFILE PHOTO</span><strong>Make it yours</strong><small>JPG, PNG or WebP · max 5 MB</small></div>
              <div className="settings-avatar">{user?.avatar_url ? <img src={user.avatar_url} alt="" onError={(event) => { event.currentTarget.hidden = true; const fallback = event.currentTarget.nextElementSibling as HTMLElement | null; if (fallback) fallback.hidden = false; }} /> : null}<b hidden={Boolean(user?.avatar_url)}>{(user?.name ?? 'Passenger').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</b><label htmlFor="profilePhotoInput" className="settings-avatar-camera" aria-label="Change profile photo"><ActionIcon name="settings" /></label></div>
              <label htmlFor="profilePhotoInput" className="profile-photo-button">{user?.avatar_url ? 'Change photo' : 'Add photo'}</label><input id="profilePhotoInput" type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadPhoto} />
            </div>
            <form onSubmit={saveProfile} className="account-profile-form"><div className="profile-fields"><label><span>Full name</span><input value={name} onChange={(event) => setName(event.target.value)} required maxLength={150} /></label><label><span>Phone number</span><input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" maxLength={40} /></label>{user?.email && <label><span>Email</span><input value={user.email} readOnly /></label>}{user?.role && <label><span>Account role</span><input value={user.role} readOnly /></label>}<div className="profile-form-actions"><button type="submit" className="button button--primary" disabled={saving || !profileDirty}>{saving ? 'Saving…' : 'Save changes'}</button><small aria-live="polite">{message || (profileDirty ? 'Unsaved changes' : 'All changes saved')}</small></div></div></form>
          </section>
          <section className="account-security-panel" aria-label="Account actions">
        <div><span className="account-panel-label">ACCOUNT ACCESS</span><h2>Keep control of your account.</h2><p>Sign out on shared devices or permanently remove your profile when you no longer need it.</p></div>
        <div className="account-security-actions"><button type="button" className="button button--ghost" onClick={signOut}>Sign out</button><button type="button" className="button button--danger" onClick={deleteAccount}>Delete account</button></div>
        <small aria-live="polite">{accountAction}</small>
          </section>
      </dialog>}
      <div className="account-section-heading"><span className="account-panel-label">MY TRIPS</span><h2>Tickets and journey history</h2></div>
      <div className="account-trip-tabs" role="tablist" aria-label="Trip history"><button className={tripTab === 'upcoming' ? 'is-active' : ''} onClick={() => setTripTab('upcoming')} role="tab">Upcoming</button><button className={tripTab === 'used' ? 'is-active' : ''} onClick={() => setTripTab('used')} role="tab">Used</button><button className={tripTab === 'expired' ? 'is-active' : ''} onClick={() => setTripTab('expired')} role="tab">Expired</button><button className={tripTab === 'cancelled' ? 'is-active' : ''} onClick={() => setTripTab('cancelled')} role="tab">Cancelled</button></div>
      {loading ? <div className="smart-banner"><b>Loading your bookings…</b></div> : !bookings.length ? (
        <div className="smart-banner"><b>No bookings yet.</b><span>Search a departure to create your first ticket.</span><button type="button" className="button button--primary" onClick={onNewTrip}>Find a trip</button></div>
      ) : (
        <div className="account-bookings">
          {bookings.filter((booking) => {
            const status = String(booking.status ?? '').toLowerCase();
            const used = ['completed', 'used', 'boarded'].includes(status);
            const expired = ['expired', 'no_show'].includes(status) || (!used && booking.trip?.departure_date && new Date(`${booking.trip.departure_date}T${booking.trip.departure_time ?? '23:59'}`) < new Date());
            const cancelled = ['cancelled', 'refunded'].includes(status);
            return tripTab === 'used' ? used : tripTab === 'expired' ? expired && !cancelled : tripTab === 'cancelled' ? cancelled : !used && !expired && !cancelled;
          }).map((booking) => {
            const status = String(booking.status ?? '').toLowerCase();
            const used = ['completed', 'used', 'boarded'].includes(status);
            const route = typeof booking.route === 'string' ? booking.route : booking.route?.origin && booking.route?.destination ? `${booking.route.origin} → ${booking.route.destination}` : typeof booking.trip?.route === 'string' ? booking.trip.route : booking.trip?.route?.origin && booking.trip?.route?.destination ? `${booking.trip.route.origin} → ${booking.trip.route.destination}` : 'Encore Transport journey';
            const reference = booking.reference ?? 'Booking #' + booking.id;
            const shareBooking = async () => {
              const text = `${reference} · ${route}`;
              try {
                if (navigator.share) await navigator.share({ title: 'Encore Transport journey', text });
                else await navigator.clipboard.writeText(text);
                setBookingAction('Journey details ready to share.');
              } catch { /* user cancelled the native share sheet */ }
            };
            const copyReference = async () => {
              try { await navigator.clipboard.writeText(reference); setBookingAction('Booking reference copied.'); }
              catch { setBookingAction('Copy is unavailable in this browser.'); }
            };
            return <article key={booking.id} className="account-booking"><div><span>{used ? 'USED TICKET' : 'RESERVATION'}</span><h3>{reference}</h3><p>{route}</p><div className="account-booking__actions"><button type="button" onClick={copyReference}>Copy reference</button><button type="button" onClick={shareBooking}>Share journey</button></div></div><strong className={'account-booking__status account-booking__status--' + (used ? 'used' : status)}>{used ? 'Travel completed' : booking.status ?? 'Active'}</strong></article>;
          })}
          {!bookings.some((booking) => { const status = String(booking.status ?? '').toLowerCase(); return tripTab === 'used' ? ['completed', 'used', 'boarded'].includes(status) : tripTab === 'cancelled' ? ['cancelled', 'refunded'].includes(status) : tripTab === 'expired' ? ['expired', 'no_show'].includes(status) : !['completed', 'used', 'boarded', 'expired', 'no_show', 'cancelled', 'refunded'].includes(status); }) && <div className="smart-banner"><b>No {tripTab} trips.</b><span>Choose another section or plan a new journey.</span><button type="button" className="button button--primary" onClick={onNewTrip}>Find a trip</button></div>}
        </div>
      )}
      <small className="account-action-message" aria-live="polite">{bookingAction}</small>
    </div>
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
  routes,
  setFilters,
  onSearch,
  loading,
}: {
  filters: any;
  routes: ApiRoute[];
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
        <PointField
          label="From"
          value={filters.origin}
          options={[...new Set(routes.flatMap((route) => route.stops?.length ? route.stops.map((stop) => stop.name) : [route.origin]))]}
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
          <ActionIcon name="swap" />
        </button>

        <PointField
          label="To"
          value={filters.destination}
          options={[...new Set(routes.filter((route) => !filters.origin || route.stops?.some((stop) => stop.name === filters.origin) || route.origin === filters.origin).flatMap((route) => {
            if (route.segments?.length && filters.origin) return route.segments.filter((segment) => segment.origin === filters.origin && segment.active !== false).map((segment) => segment.destination);
            if (route.stops?.length && filters.origin) {
              const start = route.stops.findIndex((stop) => stop.name === filters.origin);
              return start >= 0 ? route.stops.slice(start + 1).map((stop) => stop.name) : [];
            }
            return route.stops?.length ? route.stops.slice(1).map((stop) => stop.name) : [route.destination];
          }))]}
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
          <ActionIcon name="search" />{loading ? 'SEARCHING…' : 'SEARCH DEPARTURES'}
        </button>
      </form>
    </>
  );
}

function PointField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} required>
        <option value="">Select point</option>
        {options.map((point) => <option key={point} value={point}>{point}</option>)}
      </select>
    </label>
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
        <ActionIcon name="back" />BACK
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
  const [sort, setSort] = useState<'departure' | 'price' | 'availability'>('departure');
  const orderedTrips = useMemo(() => [...trips].sort((left, right) => {
    if (sort === 'price') return Number(left.baseFare ?? 0) - Number(right.baseFare ?? 0);
    if (sort === 'availability') return Number(right.availableSeats ?? 0) - Number(left.availableSeats ?? 0);
    return String(left.departureTime ?? '').localeCompare(String(right.departureTime ?? ''));
  }), [sort, trips]);

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
        <>
          <div className="results-toolbar" aria-label="Departure result controls">
            <span><strong>{trips.length}</strong> departure{trips.length === 1 ? '' : 's'} found</span>
            <label>Sort by
              <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}>
                <option value="departure">Earliest departure</option>
                <option value="price">Lowest fare</option>
                <option value="availability">Most seats available</option>
              </select>
            </label>
          </div>
          <div className="departures">
          {orderedTrips.map((trip) => (
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
                  <ActionIcon name="arrow" />SELECT
                </button>
              </aside>
            </article>
          ))}
          </div>
        </>
      )}
    </>
  );
}

function JourneyMap({ trip }: { trip: ApiTrip }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [mapError, setMapError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let observer: IntersectionObserver | null = null;

    const loadMap = async () => {
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
    };

    if ('IntersectionObserver' in window && ref.current) {
      observer = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer?.disconnect();
        void loadMap();
      }, { rootMargin: '240px 0px' });
      observer.observe(ref.current);
    } else {
      void loadMap();
    }

    return () => {
      cancelled = true;
      observer?.disconnect();
      if (ref.current) destroyRealMap(ref.current);
    };
  }, [trip.id, trip.origin, trip.destination]);

  return (
    <section className="trip-map-card">
      <div className="trip-map-card__head">
        <div>
          <span className="eyebrow">ROUTE MAP</span>
          <h2>Route and streets</h2>
        </div>
        <span className="trip-map-card__provider">Live route</span>
      </div>

      {mapError && (
        <div className="smart-banner smart-banner--error">
          <b>Route map unavailable</b>
          <span>{mapError}</span>
        </div>
      )}

      <div ref={ref} className="passenger-real-map">
        <div className="encore-map-fallback" aria-live="polite">
          <div><strong>Loading route map…</strong><span>Preparing the current route.</span></div>
        </div>
      </div>
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
            <span>Trip total</span>
            <strong>
              {money(
                quote?.total ?? 0,
                quote?.currency ?? 'GYD',
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
  accountUser,
  onBack,
  onReserve,
  onGoogleSignIn,
}: {
  trip: ApiTrip;
  seatLabels: string[];
  passengers: Passenger[];
  quote: Quote | null;
  loading: boolean;
  accountUser: { name: string; email?: string } | null;
  onBack: () => void;
  onReserve: (registration?: RegistrationDetails) => void;
  onGoogleSignIn: (credential: string) => void;
}) {
  const signed = Boolean(sessionStorage.getItem(TOKEN));
  const [checkoutMode, setCheckoutMode] = useState<'guest' | 'register'>('guest');
  const [registrationError, setRegistrationError] = useState('');

  useEffect(() => {
    const target = document.querySelector('#checkoutGoogleSignIn');
    const clientId = document.querySelector('meta[name="google-client-id"]')?.getAttribute('content');
    if (!target || !clientId || signed) return;
    const render = () => {
      const google = (window as any).google;
      if (!google?.accounts?.id) return false;
      google.accounts.id.initialize({ client_id: clientId, callback: ({ credential }: { credential: string }) => onGoogleSignIn(credential) });
      google.accounts.id.renderButton(target, { theme: 'outline', size: 'large', width: 360, text: 'continue_with' });
      return true;
    };
    if (!render()) {
      const timer = window.setInterval(() => { if (render()) window.clearInterval(timer); }, 250);
      return () => window.clearInterval(timer);
    }
  }, [signed, onGoogleSignIn]);

  const submitRegistration = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') ?? '');
    const confirmation = String(form.get('password_confirmation') ?? '');
    if (password !== confirmation) {
      setRegistrationError('Passwords do not match.');
      return;
    }
    setRegistrationError('');
    onReserve({
      name: String(form.get('name') ?? '').trim(),
      email: String(form.get('email') ?? '').trim(),
      phone: String(form.get('phone') ?? '').trim(),
      password,
      password_confirmation: confirmation,
    });
  };

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

          <section className="checkout-account" aria-label="Checkout account options">
            <h3>{signed ? 'Booking with your account' : 'Choose how to continue'}</h3>
            {signed ? (
              <div className="smart-banner"><b>{accountUser?.name ?? 'Signed in'}</b><span>{accountUser?.email ?? 'This booking will be saved in your account.'}</span></div>
            ) : (
              <div className="checkout-choice" role="radiogroup" aria-label="Account choice">
                <button type="button" role="radio" aria-checked={checkoutMode === 'guest'} className={checkoutMode === 'guest' ? 'is-selected' : ''} onClick={() => setCheckoutMode('guest')}><strong>Continue as guest</strong><span>Reserve without creating a password.</span></button>
                <button type="button" role="radio" aria-checked={checkoutMode === 'register'} className={checkoutMode === 'register' ? 'is-selected' : ''} onClick={() => setCheckoutMode('register')}><strong>Create an account</strong><span>Save your name and view future bookings.</span></button>
              </div>
            )}
            {!signed && <div className="checkout-google"><span>Save this booking securely</span><div id="checkoutGoogleSignIn" aria-label="Continue with Google"></div></div>}
            {!signed && checkoutMode === 'guest' && <p className="checkout-note">Your booking will be linked to a private access code for this session.</p>}
            {!signed && checkoutMode === 'register' && (
              <form className="checkout-register" onSubmit={submitRegistration}>
                <label><span>Full name</span><input name="name" required maxLength={150} defaultValue={passengers[0]?.full_name ?? ''} autoComplete="name" /></label>
                <label><span>Email</span><input name="email" type="email" required maxLength={190} defaultValue={passengers[0]?.email ?? ''} autoComplete="email" /></label>
                <label><span>Phone (optional)</span><input name="phone" maxLength={40} defaultValue={passengers[0]?.phone ?? ''} autoComplete="tel" /></label>
                <label><span>Password</span><input name="password" type="password" required minLength={8} autoComplete="new-password" /></label>
                <label><span>Confirm password</span><input name="password_confirmation" type="password" required minLength={8} autoComplete="new-password" /></label>
                {registrationError && <p className="checkout-register__error" role="alert">{registrationError}</p>}
                <button className="primary wide" disabled={loading}>{loading ? 'CREATING ACCOUNT…' : 'CREATE ACCOUNT & RESERVE →'}</button>
              </form>
            )}
          </section>
        </div>

        <aside className="total-panel">
            <span>TRIP TOTAL</span>
          <strong>
            {money(
              quote?.total ?? 0,
              quote?.currency ?? 'GYD',
            )}
          </strong>
          <small>
            Calculated and validated before the reservation is created.
          </small>

          {(signed || checkoutMode === 'guest') && <button className="primary" disabled={loading} onClick={() => onReserve()}>{loading ? 'RESERVING…' : signed ? 'RESERVE WITH ACCOUNT →' : 'CONTINUE AS GUEST →'}</button>}
        </aside>
      </div>
    </>
  );
}

function Status({
  booking,
  trip,
  seats,
  loading = false,
  onCancel,
  onNew,
}: {
  booking: Booking | null;
  trip: ApiTrip | null;
  seats: string[];
  loading?: boolean;
  onCancel?: () => void;
  onNew: () => void;
}) {
  const isHeld = booking?.status === 'pending_payment' || booking?.status === 'held';

  return (
    <>
      <div className="confirmation">
        <div>✓</div>
        <h2>
          {isHeld
            ? 'Your seats are being held.'
            : 'Booking status updated.'}
        </h2>
        <p>
          Online payment is temporarily unavailable. Your booking has been
          held while payment options are being finalized.
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
          <span>TRIP TOTAL</span>
          <strong>{money(Number(booking?.total_amount ?? 0))}</strong>
        </div>
        <div className="action-band__actions">
          {isHeld && onCancel && (
            <button
              type="button"
              className="ghost danger"
              disabled={loading}
              onClick={onCancel}
            >
              {loading ? 'CANCELLING…' : 'CANCEL HOLD'}
            </button>
          )}
          <button className="primary" onClick={onNew}>
            NEW SEARCH
          </button>
        </div>
      </div>
    </>
  );
}
