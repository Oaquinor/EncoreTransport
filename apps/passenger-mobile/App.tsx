import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Svg, { Path, Rect } from 'react-native-svg';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

type Tab='home'|'trips'|'tickets'|'profile';
type Step='search'|'results'|'trip'|'seats'|'passenger'|'review'|'payment'|'confirmation'|'ticket';
type SeatStatus='available'|'selected'|'occupied'|'reserved'|'unavailable'|'accessible';
type SeatModel={id:string;row:number;column:number;status:SeatStatus};

const W=Dimensions.get('window').width;
const p={ink:'#102130',ink2:'#20384b',muted:'#6e7f8e',line:'#d9e4eb',blue:'#2da9df',blue2:'#147ca9',green:'#1f9d74',amber:'#d39739',red:'#d35d5d',bg:'#f3f7f9',white:'#fff'};
const trip={id:'EN-001',origin:'Santo Domingo',destination:'Santiago',date:'Sep 14, 2026',departure:'08:30',arrival:'10:45',duration:'2h 15m',price:685,vehicle:'Bus 203',plate:'A874512',driver:'Ricardo Luna',boarding:'Agora Mall, north entrance',dropoff:'Monumento a los Heroes'};
const route=[{latitude:18.4822,longitude:-69.9369},{latitude:18.72,longitude:-70.08},{latitude:18.98,longitude:-70.3},{latitude:19.22,longitude:-70.52},{latitude:19.4517,longitude:-70.697}];
const steps:Step[]=['search','results','trip','seats','passenger','review','payment','confirmation','ticket'];

export default function App(){
  const[tab,setTab]=useState<Tab>('home');
  const[step,setStepRaw]=useState<Step>('search');
  const[selectedSeats,setSelectedSeats]=useState(['4B','4C']);
  const[history,setHistory]=useState<Step[]>([]);
  const opacity=useRef(new Animated.Value(1)).current;
  const translate=useRef(new Animated.Value(0)).current;

  const animateTo=(next:Step,push=true)=>{
    if(push)setHistory(h=>[...h,step]);
    Animated.parallel([
      Animated.timing(opacity,{toValue:0,duration:90,useNativeDriver:true}),
      Animated.timing(translate,{toValue:12,duration:90,useNativeDriver:true})
    ]).start(()=>{
      setStepRaw(next);
      translate.setValue(18);
      Animated.parallel([
        Animated.timing(opacity,{toValue:1,duration:180,useNativeDriver:true}),
        Animated.spring(translate,{toValue:0,damping:16,stiffness:180,useNativeDriver:true})
      ]).start();
    });
  };
  const back=()=>setHistory(h=>{const n=[...h];const prev=n.pop();if(prev)animateTo(prev,false);return n});
  const toggleSeat=(seat:string)=>setSelectedSeats(cur=>cur.includes(seat)?cur.filter(x=>x!==seat):cur.length<2?[...cur,seat]:cur);
  const title=tab==='home'?({search:'Where are you going?',results:'Available trips',trip:'Trip details',seats:'Choose seats',passenger:'Passenger details',review:'Review trip',payment:'Payment',confirmation:'Confirmation',ticket:'Boarding pass'} as Record<Step,string>)[step]:tab==='trips'?'My trips':tab==='tickets'?'Tickets':'Profile';

  return <SafeAreaProvider><SafeAreaView style={s.safe} edges={['top','left','right']}><StatusBar style="dark"/>
    <View style={s.app}>
      <Header title={title} step={tab==='home'?step:undefined} onBack={tab==='home'&&history.length?back:undefined}/>
      <Animated.View style={{flex:1,opacity,transform:[{translateY:translate}]}}>
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          {tab==='home'&&<Flow step={step} setStep={animateTo} selectedSeats={selectedSeats} toggleSeat={toggleSeat}/>}
          {tab==='trips'&&<Trips onOpen={()=>{setTab('home');animateTo('trip')}}/>}
          {tab==='tickets'&&<Ticket selectedSeats={selectedSeats}/>}
          {tab==='profile'&&<Profile/>}
        </ScrollView>
      </Animated.View>
      <SafeAreaView edges={['bottom']} style={s.navSafe}><BottomNav tab={tab} setTab={setTab}/></SafeAreaView>
    </View>
  </SafeAreaView></SafeAreaProvider>;
}

function Header({title,step,onBack}:{title:string;step?:Step;onBack?:()=>void}){
  const progress=step?(steps.indexOf(step)+1)/steps.length:0;
  return <View style={s.header}><View style={s.headerRow}>
    {onBack?<IconButton icon="chevron-back" onPress={onBack}/>:<View style={s.logo}><Text style={s.logoText}>E</Text></View>}
    <View style={s.headerCopy}><Text style={s.brand}>Encore Passenger</Text><Text style={s.title}>{title}</Text></View>
    <View style={s.avatar}><Text style={s.avatarText}>MT</Text></View>
  </View>{step&&<View style={s.progress}><View style={[s.progressFill,{width:`${progress*100}%`}]} /></View>}</View>
}

function Flow({step,setStep,selectedSeats,toggleSeat}:{step:Step;setStep:(s:Step)=>void;selectedSeats:string[];toggleSeat:(s:string)=>void}){
  if(step==='results')return <Results onSelect={()=>setStep('trip')}/>;
  if(step==='trip')return <TripDetails onContinue={()=>setStep('seats')}/>;
  if(step==='seats')return <Seats selectedSeats={selectedSeats} toggleSeat={toggleSeat} onContinue={()=>setStep('passenger')}/>;
  if(step==='passenger')return <PassengerForm onContinue={()=>setStep('review')}/>;
  if(step==='review')return <Review selectedSeats={selectedSeats} onContinue={()=>setStep('payment')}/>;
  if(step==='payment')return <Payment onContinue={()=>setStep('confirmation')}/>;
  if(step==='confirmation')return <Confirmation onContinue={()=>setStep('ticket')}/>;
  if(step==='ticket')return <Ticket selectedSeats={selectedSeats}/>;
  return <Home onSearch={()=>setStep('results')} onTicket={()=>setStep('ticket')}/>;
}

