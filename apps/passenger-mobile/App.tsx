import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

type Tab = 'home' | 'trips' | 'tickets' | 'profile';
type BookingStep = 'search' | 'results' | 'trip' | 'seats' | 'passenger' | 'review' | 'payment' | 'confirmation' | 'ticket';
type SeatStatus = 'available' | 'selected' | 'occupied' | 'reserved' | 'unavailable' | 'accessible';

const trip = {
  id: 'EN-001',
  origin: 'Santo Domingo',
  destination: 'Santiago',
  date: 'Sep 14, 2026',
  departure: '08:30',
  arrival: '10:45',
  duration: '2h 15m',
  price: 685,
  vehicle: 'Bus 203',
  plate: 'A874512',
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
  blueDark: '#1e7fb3',
  green: '#1f9d74',
  bg: '#f5f8fb',
  white: '#ffffff',
  warning: '#b66a1d'
};

const steps: BookingStep[] = ['search', 'results', 'trip', 'seats', 'passenger', 'review', 'payment', 'confirmation', 'ticket'];

export default function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [step, setStepValue] = useState<BookingStep>('search');
  const [selectedSeats, setSelectedSeats] = useState<string[]>(trip.seats);
  const opacity = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  function setStep(next: BookingStep) {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 90, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 10, duration: 90, useNativeDriver: true })
    ]).start(() => {
      setStepValue(next);
      translateY.setValue(12);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, damping: 18, stiffness: 170, mass: 0.7, useNativeDriver: true })
      ]).start();
    });
  }

  function toggleSeat(seat: string) {
    setSelectedSeats((current) => {
      if (current.includes(seat)) return current.filter((item) => item !== seat);
      if (current.length >= 2) return current;
      return [...current, seat];
    });
  }

  const title = tab === 'home' ? titleForStep(step) : tab === 'trips' ? 'Trips' : tab === 'tickets' ? 'Tickets' : 'Profile';

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <StatusBar style="dark" />
        <View style={styles.app}>
          <Header title={title} step={tab === 'home' ? step : undefined} onBack={step !== 'search' && tab === 'home' ? () => setStep(previousStep(step)) : undefined} />
          <Animated.View style={{ flex: 1, opacity, transform: [{ translateY }] }}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
              {tab === 'home' && <Home step={step} setStep={setStep} selectedSeats={selectedSeats} toggleSeat={toggleSeat} />}
              {tab === 'trips' && <Trips setStep={setStep} setTab={setTab} />}
              {tab === 'tickets' && <Ticket selectedSeats={selectedSeats} />}
              {tab === 'profile' && <Profile />}
            </ScrollView>
          </Animated.View>
          <SafeAreaView edges={['bottom']} style={styles.navSafe}>
            <BottomNav tab={tab} setTab={setTab} />
          </SafeAreaView>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function titleForStep(step: BookingStep) {
  return {
    search: 'Where are you going?',
    results: 'Available trips',
    trip: 'Trip details',
    seats: 'Choose seats',
    passenger: 'Passenger details',
    review: 'Review trip',
    payment: 'Payment',
    confirmation: 'Confirmation',
    ticket: 'Boarding pass'
  }[step];
}

function previousStep(step: BookingStep): BookingStep {
  return steps[Math.max(0, steps.indexOf(step) - 1)];
}

