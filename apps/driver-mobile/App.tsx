import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import * as Location from 'expo-location';
import * as Network from 'expo-network';
import * as SecureStore from 'expo-secure-store';
import * as TaskManager from 'expo-task-manager';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { requestJson } from '@encore/api-client';
import { createCustodyOutbox } from './custody-outbox.mjs';

import MapView, {
  Marker,
  Polyline,
  UrlTile,
} from 'react-native-maps';

const API =
  process.env.EXPO_PUBLIC_API_URL ??
  'http://127.0.0.1:8000/api/v1';

const API_ORIGIN =
  API.replace(/\/api\/v1\/?$/, '');

const TILE_TEMPLATE =
  `${API_ORIGIN}/api/v1/maps/tiles/{z}/{x}/{y}.png?style=street-light`;
// react-native-maps uses Google Maps on Android and crashes at native mount
// when the build has no authorized Google Maps key. Keep the operational app
// usable with a truthful route summary until a key is supplied at build time.
const NATIVE_MAPS_AVAILABLE = Boolean(
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
);
const AUTH_TOKEN_KEY = 'encore_driver_api_token';
const ACTIVE_TRIP_KEY = 'encore_driver_active_trip';
const GPS_OUTBOX_KEY = 'encore_driver_gps_outbox';
const CUSTODY_OUTBOX_KEY = 'encore_driver_custody_outbox';
const MAX_GPS_OUTBOX_ITEMS = 25;
const MAX_CUSTODY_OUTBOX_ITEMS = 12;
const BACKGROUND_LOCATION_TASK = 'encore-driver-background-location';

type QueuedLocation = {
  trip_id: number;
  latitude: number;
  longitude: number;
  heading: number | null;
  speed_kph: number | null;
  recorded_at: string;
};

type QueuedCustodyStatus = {
  package_id: number;
  status: 'in_progress';
  queued_at: string;
};

async function rawRequest(
  path: string,
  options: RequestInit = {},
  token = '',
) {
  return requestJson<any>(API, path, options, { token });
}

function isNetworkFailure(error: unknown) {
  const status = typeof error === 'object' && error !== null
    ? Number((error as { status?: unknown }).status)
    : NaN;

  return status === 0 || status === 408 || status === 502 || status === 503;
}

const custodyOutbox = createCustodyOutbox({
  key: CUSTODY_OUTBOX_KEY,
  maxItems: MAX_CUSTODY_OUTBOX_ITEMS,
  storage: {
    getItem: (key) => SecureStore.getItemAsync(key),
    setItem: (key, value) => SecureStore.setItemAsync(key, value),
  },
});

async function readGpsOutbox(): Promise<QueuedLocation[]> {
  try {
    const stored = await SecureStore.getItemAsync(GPS_OUTBOX_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.slice(-MAX_GPS_OUTBOX_ITEMS) : [];
  } catch {
    return [];
  }
}

async function writeGpsOutbox(items: QueuedLocation[]) {
  await SecureStore.setItemAsync(
    GPS_OUTBOX_KEY,
    JSON.stringify(items.slice(-MAX_GPS_OUTBOX_ITEMS)),
  );
}

async function enqueueGpsLocation(location: QueuedLocation) {
  const current = await readGpsOutbox();
  const next = current
    .filter((item) => item.trip_id !== location.trip_id || item.recorded_at !== location.recorded_at)
    .concat(location)
    .slice(-MAX_GPS_OUTBOX_ITEMS);
  await writeGpsOutbox(next);
  return next.length;
}

async function flushGpsOutbox(activeToken: string) {
  const pending = await readGpsOutbox();
  while (pending.length) {
    try {
      await rawRequest(
        '/driver/locations',
        {
          method: 'POST',
          body: JSON.stringify(pending[0]),
        },
        activeToken,
      );
      pending.shift();
    } catch (error) {
      if (!isNetworkFailure(error)) break;
      break;
    }
  }

  await writeGpsOutbox(pending);
  return pending.length;
}

async function sendOrQueueGpsLocation(
  activeToken: string,
  location: QueuedLocation,
) {
  try {
    return {
      queued: false,
      payload: await rawRequest(
        '/driver/locations',
        {
          method: 'POST',
          body: JSON.stringify(location),
        },
        activeToken,
      ),
    };
  } catch (error) {
    if (!isNetworkFailure(error)) throw error;
    return {
      queued: true,
      payload: null,
      pending: await enqueueGpsLocation(location),
    };
  }
}

async function readCustodyOutbox(): Promise<QueuedCustodyStatus[]> {
  return custodyOutbox.read();
}

async function writeCustodyOutbox(items: QueuedCustodyStatus[]) {
  await custodyOutbox.write(items);
}

async function enqueueCustodyStatus(packageId: number, status: 'in_progress') {
  return custodyOutbox.enqueue(packageId, status);
}

async function flushCustodyOutbox(activeToken: string) {
  return custodyOutbox.flush(
    (item, token) => rawRequest(
      `/driver/packages/${item.package_id}/status`,
      {
        method: 'POST',
        body: JSON.stringify({ status: item.status }),
      },
      token,
    ),
    activeToken,
  );
}

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async (taskData) => {
  if (taskData.error) return;
  const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  const tripId = await SecureStore.getItemAsync(ACTIVE_TRIP_KEY);
  const locations = (taskData.data as { locations?: Location.LocationObject[] } | undefined)?.locations ?? [];
  const location = locations.at(-1);
  if (!token || !tripId || !location) return;

  await sendOrQueueGpsLocation(token, {
      trip_id: Number(tripId),
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      heading: Number.isFinite(location.coords.heading ?? NaN) && Number(location.coords.heading) >= 0 ? Number(location.coords.heading) : null,
      speed_kph: Number.isFinite(location.coords.speed ?? NaN) && Number(location.coords.speed) >= 0 ? Number(location.coords.speed) * 3.6 : null,
      recorded_at: new Date(location.timestamp).toISOString(),
  });
});

function validCoordinate(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number);
}