function Home({onSearch,onTicket}:{onSearch:()=>void;onTicket:()=>void}){
  return <View style={s.stack}>
    <View style={s.greetingRow}><View><Text style={s.greeting}>Good evening, Maria</Text><Text style={s.homeHeadline}>Where do you want to go?</Text></View><View style={s.livePill}><View style={s.liveDot}/><Text style={s.liveText}>Live</Text></View></View>
    <View style={s.searchCard}><Field icon="location-outline" label="From" value="Santo Domingo"/><View style={s.swapRow}><View style={s.rule}/><View style={s.swapCircle}><Ionicons name="swap-vertical" size={18} color={p.blue2}/></View><View style={s.rule}/></View><Field icon="flag-outline" label="To" value="Santiago"/><View style={s.row}><Field compact icon="calendar-outline" label="Date" value="Sep 14"/><Field compact icon="people-outline" label="Passengers" value="2"/></View><PrimaryButton label="Search trips" icon="search" onPress={onSearch}/></View>
    <SectionTitle title="Upcoming trip" action="View ticket"/>
    <Pressable onPress={onTicket} style={s.upcoming}><View style={s.upcomingTop}><Tag text="EN-001"/><Text style={s.pending}>Payment pending</Text></View><RouteTimes/><Text style={s.darkMeta}>Bus 203 · Seats 4B, 4C · 2h 15m</Text></Pressable>
    <SectionTitle title="Popular destinations"/>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.destRow}>{[['Santiago','DOP 685'],['Punta Cana','DOP 1,048'],['La Romana','DOP 820']].map(([name,fare],i)=><View key={name} style={[s.destCard,i===1&&s.destCardAlt]}><Text style={s.destCode}>{i===0?'STI':i===1?'PUJ':'LRM'}</Text><Text style={s.destName}>{name}</Text><Text style={s.destFare}>{fare}</Text></View>)}</ScrollView>
  </View>
}

function RouteTimes(){return <View style={s.routeTimes}><Time time={trip.departure} city="Santo Domingo" light/><View style={s.routeLine}><View style={s.routeDot}/><View style={s.routeDash}/><MaterialCommunityIcons name="bus" size={18} color="#a9e9ff"/><View style={s.routeDash}/><View style={[s.routeDot,s.routeDotEnd]}/></View><Time time={trip.arrival} city="Santiago" right light/></View>}

function Results({onSelect}:{onSelect:()=>void}){return <View style={s.stack}>
  <RouteMap compact/>
  <View style={s.techStrip}><TechStat icon="clock-outline" label="Fastest" value="2h 15m"/><TechStat icon="seat-passenger" label="Best seats" value="18"/><TechStat icon="shield-check-outline" label="Status" value="On time"/></View>
  {[trip,{...trip,id:'EN-002',destination:'Punta Cana',departure:'11:15',arrival:'14:00',price:1048,vehicle:'Bus 118'}].map((t,i)=><Pressable key={t.id} style={[s.resultCard,i===0&&s.resultFeatured]} onPress={onSelect}><View style={s.resultTop}><View><Tag text={t.id}/><Text style={s.resultTitle}>{t.origin} → {t.destination}</Text><Text style={s.meta}>{t.departure} - {t.arrival} · {t.duration}</Text></View><Text style={s.price}>DOP {t.price}</Text></View><View style={s.features}><Feature icon="wifi" text="Wi-Fi"/><Feature icon="snowflake" text="A/C"/><Feature icon="bag-suitcase-outline" text="Luggage"/><Feature icon="seat-passenger" text="18 seats"/></View><View style={s.resultFooter}><Text style={s.link}>View details</Text><Ionicons name="chevron-forward" size={20} color={p.blue2}/></View></Pressable>)}
</View>}

function TripDetails({onContinue}:{onContinue:()=>void}){return <View style={s.stack}>
  <RouteMap/>
  <View style={s.tripCard}><View style={s.resultTop}><Tag text={`${trip.id} · Boarding`}/><Text style={s.price}>DOP {trip.price}</Text></View><Text style={s.screenTitle}>{trip.origin} to {trip.destination}</Text><View style={s.infoGrid}><Info icon="time-outline" label="Departure" value={`${trip.date} · ${trip.departure}`}/><Info icon="bus-outline" label="Vehicle" value={`${trip.vehicle} · ${trip.plate}`}/><Info icon="person-outline" label="Driver" value={trip.driver}/><Info icon="sparkles-outline" label="Service" value="Wi-Fi · A/C · Luggage"/></View></View>
  <View style={s.routeTimeline}><Stop label="Boarding" value={trip.boarding}/><View style={s.timelineConnector}/><Stop label="Checkpoint" value="Autopista Duarte · 42 min"/><View style={s.timelineConnector}/><Stop label="Drop-off" value={trip.dropoff} end/></View>
  <Sticky title="DOP 685" subtitle="18 seats available" label="Select seats" onPress={onContinue}/>
</View>}

function RouteMap({compact}:{compact?:boolean}){return <View style={[s.map,compact&&s.mapCompact]}>
  <MapView provider={PROVIDER_GOOGLE} style={StyleSheet.absoluteFill} initialRegion={{latitude:18.965,longitude:-70.31,latitudeDelta:compact?1.4:1.15,longitudeDelta:compact?1.4:1.15}} rotateEnabled={false} toolbarEnabled={false}>
    <Polyline coordinates={route} strokeColor={p.green} strokeWidth={5}/>
    <Marker coordinate={route[0]} title="Agora Mall"/>
    <Marker coordinate={route[route.length-1]} title="Monumento"/>
    <Marker coordinate={route[2]} title="Bus 203"><View style={s.busMarker}><MaterialCommunityIcons name="bus" size={18} color={p.white}/></View></Marker>
  </MapView>
  <View style={s.mapTop}><Text style={s.mapLabel}>Live route preview</Text><View style={s.mapStatus}><View style={s.liveDot}/><Text style={s.mapStatusText}>On schedule</Text></View></View>
  {!compact&&<View style={s.mapBottom}><View><Text style={s.label}>Next checkpoint</Text><Text style={s.mapBottomTitle}>Autopista Duarte · 42 min</Text></View><MaterialCommunityIcons name="navigation-variant" size={24} color={p.blue2}/></View>}
</View>}

