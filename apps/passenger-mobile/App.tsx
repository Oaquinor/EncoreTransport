import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Svg, { Path, Rect } from 'react-native-svg';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

type Tab = 'home' | 'trips' | 'tickets' | 'profile';
type BookingStep =
  | 'search'
  | 'results'
  | 'trip'
  | 'seats'
  | 'passenger'
  | 'review'
  | 'payment'
  | 'confirmation'
  | 'ticket';
type SeatStatus = 'available' | 'selected' | 'occupied' | 'reserved' | 'unavailable' | 'accessible';

type SeatModel = { id: string; row: number; column: number; status: SeatStatus };

const routeCoordinates = [
  { latitude: 18.4822, longitude: -69.9369 },
  { latitude: 18.72, longitude: -70.08 },
  { latitude: 18.98, longitude: -70.3 },
  { latitude: 19.22, longitude: -70.52 },
  { latitude: 19.4517, longitude: -70.697 },
];

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
  seats: ['4B', '4C'],
};

const palette = {
  ink: '#122131',
  inkSoft: '#20364a',
  muted: '#6d7e8e',
  line: '#dbe5ec',
  blue: '#2da9df',
  blueDark: '#1478a6',
  green: '#1f9d74',
  red: '#d85c5c',
  amber: '#c8872b',
  bg: '#f3f7fa',
  white: '#ffffff',
  mapBlue: '#dff3fb',
};

const steps: BookingStep[] = [
  'search',
  'results',
  'trip',
  'seats',
  'passenger',
  'review',
  'payment',
  'confirmation',
  'ticket',
];

export default function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [step, setStepValue] = useState<BookingStep>('search');
  const [selectedSeats, setSelectedSeats] = useState<string[]>(trip.seats);
  const opacity = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  function setStep(next: BookingStep) {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 90, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 12, duration: 90, useNativeDriver: true }),
    ]).start(() => {
      setStepValue(next);
      translateY.setValue(18);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(translateY, {
          toValue: 0,
          damping: 17,
          stiffness: 175,
          mass: 0.7,
          useNativeDriver: true,
        }),
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

  function switchTab(next: Tab) {
    setTab(next);
    if (next === 'home' && step === 'ticket') setStepValue('search');
  }

  const title =
    tab === 'home'
      ? titleForStep(step)
      : tab === 'trips'
        ? 'My trips'
        : tab === 'tickets'
          ? 'Tickets'
          : 'Profile';

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <StatusBar style="dark" />
        <View style={styles.app}>
          <Header
            title={title}
            step={tab === 'home' ? step : undefined}
            onBack={step !== 'search' && tab === 'home' ? () => setStep(previousStep(step)) : undefined}
          />

          <Animated.View style={{ flex: 1, opacity, transform: [{ translateY }] }}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
              {tab === 'home' && (
                <Home
                  step={step}
                  setStep={setStep}
                  selectedSeats={selectedSeats}
                  toggleSeat={toggleSeat}
                />
              )}
              {tab === 'trips' && <Trips setStep={setStep} setTab={setTab} />}
              {tab === 'tickets' && <Ticket selectedSeats={selectedSeats} />}
              {tab === 'profile' && <Profile />}
            </ScrollView>
          </Animated.View>

          <SafeAreaView edges={['bottom']} style={styles.navSafe}>
            <BottomNav tab={tab} setTab={switchTab} />
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
    ticket: 'Boarding pass',
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
          <View style={styles.logoMark}>
            <Text style={styles.logoText}>E</Text>
          </View>
        )}
        <View style={styles.headerCopy}>
          <Text style={styles.brand}>Encore Passenger</Text>
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>MT</Text>
        </View>
      </View>
      {step && (
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      )}
    </View>
  );
}

