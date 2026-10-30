import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, Polyline, UrlTile } from 'react-native-maps';
import * as SecureStore from 'expo-secure-store';
import { formatCurrency } from '@encore/domain';
import { requestJson } from '@encore/api-client';

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
type RouteOption = { origin: string; destination: string; stops?: { name: string }[]; segments?: { origin: string; destination: string; active?: boolean }[] };
type PassengerDetails = { full_name: string; document_number: string; email: string; phone: string };

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
const AUTH_TOKEN_KEY = 'encore_passenger_api_token';

const money = (value: number) => formatCurrency(value);

function statusLabel(status: string | null | undefined) {
  const labels: Record<string, string> = {
    draft: 'Borrador',
    held: 'Reservado temporalmente',
    pending_payment: 'Pendiente de pago',
    confirmed: 'Confirmada',
    cancelled: 'Cancelada',
    expired: 'Vencida',
    failed: 'Fallido',
    processing: 'En proceso',
    pending: 'Pendiente',
    issued: 'Emitido',
    scheduled: 'Programado',
    boarding: 'Abordaje',
    in_progress: 'En curso',
    completed: 'Completado',
  };
  return status ? labels[status] ?? status.replaceAll('_', ' ') : 'Sin estado';
}

function userFacingError(error: unknown, fallback: string) {
  if (error instanceof Error && /[áéíóúñ¿¡]/i.test(error.message)) {
    return error.message;
  }
  return fallback;
}

function localCalendarDate() {
  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  return today.toISOString().slice(0, 10);
}

async function request(
  path: string,
  options: RequestInit = {},
  token = '',
) {
  return requestJson<any>(API, path, options, { token });
}

