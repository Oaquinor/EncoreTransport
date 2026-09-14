import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

type Tab = 'home' | 'trips' | 'notifications' | 'profile';
type Flow = 'splash' | 'login' | 'home' | 'boarding' | 'active' | 'complete' | 'incident';

const trip = {
  id: 'EN-001',
  route: 'Santo Domingo → Santiago',
  departure: '08:30',
  eta: '10:45',
  vehicle: 'Bus 203',
  plate: 'A874512',
  driver: 'Ricardo Luna',
  passengers: 22,
  seats: 40,
  nextStop: 'Autopista Duarte checkpoint'
};

const passengers = [
  { name: 'Maria Torres', seat: '4B', status: 'Boarded' },
  { name: 'Luis Ibarra', seat: '4C', status: 'Pending' },
  { name: 'Andrea Molina', seat: '5A', status: 'Boarded' },
  { name: 'Cecilia Ramos', seat: '6D', status: 'Absent' }
];

const colors = {
  ink: '#12202f',
  panel: '#ffffff',
  bg: '#eef3f6',
  line: '#d8e2ea',
  muted: '#667789',
  action: '#1f9d74',
  warning: '#f5a623',
  blue: '#39a9e1'
};

export default function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [flow, setFlow] = useState<Flow>('splash');

  if (flow === 'splash') {
    return (
      <SafeAreaProvider>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar style="light" />
        <View style={styles.splash}>
          <Text style={styles.splashBrand}>Encore Driver</Text>
          <Text style={styles.splashTitle}>Operational tools for every trip.</Text>
          <PrimaryButton label="Continue" onPress={() => setFlow('login')} />
        </View>
      </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (flow === 'login') {
    return (
      <SafeAreaProvider>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar style="dark" />
        <View style={styles.login}>
          <Text style={styles.brand}>Encore Driver</Text>
          <Text style={styles.title}>Start your shift</Text>
          <Field label="Driver ID" value="ricardo.luna" />
          <Field label="Access code" value="123456" secure />
          <PrimaryButton label="Enter driver home" onPress={() => setFlow('home')} />
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
        <Header />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {tab === 'home' && <Home flow={flow} setFlow={setFlow} />}
          {tab === 'trips' && <Trips setFlow={setFlow} />}
          {tab === 'notifications' && <Notifications setFlow={setFlow} />}
          {tab === 'profile' && <Profile />}
        </ScrollView>
        <SafeAreaView edges={['bottom']} style={styles.navSafe}>
          <BottomNav tab={tab} setTab={setTab} />
        </SafeAreaView>
      </View>
    </SafeAreaView>
    </SafeAreaProvider>
  );
}

function Header() {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.brand}>Encore Driver</Text>
        <Text style={styles.title}>Today&apos;s operation</Text>
      </View>
      <View style={styles.statusPill}><Text style={styles.statusText}>Available</Text></View>
    </View>
  );
}

function Home({ flow, setFlow }: { flow: Flow; setFlow: (flow: Flow) => void }) {
  if (flow === 'boarding') return <Boarding setFlow={setFlow} />;
  if (flow === 'active') return <ActiveTrip setFlow={setFlow} />;
  if (flow === 'incident') return <Incident setFlow={setFlow} />;
  if (flow === 'complete') return <CompleteTrip setFlow={setFlow} />;

  return (
    <View style={styles.stack}>
      <View style={styles.commandCard}>
        <Text style={styles.commandLabel}>Next assigned trip</Text>
        <Text style={styles.commandTitle}>{trip.id}</Text>
        <Text style={styles.commandRoute}>{trip.route}</Text>
        <Text style={styles.commandMeta}>{trip.departure} · {trip.vehicle} · {trip.passengers}/{trip.seats} passengers</Text>
        <PrimaryButton label="Start boarding" onPress={() => setFlow('boarding')} />
      </View>
      <View style={styles.grid}>
        <Metric label="Vehicle" value={trip.vehicle} />
        <Metric label="Departure" value={trip.departure} />
        <Metric label="Passengers" value={`${trip.passengers}`} />
        <Metric label="Status" value="Ready" />
      </View>
      <MapPanel />
    </View>
  );
}

function Boarding({ setFlow }: { setFlow: (flow: Flow) => void }) {
  return (
    <View style={styles.stack}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Boarding list</Text>
        <TextInput style={styles.search} placeholder="Search passenger or seat" placeholderTextColor={colors.muted} />
        {passengers.map((passenger) => (
          <View key={passenger.name} style={styles.passengerRow}>
            <View>
              <Text style={styles.passengerName}>{passenger.name}</Text>
              <Text style={styles.meta}>Seat {passenger.seat}</Text>
            </View>
            <Text style={[styles.passengerStatus, passenger.status === 'Absent' && styles.statusAbsent, passenger.status === 'Pending' && styles.statusPending]}>{passenger.status}</Text>
          </View>
        ))}
        <Text style={styles.meta}>Boarding scan is ready for passenger ticket validation.</Text>
        <PrimaryButton label="Start trip" onPress={() => setFlow('active')} />
      </View>
    </View>
  );
}

