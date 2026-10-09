import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, Polyline, UrlTile } from 'react-native-maps';

type Trip = {
  id: number | string;
  origin: string;
  destination: string;
  date: string;
  departureTime: string;
  arrivalTime: string;
  availableSeats: number;
  baseFare: number;
  status: string;
  busCode?: string;
};

type Seat = {
  id: number;
  seat_number: string;
  row_number?: number | null;
  position_index?: number | null;
  accessible?: boolean;
  blocked?: boolean;
  available: boolean;
};

type Journey = {
  origin: { name?: string; latitude: number; longitude: number };
  destination: { name?: string; latitude: number; longitude: number };
  route: {
    distanceMeters: number;
    durationSeconds: number;
    points: { latitude: number; longitude: number }[];
  };
};

const API =
  process.env.EXPO_PUBLIC_API_URL ??
  'http://127.0.0.1:8000/api/v1';

const API_ORIGIN = API.replace(/\/api\/v1\/?$/, '');
const TILE_TEMPLATE =
  `${API_ORIGIN}/api/v1/maps/tiles/{z}/{x}/{y}.png?style=street-light`;

const money = (value: number) =>
  `DOP ${Number(value || 0).toLocaleString('en-US')}`;

async function request(
  path: string,
  options: RequestInit = {},
  token = '',
) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = payload?.errors
      ? Object.values(payload.errors).flat().join(' ')
      : payload?.message;

    throw new Error(detail || `API ${response.status}`);
  }

  return payload;
}

