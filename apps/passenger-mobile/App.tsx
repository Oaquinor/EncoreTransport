import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

type Tab = 'home' | 'trips' | 'tickets' | 'profile';
type BookingStep = 'search' | 'results' | 'trip' | 'seats' | 'passenger' | 'review' | 'payment' | 'confirmation' | 'ticket';

const trip = {
  id: 'EN-001',
  origin: 'Santo Domingo',
  destination: 'Santiago',
  date: 'Sep 14, 2026',
  departure: '08:30',
  arrival: '10:45',
  duration: '2h 15m',
  price: 'DOP 685',
  vehicle: 'Bus 203',
  driver: 'Ricardo Luna',
  boarding: 'Agora Mall, north entrance',
  dropoff: 'Monumento a los Heroes',
  seats: ['4B', '4C']
};

const palette = {
  ink: '#142232',
  muted: '#667789',
  line: '#d8e2ea',
  blue: '#39a9e1',
  green: '#1f9d74',
  bg: '#f5f8fb',
  white: '#ffffff'
};

export default function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [step, setStep] = useState<BookingStep>('search');
  const [selectedSeats, setSelectedSeats] = useState<string[]>(trip.seats);

  const title = tab === 'home' ? 'Where are you going?' : tab === 'trips' ? 'Trips' : tab === 'tickets' ? 'Tickets' : 'Profile';

  function toggleSeat(seat: string) {
    setSelectedSeats((current) => (current.includes(seat) ? current.filter((item) => item !== seat) : current.length < 2 ? [...current, seat] : current));
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.app}>
        <Header title={title} />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {tab === 'home' && <Home step={step} setStep={setStep} selectedSeats={selectedSeats} toggleSeat={toggleSeat} />}
          {tab === 'trips' && <Trips setStep={setStep} setTab={setTab} />}
          {tab === 'tickets' && <Ticket />}
          {tab === 'profile' && <Profile />}
        </ScrollView>
        <BottomNav tab={tab} setTab={setTab} />
      </View>
    </SafeAreaView>
  );
}

function Header({ title }: { title: string }) {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.brand}>Encore Passenger</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.avatar}><Text style={styles.avatarText}>ET</Text></View>
    </View>
  );
}

function Home({ step, setStep, selectedSeats, toggleSeat }: { step: BookingStep; setStep: (step: BookingStep) => void; selectedSeats: string[]; toggleSeat: (seat: string) => void }) {
  if (step === 'results') return <Results setStep={setStep} />;
  if (step === 'trip') return <TripDetails setStep={setStep} />;
  if (step === 'seats') return <Seats selectedSeats={selectedSeats} setStep={setStep} toggleSeat={toggleSeat} />;
  if (step === 'passenger') return <PassengerForm setStep={setStep} />;
  if (step === 'review') return <Review setStep={setStep} selectedSeats={selectedSeats} />;
  if (step === 'payment') return <Payment setStep={setStep} />;
  if (step === 'confirmation') return <Confirmation setStep={setStep} />;
  if (step === 'ticket') return <Ticket />;

  return (
    <View style={styles.stack}>
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>Premium intercity travel</Text>
        <Text style={styles.heroTitle}>Book a clear, comfortable trip in minutes.</Text>
        <Text style={styles.heroCopy}>Search routes, choose seats, preview payment, and keep a digital ticket ready.</Text>
      </View>
      <View style={styles.card}>
        <Field label="Origin" value="Santo Domingo" />
        <Field label="Destination" value="Santiago" />
        <View style={styles.row}>
          <Field compact label="Date" value="Sep 14" />
          <Field compact label="Passengers" value="2" />
        </View>
        <PrimaryButton label="Search trips" onPress={() => setStep('results')} />
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Upcoming trip</Text>
        <TripMini />
      </View>
    </View>
  );
}

