import { FormEvent, useMemo, useState } from 'react';

type Screen = 'home'|'results'|'trip'|'seats'|'passengers'|'review'|'payment'|'confirmation'|'ticket';
type SeatState = 'available'|'selected'|'occupied'|'reserved';

type Trip = {
  id:string; origin:string; destination:string; departure:string; arrival:string;
  duration:string; price:number; bus:string; seats:number; featured?:boolean;
};

const trips:Trip[] = [
  {id:'EN-001',origin:'Santo Domingo',destination:'Santiago',departure:'08:30',arrival:'10:45',duration:'2h 15m',price:685,bus:'Bus 203',seats:18,featured:true},
  {id:'EN-014',origin:'Santo Domingo',destination:'Santiago',departure:'11:15',arrival:'13:35',duration:'2h 20m',price:735,bus:'Bus 118',seats:12},
  {id:'EN-022',origin:'Santo Domingo',destination:'Santiago',departure:'15:10',arrival:'17:20',duration:'2h 10m',price:790,bus:'Bus 311',seats:9}
];

const routePoints = ['Agora Mall','Autopista Duarte','Bonao','La Vega','Monumento'];

const seatIds = Array.from({length: 40},(_,i)=>{
  const row = Math.floor(i/4)+1;
  const col = ['A','B','C','D'][i%4];
  return `${row}${col}`;
});

function money(value:number){ return `DOP ${value.toLocaleString('en-US')}`; }