function Seats({selectedSeats,toggleSeat,onContinue}:{selectedSeats:string[];toggleSeat:(s:string)=>void;onContinue:()=>void}){
  const seats=useMemo<SeatModel[]>(()=>Array.from({length:40},(_,index)=>{const row=Math.floor(index/4)+1;const column=index%4;const id=`${row}${['A','B','C','D'][column]}`;let status:SeatStatus=selectedSeats.includes(id)?'selected':'available';if(['3B','5C','6B','9A'].includes(id))status='occupied';else if(['10C','10D'].includes(id))status='unavailable';else if(id==='7D')status='reserved';else if(id==='1A')status='accessible';return{id,row,column,status}}),[selectedSeats]);
  return <View style={s.stack}>
    <View style={s.seatHeading}><View style={{flex:1}}><Tag text="2 passengers"/><Text style={s.screenTitle}>Choose your seats inside Bus 203</Text><Text style={s.meta}>Tap an available seat. The cabin now mirrors a real coach layout.</Text></View><View style={s.counter}><Text style={s.counterText}>{selectedSeats.length}/2</Text></View></View>
    <SeatLegend/>
    <View style={s.cabinInfo}><TechStat icon="door-open" label="Front door" value="Row 1"/><TechStat icon="wheelchair-accessibility" label="Accessible" value="1A"/><TechStat icon="exit-run" label="Emergency" value="Rear"/></View>
    <BusCabin seats={seats} selectedSeats={selectedSeats} toggleSeat={toggleSeat}/>
    <Sticky title={`DOP ${selectedSeats.length*trip.price}`} subtitle={`Seats ${selectedSeats.join(', ')||'not selected'}`} label="Continue" disabled={selectedSeats.length!==2} onPress={onContinue}/>
  </View>
}

function BusCabin({seats,selectedSeats,toggleSeat}:{seats:SeatModel[];selectedSeats:string[];toggleSeat:(s:string)=>void}){
  return <View style={s.busShell}>
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} viewBox="0 0 360 900" preserveAspectRatio="none">
      <Rect x="8" y="8" width="344" height="884" rx="82" fill="#eaf2f6" stroke="#c5d6df" strokeWidth="4"/>
      <Rect x="54" y="34" width="252" height="64" rx="30" fill="#bfe2f0"/>
      <Path d="M180 136 L180 820" stroke="#d4e1e8" strokeWidth="2" strokeDasharray="10 12"/>
      <Rect x="54" y="827" width="252" height="40" rx="20" fill="#d5e2e8"/>
    </Svg>
    <View style={s.cockpit}>
      <View style={s.driver}><View style={s.steering}><MaterialCommunityIcons name="steering" size={22} color={p.white}/></View><Text style={s.driverText}>Driver</Text></View>
      <View style={s.door}><Ionicons name="exit-outline" size={18} color={p.blue2}/><Text style={s.doorText}>Front door</Text></View>
    </View>
    <View style={s.seatRows}>{Array.from({length:10},(_,r)=>{const rs=seats.filter(x=>x.row===r+1);return <View key={r} style={s.busRow}>
      <View style={s.rowPill}><Text style={s.rowNumber}>{r+1}</Text></View>
      <View style={s.seatPair}>{rs.slice(0,2).map(x=><Seat key={x.id} seat={x} onPress={()=>toggleSeat(x.id)}/>)}</View>
      <View style={s.aisle}>{r===4&&<Text style={s.aisleText}>AISLE</Text>}</View>
      <View style={s.seatPair}>{rs.slice(2,4).map(x=><Seat key={x.id} seat={x} onPress={()=>toggleSeat(x.id)}/>)}</View>
    </View>})}</View>
    <View style={s.rear}><Text style={s.rearText}>REAR · EMERGENCY EXIT</Text></View>
    <View style={s.floatingSummary}><Text style={s.label}>Selected</Text><Text style={s.floatingValue}>{selectedSeats.join(' · ')||'None'}</Text></View>
  </View>
}

function Seat({seat,onPress}:{seat:SeatModel;onPress:()=>void}){
  const scale=useRef(new Animated.Value(1)).current;
  const disabled=['occupied','reserved','unavailable'].includes(seat.status);
  const press=()=>{Animated.sequence([Animated.timing(scale,{toValue:.9,duration:60,useNativeDriver:true}),Animated.spring(scale,{toValue:1,damping:12,stiffness:280,useNativeDriver:true})]).start();onPress();};
  return <Animated.View style={[s.seatOuter,{transform:[{scale}]}]}>
    <Pressable disabled={disabled} onPress={press} style={[s.seat,seatStyle(seat.status)]}>
      <View style={[s.seatBack,seat.status==='selected'&&s.seatBackSelected]}>
        <View style={s.headRest}/>
        <View style={s.seatIconWrap}><MaterialCommunityIcons name="seat-recline-extra" size={19} color={seat.status==='selected'?p.white:p.ink2}/></View>
      </View>
      <View style={[s.seatCushion,seat.status==='selected'&&{backgroundColor:'#14865f'}]}/>
      <Text style={[s.seatText,seat.status==='selected'&&{color:p.white}]}>{seat.id}</Text>
      {seat.status==='accessible'&&<Ionicons name="accessibility" size={11} color={p.blue2} style={s.accessibleBadge}/>}
    </Pressable>
  </Animated.View>
}
function seatStyle(status:SeatStatus){if(status==='selected')return s.seatSelected;if(status==='occupied')return s.seatOccupied;if(status==='reserved')return s.seatReserved;if(status==='unavailable')return s.seatUnavailable;if(status==='accessible')return s.seatAccessible;return s.seatAvailable}
function SeatLegend(){return <View style={s.legend}>{[['Available','#fff'],['Selected',p.green],['Occupied','#cfd9df'],['Reserved','#f6e1b9'],['Accessible','#def5fc']].map(([x,b])=><View style={s.legendItem} key={x}><View style={[s.legendDot,{backgroundColor:b}]}/><Text style={s.meta}>{x}</Text></View>)}</View>}