function Home({
  step,
  setStep,
  selectedSeats,
  toggleSeat,
}: {
  step: BookingStep;
  setStep: (step: BookingStep) => void;
  selectedSeats: string[];
  toggleSeat: (seat: string) => void;
}) {
  if (step === 'results') return <Results setStep={setStep} />;
  if (step === 'trip') return <TripDetails setStep={setStep} />;
  if (step === 'seats')
    return <Seats selectedSeats={selectedSeats} setStep={setStep} toggleSeat={toggleSeat} />;
  if (step === 'passenger') return <PassengerForm setStep={setStep} />;
  if (step === 'review') return <Review setStep={setStep} selectedSeats={selectedSeats} />;
  if (step === 'payment') return <Payment setStep={setStep} />;
  if (step === 'confirmation') return <Confirmation setStep={setStep} />;
  if (step === 'ticket') return <Ticket selectedSeats={selectedSeats} />;

  return (
    <View style={styles.stack}>
      <View style={styles.searchPanel}>
        <View style={styles.searchPanelTop}>
          <View>
            <Text style={styles.greeting}>Good evening, Maria</Text>
            <Text style={styles.searchTitle}>Book your next route</Text>
          </View>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live</Text>
          </View>
        </View>
        <SearchField icon="location-outline" label="Origin" value="Santo Domingo" />
        <View style={styles.swapLine}>
          <View style={styles.swapRule} />
          <View style={styles.swapButton}>
            <Ionicons name="swap-vertical" size={18} color={palette.blueDark} />
          </View>
          <View style={styles.swapRule} />
        </View>
        <SearchField icon="flag-outline" label="Destination" value="Santiago" />
        <View style={styles.row}>
          <SearchField compact icon="calendar-outline" label="Date" value="Sep 14" />
          <SearchField compact icon="people-outline" label="Passengers" value="2" />
        </View>
        <PrimaryButton label="Search trips" icon="search" onPress={() => setStep('results')} />
      </View>

      <SectionHeader title="Upcoming trip" action="View ticket" />
      <Pressable style={styles.upcomingCard} onPress={() => setStep('ticket')}>
        <View style={styles.upcomingTop}>
          <View style={styles.routeCode}>
            <Text style={styles.routeCodeText}>{trip.id}</Text>
          </View>
          <Text style={styles.upcomingStatus}>Payment pending</Text>
        </View>
        <View style={styles.routeTimes}>
          <TimeBlock time={trip.departure} city="Santo Domingo" light />
          <View style={styles.routeLine}>
            <View style={styles.routeDot} />
            <View style={styles.routeDash} />
            <MaterialCommunityIcons name="bus" size={18} color="#a9e9ff" />
            <View style={styles.routeDash} />
            <View style={[styles.routeDot, styles.routeDotEnd]} />
          </View>
          <TimeBlock time={trip.arrival} city="Santiago" alignRight light />
        </View>
        <Text style={styles.metaOnDark}>
          {trip.vehicle} · Seats {selectedSeats.join(', ')} · {trip.duration}
        </Text>
      </Pressable>

      <SectionHeader title="Popular destinations" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.destinationRow}>
        {[
          ['Santiago', '08:30', 'DOP 685'],
          ['Punta Cana', '11:15', 'DOP 1,048'],
          ['La Romana', '18:10', 'DOP 820'],
        ].map(([destination, time, fare], index) => (
          <Pressable key={destination} style={[styles.destinationChip, index === 1 && styles.destinationChipAlt]}>
            <Text style={styles.destinationText}>{destination}</Text>
            <Text style={styles.destinationSub}>{time}</Text>
            <Text style={styles.destinationFare}>{fare}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function Results({ setStep }: { setStep: (step: BookingStep) => void }) {
  const trips = [
    trip,
    {
      ...trip,
      id: 'EN-002',
      destination: 'Punta Cana',
      departure: '11:15',
      arrival: '14:00',
      price: 1048,
      vehicle: 'Bus 118',
    },
  ];

  return (
    <View style={styles.stack}>
      <RouteMap compact />
      {trips.map((item) => (
        <Pressable key={item.id} style={styles.tripResult} onPress={() => setStep('trip')}>
          <View style={styles.resultHeader}>
            <View>
              <Text style={styles.badge}>{item.id}</Text>
              <Text style={styles.tripTitle}>{item.origin} → {item.destination}</Text>
              <Text style={styles.meta}>{item.departure} - {item.arrival} · {item.duration}</Text>
            </View>
            <Text style={styles.price}>DOP {item.price}</Text>
          </View>
          <View style={styles.resultFeatures}>
            <Feature icon="wifi" label="Wi-Fi" />
            <Feature icon="snowflake" label="A/C" />
            <Feature icon="bag-suitcase-outline" label="Luggage" />
            <Feature icon="seat-passenger" label="18 seats" />
          </View>
          <View style={styles.resultFooter}>
            <Text style={styles.link}>View details</Text>
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
        <View style={styles.tripHeroTop}>
          <Text style={styles.badge}>{trip.id} · Boarding</Text>
          <Text style={styles.price}>DOP {trip.price}</Text>
        </View>
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
      <StickyAction
        title="DOP 685"
        subtitle="18 seats available"
        label="Select seats"
        onPress={() => setStep('seats')}
      />
    </View>
  );
}

function RouteMap({ compact }: { compact?: boolean }) {
  return (
    <View style={[styles.mapFrame, compact && styles.mapFrameCompact]}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        initialRegion={{
          latitude: 18.965,
          longitude: -70.31,
          latitudeDelta: compact ? 1.35 : 1.15,
          longitudeDelta: compact ? 1.35 : 1.15,
        }}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
      >
        <Polyline coordinates={routeCoordinates} strokeColor={palette.green} strokeWidth={5} />
        <Marker coordinate={routeCoordinates[0]} title="Agora Mall" description="Boarding · Santo Domingo" />
        <Marker coordinate={routeCoordinates[routeCoordinates.length - 1]} title="Monumento" description="Drop-off · Santiago" />
        <Marker coordinate={routeCoordinates[2]} title="Bus 203" description="On schedule · ETA 10:45">
          <View style={styles.busMarker}>
            <MaterialCommunityIcons name="bus" size={18} color={palette.white} />
          </View>
        </Marker>
      </MapView>
      <View style={styles.mapOverlayTop}>
        <Text style={styles.mapOverlayLabel}>Live route preview</Text>
        <View style={styles.mapStatusPill}><View style={styles.liveDot} /><Text style={styles.mapStatusText}>On schedule</Text></View>
      </View>
      {!compact && (
        <View style={styles.mapBottomSheet}>
          <View>
            <Text style={styles.label}>Next checkpoint</Text>
            <Text style={styles.mapBottomTitle}>Autopista Duarte · 42 min</Text>
          </View>
          <MaterialCommunityIcons name="navigation-variant" size={24} color={palette.blueDark} />
        </View>
      )}
    </View>
  );
}

function Seats({
  selectedSeats,
  setStep,
  toggleSeat,
}: {
  selectedSeats: string[];
  setStep: (step: BookingStep) => void;
  toggleSeat: (seat: string) => void;
}) {
  const seats = useMemo<SeatModel[]>(() => {
    return Array.from({ length: 40 }, (_, index) => {
      const row = Math.floor(index / 4) + 1;
      const column = index % 4;
      const id = `${row}${['A', 'B', 'C', 'D'][column]}`;
      const status: SeatStatus = selectedSeats.includes(id)
        ? 'selected'
        : ['3B', '5C', '6B', '9A'].includes(id)
          ? 'occupied'
          : ['10C', '10D'].includes(id)
            ? 'unavailable'
            : id === '1A'
              ? 'accessible'
              : id === '7D'
                ? 'reserved'
                : 'available';
      return { id, row, column, status };
    });
  }, [selectedSeats]);

  return (
    <View style={styles.stack}>
      <View style={styles.seatHeader}>
        <View style={styles.headerCopy}>
          <Text style={styles.badge}>2 passengers</Text>
          <Text style={styles.screenTitle}>Choose seats inside {trip.vehicle}</Text>
          <Text style={styles.meta}>Tap available seats. Your selection is held for 08:00 minutes.</Text>
        </View>
        <Text style={styles.seatCounter}>{selectedSeats.length}/2</Text>
      </View>
      <SeatLegend />
      <BusSeatMap seats={seats} selectedSeats={selectedSeats} onToggle={toggleSeat} />
      <StickyAction
        title={`DOP ${selectedSeats.length * trip.price}`}
        subtitle={`Seats ${selectedSeats.join(', ') || 'not selected'}`}
        label="Continue"
        disabled={selectedSeats.length !== 2}
        onPress={() => setStep('passenger')}
      />
    </View>
  );
}

function BusSeatMap({ seats, selectedSeats, onToggle }: { seats: SeatModel[]; selectedSeats: string[]; onToggle: (seat: string) => void }) {
  return (
    <View style={styles.busShell}>
      <Svg pointerEvents="none" style={StyleSheet.absoluteFill} viewBox="0 0 340 780" preserveAspectRatio="none">
        <Rect x="9" y="8" width="322" height="764" rx="72" fill="#eef4f8" stroke="#c8d8e3" strokeWidth="4" />
        <Rect x="56" y="30" width="228" height="56" rx="25" fill="#c9e8f5" />
        <Path d="M35 136 C66 105 92 102 126 104 L214 104 C248 102 274 105 305 136" fill="none" stroke="#d0dde6" strokeWidth="3" />
        <Path d="M170 122 L170 710" stroke="#d9e5eb" strokeWidth="2" strokeDasharray="10 12" />
        <Rect x="52" y="704" width="236" height="36" rx="18" fill="#d8e4eb" />
      </Svg>

      <View style={styles.busCockpit}>
        <View style={styles.driverZone}>
          <View style={styles.driverWheel}><MaterialCommunityIcons name="steering" size={22} color={palette.white} /></View>
          <Text style={styles.driverLabel}>Driver</Text>
        </View>
        <View style={styles.doorZone}>
          <Ionicons name="exit-outline" size={18} color={palette.blueDark} />
          <Text style={styles.doorLabel}>Front door</Text>
        </View>
      </View>

      <View style={styles.seatCanvas}>
        {Array.from({ length: 10 }, (_, rowIndex) => {
          const rowSeats = seats.filter((seat) => seat.row === rowIndex + 1);
          return (
            <View key={rowIndex} style={styles.busRow}>
              <View style={styles.rowNumberPill}><Text style={styles.rowNumber}>{rowIndex + 1}</Text></View>
              <View style={styles.seatPair}>
                {rowSeats.slice(0, 2).map((seat) => <SeatButton key={seat.id} seat={seat} onPress={() => onToggle(seat.id)} />)}
              </View>
              <View style={styles.aisleLabel}>{rowIndex === 4 ? <Text style={styles.aisleText}>AISLE</Text> : null}</View>
              <View style={styles.seatPair}>
                {rowSeats.slice(2, 4).map((seat) => <SeatButton key={seat.id} seat={seat} onPress={() => onToggle(seat.id)} />)}
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.busRear}>
        <Text style={styles.busRearText}>Rear zone</Text>
        <Text style={styles.busRearMeta}>Emergency exit</Text>
      </View>

      <View style={styles.seatFloatingSummary}>
        <Text style={styles.label}>Selected</Text>
        <Text style={styles.seatFloatingValue}>{selectedSeats.join(' · ') || 'None'}</Text>
      </View>
    </View>
  );
}

function SeatButton({ seat, onPress }: { seat: SeatModel; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const disabled = ['occupied', 'reserved', 'unavailable'].includes(seat.status);
  function press() {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.9, duration: 60, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, damping: 12, stiffness: 270, useNativeDriver: true }),
    ]).start();
    onPress();
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable disabled={disabled} onPress={press} style={[styles.seat, seatStyle(seat.status)]}>
        <View style={[styles.seatHead, seat.status === 'selected' && styles.seatHeadSelected]} />
        <MaterialCommunityIcons
          name="seat-passenger"
          size={21}
          color={seat.status === 'selected' ? palette.white : seat.status === 'occupied' ? '#7c8b98' : palette.inkSoft}
        />
        <Text style={[styles.seatText, seat.status === 'selected' && styles.seatTextSelected]}>{seat.id}</Text>
        {seat.status === 'accessible' && <Ionicons name="accessibility" size={11} color={palette.blueDark} />}
      </Pressable>
    </Animated.View>
  );
}

function PassengerForm({ setStep }: { setStep: (step: BookingStep) => void }) {
  return (
    <View style={styles.formScreen}>
      <Text style={styles.screenTitle}>Passenger details</Text>
      <Text style={styles.meta}>Passenger information is used for ticketing and boarding validation.</Text>
      <SearchField icon="person-outline" label="Passenger 1" value="Maria Torres" />
      <SearchField icon="card-outline" label="Document" value="001-7482110-4" />
      <SearchField icon="call-outline" label="Phone" value="+1 809 555 1842" />
      <SearchField icon="mail-outline" label="Email" value="maria.torres@mail.com" />
      <View style={styles.passengerDivider}><Text style={styles.passengerDividerText}>Passenger 2</Text></View>
      <SearchField icon="person-add-outline" label="Full name" value="Luis Ibarra" />
      <PrimaryButton label="Review trip" icon="checkmark-circle-outline" onPress={() => setStep('review')} />
    </View>
  );
}

function Review({ setStep, selectedSeats }: { setStep: (step: BookingStep) => void; selectedSeats: string[] }) {
  return (
    <View style={styles.stack}>
      <Text style={styles.screenTitle}>Review and authorize</Text>
      <View style={styles.reviewRouteCard}>
        <Text style={styles.badge}>{trip.id}</Text>
        <Text style={styles.reviewRouteTitle}>{trip.origin} → {trip.destination}</Text>
        <Text style={styles.meta}>{trip.date} · {trip.departure} · {trip.vehicle}</Text>
      </View>
      <View style={styles.summaryPanel}>
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
  const [method, setMethod] = useState<'card' | 'cardnet' | 'visanet'>('card');
  return (
    <View style={styles.stack}>
      <View style={styles.paymentCard}>
        <View style={styles.processingRing}><Ionicons name="card-outline" size={30} color={palette.blueDark} /></View>
        <Text style={styles.screenTitle}>Authorize payment</Text>
        <Text style={styles.metaCenter}>No real charge is made in this preview. Production will wait for gateway authorization before confirming a booking.</Text>
        <View style={styles.methodRow}>
          <PaymentMethod label="Card" active={method === 'card'} onPress={() => setMethod('card')} />
          <PaymentMethod label="CardNet" active={method === 'cardnet'} onPress={() => setMethod('cardnet')} />
          <PaymentMethod label="VisaNet" active={method === 'visanet'} onPress={() => setMethod('visanet')} />
        </View>
        <View style={styles.cardPreview}>
          <Text style={styles.cardPreviewBrand}>ENCORE</Text>
          <Text style={styles.cardPreviewNumber}>••••  ••••  ••••  4821</Text>
          <View style={styles.cardPreviewBottom}><Text style={styles.cardPreviewMeta}>MARIA TORRES</Text><Text style={styles.cardPreviewMeta}>09/29</Text></View>
        </View>
      </View>
      <PrimaryButton label="Hold seats and continue" icon="shield-checkmark-outline" onPress={() => setStep('confirmation')} />
    </View>
  );
}

function Confirmation({ setStep }: { setStep: (step: BookingStep) => void }) {
  const pulse = useRef(new Animated.Value(0)).current;
  Animated.loop(
    Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true }),
    ]),
  ).start();

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  return (
    <View style={styles.confirmation}>
      <Animated.View style={[styles.successHalo, { transform: [{ scale }] }]}>
        <View style={styles.successIcon}><Ionicons name="checkmark" size={34} color={palette.white} /></View>
      </Animated.View>
      <Text style={styles.screenTitle}>Your seats are being held.</Text>
      <Text style={styles.metaCenter}>Payment status is pending. Your boarding pass is ready for check-in review.</Text>
      <View style={styles.holdInfo}><Ionicons name="timer-outline" size={18} color={palette.blueDark} /><Text style={styles.holdInfoText}>Seat hold expires in 08:00</Text></View>
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
        <View style={styles.ticketRouteMiddle}>
          <View style={styles.ticketRouteLine} />
          <MaterialCommunityIcons name="bus" size={20} color="#9be7ff" />
          <Text style={styles.ticketDuration}>{trip.duration}</Text>
        </View>
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
      <View style={styles.ticketFooter}>
        <Ionicons name="shield-checkmark-outline" size={16} color="#9be7ff" />
        <Text style={styles.ticketFooterText}>Present this boarding pass to the driver for validation.</Text>
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
      <SectionHeader title="Previous trips" />
      <View style={styles.historyCard}><Text style={styles.historyRoute}>Punta Cana → Santo Domingo</Text><Text style={styles.meta}>Sep 03 · Completed</Text></View>
    </View>
  );
}

function Profile() {
  return (
    <View style={styles.formScreen}>
      <View style={styles.profileHero}><View style={styles.profileAvatar}><Text style={styles.profileAvatarText}>MT</Text></View><Text style={styles.screenTitle}>Maria Torres</Text><Text style={styles.metaCenter}>Verified passenger</Text></View>
      <Info icon="notifications-outline" label="Notifications" value="Email and push enabled" />
      <Info icon="map-outline" label="Saved route" value="Santo Domingo to Santiago" />
      <Info icon="card-outline" label="Saved payment" value="•••• 4821" />
      <Info icon="shield-checkmark-outline" label="Account" value="Verified passenger" />
    </View>
  );
}

function SearchField({ icon, label, value, compact }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; compact?: boolean }) {
  return (
    <View style={[styles.field, compact && styles.fieldCompact]}>
      <View style={styles.fieldIcon}><Ionicons name={icon} size={18} color={palette.blueDark} /></View>
      <View style={styles.fieldText}><Text style={styles.label}>{label}</Text><TextInput style={styles.input} defaultValue={value} /></View>
    </View>
  );
}

function Info({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return <View style={styles.info}><View style={styles.infoIcon}><Ionicons name={icon} size={17} color={palette.blueDark} /></View><View><Text style={styles.label}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View></View>;
}

function Feature({ icon, label }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string }) {
  return <View style={styles.feature}><MaterialCommunityIcons name={icon} size={16} color={palette.blueDark} /><Text style={styles.featureText}>{label}</Text></View>;
}

function Stop({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return <View style={styles.stop}><View style={[styles.stopDot, last && styles.stopDotEnd]} /><View><Text style={styles.label}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View></View>;
}

function Summary({ label, value, strong, light }: { label: string; value: string; strong?: boolean; light?: boolean }) {
  return <View style={styles.summaryRow}><Text style={[styles.summaryLabel, light && styles.summaryLabelLight]}>{label}</Text><Text style={[styles.summaryValue, strong && styles.summaryStrong, light && styles.summaryValueLight]}>{value}</Text></View>;
}

function PaymentMethod({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.paymentMethod, active && styles.paymentMethodActive]}><Text style={[styles.paymentMethodText, active && styles.paymentMethodTextActive]}>{label}</Text></Pressable>;
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
  return <Pressable disabled={disabled} style={({ pressed }) => [styles.primaryButton, compact && styles.primaryButtonCompact, disabled && styles.disabledButton, pressed && !disabled && styles.primaryButtonPressed]} onPress={onPress}>{icon && <Ionicons name={icon} size={18} color={palette.white} />}<Text style={styles.primaryButtonText}>{label}</Text></Pressable>;
}

function BottomNav({ tab, setTab }: { tab: Tab; setTab: (tab: Tab) => void }) {
  const items = [['home', 'home-outline', 'Home'], ['trips', 'bus-outline', 'Trips'], ['tickets', 'ticket-outline', 'Tickets'], ['profile', 'person-outline', 'Profile']] as const;
  return <View style={styles.nav}>{items.map(([item, icon, label]) => <Pressable key={item} style={[styles.navItem, tab === item && styles.navItemActive]} onPress={() => setTab(item)}><Ionicons name={icon} size={18} color={tab === item ? palette.blueDark : palette.muted} /><Text style={[styles.navText, tab === item && styles.navTextActive]}>{label}</Text></Pressable>)}</View>;
}

function QrCode() {
  const dark = new Set([0,1,2,4,5,6,7,8,10,12,13,14,16,17,19,21,22,23,24,26,28,29,30,31,33,35,36,38,39,40,42,44,45,47,48,49,51,53,55,56,57,58,60,62,63]);
  return <View style={styles.qr}>{Array.from({ length: 64 }, (_, index) => <View key={index} style={[styles.qrDot, dark.has(index) && styles.qrDotDark]} />)}</View>;
}

function SeatLegend() {
  const items: [string, SeatStatus][] = [['Available', 'available'], ['Selected', 'selected'], ['Occupied', 'occupied'], ['Reserved', 'reserved'], ['Accessible', 'accessible']];
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.legend}>{items.map(([label, status]) => <View key={label} style={styles.legendItem}><View style={[styles.legendDot, legendStyle(status)]} /><Text style={styles.legendText}>{label}</Text></View>)}</ScrollView>;
}

function seatStyle(status: SeatStatus) {
  return {
    available: styles.seatAvailable,
    selected: styles.seatSelected,
    occupied: styles.seatOccupied,
    reserved: styles.seatReserved,
    unavailable: styles.seatUnavailable,
    accessible: styles.seatAccessible,
  }[status];
}

function legendStyle(status: SeatStatus) {
  return {
    available: styles.legendAvailable,
    selected: styles.legendSelected,
    occupied: styles.legendOccupied,
    reserved: styles.legendReserved,
    unavailable: styles.legendOccupied,
    accessible: styles.legendAccessible,
  }[status];
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  app: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  content: { paddingBottom: 126, gap: 14 },
  stack: { gap: 14 },
  navSafe: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  header: { gap: 12, paddingBottom: 12 },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerCopy: { flex: 1, minWidth: 0 },
  brand: { color: palette.muted, fontWeight: '800', fontSize: 12 },
  title: { color: palette.ink, fontSize: 25, fontWeight: '900', lineHeight: 30 },
  logoMark: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line },
  logoText: { color: palette.blueDark, fontWeight: '900', fontSize: 20 },
  iconButton: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line },
  avatar: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.ink },
  avatarText: { color: palette.white, fontWeight: '900' },
  progressTrack: { height: 5, borderRadius: 999, backgroundColor: '#e8eef3', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: palette.blue },
  searchPanel: { gap: 12, padding: 16, borderRadius: 28, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line, shadowColor: '#17364d', shadowOpacity: 0.08, shadowRadius: 20, elevation: 2 },
  searchPanelTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  greeting: { color: palette.muted, fontSize: 12, fontWeight: '800' },
  searchTitle: { color: palette.ink, fontSize: 24, fontWeight: '900', marginTop: 2 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: '#e6f7f0' },
  liveDot: { width: 8, height: 8, borderRadius: 999, backgroundColor: palette.green },
  liveText: { color: palette.green, fontWeight: '900', fontSize: 11 },
  field: { flex: 1, minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 20, backgroundColor: '#f7fafc', borderWidth: 1, borderColor: palette.line },
  fieldCompact: { minWidth: 0 },
  fieldIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e6f4fb' },
  fieldText: { flex: 1 },
  label: { color: palette.muted, fontSize: 11, fontWeight: '800', marginBottom: 3 },
  input: { color: palette.ink, fontSize: 16, fontWeight: '900', padding: 0 },
  row: { flexDirection: 'row', gap: 10 },
  swapLine: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: -4 },
  swapRule: { flex: 1, height: 1, backgroundColor: palette.line },
  swapButton: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e8f6fc' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  sectionTitle: { color: palette.ink, fontSize: 19, fontWeight: '900' },
  link: { color: palette.blueDark, fontWeight: '900', fontSize: 12 },
  upcomingCard: { gap: 15, padding: 18, borderRadius: 28, backgroundColor: palette.ink, shadowColor: '#10283b', shadowOpacity: 0.18, shadowRadius: 18, elevation: 4 },
  upcomingTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  upcomingStatus: { color: '#bdefff', fontWeight: '900', fontSize: 11 },
  routeCode: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#dff3fb' },
  routeCodeText: { color: palette.ink, fontWeight: '900' },
  routeTimes: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  routeLine: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5 },
  routeDot: { width: 8, height: 8, borderRadius: 999, backgroundColor: '#9be7ff' },
  routeDotEnd: { backgroundColor: '#7bd7b8' },
  routeDash: { flex: 1, height: 1, backgroundColor: '#587186' },
  metaOnDark: { color: '#bdc9d4', fontSize: 12, lineHeight: 18 },
  time: { color: palette.ink, fontSize: 18, fontWeight: '900' },
  city: { color: palette.muted, fontSize: 11, marginTop: 2 },
  lightText: { color: palette.white },
  lightSubText: { color: '#aebfcc' },
  alignRight: { alignItems: 'flex-end' },
  destinationRow: { gap: 10, paddingRight: 14 },
  destinationChip: { width: 145, padding: 15, borderRadius: 22, backgroundColor: '#e8f5fb', borderWidth: 1, borderColor: '#cce6f2' },
  destinationChipAlt: { backgroundColor: '#e9f6ef', borderColor: '#cae6d8' },
  destinationText: { color: palette.ink, fontWeight: '900', fontSize: 16 },
  destinationSub: { color: palette.muted, marginTop: 4 },
  destinationFare: { color: palette.blueDark, fontWeight: '900', marginTop: 9 },
  mapFrame: { height: 300, overflow: 'hidden', borderRadius: 28, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.mapBlue },
  mapFrameCompact: { height: 190 },
  mapOverlayTop: { position: 'absolute', left: 12, right: 12, top: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mapOverlayLabel: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 999, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.94)', color: palette.ink, fontWeight: '900', fontSize: 11 },
  mapStatusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.94)' },
  mapStatusText: { color: palette.green, fontWeight: '900', fontSize: 11 },
  mapBottomSheet: { position: 'absolute', left: 12, right: 12, bottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 13, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.95)' },
  mapBottomTitle: { color: palette.ink, fontWeight: '900', marginTop: 2 },
  busMarker: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.green, borderWidth: 3, borderColor: palette.white },
  tripResult: { gap: 14, padding: 17, borderRadius: 24, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  badge: { alignSelf: 'flex-start', overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#dff3fb', color: palette.ink, fontWeight: '900', fontSize: 11 },
  tripTitle: { color: palette.ink, fontSize: 19, fontWeight: '900', marginTop: 8 },
  tripTitleOnDark: { color: palette.white, fontSize: 20, fontWeight: '900' },
  price: { color: palette.ink, fontSize: 18, fontWeight: '900' },
  meta: { color: palette.muted, lineHeight: 20 },
  resultFeatures: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 999, backgroundColor: '#eef6fa' },
  featureText: { color: palette.inkSoft, fontSize: 11, fontWeight: '800' },
  resultFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 4, borderTopWidth: 1, borderTopColor: '#edf2f5', paddingTop: 12 },
  tripHero: { gap: 12, padding: 18, borderRadius: 26, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line },
  tripHeroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  screenTitle: { color: palette.ink, fontSize: 25, fontWeight: '900', lineHeight: 30 },
  detailGrid: { gap: 11 },
  info: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e9f5fa' },
  infoValue: { color: palette.ink, fontWeight: '900' },
  stopPanel: { gap: 16, padding: 17, borderRadius: 24, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line },
  stop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stopDot: { width: 12, height: 12, borderRadius: 999, backgroundColor: palette.blue },
  stopDotEnd: { backgroundColor: palette.green },
  stickyAction: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderRadius: 22, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line },
  stickyTitle: { color: palette.ink, fontWeight: '900', fontSize: 17 },
  primaryButton: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 18, backgroundColor: palette.blue, paddingHorizontal: 18 },
  primaryButtonCompact: { minHeight: 46, paddingHorizontal: 16 },
  primaryButtonPressed: { transform: [{ scale: 0.985 }], opacity: 0.92 },
  primaryButtonText: { color: palette.white, fontWeight: '900', fontSize: 15 },
  disabledButton: { opacity: 0.45 },
  seatHeader: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  seatCounter: { minWidth: 54, textAlign: 'center', paddingHorizontal: 10, paddingVertical: 10, borderRadius: 16, overflow: 'hidden', backgroundColor: palette.ink, color: palette.white, fontWeight: '900' },
  legend: { gap: 8, paddingRight: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 999, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line },
  legendDot: { width: 9, height: 9, borderRadius: 999 },
  legendText: { color: palette.muted, fontSize: 10, fontWeight: '800' },
  legendAvailable: { backgroundColor: '#dfe8ee' },
  legendSelected: { backgroundColor: palette.green },
  legendOccupied: { backgroundColor: '#9caab5' },
  legendReserved: { backgroundColor: palette.amber },
  legendAccessible: { backgroundColor: palette.blue },
  busShell: { minHeight: 790, overflow: 'hidden', borderRadius: 42, backgroundColor: '#eef4f8', borderWidth: 1, borderColor: '#cbdbe5', paddingHorizontal: 22, paddingTop: 30, paddingBottom: 30 },
  busCockpit: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 28, marginTop: 56, marginBottom: 18 },
  driverZone: { alignItems: 'center', gap: 5 },
  driverWheel: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.ink },
  driverLabel: { color: palette.muted, fontSize: 10, fontWeight: '800' },
  doorZone: { alignItems: 'center', gap: 5 },
  doorLabel: { color: palette.muted, fontSize: 10, fontWeight: '800' },
  seatCanvas: { gap: 9 },
  busRow: { minHeight: 49, flexDirection: 'row', alignItems: 'center' },
  rowNumberPill: { width: 26, alignItems: 'center' },
  rowNumber: { color: '#8b9ba8', fontWeight: '900', fontSize: 10 },
  seatPair: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  aisleLabel: { width: 46, alignItems: 'center', justifyContent: 'center' },
  aisleText: { color: '#a9bac5', fontSize: 7, fontWeight: '900', letterSpacing: 1.3, transform: [{ rotate: '-90deg' }] },
  seat: { width: 53, height: 47, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 1, borderWidth: 1 },
  seatHead: { position: 'absolute', top: 4, left: 9, right: 9, height: 7, borderRadius: 5, backgroundColor: '#d0dde5' },
  seatHeadSelected: { backgroundColor: '#6ac7a8' },
  seatAvailable: { backgroundColor: '#f7fafc', borderColor: '#cedbe4' },
  seatSelected: { backgroundColor: palette.green, borderColor: palette.green },
  seatOccupied: { backgroundColor: '#d9e1e6', borderColor: '#d0d9df', opacity: 0.7 },
  seatReserved: { backgroundColor: '#fff0d8', borderColor: '#e0b56f' },
  seatUnavailable: { backgroundColor: '#e5e8eb', borderColor: '#d3d8dc', opacity: 0.38 },
  seatAccessible: { backgroundColor: '#e3f3fb', borderColor: '#85c7e5' },
  seatText: { color: palette.ink, fontSize: 9, fontWeight: '900' },
  seatTextSelected: { color: palette.white },
  busRear: { marginHorizontal: 42, marginTop: 18, padding: 12, borderRadius: 16, alignItems: 'center', backgroundColor: '#dce7ed' },
  busRearText: { color: palette.inkSoft, fontWeight: '900', fontSize: 11 },
  busRearMeta: { color: palette.muted, fontSize: 9, marginTop: 2 },
  seatFloatingSummary: { position: 'absolute', right: 18, top: 108, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.92)' },
  seatFloatingValue: { color: palette.ink, fontWeight: '900', marginTop: 2 },
  formScreen: { gap: 12, padding: 17, borderRadius: 26, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line },
  passengerDivider: { paddingTop: 6, borderTopWidth: 1, borderTopColor: '#edf2f5' },
  passengerDividerText: { color: palette.ink, fontWeight: '900' },
  reviewRouteCard: { gap: 8, padding: 16, borderRadius: 24, backgroundColor: '#e9f6fb', borderWidth: 1, borderColor: '#cce6f2' },
  reviewRouteTitle: { color: palette.ink, fontWeight: '900', fontSize: 19 },
  summaryPanel: { padding: 17, borderRadius: 24, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#edf2f5' },
  summaryLabel: { flex: 1, color: palette.muted, fontSize: 11, fontWeight: '800' },
  summaryValue: { flex: 1.4, color: palette.ink, fontWeight: '900', textAlign: 'right' },
  summaryStrong: { fontSize: 18, color: palette.blueDark },
  summaryLabelLight: { color: '#9fb0bd' },
  summaryValueLight: { color: palette.white },
  paymentCard: { gap: 14, alignItems: 'center', padding: 20, borderRadius: 28, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line },
  processingRing: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e5f4fb', borderWidth: 5, borderColor: '#c9e9f6' },
  metaCenter: { color: palette.muted, lineHeight: 20, textAlign: 'center' },
  methodRow: { flexDirection: 'row', gap: 8 },
  paymentMethod: { flex: 1, alignItems: 'center', paddingVertical: 11, paddingHorizontal: 8, borderRadius: 14, backgroundColor: '#eef3f6', borderWidth: 1, borderColor: '#e1e8ed' },
  paymentMethodActive: { backgroundColor: '#dff3fb', borderColor: '#9ed6ed' },
  paymentMethodText: { color: palette.muted, fontWeight: '900', fontSize: 11 },
  paymentMethodTextActive: { color: palette.blueDark },
  cardPreview: { width: '100%', minHeight: 164, justifyContent: 'space-between', padding: 18, borderRadius: 24, backgroundColor: palette.ink },
  cardPreviewBrand: { color: '#9be7ff', fontWeight: '900', letterSpacing: 2 },
  cardPreviewNumber: { color: palette.white, fontSize: 20, fontWeight: '900', letterSpacing: 1.3 },
  cardPreviewBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  cardPreviewMeta: { color: '#b9c6d0', fontSize: 10, fontWeight: '800' },
  confirmation: { alignItems: 'center', gap: 14, padding: 22, borderRadius: 28, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line },
  successHalo: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: '#dff3e9' },
  successIcon: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.green },
  holdInfo: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 11, paddingVertical: 9, borderRadius: 14, backgroundColor: '#eef7fb' },
  holdInfoText: { color: palette.ink, fontWeight: '900', fontSize: 11 },
  ticket: { gap: 15, padding: 20, borderRadius: 30, backgroundColor: palette.ink },
  ticketTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  ticketBrand: { color: palette.white, fontWeight: '900', fontSize: 14 },
  ticketTitle: { color: '#9be7ff', fontWeight: '900', fontSize: 24, marginTop: 3 },
  ticketStatus: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, overflow: 'hidden', backgroundColor: '#2b4052', color: '#f2c26b', fontWeight: '900', fontSize: 10 },
  ticketRoute: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  ticketRouteMiddle: { flex: 1, alignItems: 'center', gap: 5 },
  ticketRouteLine: { width: '100%', height: 1, backgroundColor: '#597184' },
  ticketDuration: { color: '#90a5b5', fontSize: 9 },
  ticketCut: { height: 1, borderTopWidth: 1, borderTopColor: '#4c6274', borderStyle: 'dashed' },
  ticketBody: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  qr: { width: 112, height: 112, flexDirection: 'row', flexWrap: 'wrap', padding: 7, borderRadius: 16, backgroundColor: palette.white },
  qrDot: { width: '12.5%', height: '12.5%' },
  qrDotDark: { backgroundColor: palette.ink },
  ticketDetails: { flex: 1 },
  ticketFooter: { flexDirection: 'row', gap: 7, alignItems: 'center', paddingTop: 5 },
  ticketFooterText: { flex: 1, color: '#9fb0bd', fontSize: 10, lineHeight: 15 },
  historyCard: { padding: 15, borderRadius: 20, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.line },
  historyRoute: { color: palette.ink, fontWeight: '900' },
  profileHero: { alignItems: 'center', gap: 5, paddingBottom: 12 },
  profileAvatar: { width: 72, height: 72, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.ink },
  profileAvatarText: { color: palette.white, fontWeight: '900', fontSize: 22 },
  nav: { marginHorizontal: 16, marginBottom: 10, flexDirection: 'row', gap: 7, padding: 8, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.98)', borderWidth: 1, borderColor: palette.line, shadowColor: '#17364d', shadowOpacity: 0.13, shadowRadius: 18, elevation: 6 },
  navItem: { flex: 1, minHeight: 48, gap: 2, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  navItemActive: { backgroundColor: '#e3f4fb' },
  navText: { color: palette.muted, fontWeight: '800', fontSize: 9 },
  navTextActive: { color: palette.blueDark },
});
