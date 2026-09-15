import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

type Tab = 'home' | 'trips' | 'alerts' | 'profile';
type Flow = 'splash' | 'login' | 'home' | 'boarding' | 'active' | 'incident' | 'complete';

type PassengerState = 'Boarded' | 'Pending' | 'Absent';

type Passenger = { name: string; seat: string; status: PassengerState };

const trip = {
  id: 'EN-001',
  origin: 'Santo Domingo',
  destination: 'Santiago',
  departure: '08:30',
  arrival: '10:45',
  vehicle: 'Bus 203',
  plate: 'A874512',
  nextStop: 'Autopista Duarte checkpoint',
  passengers: 22,
  seats: 40,
};

const routeCoordinates = [
  { latitude: 18.4822, longitude: -69.9369 },
  { latitude: 18.72, longitude: -70.08 },
  { latitude: 18.98, longitude: -70.3 },
  { latitude: 19.22, longitude: -70.52 },
  { latitude: 19.4517, longitude: -70.697 },
];

const palette = {
  ink: '#11212f',
  inkSoft: '#20384a',
  muted: '#6f7e8a',
  line: '#d8e2e9',
  green: '#1f9d74',
  amber: '#d0902c',
  red: '#d65a58',
  blue: '#2da9df',
  bg: '#eef3f6',
  white: '#ffffff',
};

const initialPassengers: Passenger[] = [
  { name: 'Maria Torres', seat: '4B', status: 'Boarded' },
  { name: 'Luis Ibarra', seat: '4C', status: 'Pending' },
  { name: 'Andrea Molina', seat: '5A', status: 'Boarded' },
  { name: 'Cecilia Ramos', seat: '6D', status: 'Absent' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [flow, setFlowValue] = useState<Flow>('splash');
  const [passengers, setPassengers] = useState(initialPassengers);
  const opacity = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  function setFlow(next: Flow) {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 90, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 10, duration: 90, useNativeDriver: true }),
    ]).start(() => {
      setFlowValue(next);
      translateY.setValue(14);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, damping: 17, stiffness: 170, useNativeDriver: true }),
      ]).start();
    });
  }

  if (flow === 'splash') {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.splashSafe}>
          <StatusBar style="light" />
          <View style={styles.splash}>
            <View style={styles.splashMark}><MaterialCommunityIcons name="bus" size={32} color={palette.white} /></View>
            <Text style={styles.splashBrand}>Encore Driver</Text>
            <Text style={styles.splashTitle}>Operational tools built around the trip.</Text>
            <Text style={styles.splashCopy}>Board passengers, follow the route, report incidents, and close trips from one focused mobile experience.</Text>
            <PrimaryButton label="Continue" icon="arrow-forward" onPress={() => setFlow('login')} />
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (flow === 'login') {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.safe}>
          <StatusBar style="dark" />
          <View style={styles.login}>
            <View style={styles.loginMark}><MaterialCommunityIcons name="steering" size={30} color={palette.white} /></View>
            <Text style={styles.brand}>Encore Driver</Text>
            <Text style={styles.title}>Start your shift</Text>
            <Field label="Driver ID" value="ricardo.luna" />
            <Field label="Access code" value="123456" secure />
            <PrimaryButton label="Enter driver home" icon="log-in-outline" onPress={() => setFlow('home')} />
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <StatusBar style="dark" />
        <View style={styles.app}>
          <Header flow={flow} />
          <Animated.View style={{ flex: 1, opacity, transform: [{ translateY }] }}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
              {tab === 'home' && <Home flow={flow} setFlow={setFlow} passengers={passengers} setPassengers={setPassengers} />}
              {tab === 'trips' && <Trips setFlow={setFlow} />}
              {tab === 'alerts' && <Alerts setFlow={setFlow} />}
              {tab === 'profile' && <Profile />}
            </ScrollView>
          </Animated.View>
          <SafeAreaView edges={['bottom']} style={styles.navSafe}><BottomNav tab={tab} setTab={setTab} /></SafeAreaView>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function Header({ flow }: { flow: Flow }) {
  const status = flow === 'active' ? 'On route' : flow === 'boarding' ? 'Boarding' : flow === 'complete' ? 'Completed' : 'Available';
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.brand}>Encore Driver</Text>
        <Text style={styles.title}>{flow === 'home' ? "Today's operation" : flow === 'active' ? 'Active trip' : flow === 'boarding' ? 'Boarding' : flow === 'incident' ? 'Incident report' : 'Trip status'}</Text>
      </View>
      <View style={[styles.statusPill, flow === 'active' && styles.statusPillActive]}><View style={[styles.statusDot, flow === 'active' && styles.statusDotActive]} /><Text style={styles.statusText}>{status}</Text></View>
    </View>
  );
}