function PassengerForm({onContinue}:{onContinue:()=>void}){return <View style={s.stack}>
  <View style={s.smartNotice}><Ionicons name="shield-checkmark-outline" size={20} color={p.green}/><View style={{flex:1}}><Text style={s.noticeTitle}>Smart passenger validation</Text><Text style={s.meta}>Details will be checked before payment and linked to the boarding pass.</Text></View></View>
  <PassengerCard number="01" name="Maria Torres" document="001-7482110-4" phone="+1 809 555 1842" email="maria.torres@mail.com"/>
  <PassengerCard number="02" name="" document="" phone="" email=""/>
  <PrimaryButton label="Review trip" icon="arrow-forward" onPress={onContinue}/>
</View>}
function PassengerCard({number,name,document,phone,email}:{number:string;name:string;document:string;phone:string;email:string}){return <View style={s.passengerCard}><View style={s.passengerTitleRow}><Text style={s.passengerNo}>Passenger {number}</Text><Text style={s.passengerStatus}>Ready</Text></View><Field icon="person-outline" label="Full name" value={name}/><Field icon="card-outline" label="Document" value={document}/><Field icon="call-outline" label="Phone" value={phone}/><Field icon="mail-outline" label="Email" value={email}/></View>}

function Review({selectedSeats,onContinue}:{selectedSeats:string[];onContinue:()=>void}){return <View style={s.stack}>
  <View style={s.reviewHero}><Text style={s.reviewKicker}>READY TO CHECKOUT</Text><Text style={s.reviewTitle}>{trip.origin} → {trip.destination}</Text><RouteTimes/></View>
  <View style={s.reviewCard}><Info icon="people-outline" label="Passengers" value="Maria Torres · Passenger 2"/><Info icon="seat-outline" label="Seats" value={selectedSeats.join(', ')}/><Info icon="bus-outline" label="Vehicle" value={`${trip.vehicle} · ${trip.plate}`}/><Info icon="location-outline" label="Boarding" value={trip.boarding}/></View>
  <View style={s.totalCard}><Text style={s.label}>Total</Text><Text style={s.totalValue}>DOP 1,405</Text><Text style={s.meta}>Fare + service fee</Text></View>
  <PrimaryButton label="Continue to payment" icon="card-outline" onPress={onContinue}/>
</View>}

function Payment({onContinue}:{onContinue:()=>void}){
  const[method,setMethod]=useState('Card');
  const[state,setState]=useState<'ready'|'verifying'|'approved'>('ready');
  const scan=useRef(new Animated.Value(0)).current;
  const verify=()=>{setState('verifying');scan.setValue(0);Animated.timing(scan,{toValue:1,duration:1100,useNativeDriver:false}).start(()=>setState('approved'))};
  return <View style={s.stack}>
    <View style={s.paymentMethods}>{['Card','CardNet','VisaNet'].map(x=><Pressable key={x} onPress={()=>setMethod(x)} style={[s.paymentMethod,method===x&&s.paymentMethodActive]}><Text style={s.paymentMethodText}>{x}</Text></Pressable>)}</View>
    <View style={s.virtualCard}><Animated.View style={[s.cardScan,{left:scan.interpolate({inputRange:[0,1],outputRange:['-15%','100%']})}]}/><View style={s.virtualTop}><Text style={s.virtualBrand}>ENCORE</Text><MaterialCommunityIcons name="contactless-payment" size={24} color="#bcecff"/></View><Text style={s.virtualNumber}>4821  ••••  ••••  1842</Text><View style={s.virtualBottom}><View><Text style={s.virtualLabel}>CARDHOLDER</Text><Text style={s.virtualValue}>MARIA TORRES</Text></View><Text style={s.virtualValue}>09/29</Text></View></View>
    <View style={s.paymentForm}><Field icon="card-outline" label="Card number" value="4821 0000 0000 1842"/><View style={s.row}><Field compact icon="calendar-outline" label="Expiry" value="09/29"/><Field compact icon="lock-closed-outline" label="CVV" value="***"/></View></View>
    <View style={[s.verifyBox,state==='approved'&&s.verifyApproved]}><Ionicons name={state==='approved'?'checkmark-circle':'shield-checkmark-outline'} size={22} color={state==='approved'?p.green:p.blue2}/><View style={{flex:1}}><Text style={s.noticeTitle}>{state==='ready'?'Ready to verify':state==='verifying'?'Verifying card...':'Card verified'}</Text><Text style={s.meta}>{state==='approved'?'Secure preview verification completed.':'Encore secure payment preview.'}</Text></View></View>
    {state!=='approved'?<PrimaryButton label={state==='verifying'?'Verifying...':'Verify card'} icon="shield-checkmark-outline" onPress={verify}/>:<PrimaryButton label="Confirm booking" icon="checkmark" onPress={onContinue}/>}
  </View>
}

function Confirmation({onContinue}:{onContinue:()=>void}){return <View style={s.confirmation}><View style={s.confirmHalo}><Ionicons name="checkmark" size={36} color={p.white}/></View><Text style={s.confirmTitle}>Your journey is ready.</Text><Text style={s.confirmCopy}>Seats 4B and 4C are reserved on EN-001. Your digital boarding pass is ready.</Text><View style={s.confirmStats}><TechStat icon="seat-passenger" label="Seats" value="4B · 4C"/><TechStat icon="bus" label="Vehicle" value="203"/><TechStat icon="clock-outline" label="Boarding" value="08:10"/></View><PrimaryButton label="View boarding pass" icon="ticket-outline" onPress={onContinue}/></View>}