function Header({ title, step, onBack }: { title: string; step?: BookingStep; onBack?: () => void }) {
  const progress = step ? Math.max(0.08, (steps.indexOf(step) + 1) / steps.length) : 0;
  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        {onBack ? (
          <Pressable style={styles.iconButton} onPress={onBack}>
            <Ionicons name="chevron-back" size={22} color={palette.ink} />
          </Pressable>
        ) : (
          <View style={styles.logoMark}><Text style={styles.logoText}>E</Text></View>
        )}
        <View style={styles.headerCopy}>
          <Text style={styles.brand}>Encore Passenger</Text>
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={styles.avatar}><Text style={styles.avatarText}>MT</Text></View>
      </View>
      {step && <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress * 100}%` }]} /></View>}
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
  if (step === 'ticket') return <Ticket selectedSeats={selectedSeats} />;

  return (
    <View style={styles.stack}>
      <View style={styles.searchPanel}>
        <Text style={styles.greeting}>Good morning, Maria</Text>
        <Text style={styles.searchTitle}>Book your next route</Text>
        <SearchField icon="location-outline" label="Origin" value="Santo Domingo" />
        <SearchField icon="flag-outline" label="Destination" value="Santiago" />
        <View style={styles.row}>
          <SearchField compact icon="calendar-outline" label="Date" value="Sep 14" />
          <SearchField compact icon="people-outline" label="Passengers" value="2" />
        </View>
        <PrimaryButton label="Search trips" icon="search" onPress={() => setStep('results')} />
      </View>
      <SectionHeader title="Upcoming trip" action="Ticket" />
      <Pressable style={styles.upcomingCard} onPress={() => setStep('ticket')}>
        <View style={styles.routeCode}><Text style={styles.routeCodeText}>EN-001</Text></View>
        <View style={styles.routeTimes}>
          <TimeBlock time={trip.departure} city="Santo Domingo" light />
          <View style={styles.routeLine}><View style={styles.routeDot} /><View style={styles.routeDash} /><View style={[styles.routeDot, styles.routeDotEnd]} /></View>
          <TimeBlock time={trip.arrival} city="Santiago" alignRight light />
        </View>
        <Text style={styles.metaOnDark}>{trip.vehicle} · Seats {selectedSeats.join(', ')} · Payment pending</Text>
      </Pressable>
      <SectionHeader title="Popular destinations" />
      <View style={styles.destinationRow}>
        {['Santiago', 'Punta Cana', 'La Romana'].map((destination, index) => (
          <Pressable key={destination} style={[styles.destinationChip, index === 1 && styles.destinationChipAlt]}>
            <Text style={styles.destinationText}>{destination}</Text>
            <Text style={styles.destinationSub}>{index === 0 ? '08:30' : index === 1 ? '11:15' : '18:10'}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Results({ setStep }: { setStep: (step: BookingStep) => void }) {
  const trips = [trip, { ...trip, id: 'EN-002', destination: 'Punta Cana', departure: '11:15', arrival: '14:00', price: 1048, vehicle: 'Bus 118' }];
  return (
    <View style={styles.stack}>
      <RouteMap compact />
      {trips.map((item) => (
        <Pressable key={item.id} style={styles.tripResult} onPress={() => setStep('trip')}>
          <View>
            <Text style={styles.badge}>{item.id}</Text>
            <Text style={styles.tripTitle}>{item.origin} → {item.destination}</Text>
            <Text style={styles.meta}>{item.departure} - {item.arrival} · {item.duration}</Text>
          </View>
          <View style={styles.resultFooter}>
            <Text style={styles.price}>DOP {item.price}</Text>
            <Ionicons name="chevron-forward" size={20} color={palette.blueDark} />
          </View>
        </Pressable>
      ))}
    </View>
  );
}

function TripDetails({ setStep }: { setStep: (step: BookingStep) => void }) {
  return (
    <View style={styles.stack}>
      <RouteMap />
      <View style={styles.tripHero}>
        <Text style={styles.badge}>{trip.id} · Boarding</Text>
        <Text style={styles.screenTitle}>{trip.origin} to {trip.destination}</Text>
        <View style={styles.detailGrid}>
          <Info icon="time-outline" label="Departure" value={`${trip.date} · ${trip.departure}`} />
          <Info icon="bus-outline" label="Vehicle" value={`${trip.vehicle} · ${trip.plate}`} />
          <Info icon="person-outline" label="Driver" value={trip.driver} />
          <Info icon="bag-handle-outline" label="Included" value="Wi-Fi · A/C · Luggage" />
        </View>
      </View>
      <View style={styles.stopPanel}>
        <Stop label="Boarding" value={trip.boarding} />
        <Stop label="Drop-off" value={trip.dropoff} last />
      </View>
      <StickyAction title="DOP 685" subtitle="18 seats available" label="Select seats" onPress={() => setStep('seats')} />
    </View>
  );
}

function Seats({ selectedSeats, setStep, toggleSeat }: { selectedSeats: string[]; setStep: (step: BookingStep) => void; toggleSeat: (seat: string) => void }) {
  const seats = useMemo(() => Array.from({ length: 40 }, (_, index) => {
    const id = `${Math.floor(index / 4) + 1}${['A', 'B', 'C', 'D'][index % 4]}`;
    const status: SeatStatus = selectedSeats.includes(id) ? 'selected' : ['3B', '5C', '6B', '9A'].includes(id) ? 'occupied' : ['10C', '10D'].includes(id) ? 'unavailable' : ['1A'].includes(id) ? 'accessible' : ['7D'].includes(id) ? 'reserved' : 'available';
    return { id, status };
  }), [selectedSeats]);

  return (
    <View style={styles.stack}>
      <View style={styles.seatHeader}>
        <View style={styles.headerCopy}>
          <Text style={styles.badge}>2 passengers</Text>
          <Text style={styles.screenTitle}>Choose seats inside {trip.vehicle}</Text>
        </View>
        <Text style={styles.seatCounter}>{selectedSeats.length}/2</Text>
      </View>
      <SeatLegend />
      <View style={styles.busMap}>
        <View style={styles.windshield} />
        <View style={styles.cockpit}>
          <View style={styles.driverWheel}><MaterialCommunityIcons name="steering" size={20} color={palette.white} /></View>
          <View style={styles.frontDoor}><Text style={styles.frontDoorText}>Door</Text></View>
        </View>
        <View style={styles.seatRows}>
          {Array.from({ length: 10 }, (_, row) => {
            const rowSeats = seats.slice(row * 4, row * 4 + 4);
            return (
              <View key={row} style={styles.seatRow}>
                <Text style={styles.rowNumber}>{row + 1}</Text>
                {rowSeats.map((seat, index) => <SeatButton key={seat.id} seat={seat} aisle={index === 2} onPress={() => ['available', 'selected', 'accessible'].includes(seat.status) && toggleSeat(seat.id)} />)}
              </View>
            );
          })}
        </View>
        <View style={styles.backBench}><Text style={styles.backBenchText}>Rear zone</Text></View>
      </View>
      <StickyAction title={`DOP ${selectedSeats.length * trip.price}`} subtitle={`Seats ${selectedSeats.join(', ') || 'not selected'}`} label="Continue" disabled={selectedSeats.length !== 2} onPress={() => setStep('passenger')} />
    </View>
  );
}

function PassengerForm({ setStep }: { setStep: (step: BookingStep) => void }) {
  return (
    <View style={styles.formScreen}>
      <Text style={styles.screenTitle}>Passenger details</Text>
      <SearchField icon="person-outline" label="Passenger 1" value="Maria Torres" />
      <SearchField icon="card-outline" label="Document" value="001-7482110-4" />
      <SearchField icon="call-outline" label="Phone" value="+1 809 555 1842" />
      <SearchField icon="person-add-outline" label="Passenger 2" value="Luis Ibarra" />
      <PrimaryButton label="Review trip" icon="checkmark-circle-outline" onPress={() => setStep('review')} />
    </View>
  );
}

function Review({ setStep, selectedSeats }: { setStep: (step: BookingStep) => void; selectedSeats: string[] }) {
  return (
    <View style={styles.stack}>
      <Text style={styles.screenTitle}>Review and authorize</Text>
      <View style={styles.summaryPanel}>
        <Summary label="Trip" value={`${trip.id} · ${trip.origin} to ${trip.destination}`} />
        <Summary label="Passengers" value="Maria Torres, Luis Ibarra" />
        <Summary label="Seats" value={selectedSeats.join(', ')} />
        <Summary label="Subtotal" value="DOP 1,370" />
        <Summary label="Service fee" value="DOP 35" />
        <Summary label="Total" value="DOP 1,405" strong />
      </View>
      <PrimaryButton label="Continue to payment" icon="lock-closed-outline" onPress={() => setStep('payment')} />
    </View>
  );
}

function Payment({ setStep }: { setStep: (step: BookingStep) => void }) {
  return (
    <View style={styles.stack}>
      <View style={styles.paymentCard}>
        <View style={styles.processingRing}><Ionicons name="card-outline" size={32} color={palette.blueDark} /></View>
        <Text style={styles.screenTitle}>Authorize payment</Text>
        <Text style={styles.metaCenter}>Choose a method and continue. The booking remains pending until the provider authorizes it.</Text>
        <View style={styles.methodRow}>
          <PaymentMethod active label="Card" />
          <PaymentMethod label="CardNet" />
          <PaymentMethod label="VisaNet" />
        </View>
      </View>
      <PrimaryButton label="Hold seats and continue" icon="shield-checkmark-outline" onPress={() => setStep('confirmation')} />
    </View>
  );
}

function Confirmation({ setStep }: { setStep: (step: BookingStep) => void }) {
  return (
    <View style={styles.confirmation}>
      <View style={styles.successIcon}><Ionicons name="checkmark" size={34} color={palette.white} /></View>
      <Text style={styles.screenTitle}>Your seats are being held.</Text>
      <Text style={styles.metaCenter}>Payment status is pending. Your boarding pass is ready for check-in review.</Text>
      <PrimaryButton label="View boarding pass" icon="ticket-outline" onPress={() => setStep('ticket')} />
    </View>
  );
}

function Ticket({ selectedSeats = trip.seats }: { selectedSeats?: string[] }) {
  return (
    <View style={styles.ticket}>
      <View style={styles.ticketTop}>
        <View>
          <Text style={styles.ticketBrand}>Encore Transport</Text>
          <Text style={styles.ticketTitle}>Digital Boarding Pass</Text>
        </View>
        <Text style={styles.ticketStatus}>Pending</Text>
      </View>
      <View style={styles.ticketRoute}>
        <TimeBlock time={trip.departure} city="SDQ" light />
        <View style={styles.ticketRouteLine} />
        <TimeBlock time={trip.arrival} city="STI" alignRight light />
      </View>
      <View style={styles.ticketCut} />
      <View style={styles.ticketBody}>
        <QrCode />
        <View style={styles.ticketDetails}>
          <Summary label="Booking" value="BK-EN-001-4281" light />
          <Summary label="Passenger" value="Maria Torres" light />
          <Summary label="Seat" value={selectedSeats.join(', ')} light />
          <Summary label="Bus" value={`${trip.vehicle} · ${trip.plate}`} light />
        </View>
      </View>
    </View>
  );
}

function Trips({ setStep, setTab }: { setStep: (step: BookingStep) => void; setTab: (tab: Tab) => void }) {
  return (
    <View style={styles.stack}>
      <SectionHeader title="Upcoming" />
      <Pressable style={styles.upcomingCard} onPress={() => { setTab('home'); setStep('trip'); }}>
        <Text style={styles.badge}>{trip.id}</Text>
        <Text style={styles.tripTitleOnDark}>{trip.origin} → {trip.destination}</Text>
        <Text style={styles.metaOnDark}>{trip.date} · {trip.departure} · {trip.vehicle}</Text>
      </Pressable>
    </View>
  );
}

function Profile() {
  return (
    <View style={styles.formScreen}>
      <Text style={styles.screenTitle}>Maria Torres</Text>
      <Info icon="notifications-outline" label="Notifications" value="Email and push enabled" />
      <Info icon="map-outline" label="Saved route" value="Santo Domingo to Santiago" />
      <Info icon="shield-checkmark-outline" label="Profile" value="Verified passenger" />
    </View>
  );
}

function RouteMap({ compact }: { compact?: boolean }) {
  return (
    <View style={[styles.map, compact && styles.mapCompact]}>
      <View style={styles.mapDistrictOne} />
      <View style={styles.mapDistrictTwo} />
      <View style={styles.mapDistrictThree} />
      <View style={styles.mapRoadSoft} />
      <View style={styles.mapRoadSoftTwo} />
      <View style={styles.mapRoad} />
      <Text style={[styles.mapPin, styles.mapStart]}>Agora Mall</Text>
      <Text style={[styles.mapPin, styles.mapEnd]}>Monumento</Text>
      <Text style={styles.mapBus}>Bus 203 · ETA 10:45</Text>
    </View>
  );
}

function SeatButton({ seat, aisle, onPress }: { seat: { id: string; status: SeatStatus }; aisle?: boolean; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  function press() {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.92, duration: 70, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, damping: 12, stiffness: 260, useNativeDriver: true })
    ]).start();
    onPress();
  }
  const disabled = ['occupied', 'reserved', 'unavailable'].includes(seat.status);
  return (
    <>
      {aisle && <View style={styles.aisle} />}
      <Animated.View style={{ transform: [{ scale }] }}>
        <Pressable disabled={disabled} onPress={press} style={[styles.seat, seatStyle(seat.status)]}>
          <View style={styles.seatBack} />
          <Text style={[styles.seatText, seat.status === 'selected' && styles.seatTextSelected]}>{seat.id}</Text>
          {seat.status === 'accessible' && <Ionicons name="accessibility" size={10} color={palette.blueDark} />}
        </Pressable>
      </Animated.View>
    </>
  );
}

function seatStyle(status: SeatStatus) {
  return {
    available: styles.seatAvailable,
    selected: styles.seatSelected,
    occupied: styles.seatOccupied,
    reserved: styles.seatReserved,
    unavailable: styles.seatUnavailable,
    accessible: styles.seatAccessible
  }[status];
}

function SeatLegend() {
  const items: [string, SeatStatus][] = [['Available', 'available'], ['Selected', 'selected'], ['Occupied', 'occupied'], ['Reserved', 'reserved'], ['Accessible', 'accessible']];
  return <View style={styles.legend}>{items.map(([label, status]) => <View key={label} style={styles.legendItem}><View style={[styles.legendDot, legendStyle(status)]} /><Text style={styles.legendText}>{label}</Text></View>)}</View>;
}

function legendStyle(status: SeatStatus) {
  return {
    available: styles.legendAvailable,
    selected: styles.legendSelected,
    occupied: styles.legendOccupied,
    reserved: styles.legendReserved,
    unavailable: styles.legendOccupied,
    accessible: styles.legendAccessible
  }[status];
}

function SearchField({ icon, label, value, compact }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; compact?: boolean }) {
  return <View style={[styles.field, compact && styles.fieldCompact]}><Ionicons name={icon} size={18} color={palette.blueDark} /><View style={styles.fieldText}><Text style={styles.label}>{label}</Text><TextInput style={styles.input} defaultValue={value} /></View></View>;
}

function Info({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return <View style={styles.info}><Ionicons name={icon} size={17} color={palette.blueDark} /><View><Text style={styles.label}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View></View>;
}

function Stop({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return <View style={styles.stop}><View style={[styles.stopDot, last && styles.stopDotEnd]} /><View><Text style={styles.label}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View></View>;
}

function Summary({ label, value, strong, light }: { label: string; value: string; strong?: boolean; light?: boolean }) {
  return <View style={styles.summaryRow}><Text style={[styles.summaryLabel, light && styles.summaryLabelLight]}>{label}</Text><Text style={[styles.summaryValue, strong && styles.summaryStrong, light && styles.summaryValueLight]}>{value}</Text></View>;
}

function PaymentMethod({ label, active }: { label: string; active?: boolean }) {
  return <View style={[styles.paymentMethod, active && styles.paymentMethodActive]}><Text style={[styles.paymentMethodText, active && styles.paymentMethodTextActive]}>{label}</Text></View>;
}

function TimeBlock({ time, city, alignRight, light }: { time: string; city: string; alignRight?: boolean; light?: boolean }) {
  return <View style={alignRight && styles.alignRight}><Text style={[styles.time, light && styles.lightText]}>{time}</Text><Text style={[styles.city, light && styles.lightSubText]}>{city}</Text></View>;
}

function SectionHeader({ title, action }: { title: string; action?: string }) {
  return <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{title}</Text>{action && <Text style={styles.link}>{action}</Text>}</View>;
}

function StickyAction({ title, subtitle, label, disabled, onPress }: { title: string; subtitle: string; label: string; disabled?: boolean; onPress: () => void }) {
  return <View style={styles.stickyAction}><View style={styles.headerCopy}><Text style={styles.stickyTitle}>{title}</Text><Text style={styles.meta}>{subtitle}</Text></View><PrimaryButton compact disabled={disabled} label={label} icon="arrow-forward" onPress={onPress} /></View>;
}

function PrimaryButton({ label, icon, compact, disabled, onPress }: { label: string; icon?: keyof typeof Ionicons.glyphMap; compact?: boolean; disabled?: boolean; onPress: () => void }) {
  return <Pressable disabled={disabled} style={[styles.primaryButton, compact && styles.primaryButtonCompact, disabled && styles.disabledButton]} onPress={onPress}>{icon && <Ionicons name={icon} size={18} color={palette.white} />}<Text style={styles.primaryButtonText}>{label}</Text></Pressable>;
}

function BottomNav({ tab, setTab }: { tab: Tab; setTab: (tab: Tab) => void }) {
  const items = [['home', 'home-outline', 'Home'], ['trips', 'bus-outline', 'Trips'], ['tickets', 'ticket-outline', 'Tickets'], ['profile', 'person-outline', 'Profile']] as const;
  return <View style={styles.nav}>{items.map(([item, icon, label]) => <Pressable key={item} style={[styles.navItem, tab === item && styles.navItemActive]} onPress={() => setTab(item)}><Ionicons name={icon} size={18} color={tab === item ? palette.blueDark : palette.muted} /><Text style={[styles.navText, tab === item && styles.navTextActive]}>{label}</Text></Pressable>)}</View>;
}

function QrCode() {
  return <View style={styles.qr}>{Array.from({ length: 64 }, (_, index) => <View key={index} style={[styles.qrDot, (index * 7 + 5) % 11 < 5 && styles.qrDotDark]} />)}</View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  app: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  navSafe: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  header: { gap: 12, paddingBottom: 12 },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerCopy: { flex: 1, minWidth: 0 },
  brand: { color: palette.muted, fontWeight: '800', fontSize: 12 },
  title: { color: palette.ink, fontSize: 26, fontWeight: '900', lineHeight: 31 },
  logoMark: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line },
  logoText: { color: palette.blueDark, fontWeight: '900', fontSize: 20 },
  iconButton: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line },
  avatar: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.ink },
  avatarText: { color: palette.white, fontWeight: '900' },
  progressTrack: { height: 5, borderRadius: 999, backgroundColor: '#e8eef3', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: palette.blue },
  content: { paddingBottom: 116, gap: 16 },
  stack: { gap: 16 },
  searchPanel: { gap: 12, padding: 18, borderRadius: 26, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line },
  greeting: { color: palette.muted, fontWeight: '800' },
  searchTitle: { color: palette.ink, fontSize: 28, lineHeight: 32, fontWeight: '900' },
  row: { flexDirection: 'row', gap: 10 },
  field: { flex: 1, minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, borderRadius: 17, backgroundColor: '#f7fafc', borderWidth: 1, borderColor: palette.line },
  fieldCompact: { minWidth: 0 },
  fieldText: { flex: 1, minWidth: 0 },
  label: { color: palette.muted, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.6 },
  input: { color: palette.ink, fontSize: 16, fontWeight: '900', padding: 0 },
  primaryButton: { minHeight: 52, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: palette.blue },
  primaryButtonCompact: { minWidth: 132, paddingHorizontal: 16 },
  disabledButton: { opacity: 0.45 },
  primaryButtonText: { color: palette.white, fontWeight: '900', fontSize: 15 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: palette.ink, fontWeight: '900', fontSize: 18 },
  link: { color: palette.blueDark, fontWeight: '900' },
  upcomingCard: { gap: 12, padding: 16, borderRadius: 24, backgroundColor: palette.ink },
  routeCode: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(57,169,225,0.18)' },
  routeCodeText: { color: '#c8efff', fontWeight: '900' },
  routeTimes: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  routeLine: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  routeDot: { width: 10, height: 10, borderRadius: 99, backgroundColor: palette.blue },
  routeDotEnd: { backgroundColor: palette.green },
  routeDash: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.28)' },
  time: { color: palette.ink, fontWeight: '900', fontSize: 20 },
  city: { color: palette.muted, fontWeight: '800' },
  lightText: { color: palette.white },
  lightSubText: { color: '#d8e2ea' },
  alignRight: { alignItems: 'flex-end' },
  meta: { color: palette.muted, lineHeight: 20 },
  metaOnDark: { color: '#d8e2ea', lineHeight: 20 },
  metaCenter: { color: palette.muted, lineHeight: 21, textAlign: 'center' },
  destinationRow: { flexDirection: 'row', gap: 10 },
  destinationChip: { flex: 1, minHeight: 90, justifyContent: 'flex-end', padding: 12, borderRadius: 22, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line },
  destinationChipAlt: { backgroundColor: '#eaf6ee' },
  destinationText: { color: palette.ink, fontWeight: '900' },
  destinationSub: { color: palette.muted, fontWeight: '800', marginTop: 2 },
  badge: { alignSelf: 'flex-start', overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#dff3fb', color: palette.blueDark, fontWeight: '900' },
  tripResult: { gap: 14, padding: 16, borderRadius: 24, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line },
  tripTitle: { color: palette.ink, fontSize: 19, lineHeight: 24, fontWeight: '900', marginTop: 8 },
  tripTitleOnDark: { color: palette.white, fontSize: 19, lineHeight: 24, fontWeight: '900', marginTop: 8 },
  resultFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { color: palette.ink, fontSize: 20, fontWeight: '900' },
  screenTitle: { color: palette.ink, fontSize: 25, lineHeight: 30, fontWeight: '900' },
  tripHero: { gap: 14, padding: 16, borderRadius: 24, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  info: { width: '47%', minWidth: 142, gap: 7, padding: 12, borderRadius: 17, backgroundColor: '#f7fafc', borderWidth: 1, borderColor: palette.line },
  infoValue: { color: palette.ink, fontWeight: '900', marginTop: 2 },
  stopPanel: { padding: 16, borderRadius: 24, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line },
  stop: { flexDirection: 'row', gap: 12, paddingVertical: 10 },
  stopDot: { width: 14, height: 14, borderRadius: 99, marginTop: 3, borderWidth: 4, borderColor: palette.blue },
  stopDotEnd: { borderColor: palette.green },
  map: { height: 224, borderRadius: 26, overflow: 'hidden', backgroundColor: '#dcecf2', borderWidth: 1, borderColor: palette.line },
  mapCompact: { height: 154 },
  mapDistrictOne: { position: 'absolute', left: 18, bottom: 18, width: 134, height: 88, borderRadius: 24, backgroundColor: '#cfe8db' },
  mapDistrictTwo: { position: 'absolute', right: -14, top: 10, width: 164, height: 96, borderRadius: 32, backgroundColor: '#c9e9f7' },
  mapDistrictThree: { position: 'absolute', left: 136, top: 24, width: 90, height: 66, borderRadius: 20, backgroundColor: '#edf1d8' },
  mapRoadSoft: { position: 'absolute', left: -10, right: -10, top: 103, height: 20, borderRadius: 999, backgroundColor: palette.white, transform: [{ rotate: '-14deg' }] },
  mapRoadSoftTwo: { position: 'absolute', left: -18, right: -18, top: 62, height: 12, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.74)', transform: [{ rotate: '24deg' }] },
  mapRoad: { position: 'absolute', left: 38, right: 42, top: 110, height: 6, borderRadius: 999, backgroundColor: palette.green, transform: [{ rotate: '-14deg' }] },
  mapPin: { position: 'absolute', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: palette.white, color: palette.ink, fontWeight: '900', overflow: 'hidden' },
  mapStart: { left: 18, top: 50 },
  mapEnd: { right: 18, bottom: 42 },
  mapBus: { position: 'absolute', left: 110, top: 96, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, overflow: 'hidden', backgroundColor: palette.ink, color: palette.white, fontWeight: '900' },
  seatHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  seatCounter: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: '#eaf6ee', color: palette.green, fontWeight: '900' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 12, height: 12, borderRadius: 4, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line },
  legendAvailable: { backgroundColor: palette.white },
  legendSelected: { backgroundColor: palette.green },
  legendOccupied: { backgroundColor: '#cfd9e2' },
  legendReserved: { backgroundColor: '#fff4df' },
  legendAccessible: { backgroundColor: '#dff3fb' },
  legendText: { color: palette.muted, fontWeight: '800', fontSize: 11 },
  busMap: { gap: 12, padding: 16, borderRadius: 34, backgroundColor: '#f8fbfd', borderWidth: 2, borderColor: '#cfdae4' },
  windshield: { height: 22, marginHorizontal: 42, borderRadius: 12, backgroundColor: '#c9e9f7' },
  cockpit: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderRadius: 22, backgroundColor: palette.ink },
  driverWheel: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.12)' },
  frontDoor: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.12)' },
  frontDoorText: { color: palette.white, fontWeight: '900' },
  seatRows: { gap: 8 },
  seatRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  rowNumber: { width: 18, color: palette.muted, fontWeight: '900', fontSize: 11 },
  aisle: { width: 18 },
  seat: { width: 45, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line, overflow: 'hidden' },
  seatBack: { position: 'absolute', top: 5, left: 8, right: 8, height: 7, borderRadius: 99, backgroundColor: '#cad7e1' },
  seatAvailable: { backgroundColor: palette.white },
  seatSelected: { backgroundColor: palette.green, borderColor: palette.green },
  seatOccupied: { backgroundColor: '#d8e2ea', opacity: 0.52 },
  seatReserved: { backgroundColor: '#fff4df', borderColor: '#efd59f' },
  seatUnavailable: { backgroundColor: '#e5e9ee', opacity: 0.36 },
  seatAccessible: { backgroundColor: '#dff3fb', borderColor: palette.blue },
  seatText: { color: palette.ink, fontSize: 11, fontWeight: '900', marginTop: 8 },
  seatTextSelected: { color: palette.white },
  backBench: { alignItems: 'center', padding: 10, borderRadius: 18, backgroundColor: '#eef4f8' },
  backBenchText: { color: palette.muted, fontWeight: '900' },
  stickyAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 12, borderRadius: 22, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line },
  stickyTitle: { color: palette.ink, fontSize: 18, fontWeight: '900' },
  formScreen: { gap: 12, padding: 16, borderRadius: 24, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line },
  summaryPanel: { overflow: 'hidden', borderRadius: 22, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: palette.line },
  summaryLabel: { color: palette.muted, fontWeight: '800' },
  summaryValue: { flex: 1, textAlign: 'right', color: palette.ink, fontWeight: '900' },
  summaryStrong: { fontSize: 18 },
  summaryLabelLight: { color: '#aebdcc' },
  summaryValueLight: { color: palette.white },
  paymentCard: { alignItems: 'center', gap: 16, padding: 22, borderRadius: 26, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line },
  processingRing: { width: 82, height: 82, borderRadius: 41, alignItems: 'center', justifyContent: 'center', backgroundColor: '#dff3fb', borderWidth: 8, borderColor: '#eef8fc' },
  methodRow: { flexDirection: 'row', gap: 8 },
  paymentMethod: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 16, backgroundColor: '#f7fafc', borderWidth: 1, borderColor: palette.line },
  paymentMethodActive: { borderColor: palette.blue, backgroundColor: '#dff3fb' },
  paymentMethodText: { color: palette.muted, fontWeight: '900' },
  paymentMethodTextActive: { color: palette.blueDark },
  confirmation: { alignItems: 'center', gap: 16, padding: 22, borderRadius: 26, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line },
  successIcon: { width: 74, height: 74, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.green },
  ticket: { gap: 18, padding: 20, borderRadius: 30, backgroundColor: palette.ink },
  ticketTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  ticketBrand: { color: palette.white, fontWeight: '900', fontSize: 18 },
  ticketTitle: { color: '#bdefff', fontWeight: '900', fontSize: 25 },
  ticketStatus: { alignSelf: 'flex-start', overflow: 'hidden', paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999, backgroundColor: '#fff4df', color: palette.warning, fontWeight: '900' },
  ticketRoute: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  ticketRouteLine: { flex: 1, height: 2, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.26)' },
  ticketCut: { height: 1, borderStyle: 'dashed', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' },
  ticketBody: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  ticketDetails: { flex: 1 },
  qr: { width: 126, height: 126, padding: 9, borderRadius: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 3, backgroundColor: palette.white },
  qrDot: { width: 10.5, height: 10.5, borderRadius: 2, backgroundColor: '#d8e2ea' },
  qrDotDark: { backgroundColor: palette.ink },
  nav: { marginHorizontal: 16, marginBottom: 10, flexDirection: 'row', gap: 8, padding: 8, borderRadius: 24, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line },
  navItem: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 2, borderRadius: 16 },
  navItemActive: { backgroundColor: '#dff3fb' },
  navText: { color: palette.muted, fontWeight: '800', fontSize: 11 },
  navTextActive: { color: palette.ink }
});