export function PassengerApp(){
  const [screen,setScreen] = useState<Screen>('home');
  const [selectedTrip,setSelectedTrip] = useState<Trip>(trips[0]);
  const [selectedSeats,setSelectedSeats] = useState<string[]>(['4B','4C']);
  const [payment,setPayment] = useState<'Card'|'CardNet'|'VisaNet'>('Card');
  const [passenger2,setPassenger2] = useState('');
  const [history,setHistory] = useState<Screen[]>([]);
  const steps:Screen[] = ['home','results','trip','seats','passengers','review','payment','confirmation','ticket'];
  const step = steps.indexOf(screen);

  function move(next:Screen){
    if(next===screen) return;
    setHistory(current=>[...current,screen]);
    setScreen(next);
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function goBack(){
    setHistory(current=>{
      const copy=[...current];
      const previous=copy.pop();
      if(previous){ setScreen(previous); window.scrollTo({top:0,behavior:'smooth'}); }
      return copy;
    });
  }
  function resetFlow(){ setHistory([]); setScreen('home'); window.scrollTo({top:0,behavior:'smooth'}); }
  function jumpBack(target:Screen){
    const targetIndex=steps.indexOf(target);
    if(targetIndex<0||targetIndex>step) return;
    setScreen(target);
    setHistory(steps.slice(0,targetIndex));
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function chooseTrip(t:Trip){ setSelectedTrip(t); move('trip'); }
  function toggleSeat(id:string){
    const blocked = ['3B','5C','6B','9A','7D'];
    if(blocked.includes(id)) return;
    setSelectedSeats(cur => cur.includes(id) ? cur.filter(x=>x!==id) : cur.length < 2 ? [...cur,id] : cur);
  }

  return (
    <div className="app">
      <Topbar onBook={resetFlow} onTrips={()=>move('results')} />
      <div className="shell">
        <ProgressRail step={step} onStep={jumpBack} />
        <main className="stage">
          {screen==='home' && <Home onSearch={()=>move('results')} />}
          {screen==='results' && <Results onBack={goBack} onSelect={chooseTrip} />}
          {screen==='trip' && <TripView trip={selectedTrip} onBack={goBack} onContinue={()=>move('seats')} />}
          {screen==='seats' && <Seats trip={selectedTrip} selected={selectedSeats} toggle={toggleSeat} onBack={goBack} onContinue={()=>move('passengers')} />}
          {screen==='passengers' && <Passengers passenger2={passenger2} setPassenger2={setPassenger2} onBack={goBack} onContinue={()=>move('review')} />}
          {screen==='review' && <Review trip={selectedTrip} seats={selectedSeats} passenger2={passenger2} onBack={goBack} onContinue={()=>move('payment')} />}
          {screen==='payment' && <Payment method={payment} setMethod={setPayment} onBack={goBack} onContinue={()=>move('confirmation')} />}
          {screen==='confirmation' && <Confirmation onBack={goBack} onTicket={()=>move('ticket')} onNew={resetFlow} />}
          {screen==='ticket' && <Ticket trip={selectedTrip} seats={selectedSeats} passenger2={passenger2} onBack={goBack} />}
        </main>
      </div>
      <BottomNav current={screen} onHome={resetFlow} onTrips={()=>move('results')} onTicket={()=>move('ticket')} />
    </div>
  );
}

function Topbar({onBook,onTrips}:{onBook:()=>void;onTrips:()=>void}){
  return <header className="topbar">
    <button className="brand brand-button" type="button" onClick={onBook}>
      <img src="/logo.svg" alt="Encore Transport" />
      <div><strong>ENCORE</strong><span>Passenger</span></div>
    </button>
    <nav>
      <button onClick={onBook}>Book</button><button onClick={onTrips}>Trips</button><button>Support</button>
    </nav>
    <div className="user">
      <span>Maria Torres</span><b>MT</b>
    </div>
  </header>
}

const stepsForProgress:Screen[]=['home','results','trip','seats','passengers','review','payment','ticket'];

function ProgressRail({step,onStep}:{step:number;onStep:(screen:Screen)=>void}){
  const labels=['Search','Results','Trip','Seats','Passengers','Review','Pay','Ticket'];
  const pct=Math.min(100,Math.round((step/8)*100));
  return <section className="progress-block">
    <div className="progress-head"><span>BOOKING JOURNEY</span><strong>{pct}%</strong></div>
    <div className="progress-line"><i style={{width:`${pct}%`}} /></div>
    <div className="steps">{labels.map((x,i)=>{const target=stepsForProgress[i];return <button type="button" key={x} disabled={i>step} onClick={()=>target&&onStep(target)} className={i<=Math.min(step,7)?'active':''}><em>{String(i+1).padStart(2,'0')}</em><span>{x}</span></button>})}</div>
  </section>
}

function Home({onSearch}:{onSearch:()=>void}){
  const submit=(e:FormEvent)=>{e.preventDefault();onSearch()};
  return <section className="home">
    <div className="hero">
      <div className="hero-copy">
        <span className="kicker">INTERCITY, REFINED</span>
        <h1>Move through the island with intent.</h1>
        <p>Choose your route, pick a real seat, and travel with live trip context from booking to boarding.</p>
        <div className="hero-stats">
          <div><strong>38</strong><span>Destinations</span></div>
          <div><strong>96%</strong><span>On-time</span></div>
          <div><strong>420+</strong><span>Daily departures</span></div>
        </div>
      </div>
      <div className="hero-art">
        <div className="route-visual">
          <span>SDQ</span><i></i><b>BUS 203</b><i></i><span>STI</span>
        </div>
        <div className="hero-ticket">
          <small>NEXT DEPARTURE</small>
          <strong>08:30 → 10:45</strong>
          <span>Premium Coach · Gate N-04</span>
        </div>
      </div>
    </div>

    <form className="booking-console" onSubmit={submit}>
      <div className="console-title"><span>01</span><strong>Build your trip</strong></div>
      <label><span>FROM</span><input defaultValue="Santo Domingo" /></label>
      <button className="swap" type="button">⇄</button>
      <label><span>TO</span><input defaultValue="Santiago" /></label>
      <label><span>DATE</span><input type="date" defaultValue="2026-09-14" /></label>
      <label><span>PASSENGERS</span><input type="number" defaultValue={2} min={1} max={8} /></label>
      <button className="cta" type="submit">SEARCH DEPARTURES <span>→</span></button>
    </form>

    <div className="editorial-grid">
      <article className="feature-large"><span>LIVE ROUTE INTELLIGENCE</span><h2>Know where the journey stands before you board.</h2><p>Departure context, route progress, bus assignment, boarding point and expected arrival—all in one view.</p></article>
      <article><span>POPULAR</span><h3>Punta Cana</h3><strong>From DOP 1,048</strong></article>
      <article><span>UPCOMING</span><h3>EN-001</h3><strong>Santo Domingo → Santiago</strong></article>
    </div>
  </section>
}

function Results({onBack,onSelect}:{onBack:()=>void;onSelect:(t:Trip)=>void}){
  return <section>
    <PageHead eyebrow="AVAILABLE DEPARTURES" title="Choose the rhythm of your day." onBack={onBack} />
    <RoutePanel compact />
    <div className="trip-list">{trips.map((t,i)=><article className={`trip-card ${t.featured?'featured':''}`} key={t.id}>
      <div className="trip-index">{String(i+1).padStart(2,'0')}</div>
      <div className="trip-main">
        <div className="trip-title"><div><span>{t.id}</span><h3>{t.origin} <b>→</b> {t.destination}</h3></div><strong>{money(t.price)}</strong></div>
        <div className="time-rail"><div><strong>{t.departure}</strong><span>Departure</span></div><i></i><b>{t.duration}</b><i></i><div><strong>{t.arrival}</strong><span>Arrival</span></div></div>
        <div className="trip-meta"><span>{t.bus}</span><span>{t.seats} seats available</span><span>Wi-Fi</span><span>A/C</span><span>Luggage</span></div>
      </div>
      <div className="trip-actions"><button className="ghost">DETAILS</button><button className="cta small" onClick={()=>onSelect(t)}>SELECT <span>→</span></button></div>
    </article>)}</div>
  </section>
}

function TripView({trip,onBack,onContinue}:{trip:Trip;onBack:()=>void;onContinue:()=>void}){
  return <section>
    <PageHead eyebrow={`${trip.id} · PREMIUM COACH`} title={`${trip.origin} to ${trip.destination}`} onBack={onBack} />
    <RoutePanel />
    <div className="facts">
      <Fact n="01" label="Boarding" value="Agora Mall · North entrance" sub="Arrive 20 min early" />
      <Fact n="02" label="Departure" value={`${trip.departure} · Sep 14`} sub="Gate N-04" />
      <Fact n="03" label="Vehicle" value={`${trip.bus} · A874512`} sub="Premium Coach" />
      <Fact n="04" label="Driver" value="Ricardo Luna" sub="Verified operator" />
    </div>
    <div className="action-band"><div><span>FARE PER PASSENGER</span><strong>{money(trip.price)}</strong></div><button className="cta" onClick={onContinue}>CHOOSE SEATS <span>→</span></button></div>
  </section>
}

function RoutePanel({compact=false}:{compact?:boolean}){
  return <div className={`route-panel ${compact?'compact':''}`}>
    <div className="map-grid"></div>
    <svg viewBox="0 0 1000 420" preserveAspectRatio="none"><path d="M100,330 C280,340 300,185 470,220 S720,170 900,80" /></svg>
    <div className="map-label start">SANTO DOMINGO</div><div className="map-label end">SANTIAGO</div>
    <div className="moving-bus">BUS 203</div>
    <div className="route-status"><i></i><div><strong>ON SCHEDULE</strong><span>Live preview · ETA 10:45</span></div></div>
    <div className="route-points">{routePoints.map((x,i)=><span key={x} className={i===0||i===routePoints.length-1?'major':''}>{x}</span>)}</div>
  </div>
}

function Seats({trip,selected,toggle,onBack,onContinue}:{trip:Trip;selected:string[];toggle:(id:string)=>void;onBack:()=>void;onContinue:()=>void}){
  const status=(id:string):SeatState => selected.includes(id)?'selected':['3B','5C','6B','9A'].includes(id)?'occupied':id==='7D'?'reserved':'available';
  return <section>
    <PageHead eyebrow="SEAT SELECTION" title="Choose your place on board." onBack={onBack} />
    <div className="seat-layout">
      <div className="bus">
        <div className="windshield"><span>FRONT</span><b>DRIVER</b></div>
        <div className="seat-legend"><span><i className="av"></i>Available</span><span><i className="sel"></i>Selected</span><span><i className="occ"></i>Occupied</span><span><i className="res"></i>Reserved</span></div>
        <div className="seat-grid">{Array.from({length:10},(_,r)=>{
          const row=r+1; const ids=['A','B','C','D'].map(c=>`${row}${c}`);
          return <div className="seat-row" key={row}><em>{row}</em>
            {ids.slice(0,2).map(id=><Seat key={id} id={id} state={status(id)} onClick={()=>toggle(id)} />)}
            <span className="aisle"></span>
            {ids.slice(2).map(id=><Seat key={id} id={id} state={status(id)} onClick={()=>toggle(id)} />)}
          </div>
        })}</div>
        <div className="rear">REAR · EMERGENCY EXIT</div>
      </div>
      <aside className="seat-summary">
        <span className="kicker">YOUR SELECTION</span>
        <h3>{selected.length}/2 seats</h3>
        <div className="selected-list">{selected.map(x=><b key={x}>{x}</b>)}</div>
        <dl><div><dt>Trip</dt><dd>{trip.id}</dd></div><div><dt>Bus</dt><dd>{trip.bus}</dd></div><div><dt>Total</dt><dd>{money(trip.price*2)}</dd></div></dl>
        <button className="cta" disabled={selected.length!==2} onClick={onContinue}>CONTINUE <span>→</span></button>
      </aside>
    </div>
  </section>
}

function Seat({id,state,onClick}:{id:string;state:SeatState;onClick:()=>void}){
  return <button className={`seat ${state}`} onClick={onClick} disabled={state==='occupied'||state==='reserved'}><i></i><span>{id}</span></button>
}

function Passengers({passenger2,setPassenger2,onBack,onContinue}:{passenger2:string;setPassenger2:(v:string)=>void;onBack:()=>void;onContinue:()=>void}){
  const submit=(e:FormEvent)=>{e.preventDefault();onContinue()};
  return <section>
    <PageHead eyebrow="PASSENGER DETAILS" title="Who is travelling?" onBack={onBack} />
    <form className="passenger-form" onSubmit={submit}>
      <PassengerCard index={1} name="Maria Torres" document="001-7482110-4" phone="+1 809 555 1842" email="maria.torres@mail.com" />
      <PassengerCard index={2} name={passenger2} setName={setPassenger2} document="" phone="" email="" />
      <div className="form-footer"><span>All details are used only for booking and boarding validation.</span><button className="cta">REVIEW TRIP <span>→</span></button></div>
    </form>
  </section>
}

function PassengerCard({index,name,setName,document,phone,email}:{index:number;name:string;setName?:(v:string)=>void;document:string;phone:string;email:string}){
  return <article className="passenger-card">
    <div className="passenger-no">{String(index).padStart(2,'0')}</div>
    <div className="passenger-fields">
      <label><span>FULL NAME</span><input value={name} onChange={e=>setName?.(e.target.value)} readOnly={!setName} placeholder="Passenger name" /></label>
      <label><span>DOCUMENT</span><input defaultValue={document} placeholder="ID / Passport" /></label>
      <label><span>PHONE</span><input defaultValue={phone} placeholder="+1 809..." /></label>
      <label><span>EMAIL</span><input defaultValue={email} placeholder="name@email.com" /></label>
    </div>
  </article>
}

function Review({trip,seats,passenger2,onBack,onContinue}:{trip:Trip;seats:string[];passenger2:string;onBack:()=>void;onContinue:()=>void}){
  const subtotal=trip.price*2,total=subtotal+35;
  return <section>
    <PageHead eyebrow="REVIEW" title="One final look before payment." onBack={onBack} />
    <div className="review-grid">
      <div className="review-main">
        <ReviewLine n="01" label="Route" value={`${trip.origin} → ${trip.destination}`} sub={`${trip.departure} · ${trip.arrival} · ${trip.duration}`} />
        <ReviewLine n="02" label="Passengers" value={`Maria Torres${passenger2?`, ${passenger2}`:', Passenger 2'}`} sub={`Seats ${seats.join(', ')}`} />
        <ReviewLine n="03" label="Vehicle" value={`${trip.bus} · Premium Coach`} sub="Wi-Fi · A/C · Luggage" />
      </div>
      <aside className="price-panel">
        <span className="kicker">ORDER SUMMARY</span>
        <dl><div><dt>Fare</dt><dd>{money(subtotal)}</dd></div><div><dt>Service fee</dt><dd>DOP 35</dd></div><div className="total"><dt>Total</dt><dd>{money(total)}</dd></div></dl>
        <button className="cta" onClick={onContinue}>CONTINUE TO PAY <span>→</span></button>
      </aside>
    </div>
  </section>
}

function Payment({method,setMethod,onBack,onContinue}:{method:string;setMethod:(m:any)=>void;onBack:()=>void;onContinue:()=>void}){
  const [status,setStatus]=useState<'ready'|'verifying'|'approved'>('ready');
  const authorize=()=>{
    if(status!=='ready') return;
    setStatus('verifying');
    window.setTimeout(()=>{
      setStatus('approved');
      window.setTimeout(onContinue,720);
    },1350);
  };
  return <section>
    <PageHead eyebrow="PAYMENT" title="Secure your seats." onBack={onBack} />
    <div className="payment-grid">
      <div className="payment-main">
        <div className="payment-methods">{['Card','CardNet','VisaNet'].map(m=><button type="button" key={m} className={method===m?'active':''} onClick={()=>setMethod(m)}>{m}</button>)}</div>
        <div className="payment-trust"><span className="trust-dot"></span><div><strong>Secure preview checkout</strong><small>256-bit encrypted session · seat hold 08:00</small></div></div>
        <div className="card-form">
          <label><span>CARDHOLDER</span><input defaultValue="Maria Torres" /></label>
          <label><span>CARD NUMBER</span><input defaultValue="4821 0000 0000 4821" /></label>
          <div><label><span>EXPIRY</span><input defaultValue="09/29" /></label><label><span>CVV</span><input defaultValue="***" /></label></div>
        </div>
        <div className={`verification-panel ${status}`}>
          <span className="verification-icon">{status==='approved'?'✓':status==='verifying'?'◌':'⌁'}</span>
          <div><strong>{status==='approved'?'Card verified':status==='verifying'?'Verifying card…':'Ready to verify'}</strong><small>{status==='approved'?'Authorization accepted for this preview.':status==='verifying'?'Contacting the selected payment route and validating card data.':'No charge will be made in this preview.'}</small></div>
          <div className="verification-track"><i></i></div>
        </div>
      </div>
      <aside className={`credit-card ${status==='verifying'?'is-verifying':''} ${status==='approved'?'is-approved':''}`}><span>ENCORE</span><div className="card-chip"></div><strong>••••  ••••  ••••  4821</strong><div><b>MARIA TORRES</b><b>09/29</b></div><i className="card-shine"></i></aside>
    </div>
    <div className="action-band"><div><span>TOTAL DUE</span><strong>{money(1405)}</strong></div><button className="cta" disabled={status!=='ready'} onClick={authorize}>{status==='verifying'?'VERIFYING…':status==='approved'?'APPROVED ✓':'AUTHORIZE PAYMENT'} <span>→</span></button></div>
  </section>
}

function Confirmation({onBack,onTicket,onNew}:{onBack:()=>void;onTicket:()=>void;onNew:()=>void}){
  return <section>
    <PageHead eyebrow="BOOKING RESERVED" title="Your journey is ready." onBack={onBack} />
    <div className="confirmation">
      <div className="confirmation-mark">✓</div><span className="kicker">PAYMENT VERIFIED · SEATS HELD</span>
      <p>Seats 4B and 4C are reserved on EN-001. Your boarding pass is available now, and you can still return to the payment step during this preview.</p>
      <div className="confirmation-strip"><div><span>TRIP</span><strong>EN-001</strong></div><div><span>SEATS</span><strong>4B · 4C</strong></div><div><span>STATUS</span><strong>Ready to board</strong></div></div>
      <div className="confirmation-actions"><button className="ghost" onClick={onNew}>NEW SEARCH</button><button className="cta" onClick={onTicket}>VIEW BOARDING PASS <span>→</span></button></div>
    </div>
  </section>
}

function Ticket({trip,seats,passenger2,onBack}:{trip:Trip;seats:string[];passenger2:string;onBack:()=>void}){
  return <section>
    <PageHead eyebrow="DIGITAL BOARDING PASS" title="Ready to board." onBack={onBack} />
    <div className="boarding-pass">
      <div className="pass-head"><div><span>ENCORE TRANSPORT</span><strong>{trip.id}</strong></div><b>BOARDING</b></div>
      <div className="pass-route"><div><strong>{trip.departure}</strong><span>SDQ</span></div><i></i><em>BUS</em><i></i><div><strong>{trip.arrival}</strong><span>STI</span></div></div>
      <div className="pass-body"><Qr/><div className="pass-data"><ReviewLine n="A" label="Passenger" value={`Maria Torres${passenger2?` + ${passenger2}`:''}`} sub={`Seats ${seats.join(', ')}`} /><ReviewLine n="B" label="Vehicle" value={`${trip.bus} · A874512`} sub="Premium Coach" /><ReviewLine n="C" label="Booking" value="BK-EN-001-4281" sub="Present this pass to the driver" /></div></div>
    </div>
  </section>
}

function Qr(){
  const cells = new Set([0,1,2,4,5,6,7,8,10,12,13,14,16,17,19,21,22,23,24,26,28,29,30,31,33,35,36,38,39,40,42,44,45,47,48,49,51,53,55,56,57,58,60,62,63]);
  return <div className="qr">{Array.from({length:64},(_,i)=><i key={i} className={cells.has(i)?'on':''}></i>)}</div>
}

function PageHead({eyebrow,title,onBack}:{eyebrow:string;title:string;onBack:()=>void}){
  return <div className="page-head"><div><span className="kicker">{eyebrow}</span><h1>{title}</h1></div><button className="ghost" onClick={onBack}>← BACK</button></div>
}
function Fact({n,label,value,sub}:{n:string;label:string;value:string;sub:string}){
  return <article className="fact"><em>{n}</em><span>{label}</span><strong>{value}</strong><small>{sub}</small></article>
}
function ReviewLine({n,label,value,sub}:{n:string;label:string;value:string;sub:string}){
  return <article className="review-line"><em>{n}</em><div><span>{label}</span><strong>{value}</strong><small>{sub}</small></div></article>
}
function BottomNav({current,onHome,onTrips,onTicket}:{current:Screen;onHome:()=>void;onTrips:()=>void;onTicket:()=>void}){
  return <div className="bottom-nav"><button className={current==='home'?'active':''} onClick={onHome}>HOME</button><button className={current==='results'?'active':''} onClick={onTrips}>TRIPS</button><button className={current==='ticket'?'active':''} onClick={onTicket}>TICKET</button><button>PROFILE</button></div>
}