function Ticket({selectedSeats}:{selectedSeats:string[]}){return <View style={s.ticket}><View style={s.ticketTop}><Text style={s.ticketBrand}>ENCORE TRANSPORT</Text><Text style={s.ticketId}>EN-001</Text><Tag text="BOARDING"/></View><RouteTimes/><View style={s.ticketBody}><Qr/><View style={{flex:1}}><Text style={s.label}>Passenger</Text><Text style={s.ticketValue}>Maria Torres</Text><Text style={s.label}>Seats</Text><Text style={s.ticketValue}>{selectedSeats.join(', ')}</Text><Text style={s.label}>Vehicle</Text><Text style={s.ticketValue}>Bus 203 · A874512</Text></View></View><View style={s.ticketFooter}><Ionicons name="phone-portrait-outline" size={18} color={p.blue2}/><Text style={s.meta}>Show this pass to the driver while boarding.</Text></View></View>}

function Trips({onOpen}:{onOpen:()=>void}){return <View style={s.stack}><SectionTitle title="Upcoming"/><Pressable style={s.tripListCard} onPress={onOpen}><Tag text="EN-001"/><Text style={s.resultTitle}>Santo Domingo → Santiago</Text><Text style={s.meta}>Sep 14 · 08:30 · Bus 203</Text><RouteTimes/></Pressable><SectionTitle title="Past"/><View style={s.tripListCard}><Tag text="Completed"/><Text style={s.resultTitle}>Santiago → Santo Domingo</Text><Text style={s.meta}>Sep 02 · 17:00 · Bus 144</Text></View></View>}
function Profile(){return <View style={s.stack}><View style={s.profileCard}><View style={s.bigAvatar}><Text style={s.bigAvatarText}>MT</Text></View><Text style={s.screenTitle}>Maria Torres</Text><Text style={s.meta}>Encore Passenger · Verified profile</Text></View><View style={s.passengerCard}><Info icon="mail-outline" label="Email" value="maria.torres@mail.com"/><Info icon="call-outline" label="Phone" value="+1 809 555 1842"/><Info icon="shield-checkmark-outline" label="Identity" value="Verified"/><Info icon="notifications-outline" label="Trip alerts" value="Enabled"/></View></View>}

function Field({icon,label,value,compact}:{icon:keyof typeof Ionicons.glyphMap;label:string;value:string;compact?:boolean}){return <View style={[s.field,compact&&s.fieldCompact]}><View style={s.fieldIcon}><Ionicons name={icon} size={18} color={p.blue2}/></View><View style={{flex:1}}><Text style={s.label}>{label}</Text><TextInput style={s.input} defaultValue={value} placeholderTextColor={p.muted}/></View></View>}
function Info({icon,label,value}:{icon:keyof typeof Ionicons.glyphMap;label:string;value:string}){return <View style={s.info}><View style={s.infoIcon}><Ionicons name={icon} size={17} color={p.blue2}/></View><View style={{flex:1}}><Text style={s.label}>{label}</Text><Text style={s.infoValue}>{value}</Text></View></View>}
function Stop({label,value,end}:{label:string;value:string;end?:boolean}){return <View style={s.stop}><View style={[s.stopDot,end&&{backgroundColor:p.green}]}/><View><Text style={s.label}>{label}</Text><Text style={s.infoValue}>{value}</Text></View></View>}
function Feature({icon,text}:{icon:keyof typeof MaterialCommunityIcons.glyphMap;text:string}){return <View style={s.feature}><MaterialCommunityIcons name={icon} size={15} color={p.blue2}/><Text style={s.featureText}>{text}</Text></View>}
function Tag({text}:{text:string}){return <View style={s.tag}><Text style={s.tagText}>{text}</Text></View>}
function Time({time,city,right,light}:{time:string;city:string;right?:boolean;light?:boolean}){return <View style={right&&{alignItems:'flex-end'}}><Text style={[s.time,light&&{color:p.white}]}>{time}</Text><Text style={[s.city,light&&{color:'#b9cbd5'}]}>{city}</Text></View>}
function SectionTitle({title,action}:{title:string;action?:string}){return <View style={s.sectionTitle}><Text style={s.sectionTitleText}>{title}</Text>{action&&<Text style={s.link}>{action}</Text>}</View>}
function TechStat({icon,label,value}:{icon:keyof typeof MaterialCommunityIcons.glyphMap;label:string;value:string}){return <View style={s.techStat}><MaterialCommunityIcons name={icon} size={16} color={p.blue2}/><Text style={s.techLabel}>{label}</Text><Text style={s.techValue}>{value}</Text></View>}
function Sticky({title,subtitle,label,onPress,disabled}:{title:string;subtitle:string;label:string;onPress:()=>void;disabled?:boolean}){return <View style={s.sticky}><View><Text style={s.stickyTitle}>{title}</Text><Text style={s.meta}>{subtitle}</Text></View><Pressable disabled={disabled} onPress={onPress} style={[s.stickyButton,disabled&&{opacity:.4}]}><Text style={s.stickyButtonText}>{label}</Text><Ionicons name="arrow-forward" size={18} color={p.white}/></Pressable></View>}
function PrimaryButton({label,icon,onPress}:{label:string;icon:keyof typeof Ionicons.glyphMap;onPress:()=>void}){return <Pressable onPress={onPress} style={({pressed})=>[s.primary,pressed&&{transform:[{scale:.985}]}]}><Ionicons name={icon} size={18} color={p.white}/><Text style={s.primaryText}>{label}</Text><Ionicons name="arrow-forward" size={17} color={p.white}/></Pressable>}
function IconButton({icon,onPress}:{icon:keyof typeof Ionicons.glyphMap;onPress:()=>void}){return <Pressable style={s.iconButton} onPress={onPress}><Ionicons name={icon} size={23} color={p.ink}/></Pressable>}
function Qr(){const on=new Set([0,1,2,4,5,6,7,8,10,12,13,14,16,17,19,21,22,23,24,26,28,29,30,31,33,35,36,38,39,40,42,44,45,47,48,49,51,53,55,56,57,58,60,62,63]);return <View style={s.qr}>{Array.from({length:64},(_,i)=><View key={i} style={[s.qrCell,on.has(i)&&s.qrOn]}/>)}</View>}
function BottomNav({tab,setTab}:{tab:Tab;setTab:(t:Tab)=>void}){const items:[Tab,keyof typeof Ionicons.glyphMap,string][]=[['home','home-outline','Home'],['trips','map-outline','Trips'],['tickets','ticket-outline','Tickets'],['profile','person-outline','Profile']];return <View style={s.nav}>{items.map(([t,icon,label])=><Pressable key={t} onPress={()=>setTab(t)} style={s.navItem}><Ionicons name={icon} size={20} color={tab===t?p.blue2:p.muted}/><Text style={[s.navText,tab===t&&{color:p.blue2,fontWeight:'900'}]}>{label}</Text></Pressable>)}</View>}