export default function App() {
  const [screen, setScreen] = useState<'search' | 'trip' | 'booking' | 'status'>('search');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [journey, setJourney] = useState<Journey | null>(null);
  const [quote, setQuote] = useState<any>(null);
  const [fullName, setFullName] = useState('');
  const [passengerEmail, setPassengerEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedSeat = useMemo(
    () => seats.find((seat) => selected.includes(seat.id)),
    [seats, selected],
  );

  const search = async () => {
    setLoading(true);
    setError('');

    try {
      const query = new URLSearchParams({
        origin,
        destination,
        passengers: '1',
      });

      const payload = await request(`/trips/search?${query}`);
      setTrips(Array.isArray(payload.data) ? payload.data : []);
    } catch (caught) {
      setTrips([]);
      setError(caught instanceof Error ? caught.message : 'Unable to load trips.');
    } finally {
      setLoading(false);
    }
  };

  const openTrip = async (selectedTrip: Trip) => {
    setLoading(true);
    setError('');

    try {
      const routeQuery = new URLSearchParams({
        origin: selectedTrip.origin,
        destination: selectedTrip.destination,
      });

      const [seatPayload, quotePayload, journeyPayload] = await Promise.all([
        request(`/trips/${selectedTrip.id}/seats`),
        request(`/trips/${selectedTrip.id}/quote?passengers=1`),
        request(`/maps/journey?${routeQuery}`),
      ]);

      setTrip(selectedTrip);
      setSeats(seatPayload.data ?? []);
      setQuote(quotePayload.data ?? quotePayload);
      setJourney(journeyPayload.data ?? journeyPayload);
      setSelected([]);
      setScreen('trip');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to open trip.');
    } finally {
      setLoading(false);
    }
  };

  const createBooking = async () => {
    if (!trip || !selected.length || !fullName.trim()) return;

    setLoading(true);
    setError('');

    try {
      let currentToken = token;

      if (!currentToken) {
        const loginPayload = await request('/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email: accountEmail,
            password,
          }),
        });

        currentToken = loginPayload.token;
        setToken(currentToken);
      }

      const payload = await request(
        '/bookings',
        {
          method: 'POST',
          body: JSON.stringify({
            trip_id: Number(trip.id),
            seat_ids: selected,
            passengers: [{
              full_name: fullName.trim(),
              email: passengerEmail.trim() || null,
              phone: phone.trim() || null,
            }],
          }),
        },
        currentToken,
      );

      setBooking(payload.data ?? payload);
      setScreen('status');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to create booking.');
    } finally {
      setLoading(false);
    }
  };

  if (screen === 'search') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>encore</Text>
            <Text style={styles.brandSub}>TRANSPORT · PASSENGER</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.wrap}>
          <Text style={styles.eyebrow}>REAL TRIP SEARCH</Text>
          <Text style={styles.title}>Where are you going?</Text>
          <Text style={styles.copy}>
            Search current departures and continue with actual seat availability.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Origin"
            value={origin}
            onChangeText={setOrigin}
          />
          <TextInput
            style={styles.input}
            placeholder="Destination"
            value={destination}
            onChangeText={setDestination}
          />

          <TouchableOpacity
            style={styles.button}
            onPress={search}
            disabled={loading || !origin.trim() || !destination.trim()}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Searching…' : 'Search trips'}
            </Text>
          </TouchableOpacity>

          {loading && <ActivityIndicator />}
          {!!error && <Text style={styles.error}>{error}</Text>}

          {trips.map((item) => (
            <TouchableOpacity
              key={String(item.id)}
              style={styles.card}
              onPress={() => openTrip(item)}
            >
              <Text style={styles.cardKicker}>TRIP {item.id}</Text>
              <Text style={styles.cardTitle}>
                {item.origin} → {item.destination}
              </Text>
              <Text>{item.date} · {item.departureTime} - {item.arrivalTime}</Text>
              <Text>{item.availableSeats} seats · {money(item.baseFare)}</Text>
              <Text style={styles.link}>View trip →</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'trip' && trip) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.wrap}>
          <TouchableOpacity onPress={() => setScreen('search')}>
            <Text style={styles.link}>← Back to departures</Text>
          </TouchableOpacity>

          <Text style={styles.eyebrow}>TRIP {trip.id}</Text>
          <Text style={styles.title}>{trip.origin} → {trip.destination}</Text>
          <Text style={styles.copy}>
            {trip.date} · {trip.departureTime} · {trip.busCode ?? 'Assigned vehicle'}
          </Text>

          {journey && (
            <MapView
              style={styles.map}
              mapType="none"
              initialRegion={{
                latitude: journey.origin.latitude,
                longitude: journey.origin.longitude,
                latitudeDelta: Math.max(
                  0.05,
                  Math.abs(journey.origin.latitude - journey.destination.latitude) * 1.6,
                ),
                longitudeDelta: Math.max(
                  0.05,
                  Math.abs(journey.origin.longitude - journey.destination.longitude) * 1.6,
                ),
              }}
            >
              <UrlTile urlTemplate={TILE_TEMPLATE} maximumZ={22} />
              <Marker
                coordinate={{
                  latitude: journey.origin.latitude,
                  longitude: journey.origin.longitude,
                }}
                title={journey.origin.name ?? trip.origin}
              />
              <Marker
                coordinate={{
                  latitude: journey.destination.latitude,
                  longitude: journey.destination.longitude,
                }}
                title={journey.destination.name ?? trip.destination}
                pinColor="#1f9d74"
              />
              {journey.route.points.length > 1 && (
                <Polyline
                  coordinates={journey.route.points}
                  strokeWidth={5}
                  strokeColor="#1f9d74"
                />
              )}
            </MapView>
          )}

          <View style={styles.row}>
            <View style={styles.metric}>
              <Text style={styles.muted}>Server total</Text>
              <Text style={styles.metricValue}>{money(quote?.total ?? 0)}</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.muted}>Available</Text>
              <Text style={styles.metricValue}>
                {seats.filter((seat) => seat.available && !seat.blocked).length}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Choose one seat</Text>

          <View style={styles.seatGrid}>
            {seats.map((seat) => {
              const isSelected = selected.includes(seat.id);
              const unavailable = !seat.available || seat.blocked;

              return (
                <TouchableOpacity
                  key={seat.id}
                  style={[
                    styles.seat,
                    unavailable && styles.seatUnavailable,
                    isSelected && styles.seatSelected,
                  ]}
                  disabled={unavailable}
                  onPress={() => setSelected(
                    isSelected ? [] : [seat.id],
                  )}
                >
                  <Text style={[
                    styles.seatText,
                    isSelected && styles.seatTextSelected,
                  ]}>
                    {seat.seat_number}
                    {seat.accessible ? ' ♿' : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.button}
            disabled={!selected.length}
            onPress={() => setScreen('booking')}
          >
            <Text style={styles.buttonText}>Continue →</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'booking' && trip) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.wrap}>
          <TouchableOpacity onPress={() => setScreen('trip')}>
            <Text style={styles.link}>← Back to seats</Text>
          </TouchableOpacity>

          <Text style={styles.eyebrow}>PASSENGER DETAILS</Text>
          <Text style={styles.title}>Review and hold your seat.</Text>

          <View style={styles.summary}>
            <Text style={styles.summaryStrong}>{trip.origin} → {trip.destination}</Text>
            <Text>Seat {selectedSeat?.seat_number ?? '—'}</Text>
            <Text>{money(quote?.total ?? 0)}</Text>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Passenger full name"
            value={fullName}
            onChangeText={setFullName}
          />
          <TextInput
            style={styles.input}
            placeholder="Passenger email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={passengerEmail}
            onChangeText={setPassengerEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Phone"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />

          {!token && (
            <View style={styles.authBox}>
              <Text style={styles.sectionTitle}>Account</Text>
              <Text style={styles.copy}>
                Sign in before the booking is created. Your selected seat stays on this screen.
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Account email"
                autoCapitalize="none"
                keyboardType="email-address"
                value={accountEmail}
                onChangeText={setAccountEmail}
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>
          )}

          {!!error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={styles.button}
            disabled={
              loading ||
              !fullName.trim() ||
              (!token && (!accountEmail.trim() || !password))
            }
            onPress={createBooking}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Creating booking…' : 'Hold seat / create booking'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.wrap}>
        <Text style={styles.eyebrow}>BOOKING STATUS</Text>
        <Text style={styles.title}>Your reservation was created.</Text>

        <View style={styles.summary}>
          <Text style={styles.summaryStrong}>
            {booking?.reference ?? `Booking ${booking?.id ?? ''}`}
          </Text>
          <Text>Status: {booking?.status ?? 'unknown'}</Text>
          <Text>Seat: {selectedSeat?.seat_number ?? '—'}</Text>
          <Text>Server total: {money(Number(booking?.total_amount ?? 0))}</Text>
        </View>

        <Text style={styles.copy}>
          No payment success is simulated. A final ticket is available only after
          a configured payment provider verifies the transaction.
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            setScreen('search');
            setTrip(null);
            setSeats([]);
            setSelected([]);
            setBooking(null);
          }}
        >
          <Text style={styles.buttonText}>New search</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#eef4f7',
  },
  header: {
    marginHorizontal: 14,
    marginTop: 10,
    paddingHorizontal: 18,
    paddingVertical: 13,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dce5ea',
    borderRadius: 18,
    shadowColor: '#071722',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  wrap: {
    padding: 18,
    gap: 12,
    paddingBottom: 48,
  },
  brand: {
    fontSize: 26,
    fontWeight: '900',
    color: '#071722',
    letterSpacing: -1.2,
  },
  brandSub: {
    marginTop: 2,
    fontSize: 9,
    fontWeight: '800',
    color: '#71838f',
    letterSpacing: 1.8,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '900',
    color: '#138bc1',
    letterSpacing: 1.6,
  },
  title: {
    maxWidth: 520,
    fontSize: 34,
    lineHeight: 36,
    fontWeight: '900',
    color: '#071722',
    letterSpacing: -1.1,
  },
  copy: {
    color: '#617381',
    lineHeight: 21,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cfdce3',
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: '#0d1c28',
  },
  button: {
    backgroundColor: '#0b2232',
    paddingVertical: 16,
    borderRadius: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '900',
  },
  error: {
    color: '#8c2f2f',
    backgroundColor: '#fff5f6',
    borderWidth: 1,
    borderColor: '#efc4c9',
    borderRadius: 12,
    padding: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dce5ea',
    borderRadius: 18,
    padding: 17,
    marginTop: 5,
    gap: 6,
    shadowColor: '#071722',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 7 },
    elevation: 2,
  },
  cardKicker: {
    color: '#138bc1',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.3,
  },
  cardTitle: {
    fontWeight: '900',
    fontSize: 19,
    color: '#071722',
    letterSpacing: -0.4,
  },
  link: {
    color: '#138bc1',
    fontWeight: '900',
  },
  map: {
    height: 320,
    borderRadius: 18,
    overflow: 'hidden',
    marginVertical: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  metric: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dce5ea',
    borderRadius: 15,
    padding: 15,
  },
  muted: {
    color: '#7a8a95',
    fontSize: 11,
    fontWeight: '700',
  },
  metricValue: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: '900',
    color: '#071722',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#071722',
    marginTop: 8,
  },
  seatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  seat: {
    minWidth: 60,
    paddingHorizontal: 10,
    paddingVertical: 15,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#c8d6de',
    borderRadius: 12,
    alignItems: 'center',
  },
  seatUnavailable: {
    backgroundColor: '#e7ecef',
    borderColor: '#dce3e7',
  },
  seatSelected: {
    backgroundColor: '#1f9d74',
    borderColor: '#1f9d74',
  },
  seatText: {
    fontWeight: '900',
    color: '#071722',
  },
  seatTextSelected: {
    color: '#ffffff',
  },
  authBox: {
    backgroundColor: '#eaf6fb',
    borderWidth: 1,
    borderColor: '#cfe6f0',
    borderRadius: 18,
    padding: 15,
    gap: 10,
  },
  summary: {
    backgroundColor: '#071722',
    borderRadius: 18,
    padding: 18,
    gap: 7,
  },
  summaryStrong: {
    fontSize: 19,
    fontWeight: '900',
    color: '#ffffff',
  },
});