function Results({ setStep }: { setStep: (step: BookingStep) => void }) {
  return (
    <View style={styles.stack}>
      {[trip, { ...trip, id: 'EN-002', destination: 'Punta Cana', departure: '11:15', arrival: '14:00', price: 'DOP 1,048' }].map((item) => (
        <Pressable key={item.id} style={styles.card} onPress={() => setStep('trip')}>
          <Text style={styles.badge}>{item.id}</Text>
          <Text style={styles.cardTitle}>{item.origin} → {item.destination}</Text>
          <Text style={styles.meta}>{item.departure} - {item.arrival} · {item.duration}</Text>
          <Text style={styles.meta}>{item.vehicle} · Wi-Fi · A/C · 18 seats</Text>
          <View style={styles.cardFooter}>
            <Text style={styles.price}>{item.price}</Text>
            <Text style={styles.link}>View details</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

function TripDetails({ setStep }: { setStep: (step: BookingStep) => void }) {
  return (
    <View style={styles.stack}>
      <MapMock />
      <View style={styles.card}>
        <Text style={styles.badge}>{trip.id}</Text>
        <Text style={styles.cardTitle}>{trip.origin} to {trip.destination}</Text>
        <Text style={styles.meta}>{trip.date} · {trip.departure} · {trip.duration}</Text>
        <Info label="Boarding" value={trip.boarding} />
        <Info label="Drop-off" value={trip.dropoff} />
        <Info label="Vehicle" value={`${trip.vehicle} · ${trip.driver}`} />
        <PrimaryButton label="Choose seats" onPress={() => setStep('seats')} />
      </View>
    </View>
  );
}

function Seats({ selectedSeats, setStep, toggleSeat }: { selectedSeats: string[]; setStep: (step: BookingStep) => void; toggleSeat: (seat: string) => void }) {
  const seats = useMemo(() => Array.from({ length: 32 }, (_, index) => `${Math.floor(index / 4) + 1}${['A', 'B', 'C', 'D'][index % 4]}`), []);
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Select seats</Text>
      <View style={styles.busFront}><Text style={styles.meta}>Driver · Front door</Text></View>
      <View style={styles.seatGrid}>
        {seats.map((seat, index) => {
          const reserved = ['3B', '5C', '6B'].includes(seat);
          const active = selectedSeats.includes(seat);
          return (
            <Pressable key={seat} disabled={reserved} onPress={() => toggleSeat(seat)} style={[styles.seat, index % 4 === 2 && styles.seatGap, reserved && styles.seatReserved, active && styles.seatActive]}>
              <Text style={[styles.seatText, active && styles.seatTextActive]}>{seat}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.meta}>Selected: {selectedSeats.join(', ')}</Text>
      <PrimaryButton label="Continue" onPress={() => setStep('passenger')} />
    </View>
  );
}

function PassengerForm({ setStep }: { setStep: (step: BookingStep) => void }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Passenger details</Text>
      <Field label="Passenger 1" value="Maria Torres" />
      <Field label="Document" value="001-7482110-4" />
      <Field label="Phone" value="+1 809 555 1842" />
      <Field label="Email" value="maria.torres@mail.com" />
      <Field label="Passenger 2" value="Luis Ibarra" />
      <PrimaryButton label="Review trip" onPress={() => setStep('review')} />
    </View>
  );
}

function Review({ setStep, selectedSeats }: { setStep: (step: BookingStep) => void; selectedSeats: string[] }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Review</Text>
      <Info label="Trip" value={`${trip.id} · ${trip.origin} to ${trip.destination}`} />
      <Info label="Passengers" value="Maria Torres, Luis Ibarra" />
      <Info label="Seats" value={selectedSeats.join(', ')} />
      <Info label="Subtotal" value="DOP 1,300" />
      <Info label="Fees" value="DOP 35" />
      <Info label="Total" value="DOP 1,335" />
      <PrimaryButton label="Payment preview" onPress={() => setStep('payment')} />
    </View>
  );
}

function Payment({ setStep }: { setStep: (step: BookingStep) => void }) {
  return (
    <View style={styles.card}>
      <Text style={styles.badge}>Mock gateway</Text>
      <Text style={styles.cardTitle}>Payment handoff ready</Text>
      <Text style={styles.meta}>Card, CardNet, and VisaNet states are represented without real charges.</Text>
      <View style={styles.row}>
        <Text style={styles.paymentChip}>Card</Text>
        <Text style={styles.paymentChip}>CardNet</Text>
        <Text style={styles.paymentChip}>VisaNet</Text>
      </View>
      <PrimaryButton label="Simulate pending payment" onPress={() => setStep('confirmation')} />
    </View>
  );
}

function Confirmation({ setStep }: { setStep: (step: BookingStep) => void }) {
  return (
    <View style={styles.card}>
      <Text style={styles.badge}>Payment pending</Text>
      <Text style={styles.cardTitle}>Your seats are being held.</Text>
      <Text style={styles.meta}>The preview does not mark payment as confirmed while the gateway state is pending.</Text>
      <PrimaryButton label="View digital ticket" onPress={() => setStep('ticket')} />
    </View>
  );
}

function Trips({ setStep, setTab }: { setStep: (step: BookingStep) => void; setTab: (tab: Tab) => void }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Upcoming</Text>
      <TripMini />
      <PrimaryButton label="Continue booking" onPress={() => {
        setTab('home');
        setStep('trip');
      }} />
    </View>
  );
}

function Ticket() {
  return (
    <View style={styles.ticket}>
      <Text style={styles.ticketBrand}>Encore Transport</Text>
      <Text style={styles.ticketTitle}>Digital Ticket</Text>
      <View style={styles.qr}><Text style={styles.qrText}>QR</Text></View>
      <Info light label="Booking" value="BK-EN-001-4281" />
      <Info light label="Passenger" value="Maria Torres" />
      <Info light label="Route" value={`${trip.origin} → ${trip.destination}`} />
      <Info light label="Seat" value="4B, 4C" />
      <Info light label="Status" value="Payment pending" />
    </View>
  );
}

function Profile() {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Maria Torres</Text>
      <Text style={styles.meta}>Verified passenger profile preview</Text>
      <Info label="Notifications" value="Email and push ready" />
      <Info label="Saved route" value="Santo Domingo to Santiago" />
    </View>
  );
}

function TripMini() {
  return (
    <View>
      <Text style={styles.badge}>{trip.id}</Text>
      <Text style={styles.cardTitle}>{trip.origin} → {trip.destination}</Text>
      <Text style={styles.meta}>{trip.date} · {trip.departure} · {trip.vehicle}</Text>
    </View>
  );
}

function MapMock() {
  return (
    <View style={styles.map}>
      <View style={styles.mapLine} />
      <Text style={[styles.mapPin, styles.mapStart]}>Origin</Text>
      <Text style={[styles.mapPin, styles.mapEnd]}>Destination</Text>
    </View>
  );
}

function Field({ label, value, compact }: { label: string; value: string; compact?: boolean }) {
  return (
    <View style={[styles.field, compact && styles.fieldCompact]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} defaultValue={value} />
    </View>
  );
}

function Info({ label, value, light }: { label: string; value: string; light?: boolean }) {
  return (
    <View style={styles.info}>
      <Text style={[styles.label, light && styles.lightLabel]}>{label}</Text>
      <Text style={[styles.infoValue, light && styles.lightValue]}>{value}</Text>
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

function BottomNav({ tab, setTab }: { tab: Tab; setTab: (tab: Tab) => void }) {
  return (
    <View style={styles.nav}>
      {(['home', 'trips', 'tickets', 'profile'] as Tab[]).map((item) => (
        <Pressable key={item} style={[styles.navItem, tab === item && styles.navItemActive]} onPress={() => setTab(item)}>
          <Text style={[styles.navText, tab === item && styles.navTextActive]}>{item[0].toUpperCase() + item.slice(1)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  app: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 14 },
  brand: { color: palette.muted, fontWeight: '800', fontSize: 12 },
  title: { color: palette.ink, fontSize: 28, fontWeight: '900' },
  avatar: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.ink },
  avatarText: { color: palette.white, fontWeight: '900' },
  content: { paddingBottom: 110, gap: 14 },
  stack: { gap: 14 },
  hero: { padding: 20, borderRadius: 28, backgroundColor: palette.ink },
  heroLabel: { color: '#bdefff', fontWeight: '900', marginBottom: 10 },
  heroTitle: { color: palette.white, fontSize: 34, lineHeight: 36, fontWeight: '900' },
  heroCopy: { color: '#d8e2ea', marginTop: 12, lineHeight: 21 },
  card: { gap: 12, padding: 16, borderRadius: 24, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line },
  cardTitle: { color: palette.ink, fontSize: 20, fontWeight: '900' },
  meta: { color: palette.muted, lineHeight: 20 },
  badge: { alignSelf: 'flex-start', overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#dff3fb', color: palette.ink, fontWeight: '900' },
  row: { flexDirection: 'row', gap: 10 },
  field: { flex: 1, gap: 6, padding: 12, borderRadius: 18, backgroundColor: '#f7fafc', borderWidth: 1, borderColor: palette.line },
  fieldCompact: { minWidth: 0 },
  label: { color: palette.muted, fontSize: 12, fontWeight: '800' },
  input: { color: palette.ink, fontSize: 16, fontWeight: '800', padding: 0 },
  primaryButton: { minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: palette.blue },
  primaryButtonText: { color: palette.white, fontWeight: '900', fontSize: 16 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { color: palette.ink, fontSize: 18, fontWeight: '900' },
  link: { color: palette.blue, fontWeight: '900' },
  map: { height: 180, borderRadius: 26, overflow: 'hidden', backgroundColor: '#dff3fb', borderWidth: 1, borderColor: palette.line },
  mapLine: { position: 'absolute', left: 54, right: 54, top: 88, height: 6, borderRadius: 999, backgroundColor: palette.green, transform: [{ rotate: '-10deg' }] },
  mapPin: { position: 'absolute', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: palette.white, color: palette.ink, fontWeight: '900' },
  mapStart: { left: 24, top: 52 },
  mapEnd: { right: 24, bottom: 48 },
  info: { gap: 2 },
  infoValue: { color: palette.ink, fontWeight: '900' },
  busFront: { padding: 12, borderRadius: 18, backgroundColor: '#eef4f8' },
  seatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  seat: { width: '20%', minWidth: 54, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#eef4f8' },
  seatGap: { marginLeft: 18 },
  seatReserved: { backgroundColor: '#d8e2ea', opacity: 0.55 },
  seatActive: { backgroundColor: palette.green },
  seatText: { color: palette.ink, fontWeight: '900' },
  seatTextActive: { color: palette.white },
  paymentChip: { flex: 1, textAlign: 'center', padding: 12, borderRadius: 16, backgroundColor: '#eef4f8', color: palette.ink, fontWeight: '900' },
  ticket: { gap: 14, padding: 22, borderRadius: 30, backgroundColor: palette.ink },
  ticketBrand: { color: palette.white, fontWeight: '900', fontSize: 18 },
  ticketTitle: { color: '#bdefff', fontWeight: '900', fontSize: 28 },
  qr: { width: 116, height: 116, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.white },
  qrText: { color: palette.ink, fontWeight: '900' },
  lightLabel: { color: '#aebdcc' },
  lightValue: { color: palette.white },
  nav: { position: 'absolute', left: 16, right: 16, bottom: 16, flexDirection: 'row', gap: 8, padding: 8, borderRadius: 24, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line },
  navItem: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  navItemActive: { backgroundColor: '#dff3fb' },
  navText: { color: palette.muted, fontWeight: '800', fontSize: 12 },
  navTextActive: { color: palette.ink }
});