function Home({ flow, setFlow, passengers, setPassengers }: { flow: Flow; setFlow: (flow: Flow) => void; passengers: Passenger[]; setPassengers: (value: Passenger[]) => void }) {
  if (flow === 'boarding') return <Boarding passengers={passengers} setPassengers={setPassengers} setFlow={setFlow} />;
  if (flow === 'active') return <ActiveTrip setFlow={setFlow} />;
  if (flow === 'incident') return <Incident setFlow={setFlow} />;
  if (flow === 'complete') return <CompleteTrip setFlow={setFlow} />;

  return (
    <View style={styles.stack}>
      <View style={styles.commandCard}>
        <View style={styles.commandTop}><Text style={styles.commandLabel}>Next assigned trip</Text><Text style={styles.commandBadge}>Ready</Text></View>
        <Text style={styles.commandTitle}>{trip.id}</Text>
        <Text style={styles.commandRoute}>{trip.origin} → {trip.destination}</Text>
        <View style={styles.commandMetaRow}><Metric icon="clock-outline" label="Departure" value={trip.departure} /><Metric icon="bus-outline" label="Vehicle" value={trip.vehicle} /><Metric icon="people-outline" label="Passengers" value={`${trip.passengers}/${trip.seats}`} /></View>
        <PrimaryButton label="Start boarding" icon="people-outline" onPress={() => setFlow('boarding')} />
      </View>
      <DriverMap compact />
      <View style={styles.operationsCard}><Text style={styles.cardTitle}>Shift overview</Text><Info label="Vehicle inspection" value="Completed · 07:52" /><Info label="Fuel level" value="78%" /><Info label="Operations channel" value="Connected" /></View>
    </View>
  );
}