function ActiveTrip({ setFlow }: { setFlow: (flow: Flow) => void }) {
  return (
    <View style={styles.stack}>
      <MapPanel active />
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Active trip</Text>
        <Info label="Route" value={trip.route} />
        <Info label="Next stop" value={trip.nextStop} />
        <Info label="ETA" value={trip.eta} />
        <Info label="Vehicle" value={`${trip.vehicle} · ${trip.plate}`} />
        <View style={styles.actionRow}>
          <SecondaryButton label="Report incident" onPress={() => setFlow('incident')} />
          <PrimaryButton label="Complete trip" onPress={() => setFlow('complete')} />
        </View>
      </View>
    </View>
  );
}

function Incident({ setFlow }: { setFlow: (flow: Flow) => void }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Report incident</Text>
      {['Traffic', 'Mechanical', 'Passenger', 'Route', 'Other'].map((item) => (
        <Pressable key={item} style={styles.incidentType}>
          <Text style={styles.incidentText}>{item}</Text>
        </Pressable>
      ))}
      <TextInput style={[styles.search, styles.notes]} placeholder="Add details for operations" placeholderTextColor={colors.muted} multiline />
      <PrimaryButton label="Send incident" onPress={() => setFlow('active')} />
    </View>
  );
}

function CompleteTrip({ setFlow }: { setFlow: (flow: Flow) => void }) {
  return (
    <View style={styles.card}>
      <Text style={styles.badge}>Completed</Text>
      <Text style={styles.cardTitle}>Trip closed.</Text>
      <Info label="Trip" value={trip.id} />
      <Info label="Passengers" value="22 boarded · 1 absent" />
      <Info label="Arrival" value={trip.eta} />
      <PrimaryButton label="Back to home" onPress={() => setFlow('home')} />
    </View>
  );
}

function Trips({ setFlow }: { setFlow: (flow: Flow) => void }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Assigned trips</Text>
      <Info label={trip.id} value={`${trip.route} · ${trip.departure}`} />
      <Info label="EN-002" value="Santo Domingo → Punta Cana · 11:15" />
      <PrimaryButton label="Open boarding" onPress={() => setFlow('boarding')} />
    </View>
  );
}

function Notifications({ setFlow }: { setFlow: (flow: Flow) => void }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Notifications</Text>
      <Info label="Operations" value="EN-001 boarding window opens in 10 minutes." />
      <Info label="Vehicle" value="Bus 203 inspection is complete." />
      <SecondaryButton label="Report an incident" onPress={() => setFlow('incident')} />
    </View>
  );
}

function Profile() {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Ricardo Luna</Text>
      <Info label="Status" value="Available" />
      <Info label="Assigned vehicle" value={`${trip.vehicle} · ${trip.plate}`} />
      <Info label="License" value="DOP-D-5520" />
    </View>
  );
}

