import { fetchRoutes, fetchPassengerSearch, fetchTripSeats, mapJourney, health } from '../../packages/shared/api.mjs';

const destinationGrid=document.querySelector('#destinationGrid');
const bookingForm=document.querySelector('#bookingForm');
const seatPreview=document.querySelector('#seatPreview');
let featuredTrip=null;
let featuredJourney=null;

function esc(value=''){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));}
function routeCode(name=''){return name.split(/\s+/).filter(Boolean).map(x=>x[0]).join('').slice(0,3).toUpperCase()||'ET';}
function setText(selector,value){const el=document.querySelector(selector);if(el)el.textContent=String(value??'');}
function minutes(seconds){return Math.max(1,Math.round(Number(seconds||0)/60));}
function km(meters){return `${(Number(meters||0)/1000).toFixed(1)} km`;}

function svgPath(points){
  if(!Array.isArray(points)||points.length<2)return '';
  const lats=points.map(p=>Number(p.latitude));const lons=points.map(p=>Number(p.longitude));
  const minLat=Math.min(...lats),maxLat=Math.max(...lats),minLon=Math.min(...lons),maxLon=Math.max(...lons);
  const latSpan=Math.max(.000001,maxLat-minLat),lonSpan=Math.max(.000001,maxLon-minLon);
  return points.map((p,i)=>{const x=70+((Number(p.longitude)-minLon)/lonSpan)*860;const y=550-((Number(p.latitude)-minLat)/latSpan)*480;return `${i?'L':'M'}${x.toFixed(1)},${y.toFixed(1)}`}).join(' ');
}

function renderFeatured(trip){
  const card=document.querySelector('#featuredTrip');if(!card)return;
  if(!trip){card.innerHTML='<div class="trip-status"><i></i>No scheduled departures are currently available.</div>';return;}
  card.innerHTML=`<div class="trip-status"><i></i>${esc(String(trip.status??'scheduled').replaceAll('_',' '))}</div><div class="trip-points"><div><small>FROM</small><strong>${esc(trip.origin)}</strong><span>${esc((trip.departureTime??'').slice(0,5))}</span></div><div class="trip-track"><i></i><b></b><span>${esc(trip.busCode??'Vehicle assigned')}</span><b></b><i></i></div><div class="align-right"><small>TO</small><strong>${esc(trip.destination)}</strong><span>${esc((trip.arrivalTime??'').slice(0,5))}</span></div></div><div class="trip-card-meta"><span>${Number(trip.availableSeats??0)} seats</span><span>${Number(trip.durationMinutes??0)} min</span><span>DOP ${Number(trip.baseFare??0).toLocaleString('en-US')}</span></div>`;
}

function renderSeats(seats){
  if(!seatPreview)return;
  if(!seats.length){seatPreview.innerHTML='<p class="muted-copy">No seat layout is configured for this vehicle.</p>';return;}
  const rows=new Map();
  for(const seat of seats){const row=Number(seat.row_number ?? (parseInt(seat.seat_number,10) || 0));if(!rows.has(row))rows.set(row,[]);rows.get(row).push(seat);}
  seatPreview.innerHTML=[...rows.entries()].sort((a,b)=>a[0]-b[0]).map(([row,rowSeats])=>{
    const max=Math.max(4,...rowSeats.map(s=>Number(s.position_index??0)));
    const byPos=new Map(rowSeats.map(s=>[Number(s.position_index??0),s]));
    const items=[];
    for(let pos=1;pos<=max;pos++){
      const seat=byPos.get(pos);
      if(!seat){items.push('<span class="aisle" aria-hidden="true"></span>');continue;}
      items.push(`<button class="seat ${seat.available?'':'reserved'}" disabled aria-label="Seat ${esc(seat.seat_number)} ${seat.available?'available':'unavailable'}">${esc(seat.seat_number)}</button>`);
    }
    return `<div class="seat-row"><em>${row||''}</em>${items.join('')}</div>`;
  }).join('');
}