function Boarding({ passengers, setPassengers, setFlow }: { passengers: Passenger[]; setPassengers: (value: Passenger[]) => void; setFlow: (flow: Flow) => void }) {
  function toggle(passenger: Passenger) {
    setPassengers(passengers.map((item) => item.name === passenger.name ? { ...item, status: item.status === 'Boarded' ? 'Pending' : 'Boarded' } : item));
  }
  const boarded = passengers.filter((passenger) => passenger.status === 'Boarded').length;
  return (
    <View style={styles.stack}>
      <View style={styles.boardingSummary}><Text style={styles.boardingNumber}>{boarded}/{passengers.length}</Text><View><Text style={styles.cardTitle}>Preview passenger list</Text><Text style={styles.meta}>Tap a passenger to toggle boarded state.</Text></View></View>
      <View style={styles.card}>
        <TextInput style={styles.search} placeholder="Search passenger or seat" placeholderTextColor={palette.muted} />
        {passengers.map((passenger) => (
          <Pressable key={passenger.name} style={styles.passengerRow} onPress={() => toggle(passenger)}>
            <View style={styles.passengerAvatar}><Text style={styles.passengerAvatarText}>{passenger.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</Text></View>
            <View style={styles.passengerCopy}><Text style={styles.passengerName}>{passenger.name}</Text><Text style={styles.meta}>Seat {passenger.seat}</Text></View>
            <Text style={[styles.passengerStatus, passenger.status === 'Absent' && styles.statusAbsent, passenger.status === 'Pending' && styles.statusPending]}>{passenger.status}</Text>
          </Pressable>
        ))}
        <View style={styles.qrReady}><Ionicons name="qr-code-outline" size={22} color={palette.green} /><View><Text style={styles.infoValue}>QR boarding ready</Text><Text style={styles.meta}>Production scanner can replace this preview action.</Text></View></View>
        <PrimaryButton label="Start trip" icon="navigate-outline" onPress={() => setFlow('active')} />
      </View>
    </View>
  );
}

function ActiveTrip({ setFlow }: { setFlow: (flow: Flow) => void }) {
  return (
    <View style={styles.stack}>
      <DriverMap />
      <View style={styles.card}>
        <View style={styles.activeTop}><View><Text style={styles.cardEyebrow}>LIVE TRIP</Text><Text style={styles.cardTitle}>{trip.origin} → {trip.destination}</Text></View><Text style={styles.eta}>ETA {trip.arrival}</Text></View>
        <Info label="Next stop" value={trip.nextStop} />
        <Info label="Passengers" value="22 boarded · 1 absent" />
        <Info label="Vehicle" value={`${trip.vehicle} · ${trip.plate}`} />
        <View style={styles.actionRow}><SecondaryButton label="Report incident" icon="warning-outline" onPress={() => setFlow('incident')} /><PrimaryButton compact label="Complete trip" icon="checkmark-circle-outline" onPress={() => setFlow('complete')} /></View>
      </View>
    </View>
  );
}

function DriverMap({ compact }: { compact?: boolean }) {
  return (
    <View style={[styles.mapFrame, compact && styles.mapFrameCompact]}>
      <MapView provider={PROVIDER_GOOGLE} style={StyleSheet.absoluteFill} initialRegion={{ latitude: 18.965, longitude: -70.31, latitudeDelta: 1.15, longitudeDelta: 1.15 }} rotateEnabled={false} pitchEnabled={false} toolbarEnabled={false}>
        <Polyline coordinates={routeCoordinates} strokeColor={palette.green} strokeWidth={5} />
        <Marker coordinate={routeCoordinates[0]} title="Agora Mall" />
        <Marker coordinate={routeCoordinates[routeCoordinates.length - 1]} title="Monumento" />
        <Marker coordinate={routeCoordinates[2]} title="Bus 203"><View style={styles.busMarker}><MaterialCommunityIcons name="bus" size={18} color={palette.white} /></View></Marker>
      </MapView>
      <View style={styles.mapTopPill}><View style={styles.statusDotActive} /><Text style={styles.mapTopText}>GPS preview · On schedule</Text></View>
      {!compact && <View style={styles.mapBottomCard}><View><Text style={styles.meta}>Next checkpoint</Text><Text style={styles.mapBottomTitle}>Autopista Duarte · 42 min</Text></View><Ionicons name="navigate" size={22} color={palette.green} /></View>}
    </View>
  );
}

function Incident({ setFlow }: { setFlow: (flow: Flow) => void }) {
  const [type, setType] = useState('Traffic');
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Report incident</Text>
      <Text style={styles.meta}>Operations receives the incident against {trip.id}.</Text>
      <View style={styles.incidentGrid}>{['Traffic', 'Mechanical', 'Passenger', 'Route', 'Other'].map((item) => <Pressable key={item} onPress={() => setType(item)} style={[styles.incidentType, type === item && styles.incidentTypeActive]}><Text style={[styles.incidentText, type === item && styles.incidentTextActive]}>{item}</Text></Pressable>)}</View>
      <TextInput style={[styles.search, styles.notes]} placeholder="Add details for operations" placeholderTextColor={palette.muted} multiline />
      <PrimaryButton label="Send incident preview" icon="send-outline" onPress={() => setFlow('active')} />
    </View>
  );
}