const s=StyleSheet.create({
safe:{flex:1,backgroundColor:p.bg},app:{flex:1},content:{padding:16,paddingBottom:110,gap:16},stack:{gap:16},
header:{paddingHorizontal:16,paddingTop:8,paddingBottom:11,backgroundColor:p.bg},headerRow:{flexDirection:'row',alignItems:'center',gap:10},headerCopy:{flex:1},brand:{fontSize:10,fontWeight:'900',letterSpacing:1.2,color:p.muted,textTransform:'uppercase'},title:{fontSize:29,fontWeight:'900',color:p.ink,letterSpacing:-1},logo:{width:48,height:48,borderRadius:18,backgroundColor:p.ink,alignItems:'center',justifyContent:'center'},logoText:{color:p.white,fontWeight:'900',fontSize:20},avatar:{width:48,height:48,borderRadius:18,backgroundColor:p.ink,alignItems:'center',justifyContent:'center'},avatarText:{color:p.white,fontWeight:'900'},iconButton:{width:48,height:48,borderRadius:16,backgroundColor:p.white,borderWidth:1,borderColor:p.line,alignItems:'center',justifyContent:'center'},progress:{height:4,backgroundColor:'#dae5ea',marginTop:12,borderRadius:4,overflow:'hidden'},progressFill:{height:4,backgroundColor:p.blue,borderRadius:4},
greetingRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},greeting:{fontSize:12,color:p.muted},homeHeadline:{fontSize:27,fontWeight:'900',color:p.ink,letterSpacing:-.8},livePill:{flexDirection:'row',alignItems:'center',gap:5,paddingHorizontal:10,paddingVertical:7,borderRadius:14,backgroundColor:'#e6f6ef'},liveDot:{width:7,height:7,borderRadius:4,backgroundColor:p.green},liveText:{fontSize:9,fontWeight:'900',color:p.green},
searchCard:{backgroundColor:p.white,borderWidth:1,borderColor:p.line,borderRadius:26,padding:14,shadowColor:'#24465a',shadowOpacity:.07,shadowRadius:18,elevation:2},field:{minHeight:62,flexDirection:'row',alignItems:'center',gap:10},fieldCompact:{flex:1},fieldIcon:{width:34,height:34,borderRadius:12,backgroundColor:'#ebf7fc',alignItems:'center',justifyContent:'center'},label:{fontSize:9,color:p.muted,fontWeight:'800',textTransform:'uppercase',letterSpacing:.4},input:{fontSize:14,color:p.ink,fontWeight:'800',paddingVertical:2},swapRow:{flexDirection:'row',alignItems:'center',gap:9},rule:{height:1,backgroundColor:'#e9eef1',flex:1},swapCircle:{width:34,height:34,borderRadius:17,borderWidth:1,borderColor:p.line,alignItems:'center',justifyContent:'center'},row:{flexDirection:'row',gap:10},
primary:{minHeight:52,borderRadius:17,backgroundColor:p.blue2,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:16,marginTop:8},primaryText:{color:p.white,fontWeight:'900',fontSize:13},
sectionTitle:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},sectionTitleText:{fontSize:18,fontWeight:'900',color:p.ink},link:{fontSize:11,fontWeight:'900',color:p.blue2},
upcoming:{backgroundColor:p.ink,borderRadius:24,padding:17,gap:13},upcomingTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},pending:{fontSize:9,fontWeight:'900',color:'#ffd48a'},darkMeta:{fontSize:10,color:'#b9cbd5'},routeTimes:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},routeLine:{flex:1,flexDirection:'row',alignItems:'center',marginHorizontal:12},routeDot:{width:8,height:8,borderRadius:4,backgroundColor:'#75d4f2'},routeDotEnd:{backgroundColor:'#70d0ad'},routeDash:{height:2,flex:1,backgroundColor:'#3a596c'},time:{fontSize:24,fontWeight:'900',color:p.ink},city:{fontSize:9,color:p.muted},
destRow:{gap:10,paddingRight:8},destCard:{width:160,minHeight:130,borderRadius:22,backgroundColor:p.white,borderWidth:1,borderColor:p.line,padding:14,justifyContent:'space-between'},destCardAlt:{backgroundColor:'#eaf7fb'},destCode:{fontSize:10,fontWeight:'900',color:p.blue2},destName:{fontSize:18,fontWeight:'900',color:p.ink},destFare:{fontSize:11,color:p.muted,fontWeight:'800'},
map:{height:350,borderRadius:24,overflow:'hidden',borderWidth:1,borderColor:p.line},mapCompact:{height:225},mapTop:{position:'absolute',left:12,right:12,top:12,flexDirection:'row',justifyContent:'space-between'},mapLabel:{fontSize:10,fontWeight:'900',backgroundColor:'rgba(255,255,255,.94)',paddingHorizontal:10,paddingVertical:8,borderRadius:12,color:p.ink},mapStatus:{flexDirection:'row',gap:6,alignItems:'center',backgroundColor:'rgba(255,255,255,.94)',paddingHorizontal:10,paddingVertical:8,borderRadius:12},mapStatusText:{fontSize:9,fontWeight:'900',color:p.green},mapBottom:{position:'absolute',left:12,right:12,bottom:12,backgroundColor:'rgba(255,255,255,.95)',borderRadius:16,padding:12,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},mapBottomTitle:{fontSize:13,fontWeight:'900',color:p.ink},busMarker:{width:34,height:34,borderRadius:17,backgroundColor:p.blue2,alignItems:'center',justifyContent:'center',borderWidth:3,borderColor:p.white},
techStrip:{flexDirection:'row',gap:8},techStat:{flex:1,minHeight:74,borderRadius:18,backgroundColor:p.white,borderWidth:1,borderColor:p.line,padding:10,justifyContent:'space-between'},techLabel:{fontSize:8,color:p.muted,fontWeight:'800'},techValue:{fontSize:11,color:p.ink,fontWeight:'900'},
resultCard:{backgroundColor:p.white,borderWidth:1,borderColor:p.line,borderRadius:22,padding:15,gap:13},resultFeatured:{borderLeftWidth:4,borderLeftColor:p.blue},resultTop:{flexDirection:'row',justifyContent:'space-between',gap:10},resultTitle:{fontSize:17,fontWeight:'900',color:p.ink,marginTop:8},price:{fontSize:15,fontWeight:'900',color:p.ink},features:{flexDirection:'row',gap:8,flexWrap:'wrap'},feature:{flexDirection:'row',gap:5,alignItems:'center',backgroundColor:'#f3f7f9',paddingHorizontal:9,paddingVertical:7,borderRadius:12},featureText:{fontSize:9,color:p.ink2,fontWeight:'800'},resultFooter:{flexDirection:'row',justifyContent:'flex-end',alignItems:'center'},
tag:{alignSelf:'flex-start',paddingHorizontal:9,paddingVertical:6,borderRadius:11,backgroundColor:'#e8f7fc'},tagText:{fontSize:8,fontWeight:'900',color:p.blue2,letterSpacing:.4},
tripCard:{backgroundColor:p.white,borderWidth:1,borderColor:p.line,borderRadius:22,padding:16,gap:15},screenTitle:{fontSize:25,fontWeight:'900',letterSpacing:-.7,color:p.ink},infoGrid:{gap:4},info:{flexDirection:'row',gap:10,alignItems:'center',paddingVertical:10,borderBottomWidth:1,borderBottomColor:'#edf1f3'},infoIcon:{width:34,height:34,borderRadius:11,backgroundColor:'#edf8fc',alignItems:'center',justifyContent:'center'},infoValue:{fontSize:13,fontWeight:'900',color:p.ink,marginTop:2},
routeTimeline:{backgroundColor:p.white,borderWidth:1,borderColor:p.line,borderRadius:22,padding:16},stop:{flexDirection:'row',gap:11,alignItems:'center'},stopDot:{width:11,height:11,borderRadius:6,backgroundColor:p.blue},timelineConnector:{width:2,height:28,backgroundColor:'#dce7ec',marginLeft:4},
seatHeading:{flexDirection:'row',justifyContent:'space-between',gap:10},counter:{width:52,height:52,borderRadius:18,backgroundColor:p.ink,alignItems:'center',justifyContent:'center'},counterText:{color:p.white,fontWeight:'900'},legend:{flexDirection:'row',gap:10,flexWrap:'wrap'},legendItem:{flexDirection:'row',alignItems:'center',gap:5},legendDot:{width:9,height:9,borderRadius:5,borderWidth:1,borderColor:'#c8d4da'},cabinInfo:{flexDirection:'row',gap:8},
busShell:{minHeight:910,borderWidth:1,borderColor:'#c5d6df',borderRadius:60,overflow:'hidden',paddingTop:128,paddingHorizontal:20,paddingBottom:70,backgroundColor:'#eaf2f6'},cockpit:{position:'absolute',left:36,right:36,top:84,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},driver:{flexDirection:'row',alignItems:'center',gap:7},steering:{width:44,height:44,borderRadius:22,backgroundColor:p.ink,alignItems:'center',justifyContent:'center'},driverText:{fontSize:10,fontWeight:'900',color:p.muted},door:{flexDirection:'row',gap:6,alignItems:'center'},doorText:{fontSize:9,fontWeight:'800',color:p.muted},seatRows:{gap:10},busRow:{flexDirection:'row',alignItems:'center'},rowPill:{width:25,height:28,borderRadius:10,backgroundColor:'#dfe9ee',alignItems:'center',justifyContent:'center'},rowNumber:{fontSize:9,fontWeight:'900',color:p.muted},seatPair:{flex:1,flexDirection:'row',gap:7,justifyContent:'space-evenly'},aisle:{width:36,height:65,alignItems:'center',justifyContent:'center'},aisleText:{fontSize:7,color:'#9aabb4',writingDirection:'rtl',transform:[{rotate:'90deg'}]},seatOuter:{flex:1,maxWidth:60},seat:{height:62,position:'relative',alignItems:'center',justifyContent:'center'},seatBack:{position:'absolute',left:8,right:8,top:2,height:44,borderRadius:13,borderWidth:1,borderColor:'#bfced5',backgroundColor:p.white,shadowColor:'#314e60',shadowOpacity:.09,shadowRadius:4,elevation:2},seatBackSelected:{backgroundColor:p.green,borderColor:p.green},headRest:{position:'absolute',left:7,right:7,top:5,height:7,borderRadius:5,backgroundColor:'#e4ebef'},seatIconWrap:{position:'absolute',left:0,right:0,top:13,alignItems:'center'},seatCushion:{position:'absolute',left:13,right:13,bottom:5,height:18,borderRadius:7,backgroundColor:'#eef3f5',borderWidth:1,borderColor:'#c9d5da'},seatText:{position:'absolute',bottom:8,fontSize:8,fontWeight:'900',color:p.ink},accessibleBadge:{position:'absolute',left:2,bottom:2},seatAvailable:{},seatSelected:{},seatOccupied:{opacity:.45},seatReserved:{backgroundColor:'#fff5e2',borderRadius:12},seatUnavailable:{opacity:.2},seatAccessible:{backgroundColor:'#e7f8fd',borderRadius:12},rear:{position:'absolute',left:55,right:55,bottom:27,height:42,borderRadius:20,backgroundColor:'#d7e3e8',alignItems:'center',justifyContent:'center'},rearText:{fontSize:8,fontWeight:'900',color:'#7d8f99'},floatingSummary:{position:'absolute',right:14,bottom:82,backgroundColor:p.white,borderWidth:1,borderColor:p.line,borderRadius:18,padding:12,minWidth:90,shadowColor:'#24465a',shadowOpacity:.1,shadowRadius:12,elevation:2},floatingValue:{fontSize:15,fontWeight:'900',color:p.ink},
sticky:{backgroundColor:p.white,borderWidth:1,borderColor:p.line,borderRadius:23,padding:15,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},stickyTitle:{fontSize:19,fontWeight:'900',color:p.ink},stickyButton:{minHeight:48,borderRadius:16,backgroundColor:p.blue,flexDirection:'row',gap:8,alignItems:'center',paddingHorizontal:16},stickyButtonText:{fontSize:11,fontWeight:'900',color:p.white},
smartNotice:{flexDirection:'row',gap:10,alignItems:'center',backgroundColor:'#e9f7f1',borderWidth:1,borderColor:'#cbeadf',borderRadius:20,padding:13},noticeTitle:{fontSize:12,fontWeight:'900',color:p.ink},passengerCard:{backgroundColor:p.white,borderWidth:1,borderColor:p.line,borderRadius:23,padding:15},passengerTitleRow:{flexDirection:'row',justifyContent:'space-between',marginBottom:5},passengerNo:{fontSize:11,fontWeight:'900',color:p.blue2},passengerStatus:{fontSize:9,fontWeight:'900',color:p.green},
reviewHero:{backgroundColor:p.ink,borderRadius:24,padding:18,gap:13},reviewKicker:{fontSize:8,fontWeight:'900',letterSpacing:1,color:'#88ddfa'},reviewTitle:{fontSize:21,fontWeight:'900',color:p.white},reviewCard:{backgroundColor:p.white,borderWidth:1,borderColor:p.line,borderRadius:22,padding:14},totalCard:{backgroundColor:'#e9f7fc',borderWidth:1,borderColor:'#cce9f3',borderRadius:22,padding:18},totalValue:{fontSize:31,fontWeight:'900',color:p.ink},
paymentMethods:{flexDirection:'row',borderWidth:1,borderColor:p.line,borderRadius:18,overflow:'hidden'},paymentMethod:{flex:1,paddingVertical:14,alignItems:'center',backgroundColor:p.white},paymentMethodActive:{backgroundColor:'#e5f6fc'},paymentMethodText:{fontSize:10,fontWeight:'900',color:p.ink},virtualCard:{height:210,borderRadius:25,backgroundColor:p.ink,padding:20,justifyContent:'space-between',overflow:'hidden'},cardScan:{position:'absolute',top:0,bottom:0,width:'18%',backgroundColor:'rgba(90,205,245,.17)'},virtualTop:{flexDirection:'row',justifyContent:'space-between'},virtualBrand:{fontSize:12,fontWeight:'900',letterSpacing:2,color:'#90e0fb'},virtualNumber:{fontSize:20,fontWeight:'900',letterSpacing:2,color:p.white},virtualBottom:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-end'},virtualLabel:{fontSize:7,color:'#91a8b5'},virtualValue:{fontSize:10,fontWeight:'900',color:p.white},paymentForm:{backgroundColor:p.white,borderWidth:1,borderColor:p.line,borderRadius:22,padding:14},verifyBox:{flexDirection:'row',gap:10,alignItems:'center',backgroundColor:'#ebf7fc',borderWidth:1,borderColor:'#cde8f2',borderRadius:18,padding:13},verifyApproved:{backgroundColor:'#e9f7f1',borderColor:'#cbeadf'},
confirmation:{backgroundColor:p.white,borderWidth:1,borderColor:p.line,borderRadius:25,padding:24,alignItems:'center',gap:15},confirmHalo:{width:70,height:70,borderRadius:35,backgroundColor:p.green,alignItems:'center',justifyContent:'center'},confirmTitle:{fontSize:27,fontWeight:'900',color:p.ink,textAlign:'center'},confirmCopy:{fontSize:12,color:p.muted,lineHeight:19,textAlign:'center'},confirmStats:{flexDirection:'row',gap:7,width:'100%'},
ticket:{backgroundColor:p.white,borderWidth:1,borderColor:p.line,borderRadius:24,overflow:'hidden'},ticketTop:{backgroundColor:'#e8f7fb',padding:18,gap:5},ticketBrand:{fontSize:8,fontWeight:'900',letterSpacing:1.2,color:p.blue2},ticketId:{fontSize:28,fontWeight:'900',color:p.ink},ticketBody:{flexDirection:'row',gap:16,padding:18},ticketFooter:{flexDirection:'row',gap:8,alignItems:'center',padding:14,borderTopWidth:1,borderTopColor:p.line},ticketValue:{fontSize:12,fontWeight:'900',color:p.ink,marginBottom:8},qr:{width:120,height:120,padding:8,backgroundColor:p.white,borderWidth:1,borderColor:p.line,flexDirection:'row',flexWrap:'wrap'},qrCell:{width:'12.5%',height:'12.5%'},qrOn:{backgroundColor:p.ink},
tripListCard:{backgroundColor:p.white,borderWidth:1,borderColor:p.line,borderRadius:22,padding:16,gap:8},profileCard:{alignItems:'center',backgroundColor:p.white,borderWidth:1,borderColor:p.line,borderRadius:24,padding:24},bigAvatar:{width:80,height:80,borderRadius:26,backgroundColor:p.ink,alignItems:'center',justifyContent:'center',marginBottom:10},bigAvatarText:{color:p.white,fontSize:24,fontWeight:'900'},
meta:{fontSize:10,color:p.muted},navSafe:{backgroundColor:p.bg},nav:{marginHorizontal:12,marginBottom:6,borderRadius:24,backgroundColor:p.white,borderWidth:1,borderColor:p.line,flexDirection:'row',shadowColor:'#24465a',shadowOpacity:.08,shadowRadius:16,elevation:2},navItem:{flex:1,minHeight:58,alignItems:'center',justifyContent:'center',gap:3},navText:{fontSize:8,color:p.muted}
});