export default function App() {
  const [screen, setScreen] = useState<'search' | 'trip' | 'booking' | 'status' | 'bookings' | 'ticket'>('search');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [travelDate, setTravelDate] = useState(localCalendarDate);
  const [passengerCount, setPassengerCount] = useState(1);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [journey, setJourney] = useState<Journey | null>(null);
  const [mapMessage, setMapMessage] = useState('');
  const [quote, setQuote] = useState<any>(null);
  const [passengers, setPassengers] = useState<PassengerDetails[]>([{ full_name: '', document_number: '', email: '', phone: '' }]);
  const [accountEmail, setAccountEmail] = useState('');
  const [accountName, setAccountName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [token, setToken] = useState('');
  const [booking, setBooking] = useState<any>(null);
  const [bookingPayments, setBookingPayments] = useState<any[]>([]);
  const [paymentMessage, setPaymentMessage] = useState('');
  const paymentIdempotencyKeys = useRef(new Map<string, string>());
  const [bookings, setBookings] = useState<any[]>([]);
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void request('/routes').then((payload) => setRoutes(payload.data ?? payload ?? [])).catch(() => setError('No se pudieron cargar las rutas.'));
  }, []);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const savedToken = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
        if (!savedToken) return;
        await request('/auth/me', {}, savedToken);
        if (mounted) setToken(savedToken);
      } catch {
        await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY).catch(() => {});
      }
    })();
    return () => { mounted = false; };
  }, []);

  const origins = [...new Set(routes.flatMap((route) => route.stops?.length ? route.stops.map((stop) => stop.name) : [route.origin]))];
  const destinations = [...new Set(routes.filter((route) => !origin || route.stops?.some((stop) => stop.name === origin) || route.origin === origin).flatMap((route) => {
    if (route.segments?.length && origin) return route.segments.filter((segment) => segment.origin === origin && segment.active !== false).map((segment) => segment.destination);
    if (route.stops?.length && origin) {
      const start = route.stops.findIndex((stop) => stop.name === origin);
      return start >= 0 ? route.stops.slice(start + 1).map((stop) => stop.name) : [];
    }
    return route.stops?.length ? route.stops.slice(1).map((stop) => stop.name) : [route.destination];
  }))];

  const selectedSeat = useMemo(
    () => seats.find((seat) => selected.includes(seat.id)),
    [seats, selected],
  );

  const search = async () => {
    setLoading(true);
    setError('');
    setHasSearched(true);

    try {
      const query = new URLSearchParams({
        origin,
        destination,
        passengers: String(passengerCount),
      });
      if (travelDate) query.set('date', travelDate);

      const parsedDate = new Date(`${travelDate}T00:00:00`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(travelDate) || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== travelDate) {
        throw new Error('Escribe la fecha con el formato AAAA-MM-DD.');
      }

      const payload = await request(`/trips/search?${query}`);
      setTrips(Array.isArray(payload.data) ? payload.data : []);
      setError('');
    } catch (caught) {
      setTrips([]);
      setError(userFacingError(caught, 'No se pudieron cargar las salidas.'));
    } finally {
      setLoading(false);
    }
  };

  const openTrip = async (selectedTrip: Trip) => {
    setLoading(true);
    setError('');

    try {
      const routeQuery = new URLSearchParams({ origin, destination });
      routeQuery.set('passengers', String(passengerCount));

      const [seatPayload, quotePayload] = await Promise.all([
        request(`/trips/${selectedTrip.id}/seats?${routeQuery}`),
        request(`/trips/${selectedTrip.id}/quote?${routeQuery}`),
      ]);
      let journeyData: Journey | null = null;
      let nextMapMessage = '';
      try {
        const journeyPayload = await request(`/maps/journey?${routeQuery}`);
        const result = journeyPayload.data ?? journeyPayload;
        const originLatitude = Number(result?.origin?.latitude);
        const originLongitude = Number(result?.origin?.longitude);
        const destinationLatitude = Number(result?.destination?.latitude);
        const destinationLongitude = Number(result?.destination?.longitude);
        if ([originLatitude, originLongitude, destinationLatitude, destinationLongitude].every(Number.isFinite)) {
          journeyData = {
            ...result,
            origin: { ...result.origin, latitude: originLatitude, longitude: originLongitude },
            destination: { ...result.destination, latitude: destinationLatitude, longitude: destinationLongitude },
            route: { ...(result.route ?? {}), points: Array.isArray(result.route?.points) ? result.route.points : [] },
          };
        } else {
          nextMapMessage = 'El mapa no está disponible ahora. Puedes elegir tus asientos y reservar de todos modos.';
        }
      } catch {
        nextMapMessage = 'El mapa no está disponible ahora. Puedes elegir tus asientos y reservar de todos modos.';
      }

      setTrip(selectedTrip);
      setSeats(seatPayload.data ?? []);
      setQuote(quotePayload.data ?? quotePayload);
      setJourney(journeyData);
      setMapMessage(nextMapMessage);
      setSelected([]);
      setPassengers((current) => Array.from({ length: passengerCount }, (_, index) => current[index] ?? { full_name: '', document_number: '', email: '', phone: '' }));
      setScreen('trip');
    } catch (caught) {
      setError(userFacingError(caught, 'No se pudo abrir esta salida.'));
    } finally {
      setLoading(false);
    }
  };

  const createBooking = async () => {
    if (!trip || selected.length !== passengerCount || passengers.some((passenger) => !passenger.full_name.trim())) return;

    setLoading(true);
    setError('');

    try {
      let currentToken = token;

      if (!currentToken) {
        const authPayload = await request(authMode === 'register' ? '/auth/register' : '/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            ...(authMode === 'register' ? { name: accountName.trim(), phone: passengers[0]?.phone || null, password_confirmation: passwordConfirmation } : {}),
            email: accountEmail,
            password,
          }),
        });

        currentToken = authPayload.token;
        await SecureStore.setItemAsync(AUTH_TOKEN_KEY, currentToken);
        setToken(currentToken);
      }

      const payload = await request(
        '/bookings',
        {
          method: 'POST',
          body: JSON.stringify({
            trip_id: Number(trip.id),
            seat_ids: selected,
            passengers: passengers.map((passenger) => ({
              full_name: passenger.full_name.trim(),
              document_number: passenger.document_number.trim() || null,
              email: passenger.email.trim() || null,
              phone: passenger.phone.trim() || null,
            })),
            origin,
            destination,
          }),
        },
        currentToken,
      );

      setBooking(payload.data ?? payload);
      setBookingPayments([]);
      setPaymentMessage('');
      setScreen('status');
    } catch (caught) {
      setError(userFacingError(caught, 'No se pudo crear la reserva. Revisa los datos e inténtalo otra vez.'));
    } finally {
      setLoading(false);
    }
  };

  const loadBookingPayments = async (bookingId: number | string) => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const id = encodeURIComponent(bookingId);
      const [bookingPayload, paymentPayload] = await Promise.all([
        request(`/bookings/${id}`, {}, token),
        request(`/bookings/${id}/payments`, {}, token),
      ]);
      setBooking(bookingPayload.data ?? bookingPayload);
      setBookingPayments(Array.isArray(paymentPayload.data) ? paymentPayload.data : []);
    } catch (caught) {
      setError(userFacingError(caught, 'No se pudo consultar el estado del pago.'));
    } finally {
      setLoading(false);
    }
  };

  const initiateBookingPayment = async () => {
    if (!booking?.id || !token || booking.status !== 'pending_payment') return;
    setLoading(true);
    setError('');
    try {
      const bookingId = String(booking.id);
      const idempotencyKey = paymentIdempotencyKeys.current.get(bookingId)
        ?? `mobile-${bookingId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      paymentIdempotencyKeys.current.set(bookingId, idempotencyKey);
      const payload = await request(`/bookings/${encodeURIComponent(booking.id)}/payments`, {
        method: 'POST',
        body: JSON.stringify({ idempotency_key: idempotencyKey }),
      }, token);
      if (payload.data?.payment) {
        setBookingPayments((current) => [payload.data.payment, ...current.filter((item) => item.id !== payload.data.payment.id)]);
      }
      const checkoutUrl = payload.data?.gateway?.checkout_url;
      if (typeof checkoutUrl === 'string') {
        const parsedCheckoutUrl = new URL(checkoutUrl);
        if (parsedCheckoutUrl.protocol !== 'https:') throw new Error('El proveedor devolvió un enlace de pago no seguro.');
        await Linking.openURL(parsedCheckoutUrl.toString());
        setPaymentMessage('Abrimos el pago seguro. Cuando termines, vuelve aquí para actualizar el estado.');
      } else if (payload.data?.payment?.status === 'processing') {
        setPaymentMessage('El pago está en proceso. Actualiza el estado cuando el proveedor lo confirme.');
      }
      const [bookingPayload, paymentPayload] = await Promise.all([
        request(`/bookings/${encodeURIComponent(booking.id)}`, {}, token),
        request(`/bookings/${encodeURIComponent(booking.id)}/payments`, {}, token),
      ]);
      setBooking(bookingPayload.data ?? bookingPayload);
      setBookingPayments(Array.isArray(paymentPayload.data) ? paymentPayload.data : []);
    } catch (caught) {
      setError(userFacingError(caught, 'No se pudo iniciar el pago. La reserva no figura como pagada.'));
      try {
        const paymentPayload = await request(`/bookings/${encodeURIComponent(booking.id)}/payments`, {}, token);
        setBookingPayments(Array.isArray(paymentPayload.data) ? paymentPayload.data : []);
      } catch {
        // Keep the gateway error visible if payment history cannot be loaded.
      }
    } finally {
      setLoading(false);
    }
  };

  const openBookings = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const payload = await request('/bookings', {}, token);
      setBookings(Array.isArray(payload.data) ? payload.data : []);
      setScreen('bookings');
    } catch (caught) {
      setError(userFacingError(caught, 'No se pudieron cargar tus reservas.'));
    } finally {
      setLoading(false);
    }
  };

  const openTicket = async (bookingId: number | string) => {
    setLoading(true);
    setError('');
    try {
      const payload = await request(`/bookings/${encodeURIComponent(bookingId)}/ticket`, {}, token);
      setTicket(payload.data ?? payload);
      setScreen('ticket');
    } catch (caught) {
      setError(userFacingError(caught, 'Todavía no se ha emitido un boleto para esta reserva.'));
    } finally {
      setLoading(false);
    }
  };

  const cancelReservation = async (bookingId: number | string) => {
    setLoading(true);
    setError('');
    try {
      await request(`/bookings/${encodeURIComponent(bookingId)}/cancel`, { method: 'POST' }, token);
      setBookings((current) => current.map((item) => item.id === bookingId ? { ...item, status: 'cancelled' } : item));
    } catch (caught) {
      setError(userFacingError(caught, 'No se pudo cancelar esta reserva.'));
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
            <Text style={styles.brandSub}>TRANSPORTE · PASAJEROS</Text>
          </View>
          {!!token && <TouchableOpacity onPress={openBookings}><Text style={styles.link}>Mis reservas</Text></TouchableOpacity>}
        </View>

        <ScrollView contentContainerStyle={styles.wrap}>
          <Text style={styles.eyebrow}>BUSCA TU VIAJE</Text>
          <Text style={styles.title}>¿A dónde quieres ir?</Text>
          <Text style={styles.copy}>
            Busca salidas disponibles, elige tus asientos y continúa con tu reserva.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Punto de salida"
            value={origin}
            onChangeText={(value) => { setOrigin(value); setTrips([]); setHasSearched(false); }}
            placeholderTextColor="#75808d"
          />
          <View style={styles.suggestions}>{origins.map((point) => <TouchableOpacity key={point} onPress={() => { setOrigin(point); setDestination(''); setTrips([]); setHasSearched(false); }}><Text style={styles.link}>{point}</Text></TouchableOpacity>)}</View>
          <TextInput
            style={styles.input}
            placeholder="Destino"
            value={destination}
            onChangeText={(value) => { setDestination(value); setTrips([]); setHasSearched(false); }}
          />
          <View style={styles.suggestions}>{destinations.map((point) => <TouchableOpacity key={point} onPress={() => { setDestination(point); setTrips([]); setHasSearched(false); }}><Text style={styles.link}>{point}</Text></TouchableOpacity>)}</View>
          <TextInput style={styles.input} placeholder="Fecha del viaje (AAAA-MM-DD)" value={travelDate} onChangeText={(value) => { setTravelDate(value); setTrips([]); setHasSearched(false); }} />
          <Text style={styles.fieldLabel}>Pasajeros (1–10)</Text>
          <TextInput style={styles.input} placeholder="Cantidad de pasajeros" keyboardType="number-pad" value={String(passengerCount)} onChangeText={(value) => {
            const count = Math.max(1, Math.min(10, Number.parseInt(value, 10) || 1));
            setPassengerCount(count);
            setSelected((current) => current.slice(0, count));
            setTrips([]);
            setHasSearched(false);
          }} />

          <TouchableOpacity
            style={styles.button}
            onPress={search}
            disabled={loading || !origin.trim() || !destination.trim()}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Buscando…' : 'Buscar salidas'}
            </Text>
          </TouchableOpacity>

          {loading && <ActivityIndicator />}
          {!!error && <Text style={styles.error}>{error}</Text>}

          {hasSearched && !loading && !error && trips.length === 0 && <Text style={styles.copy}>No encontramos salidas para esa ruta y fecha. Prueba con otra fecha o destino.</Text>}

          {trips.map((item) => (
            <TouchableOpacity
              key={String(item.id)}
              style={styles.card}
              onPress={() => openTrip(item)}
            >
              <Text style={styles.cardKicker}>VIAJE {item.id}</Text>
              <Text style={styles.cardTitle}>
                {item.origin} → {item.destination}
              </Text>
              <Text>{item.date} · {item.departureTime} - {item.arrivalTime}</Text>
              <Text>{item.availableSeats} asientos · {money(item.baseFare)}</Text>
              <Text style={styles.link}>Ver salida →</Text>
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
            <Text style={styles.link}>← Volver a las salidas</Text>
          </TouchableOpacity>

          <Text style={styles.eyebrow}>VIAJE {trip.id}</Text>
          <Text style={styles.title}>{trip.origin} → {trip.destination}</Text>
          <Text style={styles.copy}>
            {trip.date} · {trip.departureTime} · {trip.busCode ? `Autobús ${trip.busCode}` : 'Autobús asignado'}
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
          {!!mapMessage && <Text style={styles.copy}>{mapMessage}</Text>}

          <View style={styles.row}>
            <View style={styles.metric}>
              <Text style={styles.muted}>Total del viaje</Text>
              <Text style={styles.metricValue}>{money(quote?.total ?? 0)}</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.muted}>Asientos disponibles</Text>
              <Text style={styles.metricValue}>
                {seats.filter((seat) => seat.available && !seat.blocked).length}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Elige {passengerCount} {passengerCount === 1 ? 'asiento' : 'asientos'}</Text>

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
                    isSelected ? selected.filter((id) => id !== seat.id) : selected.length < passengerCount ? [...selected, seat.id] : selected,
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
            disabled={selected.length !== passengerCount}
            onPress={() => setScreen('booking')}
          >
            <Text style={styles.buttonText}>Continuar →</Text>
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
            <Text style={styles.link}>← Volver a los asientos</Text>
          </TouchableOpacity>

          <Text style={styles.eyebrow}>DATOS DE LOS PASAJEROS</Text>
          <Text style={styles.title}>Revisa y reserva tus asientos.</Text>

          <View style={styles.summary}>
            <Text style={styles.summaryStrong}>{trip.origin} → {trip.destination}</Text>
            <Text>Asientos: {seats.filter((seat) => selected.includes(seat.id)).map((seat) => seat.seat_number).join(', ') || '—'}</Text>
            <Text>{money(quote?.total ?? 0)}</Text>
          </View>
          {passengers.map((passenger, index) => (
            <View key={index} style={styles.passengerCard}>
              <Text style={styles.sectionTitle}>Viajero {index + 1}</Text>
              <TextInput style={styles.input} placeholder="Nombre completo" value={passenger.full_name} onChangeText={(value) => setPassengers((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, full_name: value } : item))} />
              <TextInput style={styles.input} placeholder="Documento (opcional)" value={passenger.document_number} onChangeText={(value) => setPassengers((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, document_number: value } : item))} />
              <TextInput style={styles.input} placeholder="Correo electrónico (opcional)" autoCapitalize="none" keyboardType="email-address" value={passenger.email} onChangeText={(value) => setPassengers((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, email: value } : item))} />
              <TextInput style={styles.input} placeholder="Teléfono (opcional)" keyboardType="phone-pad" value={passenger.phone} onChangeText={(value) => setPassengers((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, phone: value } : item))} />
            </View>
          ))}

          {!token && (
            <View style={styles.authBox}>
              <Text style={styles.sectionTitle}>Cuenta</Text>
              <Text style={styles.copy}>{authMode === 'register' ? 'Crea una cuenta para consultar tus reservas y boletos.' : 'Inicia sesión para reservar y consultar tu viaje más adelante.'}</Text>
              {authMode === 'register' && <TextInput style={styles.input} placeholder="Nombre de la cuenta" value={accountName} onChangeText={setAccountName} />}
              <TextInput
                style={styles.input}
                placeholder="Correo de la cuenta"
                autoCapitalize="none"
                keyboardType="email-address"
                value={accountEmail}
                onChangeText={setAccountEmail}
              />
              <TextInput
                style={styles.input}
                placeholder="Contraseña"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              {authMode === 'register' && <TextInput style={styles.input} placeholder="Confirma la contraseña" secureTextEntry value={passwordConfirmation} onChangeText={setPasswordConfirmation} />}
              <TouchableOpacity onPress={() => setAuthMode((mode) => mode === 'login' ? 'register' : 'login')}><Text style={styles.link}>{authMode === 'login' ? '¿Primera vez aquí? Crea una cuenta' : '¿Ya tienes cuenta? Inicia sesión'}</Text></TouchableOpacity>
            </View>
          )}

          {!!error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={styles.button}
            disabled={
              loading ||
              passengers.some((passenger) => !passenger.full_name.trim()) ||
              (!token && (!accountEmail.trim() || !password || (authMode === 'register' && (!accountName.trim() || password !== passwordConfirmation))))
            }
            onPress={createBooking}
          >
            <Text style={styles.buttonText}>{loading ? 'Creando la reserva…' : authMode === 'register' && !token ? 'Crear cuenta y reservar asientos' : 'Reservar asientos'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'bookings') {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.wrap}>
          <TouchableOpacity onPress={() => setScreen('search')}><Text style={styles.link}>← Volver a buscar</Text></TouchableOpacity>
          <Text style={styles.eyebrow}>TU CUENTA</Text>
          <Text style={styles.title}>Mis reservas</Text>
          {loading && <ActivityIndicator />}
          {!!error && <Text style={styles.error}>{error}</Text>}
          {!loading && bookings.length === 0 && <Text style={styles.copy}>Todavía no hay reservas asociadas a esta cuenta.</Text>}
          {bookings.map((item) => (
            <View key={item.id} style={styles.card}>
              <Text style={styles.cardKicker}>{item.reference ?? `RESERVA ${item.id}`}</Text>
              <Text style={styles.cardTitle}>{item.trip?.origin ?? item.origin} → {item.trip?.destination ?? item.destination}</Text>
              <Text>{item.trip?.departure_date ?? item.trip?.date ?? ''} · {statusLabel(item.status)}</Text>
              <Text>Asientos: {(item.seat_numbers ?? []).join(', ') || item.reserved_seats?.map((seat: any) => seat.seat?.seat_number).filter(Boolean).join(', ') || '—'}</Text>
              <View style={styles.actionRow}>
                <TouchableOpacity onPress={() => void openTicket(item.id)}><Text style={styles.link}>Ver boleto</Text></TouchableOpacity>
                {item.status === 'pending_payment' && <TouchableOpacity disabled={loading} onPress={() => void cancelReservation(item.id)}><Text style={styles.dangerLink}>Cancelar reserva</Text></TouchableOpacity>}
              </View>
            </View>
          ))}
          <TouchableOpacity style={styles.secondaryButton} disabled={loading} onPress={() => void request('/auth/logout', { method: 'POST' }, token).catch(() => {}).finally(async () => { await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY).catch(() => {}); setToken(''); setBookings([]); setScreen('search'); })}><Text style={styles.secondaryButtonText}>Cerrar sesión</Text></TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'ticket') {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.wrap}>
          <TouchableOpacity onPress={() => setScreen('bookings')}><Text style={styles.link}>← Volver a las reservas</Text></TouchableOpacity>
          <Text style={styles.eyebrow}>DOCUMENTO DE VIAJE</Text>
          <Text style={styles.title}>{ticket ? 'Tu boleto' : 'Boleto no disponible'}</Text>
          {!!error && <Text style={styles.error}>{error}</Text>}
          {ticket && <View style={styles.summary}>
            <Text style={styles.summaryStrong}>{ticket.reference ?? ticket.public_id ?? `Ticket ${ticket.id}`}</Text>
            <Text>Estado: {statusLabel(ticket.status ?? 'issued')}</Text>
            <Text>Número de boleto: {ticket.ticket_number ?? ticket.number ?? ticket.public_id ?? '—'}</Text>
            <Text>Ten el boleto a mano al abordar.</Text>
          </View>}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.wrap}>
        <Text style={styles.eyebrow}>ESTADO DE LA RESERVA</Text>
        <Text style={styles.title}>Tu reserva está registrada.</Text>

        <View style={styles.summary}>
          <Text style={styles.summaryStrong}>
            {booking?.reference ?? `Reserva ${booking?.id ?? ''}`}
          </Text>
          <Text>Estado: {statusLabel(booking?.status)}</Text>
          <Text>Asientos: {seats.filter((seat) => selected.includes(seat.id)).map((seat) => seat.seat_number).join(', ') || selectedSeat?.seat_number || '—'}</Text>
          <Text>Total: {money(Number(booking?.total_amount ?? 0))}</Text>
          <Text>Pago: {bookingPayments[0] ? statusLabel(bookingPayments[0].status) : 'Sin intentos de pago'}</Text>
          {bookingPayments.slice(1).map((payment) => <Text key={payment.id}>Intento anterior: {statusLabel(payment.status)} · {money(Number(payment.amount_minor ?? 0) / 100)}</Text>)}
        </View>

        <Text style={styles.copy}>
          {booking?.status === 'confirmed' ? 'La reserva está confirmada.' : 'La reserva está pendiente de pago.'} El pago se registra cuando el proveedor lo confirma.
        </Text>
        {!!paymentMessage && <Text style={styles.notice}>{paymentMessage}</Text>}

        {booking?.status === 'pending_payment' && (!bookingPayments[0] || ['failed', 'processing', 'pending'].includes(bookingPayments[0].status)) && <TouchableOpacity style={styles.button} disabled={loading || !token} onPress={initiateBookingPayment}>
          <Text style={styles.buttonText}>{loading ? 'Consultando el pago…' : bookingPayments[0]?.status === 'processing' ? 'Volver al pago seguro' : 'Continuar al pago'}</Text>
        </TouchableOpacity>}
        {booking?.status === 'confirmed' && <TouchableOpacity style={styles.button} disabled={loading} onPress={() => void openTicket(booking.id)}>
          <Text style={styles.buttonText}>Ver boleto</Text>
        </TouchableOpacity>}
        {!!booking?.id && <TouchableOpacity style={styles.secondaryButton} disabled={loading || !token} onPress={() => void loadBookingPayments(booking.id)}>
          <Text style={styles.secondaryButtonText}>{loading ? 'Actualizando…' : 'Actualizar estado del pago'}</Text>
        </TouchableOpacity>}

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
          <Text style={styles.buttonText}>Buscar otro viaje</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#071722',
  },
  header: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: 'rgba(15, 34, 49, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  wrap: {
    padding: 20,
    gap: 16,
    paddingBottom: 60,
  },
  brand: {
    fontSize: 26,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -1.2,
  },
  brandSub: {
    marginTop: 2,
    fontSize: 9,
    fontWeight: '800',
    color: '#2aa9df',
    letterSpacing: 2,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '900',
    color: '#2aa9df',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  title: {
    maxWidth: 520,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -1.1,
  },
  copy: {
    color: '#9cb1be',
    lineHeight: 22,
    fontSize: 14,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    color: '#ffffff',
    fontSize: 15,
  },
  fieldLabel: { color: '#9cb1be', fontSize: 13, fontWeight: '800' },
  passengerCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  button: {
    backgroundColor: '#2aa9df',
    paddingVertical: 18,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#2aa9df',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  error: {
    color: '#ff7b88',
    backgroundColor: 'rgba(198, 85, 99, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(198, 85, 99, 0.3)',
    borderRadius: 14,
    padding: 14,
    fontSize: 13,
  },
  notice: {
    color: '#34d399',
    backgroundColor: 'rgba(31, 157, 116, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(31, 157, 116, 0.3)',
    padding: 14,
    borderRadius: 14,
    fontWeight: '700',
    fontSize: 13,
  },
  card: {
    backgroundColor: '#0e2536',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 22,
    padding: 20,
    marginTop: 6,
    gap: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.28,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  cardKicker: {
    color: '#2aa9df',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  cardTitle: {
    fontWeight: '900',
    fontSize: 20,
    color: '#ffffff',
    letterSpacing: -0.4,
  },
  link: {
    color: '#2aa9df',
    fontWeight: '900',
  },
  actionRow: { flexDirection: 'row', gap: 20, marginTop: 10 },
  dangerLink: { color: '#ff6b7b', fontWeight: '900' },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginTop: 4,
  },
  secondaryButtonText: { color: '#ffffff', fontWeight: '900', fontSize: 14 },
  map: {
    height: 340,
    borderRadius: 24,
    overflow: 'hidden',
    marginVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  metric: {
    flex: 1,
    backgroundColor: '#0e2536',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 18,
    padding: 16,
  },
  muted: {
    color: '#8399a7',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricValue: {
    marginTop: 6,
    fontSize: 24,
    fontWeight: '900',
    color: '#ffffff',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
    marginTop: 10,
  },
  seatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  seat: {
    minWidth: 64,
    paddingHorizontal: 12,
    paddingVertical: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 14,
    alignItems: 'center',
  },
  seatUnavailable: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderColor: 'rgba(255, 255, 255, 0.04)',
    opacity: 0.35,
  },
  seatSelected: {
    backgroundColor: '#1f9d74',
    borderColor: '#34d399',
    shadowColor: '#1f9d74',
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 4,
  },
  seatText: {
    fontWeight: '900',
    color: '#ffffff',
  },
  seatTextSelected: {
    color: '#ffffff',
  },
  authBox: {
    backgroundColor: 'rgba(42, 169, 223, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(42, 169, 223, 0.25)',
    borderRadius: 22,
    padding: 18,
    gap: 12,
  },
  summary: {
    backgroundColor: '#0a1d2b',
    borderWidth: 1,
    borderColor: 'rgba(42, 169, 223, 0.3)',
    borderRadius: 24,
    padding: 22,
    gap: 10,
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 22,
    elevation: 6,
  },
  summaryStrong: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
  },
});