function statusLabel(status: string | null | undefined) {
  const labels: Record<string, string> = {
    scheduled: 'Programado', upcoming: 'Próximo', boarding: 'Abordaje',
    in_progress: 'En curso', completed: 'Completado', cancelled: 'Cancelado',
    open: 'Abierto', resolved: 'Resuelto', dismissed: 'Descartado',
    operational: 'Operativo', active: 'Activo', pending: 'Pendiente',
  };
  return status ? labels[status] ?? status.replaceAll('_', ' ') : 'Sin estado';
}

function userFacingError(error: unknown, fallback: string) {
  if (error instanceof Error && /[áéíóúñ¿¡]/i.test(error.message)) {
    return error.message;
  }
  return fallback;
}

export default function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [driver, setDriver] = useState<any>(null);
  const [trip, setTrip] = useState<any>(null);
  const [passengers, setPassengers] = useState<any[]>([]);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [journey, setJourney] = useState<any>(null);
  const [latestLocation, setLatestLocation] = useState<any>(null);
  const [packageRecipient, setPackageRecipient] = useState('');
  const [packageDescription, setPackageDescription] = useState('');
  const [packageQrToken, setPackageQrToken] = useState('');
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [manifest, setManifest] = useState<any>(null);
  const [custodyMessage, setCustodyMessage] = useState('');
  const [transferDriverId, setTransferDriverId] = useState('');
  const [transferId, setTransferId] = useState('');
  const [discrepancyNotes, setDiscrepancyNotes] = useState('');

  const [incidentTitle, setIncidentTitle] = useState('');
  const [incidentDescription, setIncidentDescription] = useState('');

  const [loading, setLoading] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [backgroundTracking, setBackgroundTracking] = useState(false);
  const [pendingLocationCount, setPendingLocationCount] = useState(0);
  const [pendingCustodyCount, setPendingCustodyCount] = useState(0);
  const [locationMessage, setLocationMessage] = useState('');
  const [error, setError] = useState('');
  const [networkState, setNetworkState] = useState<Network.NetworkState | null>(null);
  const [cameraMode, setCameraMode] = useState<'qr' | 'delivery' | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [deliveryPhotoUri, setDeliveryPhotoUri] = useState('');
  const [recipientVerified, setRecipientVerified] = useState(false);
  const cameraRef = useRef<CameraView | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const locationSubscription =
    useRef<Location.LocationSubscription | null>(null);

  const request = (
    path: string,
    options: RequestInit = {},
    overrideToken = token,
  ) => rawRequest(
    path,
    options,
    overrideToken,
  );

  const isOffline = networkState?.isConnected === false
    || networkState?.isInternetReachable === false;

  const stopLocationTracking = () => {
    locationSubscription.current?.remove();
    locationSubscription.current = null;
    void Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)
      .then((started) => started ? Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK) : null)
      .catch(() => {});
    setBackgroundTracking(false);
    setTracking(false);
  };

  useEffect(() => {
    return () => {
      locationSubscription.current?.remove();
      locationSubscription.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Network.getNetworkStateAsync()
      .then((next) => {
        if (!cancelled) setNetworkState(next);
      })
      .catch(() => {});
    const subscription = Network.addNetworkStateListener((next) => setNetworkState(next));
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const synchronizeLocationOutbox = async () => {
      const remaining = token
        ? await flushGpsOutbox(token)
        : (await readGpsOutbox()).length;
      if (!cancelled) setPendingLocationCount(remaining);
    };

    void synchronizeLocationOutbox();
    const interval = setInterval(
      () => void synchronizeLocationOutbox(),
      15000,
    );

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [token]);

  useEffect(() => {
    let cancelled = false;

    const synchronizeCustodyOutbox = async () => {
      if (!token) {
        const pending = await readCustodyOutbox();
        if (!cancelled) setPendingCustodyCount(pending.length);
        return;
      }

      const result = isOffline
        ? { remaining: (await readCustodyOutbox()).length, synced: [], rejected: [] }
        : await flushCustodyOutbox(token);

      if (cancelled) return;
      setPendingCustodyCount(result.remaining);
      result.synced.forEach((payload) => {
        setSelectedPackage((current: any) => current?.id === payload?.id ? payload : current);
      });
      if (result.synced.length) {
        setCustodyMessage('La carga pendiente fue confirmada por el backend.');
      }
      if (result.rejected.length) {
        setError('Una acción de custodia pendiente fue rechazada por el backend y no se confirmó localmente.');
      }
    };

    void synchronizeCustodyOutbox();
    const interval = setInterval(() => void synchronizeCustodyOutbox(), 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [token, isOffline]);

  useEffect(() => {
    if (
      !trip ||
      !['boarding', 'in_progress'].includes(trip.status)
    ) {
      stopLocationTracking();
    }
  }, [trip?.id, trip?.status]);

  const hydrateTrip = async (
    activeToken: string,
    activeTrip: any,
  ) => {
    if (!activeTrip) {
      setPassengers([]);
      setJourney(null);
      setLatestLocation(null);
      stopLocationTracking();
      return;
    }

    const routeQuery =
      new URLSearchParams({
        origin: activeTrip.origin,
        destination: activeTrip.destination,
      });

    const [
      passengerPayload,
      journeyPayload,
      locationPayload,
    ] = await Promise.all([
      rawRequest(
        `/driver/trips/${activeTrip.id}/passengers`,
        {},
        activeToken,
      ),
      rawRequest(
        `/maps/journey?${routeQuery}`,
      ).catch(() => null),
      rawRequest(
        `/trips/${activeTrip.id}/location`,
        {},
        activeToken,
      ).catch(() => ({
        data: null,
      })),
    ]);

    setPassengers(
      passengerPayload.data ?? [],
    );

    setJourney(
      journeyPayload?.data ??
      journeyPayload ??
      null,
    );

    setLatestLocation(
      locationPayload.data ??
      null,
    );
  };

  const login = async () => {
    setLoading(true);
    setError('');

    try {
      const auth =
        await rawRequest('/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email,
            password,
          }),
        });

      const activeToken = auth.token;
      setToken(activeToken);
      await SecureStore.setItemAsync(AUTH_TOKEN_KEY, activeToken);

      const [
        driverPayload,
        tripPayload,
        schedulePayload,
      ] = await Promise.all([
        rawRequest(
          '/driver/me',
          {},
          activeToken,
        ),
        rawRequest(
          '/driver/trips/current',
          {},
          activeToken,
        ),
        rawRequest(
          '/driver/schedule',
          {},
          activeToken,
        ),
      ]);

      setDriver(driverPayload.data);
      setTrip(
        tripPayload.data ??
        null,
      );
      if (tripPayload.data?.id) await SecureStore.setItemAsync(ACTIVE_TRIP_KEY, String(tripPayload.data.id));
      else await SecureStore.deleteItemAsync(ACTIVE_TRIP_KEY);
      setSchedule(
        schedulePayload.data ??
        [],
      );

      await hydrateTrip(
        activeToken,
        tripPayload.data ?? null,
      );
    } catch (caught) {
      setToken('');
      setError(userFacingError(caught, 'No se pudo iniciar sesión. Revisa tu correo y contraseña.'));
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    if (!token) return;

    setLoading(true);
    setError('');

    try {
      const [
        tripPayload,
        schedulePayload,
      ] = await Promise.all([
        request(
          '/driver/trips/current',
        ),
        request(
          '/driver/schedule',
        ),
      ]);

      const activeTrip =
        tripPayload.data ??
        null;

      setTrip(activeTrip);
      if (activeTrip?.id) await SecureStore.setItemAsync(ACTIVE_TRIP_KEY, String(activeTrip.id));
      else await SecureStore.deleteItemAsync(ACTIVE_TRIP_KEY);

      setSchedule(
        schedulePayload.data ??
        [],
      );

      await hydrateTrip(
        token,
        activeTrip,
      );
    } catch (caught) {
      setError(userFacingError(caught, 'No se pudo actualizar la información.'));
    } finally {
      setLoading(false);
    }
  };

  const changeTripState = async () => {
    if (!trip) return;

    setLoading(true);
    setError('');

    try {
      const action =
        trip.status === 'in_progress'
          ? 'complete'
          : 'start';

      const payload =
        await request(
          `/driver/trips/${trip.id}/${action}`,
          {
            method: 'POST',
          },
        );

      setTrip(
        payload.data ??
        payload,
      );

      await refresh();
    } catch (caught) {
      setError(userFacingError(caught, 'No se pudo actualizar el viaje.'));
    } finally {
      setLoading(false);
    }
  };

  const board = async (
    passengerId: number,
  ) => {
    if (!trip) return;

    try {
      await request(
        `/driver/trips/${trip.id}/passengers/${passengerId}/board`,
        {
          method: 'POST',
        },
      );

      const payload =
        await request(
          `/driver/trips/${trip.id}/passengers`,
        );

      setPassengers(
        payload.data ??
        [],
      );
    } catch (caught) {
      setError(userFacingError(caught, 'No se pudo registrar el abordaje del pasajero.'));
    }
  };

  const reportIncident = async () => {
    if (
      !trip ||
      !incidentTitle.trim() ||
      !incidentDescription.trim()
    ) {
      return;
    }

    try {
      await request(
        '/driver/incidents',
        {
          method: 'POST',
          body: JSON.stringify({
            trip_id: trip.id,
            title: incidentTitle.trim(),
            description:
              incidentDescription.trim(),
            severity: 'medium',
          }),
        },
      );

      setIncidentTitle('');
      setIncidentDescription('');
    } catch (caught) {
      setError(userFacingError(caught, 'No se pudo reportar la incidencia.'));
    }
  };

  const persistLocation = async (
    location: Location.LocationObject,
  ) => {
    if (
      !trip ||
      !['boarding', 'in_progress'].includes(trip.status)
    ) {
      return;
    }

    const {
      latitude,
      longitude,
      heading,
      speed,
    } = location.coords;

    if (
      !validCoordinate(latitude) ||
      !validCoordinate(longitude)
    ) {
      return;
    }

    const locationPayload: QueuedLocation = {
      trip_id: trip.id,
      latitude,
      longitude,
      heading:
        validCoordinate(heading) && Number(heading) >= 0
          ? Number(heading)
          : null,
      speed_kph:
        validCoordinate(speed) && Number(speed) >= 0
          ? Number(speed) * 3.6
          : null,
      recorded_at: new Date(location.timestamp).toISOString(),
    };

    const result = await sendOrQueueGpsLocation(token, locationPayload);
    if (result.queued) {
      setPendingLocationCount(result.pending ?? 0);
      setLocationMessage(
        'Sin conexión: el último punto GPS real quedó guardado y se sincronizará al volver Internet.',
      );
      return;
    }

    const payload = result.payload;
    setLatestLocation(payload.data ?? payload);
    setPendingLocationCount(await flushGpsOutbox(token));
    setLocationMessage('La ubicación GPS se envió a Operaciones.');
  };

  const sendCurrentLocation = async () => {
    if (
      !trip ||
      !['boarding', 'in_progress'].includes(trip.status)
    ) {
      setLocationMessage(
        'Solo puedes enviar tu ubicación GPS durante el abordaje o mientras el viaje está en curso.',
      );
      return;
    }

    setError('');
    setLocationMessage(
      'Solicitando permiso de ubicación…',
    );

    try {
      const permission =
        await Location.requestForegroundPermissionsAsync();

      if (
        permission.status !==
        Location.PermissionStatus.GRANTED
      ) {
        setLocationMessage(
          'No se concedió el permiso de ubicación. No se envió ninguna posición.',
        );
        return;
      }

      setLocationMessage(
        'Obteniendo la ubicación GPS actual…',
      );

      const current =
        await Location.getCurrentPositionAsync({
          accuracy:
            Location.Accuracy.High,
        });

      await persistLocation(current);
    } catch (caught) {
      setLocationMessage('');

      setError(userFacingError(caught, 'No se pudo obtener la ubicación GPS actual.'));
    }
  };

  const startLocationTracking = async () => {
    if (
      tracking ||
      !trip ||
      !['boarding', 'in_progress'].includes(trip.status)
    ) {
      return;
    }

    setError('');
    setLocationMessage(
      'Solicitando permiso de ubicación…',
    );

    try {
      const permission =
        await Location.requestForegroundPermissionsAsync();

      if (
        permission.status !==
        Location.PermissionStatus.GRANTED
      ) {
        setLocationMessage(
          'No se concedió el permiso de ubicación. No se inició el GPS en vivo.',
        );
        return;
      }

      const subscription =
        await Location.watchPositionAsync(
          {
            accuracy:
              Location.Accuracy.BestForNavigation,
            timeInterval: 10000,
            distanceInterval: 25,
          },
          (location) => {
            void persistLocation(
              location,
            ).catch((caught) => {
              setError(userFacingError(caught, 'No se pudo enviar la actualización GPS.'));
            });
          },
        );

      locationSubscription.current =
        subscription;

      const backgroundPermission = await Location.requestBackgroundPermissionsAsync();
      if (backgroundPermission.status === Location.PermissionStatus.GRANTED) {
        await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 10000,
          distanceInterval: 25,
          pausesUpdatesAutomatically: false,
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: 'Encore Driver GPS activo',
            notificationBody: 'Encore está compartiendo la ubicación del viaje activo.',
            notificationColor: '#168dcc',
          },
        });
        setBackgroundTracking(true);
      }

      setTracking(true);

      setLocationMessage(
        backgroundPermission.status === Location.PermissionStatus.GRANTED
          ? 'GPS foreground y background activos para el viaje actual.'
          : 'GPS foreground activo. El permiso background no fue concedido; no se enviará ubicación con la app cerrada.',
      );
    } catch (caught) {
      setLocationMessage('');

      setError(userFacingError(caught, 'No se pudo iniciar el GPS en vivo.'));
    }
  };

  const registerPackage = async () => {
    if (!trip || !packageRecipient.trim()) return;
    try {
      const payload = await request('/driver/packages', { method: 'POST', body: JSON.stringify({ trip_id: trip.id, recipient_name: packageRecipient.trim(), description: packageDescription.trim() || null }) });
      const created = payload.data ?? payload;
      setSelectedPackage(created.package ?? created);
      setPackageQrToken(created.qr_payload?.token ?? '');
      setCustodyMessage('Encomienda registrada y disponible para escaneo.');
      setPackageRecipient('');
      setPackageDescription('');
    } catch (caught) { setError(userFacingError(caught, 'No se pudo registrar la encomienda.')); }
  };

  const scanPackage = async (tokenOverride = packageQrToken) => {
    if (!tokenOverride.trim()) return;
    try { const payload = await request('/driver/packages/scan', { method: 'POST', body: JSON.stringify({ qr_token: tokenOverride.trim() }) }); setSelectedPackage(payload.data ?? payload); setCustodyMessage('Custodia consultada desde el backend.'); } catch (caught) { setError(userFacingError(caught, 'No se pudo escanear el QR de la encomienda.')); }
  };

  const openCamera = async (mode: 'qr' | 'delivery') => {
    const permission = cameraPermission?.granted ? cameraPermission : await requestCameraPermission();
    if (!permission.granted) {
      setError('Se necesita permiso de cámara para escanear QR o capturar evidencia.');
      return;
    }
    setError('');
    setCameraReady(false);
    setCameraError('');
    setCameraMode(mode);
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (cameraMode !== 'qr' || !data) return;
    setPackageQrToken(data);
    setCameraMode(null);
    void scanPackage(data);
  };

  const captureDeliveryPhoto = async () => {
    if (!cameraReady) {
      setError('La cámara todavía se está preparando. Inténtalo en un momento.');
      return;
    }

    try {
      // Android devices can fail while applying the optional post-processing
      // step even though the native camera has already produced a valid frame.
      // Keep the original file and let the backend validate the multipart image.
      const picture = await cameraRef.current?.takePictureAsync({ quality: 0.7, skipProcessing: true });
      if (picture?.uri) {
        setDeliveryPhotoUri(picture.uri);
        setCameraMode(null);
        setCustodyMessage('Evidencia fotográfica preparada para la validación de entrega.');
      } else {
        setError('La cámara no devolvió una fotografía. No se preparó evidencia.');
      }
    } catch (caught) {
      setError(userFacingError(caught, 'No se pudo capturar la evidencia fotográfica.'));
    }
  };

  const deliverPackage = async () => {
    if (!selectedPackage?.id || !deliveryPhotoUri || !recipientVerified) {
      setError('La entrega requiere verificar al destinatario y capturar una fotografía privada.');
      return;
    }
    try {
      const form = new FormData();
      form.append('status', 'delivered');
      form.append('recipient_verified', '1');
      form.append('delivery_photo', { uri: deliveryPhotoUri, name: 'delivery-evidence.jpg', type: 'image/jpeg' } as any);
      const payload = await request(`/driver/packages/${selectedPackage.id}/status`, { method: 'POST', body: form as any });
      setSelectedPackage(payload.data ?? payload);
      setCustodyMessage('Entrega validada por el backend con evidencia privada.');
    } catch (caught) {
      setError(userFacingError(caught, 'El backend rechazó la entrega o la evidencia.'));
    }
  };

  const advancePackage = async (status: string) => {
    if (!selectedPackage?.id) return;
    if (status === 'in_progress' && isOffline) {
      const pending = await enqueueCustodyStatus(selectedPackage.id, 'in_progress');
      setPendingCustodyCount(pending);
      setCustodyMessage('Carga guardada para sincronizar cuando vuelva Internet; todavía no está confirmada.');
      return;
    }

    try {
      const payload = await request(`/driver/packages/${selectedPackage.id}/status`, { method: 'POST', body: JSON.stringify({ status }) });
      setSelectedPackage(payload.data ?? payload);
      setCustodyMessage(`Estado actualizado: ${statusLabel(status)}.`);
    } catch (caught) {
      if (status === 'in_progress' && isNetworkFailure(caught)) {
        const pending = await enqueueCustodyStatus(selectedPackage.id, 'in_progress');
        setPendingCustodyCount(pending);
        setCustodyMessage('Carga guardada para sincronizar cuando vuelva Internet; todavía no está confirmada.');
        return;
      }
      setError(userFacingError(caught, 'El backend rechazó la transición de custodia.'));
    }
  };

  const createManifestForPackage = async () => {
    if (!trip || !selectedPackage?.id) return;
    try { const payload = await request('/driver/manifests', { method: 'POST', body: JSON.stringify({ trip_id: trip.id, package_ids: [selectedPackage.id] }) }); setManifest(payload.data ?? payload); setCustodyMessage('Manifiesto creado; falta escanear y reconciliar.'); } catch (caught) { setError(userFacingError(caught, 'No se pudo crear el manifiesto.')); }
  };

  const reconcileManifest = async () => {
    if (!manifest?.id) return;
    try { const payload = await request(`/driver/manifests/${manifest.id}/reconcile`, { method: 'POST' }); setManifest(payload.data ?? payload); setCustodyMessage('Manifiesto reconciliado por el backend.'); } catch (caught) { setError(userFacingError(caught, 'El manifiesto aún tiene faltantes o discrepancias.')); }
  };

  const reportDiscrepancy = async () => {
    if (!selectedPackage?.id || !discrepancyNotes.trim()) return;
    try { await request(`/driver/packages/${selectedPackage.id}/discrepancy`, { method: 'POST', body: JSON.stringify({ type: 'mobile_report', notes: discrepancyNotes.trim() }) }); setDiscrepancyNotes(''); setCustodyMessage('Discrepancia registrada en la línea de custodia.'); } catch (caught) { setError(userFacingError(caught, 'No se pudo registrar la discrepancia.')); }
  };

  const requestTransfer = async () => {
    if (!selectedPackage?.id || !transferDriverId.trim()) return;
    try { const payload = await request(`/driver/packages/${selectedPackage.id}/transfer`, { method: 'POST', body: JSON.stringify({ to_driver_id: Number(transferDriverId) }) }); setTransferId(String(payload.data?.id ?? '')); setCustodyMessage('Transferencia solicitada; requiere aceptación del conductor receptor.'); } catch (caught) { setError(userFacingError(caught, 'No se pudo solicitar la transferencia.')); }
  };

  const acceptTransfer = async () => {
    if (!transferId.trim()) return;
    try { await request(`/driver/package-transfers/${transferId.trim()}/accept`, { method: 'POST' }); setCustodyMessage('Transferencia aceptada por el conductor autenticado.'); } catch (caught) { setError(userFacingError(caught, 'No se pudo aceptar la transferencia.')); }
  };

  if (!token) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loginWrap}>
          <Text style={styles.brand}>
            encore
          </Text>

          <Text style={styles.brandSub}>
            TRANSPORTE · CONDUCTOR
          </Text>

          <View style={styles.loginHero}>
            <View style={styles.loginHeroOrb}><Ionicons name="navigate" size={30} color="#ffffff" /></View>
            <View style={styles.loginHeroCopy}><Text style={styles.loginHeroKicker}>OPERACIÓN EN MOVIMIENTO</Text><Text style={styles.loginHeroTitle}>Todo lo que necesitas para conducir con claridad.</Text><Text style={styles.loginHeroText}>Viajes, pasajeros, custodia y GPS en una sola cabina.</Text></View>
          </View>

          <Text style={styles.title}>
            Acceso para conductores
          </Text>

          <Text style={styles.copy}>
            Usa la cuenta que te asignó Operaciones.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Correo electrónico"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            style={styles.button}
            onPress={login}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              Iniciar sesión
            </Text>
          </TouchableOpacity>

          {loading && <ActivityIndicator />}

          {!!error && (
            <Text style={styles.error}>
              {error}
            </Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  if (cameraMode) {
    return (
      <SafeAreaView style={styles.cameraScreen}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          onCameraReady={() => setCameraReady(true)}
          onMountError={(caught) => {
            const message = `No se pudo iniciar la cámara: ${caught.message}`;
            setCameraError(message);
            setError(message);
          }}
          onBarcodeScanned={cameraMode === 'qr' ? handleBarcodeScanned : undefined}
          barcodeScannerSettings={cameraMode === 'qr' ? { barcodeTypes: ['qr'] } : undefined}
        />
        <View pointerEvents="box-none" style={styles.cameraOverlay}>
          <Text style={styles.cameraTitle}>{cameraMode === 'qr' ? 'Escanear QR de encomienda' : 'Capturar evidencia de entrega'}</Text>
          <Text style={styles.cameraCopy}>{cameraMode === 'qr' ? 'Apunta al QR opaco del paquete.' : 'La fotografía se enviará de forma privada al validar la entrega.'}</Text>
          {!!cameraError && <Text style={styles.error}>{cameraError}</Text>}
          {cameraMode === 'delivery' && <TouchableOpacity disabled={!cameraReady} style={[styles.button, !cameraReady && styles.buttonDisabled]} onPress={captureDeliveryPhoto}><Text style={styles.buttonText}>{cameraReady ? 'Capturar fotografía' : 'Preparando cámara…'}</Text></TouchableOpacity>}
          {!!cameraError && <TouchableOpacity style={styles.secondaryButton} onPress={() => { const retryMode = cameraMode; setCameraError(''); setCameraReady(false); setCameraMode(null); setTimeout(() => setCameraMode(retryMode), 0); }}><Text style={styles.secondaryButtonText}>Reintentar cámara</Text></TouchableOpacity>}
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setCameraMode(null)}><Text style={styles.secondaryButtonText}>Cancelar</Text></TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.wrap}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>
              encore
            </Text>

            <Text style={styles.brandSub}>
              TRANSPORTE · CONDUCTOR
            </Text>
          </View>

          <TouchableOpacity
            onPress={refresh}
          >
            <Text style={styles.link}>
              Actualizar
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>
          {driver?.name ?? 'Conductor'}
        </Text>

        <Text style={styles.copy}>
          {driver?.license_number ?? ''}
        </Text>

        <View style={styles.opsBanner}>
          <View style={styles.opsBadge}><View style={styles.signalDot} /><Text style={styles.opsBadgeText}>{trip ? 'OPERACIÓN ACTIVA' : 'CENTRO DEL CONDUCTOR'}</Text></View>
          <Text style={styles.opsTitle}>{trip ? `${trip.origin} → ${trip.destination}` : 'Tu jornada, organizada.'}</Text>
          <View style={styles.opsMetrics}><View><Text style={styles.opsMetricValue}>{trip ? '01' : '—'}</Text><Text style={styles.opsMetricLabel}>viaje</Text></View><View><Text style={styles.opsMetricValue}>{passengers.length || '—'}</Text><Text style={styles.opsMetricLabel}>pasajeros</Text></View><View><Text style={styles.opsMetricValue}>{backgroundTracking ? 'GPS' : '—'}</Text><Text style={styles.opsMetricLabel}>señal</Text></View></View>
        </View>

        {!!error && (
          <Text style={styles.error}>
            {error}
          </Text>
        )}

        {isOffline && (
          <Text style={styles.offlineNotice}>
            Sin conexión. El GPS puede quedar en cola; las operaciones de custodia esperan a que vuelva Internet y no se confirman localmente.
          </Text>
        )}

        {pendingCustodyCount > 0 && (
          <Text style={styles.offlineNotice}>
            {pendingCustodyCount} carga(s) de custodia pendiente(s) de confirmar por el backend.
          </Text>
        )}

        {loading && <ActivityIndicator />}

        <View style={styles.card}>
          <Text style={styles.cardKicker}>
            HORARIO
          </Text>

          {schedule.length
            ? schedule
                .slice(0, 4)
                .map((item) => (
                  <View
                    key={item.id}
                    style={styles.scheduleRow}
                  >
                    <View>
                      <Text style={styles.bold}>
                        {String(
                          item.work_date ?? '',
                        ).slice(0, 10)}
                      </Text>

                      <Text style={styles.bodyText}>
                        {(item.starts_at ?? '').slice(0, 5)}
                        {' - '}
                        {(item.ends_at ?? '').slice(0, 5)}
                      </Text>
                    </View>

                    <Text style={styles.status}>
                      {statusLabel(item.status)}
                    </Text>
                  </View>
                ))
            : (
              <Text style={styles.copy}>
                No tienes turnos próximos.
              </Text>
            )}
        </View>

        {trip ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardKicker}>
                VIAJE ASIGNADO
              </Text>

              <Text style={styles.cardTitle}>
                {trip.origin} → {trip.destination}
              </Text>

              <Text style={styles.bodyText}>
                {trip.date} · {trip.departureTime}
              </Text>

              <Text style={styles.bodyText}>
                Estado: {statusLabel(trip.status)}
              </Text>
            </View>

            {journey && NATIVE_MAPS_AVAILABLE && (
              <MapView
                style={styles.map}
                mapType="none"
                initialRegion={{
                  latitude:
                    journey.origin.latitude,
                  longitude:
                    journey.origin.longitude,
                  latitudeDelta:
                    Math.max(
                      0.05,
                      Math.abs(
                        journey.origin.latitude -
                        journey.destination.latitude,
                      ) * 1.6,
                    ),
                  longitudeDelta:
                    Math.max(
                      0.05,
                      Math.abs(
                        journey.origin.longitude -
                        journey.destination.longitude,
                      ) * 1.6,
                    ),
                }}
              >
                <UrlTile
                  urlTemplate={TILE_TEMPLATE}
                  maximumZ={22}
                />

                <Marker
                  coordinate={{
                    latitude:
                      journey.origin.latitude,
                    longitude:
                      journey.origin.longitude,
                  }}
                  title={trip.origin}
                />

                <Marker
                  coordinate={{
                    latitude:
                      journey.destination.latitude,
                    longitude:
                      journey.destination.longitude,
                  }}
                  title={trip.destination}
                  pinColor="#1f9d74"
                />

                {journey.route.points.length > 1 && (
                  <Polyline
                    coordinates={
                      journey.route.points
                    }
                    strokeWidth={5}
                    strokeColor="#1f9d74"
                  />
                )}

                {latestLocation && (
                  <Marker
                    coordinate={{
                      latitude: Number(
                        latestLocation.latitude,
                      ),
                      longitude: Number(
                        latestLocation.longitude,
                      ),
                    }}
                    title="Ubicación actual del autobús"
                    pinColor="#2da9df"
                  />
                )}
              </MapView>
            )}

            {journey && !NATIVE_MAPS_AVAILABLE && (
              <View style={styles.mapFallback}>
                <Text style={styles.cardKicker}>MAPA DE RUTA</Text>
                <Text style={styles.cardTitle}>{trip.origin} → {trip.destination}</Text>
                <Text style={styles.copy}>
                  La ruta real está disponible. Esta compilación no tiene una clave de mapas nativos autorizada, así que las acciones del viaje siguen disponibles sin dejar la pantalla en blanco.
                </Text>
                <Text style={styles.status}>
                  {journey.route.distanceMeters ? `${Math.round(journey.route.distanceMeters / 1000)} km de recorrido` : 'Recorrido disponible'}
                </Text>
              </View>
            )}

            {!journey && (
              <View style={styles.card}>
                <Text style={styles.cardKicker}>
                  MAPA DE RUTA
                </Text>
                <Text style={styles.copy}>
                  El mapa no está disponible ahora. Puedes continuar con la información y las acciones del viaje.
                </Text>
              </View>
            )}

            <View style={styles.card}>
              <Text style={styles.cardKicker}>
                GPS EN VIVO
              </Text>

              <Text style={styles.copy}>
                La ubicación se comparte solo después de conceder el permiso del dispositivo y mientras el viaje asignado esté en abordaje o en curso.
              </Text>
              <Text style={styles.status}>{backgroundTracking ? 'Background GPS activo' : tracking ? 'Foreground GPS activo' : 'GPS detenido'}</Text>
              {pendingLocationCount > 0 && (
                <Text style={styles.locationMessage}>
                  {pendingLocationCount} punto(s) GPS pendiente(s) de sincronizar.
                </Text>
              )}

              {!!locationMessage && (
                <Text style={styles.locationMessage}>
                  {locationMessage}
                </Text>
              )}

              <View style={styles.gpsButtons}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={sendCurrentLocation}
                >
                  <Text style={styles.secondaryButtonText}>
                    Enviar ubicación actual
                  </Text>
                </TouchableOpacity>

                {!tracking ? (
                  <TouchableOpacity
                    style={[styles.button, styles.growButton]}
                    onPress={startLocationTracking}
                  >
                    <Text style={styles.buttonText}>
                      Iniciar GPS en vivo
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.stopButton}
                    onPress={stopLocationTracking}
                  >
                    <Text style={styles.stopButtonText}>
                      Detener GPS en vivo
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardKicker}>
                PASAJEROS
              </Text>

              {passengers.length
                ? passengers.map((passenger) => (
                  <View
                    key={passenger.id}
                    style={styles.passengerRow}
                  >
                    <View>
                      <Text style={styles.bold}>
                        {passenger.full_name}
                      </Text>

                      <Text style={styles.bodyText}>
                        {passenger.booking?.reference ?? ''}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.smallButton,
                        passenger.boarded_at &&
                        styles.smallButtonDisabled,
                      ]}
                      disabled={Boolean(
                        passenger.boarded_at,
                      )}
                      onPress={() =>
                        board(passenger.id)
                      }
                    >
                      <Text style={styles.smallButtonText}>
                        {passenger.boarded_at
                          ? 'Abordó'
                          : 'Registrar abordaje'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))
                : (
                  <Text style={styles.copy}>
                    Todavía no hay pasajeros confirmados.
                  </Text>
                )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardKicker}>CUSTODIA DE PAQUETERÍA</Text>
              <Text style={styles.copy}>Estas acciones escriben en la cadena de custodia real; no muestran confirmaciones si el backend rechaza la operación.</Text>
              <TextInput style={styles.input} placeholder="Nombre del destinatario" value={packageRecipient} onChangeText={setPackageRecipient} />
              <TextInput style={styles.input} placeholder="Descripción" value={packageDescription} onChangeText={setPackageDescription} />
              <TouchableOpacity disabled={isOffline} style={[styles.secondaryButton, isOffline && styles.buttonDisabled]} onPress={registerPackage}><Text style={styles.secondaryButtonText}>Registrar encomienda</Text></TouchableOpacity>
              <TextInput style={styles.input} placeholder="Token QR opaco" value={packageQrToken} onChangeText={setPackageQrToken} autoCapitalize="none" />
              <View style={styles.gpsButtons}><TouchableOpacity disabled={isOffline} style={[styles.secondaryButton, isOffline && styles.buttonDisabled]} onPress={() => openCamera('qr')}><Text style={styles.secondaryButtonText}>Escanear QR</Text></TouchableOpacity><TouchableOpacity disabled={isOffline || !packageQrToken.trim()} style={[styles.secondaryButton, (isOffline || !packageQrToken.trim()) && styles.buttonDisabled]} onPress={() => scanPackage()}><Text style={styles.secondaryButtonText}>Consultar token</Text></TouchableOpacity><TouchableOpacity style={[styles.secondaryButton, (isOffline || !selectedPackage) && styles.buttonDisabled]} onPress={() => advancePackage('in_progress')} disabled={isOffline || !selectedPackage}><Text style={styles.secondaryButtonText}>Cargar</Text></TouchableOpacity></View>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => openCamera('delivery')} disabled={!selectedPackage}><Text style={styles.secondaryButtonText}>Tomar evidencia de entrega</Text></TouchableOpacity>
              {deliveryPhotoUri ? <Image source={{ uri: deliveryPhotoUri }} style={styles.evidencePreview} /> : null}
              <TouchableOpacity style={[styles.secondaryButton, recipientVerified && styles.selectedButton]} onPress={() => setRecipientVerified((value) => !value)} disabled={!selectedPackage}><Text style={styles.secondaryButtonText}>{recipientVerified ? 'Destinatario verificado' : 'Verificar destinatario'}</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.secondaryButton, (isOffline || !selectedPackage || !deliveryPhotoUri || !recipientVerified) && styles.buttonDisabled]} onPress={deliverPackage} disabled={isOffline || !selectedPackage || !deliveryPhotoUri || !recipientVerified}><Text style={styles.secondaryButtonText}>Validar entrega</Text></TouchableOpacity>
              {selectedPackage && <Text style={styles.status}>Paquete {selectedPackage.reference ?? selectedPackage.public_id} · {statusLabel(selectedPackage.status)}</Text>}
              <TouchableOpacity style={[styles.secondaryButton, (isOffline || !selectedPackage) && styles.buttonDisabled]} onPress={createManifestForPackage} disabled={isOffline || !selectedPackage}><Text style={styles.secondaryButtonText}>Crear manifiesto</Text></TouchableOpacity>
              {manifest && <><Text style={styles.status}>Manifiesto {manifest.reference} · {manifest.scanned_count ?? 0}/{manifest.expected_count ?? 0} · {statusLabel(manifest.status)}</Text><TouchableOpacity style={[styles.secondaryButton, isOffline && styles.buttonDisabled]} onPress={reconcileManifest} disabled={isOffline}><Text style={styles.secondaryButtonText}>Consultar y reconciliar manifiesto</Text></TouchableOpacity></>}
              <TextInput style={styles.input} placeholder="Notas de discrepancia" value={discrepancyNotes} onChangeText={setDiscrepancyNotes} />
              <TouchableOpacity style={[styles.secondaryButton, (isOffline || !selectedPackage || !discrepancyNotes.trim()) && styles.buttonDisabled]} onPress={reportDiscrepancy} disabled={isOffline || !selectedPackage || !discrepancyNotes.trim()}><Text style={styles.secondaryButtonText}>Registrar discrepancia</Text></TouchableOpacity>
              <TextInput style={styles.input} placeholder="ID conductor receptor" value={transferDriverId} onChangeText={setTransferDriverId} keyboardType="numeric" />
              <TouchableOpacity style={[styles.secondaryButton, (isOffline || !selectedPackage || !transferDriverId.trim()) && styles.buttonDisabled]} onPress={requestTransfer} disabled={isOffline || !selectedPackage || !transferDriverId.trim()}><Text style={styles.secondaryButtonText}>Transferir</Text></TouchableOpacity>
              <TextInput style={styles.input} placeholder="ID transferencia a aceptar" value={transferId} onChangeText={setTransferId} keyboardType="numeric" />
              <TouchableOpacity style={[styles.secondaryButton, (isOffline || !transferId.trim()) && styles.buttonDisabled]} onPress={acceptTransfer} disabled={isOffline || !transferId.trim()}><Text style={styles.secondaryButtonText}>Aceptar transferencia</Text></TouchableOpacity>
              {!!custodyMessage && <Text style={styles.locationMessage}>{custodyMessage}</Text>}
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={changeTripState}
              disabled={
                loading ||
                ![
                  'scheduled',
                  'boarding',
                  'in_progress',
                ].includes(trip.status)
              }
            >
              <Text style={styles.buttonText}>
                {trip.status === 'in_progress'
                  ? 'Finalizar viaje'
                  : 'Iniciar viaje'}
              </Text>
            </TouchableOpacity>

            <View style={styles.card}>
              <Text style={styles.cardKicker}>
                INCIDENCIA
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Título de la incidencia"
                value={incidentTitle}
                onChangeText={setIncidentTitle}
              />

              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                ]}
                placeholder="Describe lo ocurrido"
                multiline
                value={incidentDescription}
                onChangeText={
                  setIncidentDescription
                }
              />

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={reportIncident}
              >
                <Text style={styles.secondaryButtonText}>
                  Reportar incidencia
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              No tienes viajes activos o próximos asignados.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => {
            stopLocationTracking();
            void SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
            void SecureStore.deleteItemAsync(ACTIVE_TRIP_KEY);
            setToken('');
            setDriver(null);
            setTrip(null);
            setPassengers([]);
            setSchedule([]);
            setSelectedPackage(null);
            setManifest(null);
            setCustodyMessage('');
          }}
        >
          <Text style={styles.secondaryButtonText}>
            Cerrar sesión
          </Text>
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
  loginWrap: {
    flex: 1,
    padding: 24,
    gap: 16,
    justifyContent: 'center',
    backgroundColor: '#071722',
  },
  loginHero: {
    minHeight: 150,
    marginTop: 8,
    marginBottom: 4,
    padding: 18,
    borderRadius: 26,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#0d4057',
    borderWidth: 1,
    borderColor: 'rgba(42, 169, 223, 0.4)',
  },
  loginHeroOrb: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2aa9df', borderWidth: 8, borderColor: 'rgba(255, 255, 255, 0.17)' },
  loginHeroCopy: { flex: 1, gap: 5 },
  loginHeroKicker: { color: '#bfe9f7', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  loginHeroTitle: { color: '#ffffff', fontSize: 18, lineHeight: 21, fontWeight: '900' },
  loginHeroText: { color: '#b7d3de', fontSize: 12, lineHeight: 17 },
  signalDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#34d399' },
  wrap: {
    padding: 20,
    gap: 16,
    paddingBottom: 60,
  },
  header: {
    marginBottom: 6,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 22,
    backgroundColor: 'rgba(15, 34, 49, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 6,
  },
  brand: {
    fontSize: 26,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -1.1,
  },
  brandSub: {
    marginTop: 2,
    fontSize: 9,
    fontWeight: '800',
    color: '#2aa9df',
    letterSpacing: 2,
  },
  opsBanner: { padding: 18, gap: 10, borderRadius: 26, backgroundColor: '#0d4057', borderWidth: 1, borderColor: 'rgba(42, 169, 223, 0.4)', shadowColor: '#000000', shadowOpacity: 0.22, shadowRadius: 18, elevation: 5 },
  opsBadge: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  opsBadgeText: { color: '#bfe9f7', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  opsTitle: { color: '#ffffff', fontSize: 20, fontWeight: '900' },
  opsMetrics: { flexDirection: 'row', gap: 28, paddingTop: 4 },
  opsMetricValue: { color: '#34d399', fontSize: 18, fontWeight: '900' },
  opsMetricLabel: { color: '#a8c9d4', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -1,
  },
  copy: {
    color: '#9cb1be',
    lineHeight: 22,
    fontSize: 14,
  },
  bodyText: {
    color: '#d7e5eb',
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
  textArea: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#2aa9df',
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 999,
    alignItems: 'center',
    shadowColor: '#2aa9df',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 6,
  },
  growButton: {
    flex: 1,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 0.4,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 999,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    flex: 1,
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 14,
  },
  stopButton: {
    backgroundColor: 'rgba(198, 85, 99, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(198, 85, 99, 0.4)',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 999,
    alignItems: 'center',
    flex: 1,
  },
  stopButtonText: {
    color: '#ff7b88',
    fontWeight: '900',
    fontSize: 14,
  },
  error: {
    color: '#ff7b88',
    backgroundColor: 'rgba(198, 85, 99, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(198, 85, 99, 0.3)',
    borderRadius: 14,
    padding: 14,
  },
  offlineNotice: {
    color: '#ffd58a',
    backgroundColor: 'rgba(224, 146, 33, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(224, 146, 33, 0.38)',
    borderRadius: 14,
    padding: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  locationMessage: {
    color: '#34d399',
    backgroundColor: 'rgba(31, 157, 116, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(31, 157, 116, 0.3)',
    borderRadius: 14,
    padding: 14,
    fontWeight: '700',
  },
  gpsButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  link: {
    color: '#2aa9df',
    fontWeight: '900',
  },
  card: {
    backgroundColor: '#0e2536',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 22,
    padding: 20,
    gap: 10,
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 20,
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
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -0.4,
  },
  bold: {
    fontWeight: '900',
    color: '#ffffff',
  },
  status: {
    color: '#2aa9df',
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  passengerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  smallButton: {
    backgroundColor: 'rgba(42, 169, 223, 0.18)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  smallButtonDisabled: {
    opacity: 0.35,
  },
  smallButtonText: {
    color: '#2aa9df',
    fontWeight: '900',
    fontSize: 13,
  },
  map: {
    height: 340,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  mapFallback: {
    minHeight: 190,
    justifyContent: 'center',
    gap: 10,
    padding: 20,
    borderRadius: 24,
    marginVertical: 10,
    backgroundColor: '#0e2536',
    borderWidth: 1,
    borderColor: 'rgba(42, 169, 223, 0.3)',
  },
  cameraScreen: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cameraOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1,
    elevation: 1,
    justifyContent: 'flex-end',
    gap: 12,
    padding: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
  },
  cameraTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
  },
  cameraCopy: {
    color: '#e5f4fa',
    fontSize: 14,
    lineHeight: 20,
  },
  evidencePreview: {
    width: 96,
    height: 96,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  selectedButton: {
    borderColor: '#34d399',
    backgroundColor: 'rgba(31, 157, 116, 0.22)',
  },
});