function MapPanel({ active }: { active?: boolean }) {
  return (
    <View style={styles.map}>
      <View style={styles.mapDistrictOne} />
      <View style={styles.mapDistrictTwo} />
      <View style={styles.mapRoadBase} />
      <View style={[styles.mapLine, active && styles.mapLineActive]} />
      <Text style={[styles.mapPin, styles.mapStart]}>Agora Mall</Text>
      <Text style={[styles.mapPin, styles.mapEnd]}>{active ? 'Checkpoint' : 'Monumento'}</Text>
      <Text style={styles.mapVehicle}>{active ? 'Live · Bus 203' : 'Route EN-001'}</Text>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.meta}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function Field({ label, value, secure }: { label: string; value: string; secure?: boolean }) {
  return (
    <View style={styles.field}>
      <Text style={styles.meta}>{label}</Text>
      <TextInput secureTextEntry={secure} style={styles.input} defaultValue={value} />
    </View>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.info}>
      <Text style={styles.meta}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.primaryButton} onPress={onPress}>
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.secondaryButton} onPress={onPress}>
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function BottomNav({ tab, setTab }: { tab: Tab; setTab: (tab: Tab) => void }) {
  return (
    <View style={styles.nav}>
      {(['home', 'trips', 'notifications', 'profile'] as Tab[]).map((item) => (
        <Pressable key={item} style={[styles.navItem, tab === item && styles.navItemActive]} onPress={() => setTab(item)}>
          <Text style={[styles.navText, tab === item && styles.navTextActive]}>{item === 'notifications' ? 'Alerts' : item[0].toUpperCase() + item.slice(1)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  app: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
  navSafe: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  splash: { flex: 1, justifyContent: 'flex-end', gap: 18, padding: 24, backgroundColor: colors.ink },
  splashBrand: { color: '#bdefff', fontWeight: '900', fontSize: 16 },
  splashTitle: { color: '#ffffff', fontWeight: '900', fontSize: 42, lineHeight: 44 },
  login: { flex: 1, justifyContent: 'center', gap: 14, padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 14 },
  brand: { color: colors.muted, fontWeight: '900', fontSize: 12 },
  title: { color: colors.ink, fontSize: 28, fontWeight: '900' },
  statusPill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#dff4eb' },
  statusText: { color: colors.action, fontWeight: '900' },
  content: { gap: 14, paddingBottom: 110 },
  stack: { gap: 14 },
  commandCard: { gap: 12, padding: 18, borderRadius: 28, backgroundColor: colors.ink },
  commandLabel: { color: '#bdefff', fontWeight: '900' },
  commandTitle: { color: '#ffffff', fontSize: 44, fontWeight: '900' },
  commandRoute: { color: '#ffffff', fontSize: 22, fontWeight: '900' },
  commandMeta: { color: '#d8e2ea' },
  card: { gap: 12, padding: 16, borderRadius: 24, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line },
  cardTitle: { color: colors.ink, fontSize: 22, fontWeight: '900' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric: { width: '47%', gap: 4, padding: 14, borderRadius: 20, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line },
  metricValue: { color: colors.ink, fontWeight: '900', fontSize: 17 },
  meta: { color: colors.muted, lineHeight: 20 },
  map: { height: 190, borderRadius: 26, overflow: 'hidden', backgroundColor: '#dcecf2', borderWidth: 1, borderColor: colors.line },
  mapDistrictOne: { position: 'absolute', left: 16, bottom: 18, width: 132, height: 88, borderRadius: 24, backgroundColor: '#cfe8db' },
  mapDistrictTwo: { position: 'absolute', right: -18, top: 12, width: 154, height: 92, borderRadius: 32, backgroundColor: '#c9e9f7' },
  mapRoadBase: { position: 'absolute', left: 28, right: 28, top: 90, height: 19, borderRadius: 999, backgroundColor: '#ffffff', transform: [{ rotate: '-11deg' }] },
  mapLine: { position: 'absolute', left: 42, right: 42, top: 96, height: 7, borderRadius: 999, backgroundColor: colors.blue, transform: [{ rotate: '-11deg' }] },
  mapLineActive: { backgroundColor: colors.action },
  mapPin: { position: 'absolute', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, overflow: 'hidden', backgroundColor: colors.panel, color: colors.ink, fontWeight: '900' },
  mapStart: { left: 18, top: 46 },
  mapEnd: { right: 18, bottom: 42 },
  mapVehicle: { position: 'absolute', left: 122, top: 80, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, overflow: 'hidden', backgroundColor: colors.ink, color: '#ffffff', fontWeight: '900' },
  search: { minHeight: 48, paddingHorizontal: 14, borderRadius: 16, backgroundColor: '#f5f8fb', borderWidth: 1, borderColor: colors.line, color: colors.ink },
  notes: { minHeight: 94, textAlignVertical: 'top', paddingTop: 14 },
  passengerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  passengerName: { color: colors.ink, fontWeight: '900' },
  passengerStatus: { color: colors.action, fontWeight: '900' },
  statusAbsent: { color: '#d95050' },
  statusPending: { color: colors.warning },
  actionRow: { flexDirection: 'row', gap: 10 },
  incidentType: { padding: 14, borderRadius: 18, backgroundColor: '#f5f8fb', borderWidth: 1, borderColor: colors.line },
  incidentText: { color: colors.ink, fontWeight: '900' },
  badge: { alignSelf: 'flex-start', overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#dff4eb', color: colors.action, fontWeight: '900' },
  field: { gap: 6, padding: 12, borderRadius: 18, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line },
  input: { color: colors.ink, fontWeight: '900', fontSize: 16, padding: 0 },
  info: { gap: 2 },
  infoValue: { color: colors.ink, fontWeight: '900' },
  primaryButton: { flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: colors.action },
  primaryButtonText: { color: '#ffffff', fontWeight: '900', fontSize: 16 },
  secondaryButton: { flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: '#eef4f8', borderWidth: 1, borderColor: colors.line },
  secondaryButtonText: { color: colors.ink, fontWeight: '900', fontSize: 16 },
  nav: { marginHorizontal: 16, marginBottom: 10, flexDirection: 'row', gap: 8, padding: 8, borderRadius: 24, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line },
  navItem: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  navItemActive: { backgroundColor: '#dff4eb' },
  navText: { color: colors.muted, fontWeight: '800', fontSize: 12 },
  navTextActive: { color: colors.ink }
});