function CompleteTrip({ setFlow }: { setFlow: (flow: Flow) => void }) {
  return (
    <View style={styles.completeCard}>
      <View style={styles.completeIcon}><Ionicons name="checkmark" size={34} color={palette.white} /></View>
      <Text style={styles.title}>Trip completed.</Text>
      <Text style={styles.metaCenter}>EN-001 has been closed for the preview and is ready for the Operations timeline.</Text>
      <View style={styles.completeStats}><Metric icon="people-outline" label="Boarded" value="22" /><Metric icon="flag-outline" label="Arrival" value={trip.arrival} /><Metric icon="speedometer-outline" label="Status" value="Closed" /></View>
      <PrimaryButton label="Back to home" icon="home-outline" onPress={() => setFlow('home')} />
    </View>
  );
}

function Trips({ setFlow }: { setFlow: (flow: Flow) => void }) {
  return <View style={styles.card}><Text style={styles.cardTitle}>Assigned trips</Text><Info label={trip.id} value={`${trip.origin} → ${trip.destination} · ${trip.departure}`} /><Info label="EN-002" value="Santo Domingo → Punta Cana · 11:15" /><PrimaryButton label="Open boarding" icon="people-outline" onPress={() => setFlow('boarding')} /></View>;
}

function Alerts({ setFlow }: { setFlow: (flow: Flow) => void }) {
  return <View style={styles.card}><Text style={styles.cardTitle}>Operations alerts</Text><Info label="Boarding" value="EN-001 boarding window opens in 10 minutes." /><Info label="Vehicle" value="Bus 203 inspection is complete." /><SecondaryButton label="Report an incident" icon="warning-outline" onPress={() => setFlow('incident')} /></View>;
}

function Profile() {
  return <View style={styles.card}><View style={styles.profileHero}><View style={styles.profileAvatar}><Text style={styles.profileAvatarText}>RL</Text></View><Text style={styles.cardTitle}>Ricardo Luna</Text><Text style={styles.meta}>Driver · Available</Text></View><Info label="Assigned vehicle" value={`${trip.vehicle} · ${trip.plate}`} /><Info label="License" value="DOP-D-5520" /><Info label="Shift" value="07:00 - 18:00" /></View>;
}

function Field({ label, value, secure }: { label: string; value: string; secure?: boolean }) {
  return <View style={styles.field}><Text style={styles.meta}>{label}</Text><TextInput secureTextEntry={secure} style={styles.input} defaultValue={value} /></View>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <View style={styles.info}><Text style={styles.meta}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View>;
}

