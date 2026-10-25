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
} from 'react-native';

import * as Location from 'expo-location';
import { requestJson } from '@encore/api-client';

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

async function rawRequest(
  path: string,
  options: RequestInit = {},
  token = '',
) {
  return requestJson<any>(API, path, options, { token });
}

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

  const [incidentTitle, setIncidentTitle] = useState('');
  const [incidentDescription, setIncidentDescription] = useState('');

  const [loading, setLoading] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [locationMessage, setLocationMessage] = useState('');
  const [error, setError] = useState('');

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

  const stopLocationTracking = () => {
    locationSubscription.current?.remove();
    locationSubscription.current = null;
    setTracking(false);
  };

  useEffect(() => {
    return () => {
      locationSubscription.current?.remove();
      locationSubscription.current = null;
    };
  }, []);

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

    const payload =
      await request(
        '/driver/locations',
        {
          method: 'POST',
          body: JSON.stringify({
            trip_id: trip.id,
            latitude,
            longitude,
            heading:
              validCoordinate(heading) &&
              Number(heading) >= 0
                ? Number(heading)
                : null,
            speed_kph:
              validCoordinate(speed) &&
              Number(speed) >= 0
                ? Number(speed) * 3.6
                : null,
            recorded_at:
              new Date(
                location.timestamp,
              ).toISOString(),
          }),
        },
      );

    setLatestLocation(
      payload.data ??
      payload,
    );

    setLocationMessage(
      'La ubicación GPS se envió a Operaciones.',
    );
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

      setTracking(true);

      setLocationMessage(
        'El GPS en vivo está activo mientras la aplicación permanece abierta en primer plano.',
      );
    } catch (caught) {
      setLocationMessage('');

      setError(userFacingError(caught, 'No se pudo iniciar el GPS en vivo.'));
    }
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

        {!!error && (
          <Text style={styles.error}>
            {error}
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

                      <Text>
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

              <Text>
                {trip.date} · {trip.departureTime}
              </Text>

              <Text>
                Estado: {statusLabel(trip.status)}
              </Text>
            </View>

            {journey && (
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
                    style={styles.button}
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

                      <Text>
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
            setToken('');
            setDriver(null);
            setTrip(null);
            setPassengers([]);
            setSchedule([]);
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
    backgroundColor: '#eef4f7',
  },
  loginWrap: {
    flex: 1,
    padding: 24,
    gap: 12,
    justifyContent: 'center',
    backgroundColor: '#071722',
  },
  wrap: {
    padding: 18,
    gap: 12,
    paddingBottom: 48,
  },
  header: {
    marginBottom: 2,
    padding: 15,
    borderRadius: 18,
    backgroundColor: '#071722',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    color: '#8fb2c3',
    letterSpacing: 1.7,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#071722',
    letterSpacing: -1,
  },
  copy: {
    color: '#617381',
    lineHeight: 20,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cfdae1',
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  textArea: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#0b2232',
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 13,
    alignItems: 'center',
    flex: 1,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '900',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#cbd8df',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 13,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    flex: 1,
  },
  secondaryButtonText: {
    color: '#0b2232',
    fontWeight: '900',
  },
  stopButton: {
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#e1bfc4',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 13,
    alignItems: 'center',
    flex: 1,
  },
  stopButtonText: {
    color: '#923d49',
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
  locationMessage: {
    color: '#1b6b55',
    backgroundColor: '#eaf8f2',
    borderWidth: 1,
    borderColor: '#c7e8dd',
    borderRadius: 12,
    padding: 12,
  },
  gpsButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  link: {
    color: '#9ddff7',
    fontWeight: '900',
  },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dce5ea',
    borderRadius: 18,
    padding: 17,
    gap: 8,
    shadowColor: '#071722',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: {
      width: 0,
      height: 7,
    },
    elevation: 2,
  },
  cardKicker: {
    color: '#138bc1',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.3,
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#071722',
    letterSpacing: -0.4,
  },
  bold: {
    fontWeight: '900',
    color: '#071722',
  },
  status: {
    color: '#138bc1',
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f5',
  },
  passengerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f5',
  },
  smallButton: {
    backgroundColor: '#e6f5fb',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
  },
  smallButtonDisabled: {
    opacity: 0.5,
  },
  smallButtonText: {
    color: '#138bc1',
    fontWeight: '900',
  },
  map: {
    height: 320,
    borderRadius: 18,
    overflow: 'hidden',
  },
});