async function loadRoutes(){
  setText('#routesState','Loading current routes…');
  try{
    const routes=await fetchRoutes();
    setText('#routeCount',routes.length);setText('#serviceStatus','Online');
    if(!routes.length){destinationGrid.innerHTML='<article class="destination-card"><div class="destination-body"><small>Availability</small><h3>No active routes are currently available.</h3></div></article>';setText('#routesState','No active routes are currently available.');return;}
    destinationGrid.innerHTML=routes.slice(0,8).map(route=>`<a class="destination-card" href="/passenger/?origin=${encodeURIComponent(route.origin??'')}&destination=${encodeURIComponent(route.destination??'')}&passengers=1"><div class="destination-visual"><span class="destination-code">${routeCode(route.destination)}</span></div><div class="destination-body"><small>From ${esc(route.origin)}</small><h3>${esc(route.destination)}</h3><p>View scheduled departures and current availability.</p><div class="destination-meta"><span>${route.distance_km?`${route.distance_km} km`:'Schedule available online'}</span><strong>View trips →</strong></div></div></a>`).join('');
    setText('#routesState',`${routes.length} active route${routes.length===1?'':'s'} available.`);
  }catch(error){setText('#serviceStatus','Unavailable');setText('#routesState','Routes are temporarily unavailable.');destinationGrid.innerHTML=`<article class="destination-card"><div class="destination-body"><small>Connection problem</small><h3>We could not load current routes.</h3><p>${esc(error.message)}</p><button class="btn btn-secondary" id="retryRoutes" type="button">Retry</button></div></article>`;document.querySelector('#retryRoutes')?.addEventListener('click',loadRoutes,{once:true});}
}

async function loadFeaturedTrip(){
  try{
    const result=await fetchPassengerSearch({origin:'',destination:'',date:'',passengers:1});
    setText('#tripCount',result.total);
    featuredTrip=result.trips[0]??null;renderFeatured(featuredTrip);
    if(featuredTrip){const seats=await fetchTripSeats(featuredTrip.id);renderSeats(seats);setText('#seatState',`${seats.filter(s=>s.available).length} seats are currently available on the selected departure.`);await calculateJourney(featuredTrip.origin,featuredTrip.destination);}
  }catch(error){setText('#tripCount','—');renderFeatured(null);if(seatPreview)seatPreview.innerHTML='<p class="muted-copy">Seat information is temporarily unavailable.</p>';}
}

async function calculateJourney(origin,destination){
  try{
    featuredJourney=await mapJourney(origin,destination);
    const path=svgPath(featuredJourney.route?.points??[]);
    document.querySelectorAll('#routePath,#modalRoutePath').forEach(el=>{if(path)el.setAttribute('d',path)});
    setText('#mapOrigin',origin);setText('#mapDestination',destination);setText('#mapStatus',`${origin} → ${destination}`);setText('#mapEta',`${minutes(featuredJourney.route?.durationSeconds)} min`);setText('#routeDistance',km(featuredJourney.route?.distanceMeters));setText('#routeDuration',`${minutes(featuredJourney.route?.durationSeconds)} min`);setText('#routeTitle',`${origin} → ${destination}`);
    const link=document.querySelector('#bookRouteLink');if(link)link.href=`/passenger/?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&passengers=1`;
  }catch(error){featuredJourney=null;setText('#mapStatus','Route details unavailable');setText('#mapEta','—');setText('#routeDistance','Unavailable');setText('#routeDuration','Unavailable');}
}

bookingForm?.addEventListener('submit',event=>{
  event.preventDefault();
  const form=new FormData(bookingForm);const origin=String(form.get('origin')??'').trim();const destination=String(form.get('destination')??'').trim();const date=String(form.get('date')??'');const passengers=String(form.get('passengers')??'1');
  if(!origin||!destination){setText('#searchMessage','Enter both origin and destination.');return;}
  const params=new URLSearchParams({origin,destination,date,passengers});location.href=`/passenger/?${params}`;
});

const swap=document.querySelector('.swap');swap?.addEventListener('click',()=>{const a=bookingForm?.querySelector('[name="origin"]'),b=bookingForm?.querySelector('[name="destination"]');if(!a||!b)return;[a.value,b.value]=[b.value,a.value];});
const modal=document.querySelector('#routeModal');
function openModal(){modal?.classList.add('is-open');modal?.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';if(featuredTrip&&!featuredJourney)void calculateJourney(featuredTrip.origin,featuredTrip.destination);}
function closeModal(){modal?.classList.remove('is-open');modal?.setAttribute('aria-hidden','true');document.body.style.overflow='';}
document.querySelectorAll('[data-open-map]').forEach(el=>el.addEventListener('click',openModal));document.querySelectorAll('[data-close-map]').forEach(el=>el.addEventListener('click',closeModal));document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});

const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target)}}),{threshold:.12});document.querySelectorAll('[data-reveal]').forEach(el=>observer.observe(el));
const heroBus=document.querySelector('.hero-bus');window.addEventListener('scroll',()=>{if(heroBus)heroBus.style.transform=`translate3d(0,${Math.min(24,scrollY*.025)}px,0)`},{passive:true});

async function loadHealth(){try{await health();setText('#serviceStatus','Online')}catch{setText('#serviceStatus','Offline')}}
const dateInput=bookingForm?.querySelector('input[type="date"]');if(dateInput){const now=new Date();dateInput.min=new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,10)}
await Promise.allSettled([loadHealth(),loadRoutes(),loadFeaturedTrip()]);