function Metric({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return <View style={styles.metric}><Ionicons name={icon} size={18} color={palette.green} /><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{value}</Text></View>;
}

function PrimaryButton({ label, icon, compact, onPress }: { label: string; icon?: keyof typeof Ionicons.glyphMap; compact?: boolean; onPress: () => void }) {
  return <Pressable style={({ pressed }) => [styles.primaryButton, compact && styles.primaryButtonCompact, pressed && styles.buttonPressed]} onPress={onPress}>{icon && <Ionicons name={icon} size={18} color={palette.white} />}<Text style={styles.primaryButtonText}>{label}</Text></Pressable>;
}

function SecondaryButton({ label, icon, onPress }: { label: string; icon?: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return <Pressable style={styles.secondaryButton} onPress={onPress}>{icon && <Ionicons name={icon} size={18} color={palette.ink} />}<Text style={styles.secondaryButtonText}>{label}</Text></Pressable>;
}

function BottomNav({ tab, setTab }: { tab: Tab; setTab: (tab: Tab) => void }) {
  const items = [['home', 'home-outline', 'Home'], ['trips', 'bus-outline', 'Trips'], ['alerts', 'notifications-outline', 'Alerts'], ['profile', 'person-outline', 'Profile']] as const;
  return <View style={styles.nav}>{items.map(([item, icon, label]) => <Pressable key={item} style={[styles.navItem, tab === item && styles.navItemActive]} onPress={() => setTab(item)}><Ionicons name={icon} size={18} color={tab === item ? palette.green : palette.muted} /><Text style={[styles.navText, tab === item && styles.navTextActive]}>{label}</Text></Pressable>)}</View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  splashSafe: { flex: 1, backgroundColor: palette.ink },
  splash: { flex: 1, justifyContent: 'flex-end', gap: 16, padding: 24, backgroundColor: palette.ink },
  splashMark: { width: 64, height: 64, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.green },
  splashBrand: { color: '#a5ead1', fontWeight: '900', fontSize: 15 },
  splashTitle: { color: palette.white, fontWeight: '900', fontSize: 39, lineHeight: 42 },
  splashCopy: { color: '#c1ccd4', lineHeight: 21 },
  login: { flex: 1, justifyContent: 'center', gap: 13, padding: 20 },
  loginMark: { width: 58, height: 58, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.ink },
  app: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  content: { paddingBottom: 126, gap: 14 },
  stack: { gap: 14 },
  navSafe: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingBottom: 13 },
  brand: { color: palette.muted, fontWeight: '900', fontSize: 11 },
  title: { color: palette.ink, fontSize: 25, fontWeight: '900', lineHeight: 30 },
  statusPill: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 11, paddingVertical: 8, borderRadius: 999, backgroundColor: '#e0f4eb' },
  statusPillActive: { backgroundColor: '#e1f4fb' },
  statusDot: { width: 7, height: 7, borderRadius: 999, backgroundColor: palette.green },
  statusDotActive: { width: 8, height: 8, borderRadius: 999, backgroundColor: palette.blue },
  statusText: { color: palette.ink, fontWeight: '900', fontSize: 10 },
  commandCard: { gap: 13, padding: 19, borderRadius: 28, backgroundColor: palette.ink },
  commandTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  commandLabel: { color: '#a8b8c4', fontWeight: '800' },
  commandBadge: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, overflow: 'hidden', backgroundColor: '#234b42', color: '#a9ead3', fontWeight: '900', fontSize: 10 },
  commandTitle: { color: '#a7edd4', fontWeight: '900', fontSize: 13 },
  commandRoute: { color: palette.white, fontWeight: '900', fontSize: 26, lineHeight: 31 },
  commandMetaRow: { flexDirection: 'row', gap: 8 },
  card: { gap: 13, padding: 17, borderRadius: 25, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line },
  operationsCard: { gap: 12, padding: 17, borderRadius: 25, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line },
  cardTitle: { color: palette.ink, fontSize: 20, fontWeight: '900' },
  cardEyebrow: { color: palette.green, fontWeight: '900', fontSize: 10, letterSpacing: 1.5 },
  meta: { color: palette.muted, lineHeight: 19, fontSize: 12 },
  metaCenter: { color: palette.muted, lineHeight: 20, textAlign: 'center' },
  info: { gap: 3, paddingVertical: 6 },
  infoValue: { color: palette.ink, fontWeight: '900' },
  metric: { flex: 1, minWidth: 0, gap: 3, padding: 10, borderRadius: 16, backgroundColor: '#203446' },
  metricLabel: { color: '#9cb0bf', fontSize: 9, fontWeight: '800' },
  metricValue: { color: palette.white, fontWeight: '900', fontSize: 12 },
  mapFrame: { height: 300, overflow: 'hidden', borderRadius: 28, borderWidth: 1, borderColor: palette.line, backgroundColor: '#dfeef4' },
  mapFrameCompact: { height: 205 },
  mapTopPill: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.95)' },
  mapTopText: { color: palette.ink, fontWeight: '900', fontSize: 10 },
  mapBottomCard: { position: 'absolute', left: 12, right: 12, bottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 13, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.96)' },
  mapBottomTitle: { color: palette.ink, fontWeight: '900', marginTop: 2 },
  busMarker: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.green, borderWidth: 3, borderColor: palette.white },
  boardingSummary: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 15, borderRadius: 23, backgroundColor: '#e4f5ee' },
  boardingNumber: { minWidth: 68, textAlign: 'center', paddingVertical: 14, borderRadius: 18, overflow: 'hidden', backgroundColor: palette.green, color: palette.white, fontWeight: '900', fontSize: 18 },
  search: { minHeight: 48, borderRadius: 16, paddingHorizontal: 14, backgroundColor: '#f2f6f8', color: palette.ink, borderWidth: 1, borderColor: palette.line },
  passengerRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#edf2f5' },
  passengerAvatar: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e5f2f7' },
  passengerAvatarText: { color: palette.ink, fontWeight: '900', fontSize: 11 },
  passengerCopy: { flex: 1 },
  passengerName: { color: palette.ink, fontWeight: '900' },
  passengerStatus: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, overflow: 'hidden', backgroundColor: '#dff4eb', color: palette.green, fontWeight: '900', fontSize: 10 },
  statusAbsent: { backgroundColor: '#fde7e5', color: palette.red },
  statusPending: { backgroundColor: '#fff0d9', color: palette.amber },
  qrReady: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 17, backgroundColor: '#ebf7f1' },
  activeTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  eta: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, overflow: 'hidden', backgroundColor: '#e1f4fb', color: palette.blue, fontWeight: '900', fontSize: 10 },
  actionRow: { flexDirection: 'row', gap: 9 },
  incidentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  incidentType: { paddingHorizontal: 11, paddingVertical: 9, borderRadius: 14, backgroundColor: '#f0f4f6', borderWidth: 1, borderColor: palette.line },
  incidentTypeActive: { backgroundColor: '#fff0d9', borderColor: '#e2bd80' },
  incidentText: { color: palette.ink, fontWeight: '800', fontSize: 11 },
  incidentTextActive: { color: palette.amber },
  notes: { minHeight: 110, textAlignVertical: 'top', paddingTop: 12 },
  completeCard: { alignItems: 'center', gap: 14, padding: 22, borderRadius: 28, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line },
  completeIcon: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.green },
  completeStats: { width: '100%', flexDirection: 'row', gap: 8 },
  profileHero: { alignItems: 'center', gap: 4, paddingBottom: 10 },
  profileAvatar: { width: 72, height: 72, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.ink },
  profileAvatarText: { color: palette.white, fontSize: 22, fontWeight: '900' },
  field: { gap: 5, padding: 12, borderRadius: 18, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line },
  input: { color: palette.ink, fontWeight: '900', fontSize: 16, padding: 0 },
  primaryButton: { flex: 1, minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16, borderRadius: 18, backgroundColor: palette.green },
  primaryButtonCompact: { minHeight: 48 },
  primaryButtonText: { color: palette.white, fontWeight: '900', fontSize: 14 },
  secondaryButton: { flex: 1, minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 12, borderRadius: 18, backgroundColor: '#eef3f6', borderWidth: 1, borderColor: palette.line },
  secondaryButtonText: { color: palette.ink, fontWeight: '900', fontSize: 12 },
  buttonPressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
  nav: { marginHorizontal: 16, marginBottom: 10, flexDirection: 'row', gap: 7, padding: 8, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.98)', borderWidth: 1, borderColor: palette.line, shadowColor: '#17364d', shadowOpacity: 0.13, shadowRadius: 18, elevation: 6 },
  navItem: { flex: 1, minHeight: 48, gap: 2, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  navItemActive: { backgroundColor: '#e5f5ed' },
  navText: { color: palette.muted, fontWeight: '800', fontSize: 9 },
  navTextActive: { color: palette.green },
});
