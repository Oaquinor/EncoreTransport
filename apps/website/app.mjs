import { fetchRoutes, requestJson } from '../../packages/shared/api.mjs';

const destinationGrid=document.querySelector('#destinationGrid');
const bookingForm=document.querySelector('.booking-card');

function routeCode(name=''){return name.split(/\s+/).filter(Boolean).map(x=>x[0]).join('').slice(0,3).toUpperCase() || 'ET';}
function escapeHtml(value=''){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}

async function loadRealRoutes(){
  if(!destinationGrid)return;
  destinationGrid.innerHTML='<article class="destination-card"><div class="destination-body"><small>Loading</small><h3>Consulting available routes…</h3></div></article>';
  try{
    const routes=await fetchRoutes();
    if(!routes.length){
      destinationGrid.innerHTML='<article class="destination-card"><div class="destination-body"><small>Availability</small><h3>No routes are currently available.</h3><p>Try again later.</p></div></article>';
      return;
    }
    destinationGrid.innerHTML=routes.slice(0,8).map((r)=>{
      const origin=escapeHtml(r.origin ?? ''); const destination=escapeHtml(r.destination ?? '');
      const href=`/passenger/?origin=${encodeURIComponent(r.origin??'')}&destination=${encodeURIComponent(r.destination??'')}&passengers=1`;
      return `<a class="destination-card" href="${href}" data-reveal><div class="destination-visual"><span class="destination-code">${routeCode(r.destination)}</span></div><div class="destination-body"><small>From ${origin}</small><h3>${destination}</h3><p>Available route in Encore Transport</p><div class="destination-meta"><span>${r.distance_km ? `${r.distance_km} km` : 'Schedule online'}</span><strong>View trips →</strong></div></div></a>`;
    }).join('');
    const proofs=document.querySelectorAll('.hero-proof > div');
    if(proofs[0]){proofs[0].querySelector('strong').textContent=String(routes.length);proofs[0].querySelector('span').textContent='active routes';}
    if(proofs[1]){proofs[1].querySelector('strong').textContent='API';proofs[1].querySelector('span').textContent='connected';}
    if(proofs[2]){proofs[2].querySelector('strong').textContent='DB';proofs[2].querySelector('span').textContent='live availability';}
  }catch(error){
    destinationGrid.innerHTML=`<article class="destination-card"><div class="destination-body"><small>Connection error</small><h3>Routes could not be loaded.</h3><p>${escapeHtml(error.message)}</p><button class="btn btn-secondary" id="retryRoutes" type="button">Retry</button></div></article>`;
    document.querySelector('#retryRoutes')?.addEventListener('click',loadRealRoutes,{once:true});
  }
}

bookingForm?.addEventListener('submit',(event)=>{
  event.preventDefault();
  const form=new FormData(bookingForm);
  const params=new URLSearchParams({
    origin:String(form.get('origin')??''), destination:String(form.get('destination')??''),
    date:String(form.get('date')??''), passengers:String(form.get('passengers')??'1')
  });
  window.location.href=`/passenger/?${params}`;
});

const seatPreview=document.querySelector('#seatPreview');
if(seatPreview){
  seatPreview.innerHTML=Array.from({length:9},(_,r)=>{const row=r+1;return `<div class="seat-row"><em>${row}</em>${['A','B'].map(c=>`<button class="seat" disabled>${row}${c}</button>`).join('')}<span class="aisle"></span>${['C','D'].map(c=>`<button class="seat" disabled>${row}${c}</button>`).join('')}</div>`}).join('');
}

const phoneQr=document.querySelector('#phoneQr');
if(phoneQr){phoneQr.innerHTML=Array.from({length:64},()=>'<i style="opacity:.16"></i>').join('');}

const observer=new IntersectionObserver((entries)=>{entries.forEach((entry)=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}})},{threshold:.12});
document.querySelectorAll('[data-reveal]').forEach((el)=>observer.observe(el));
const heroBus=document.querySelector('.hero-bus');
window.addEventListener('scroll',()=>{if(!heroBus)return;heroBus.style.transform=`translate3d(0,${Math.min(24,window.scrollY*.025)}px,0)`},{passive:true});
const swap=document.querySelector('.swap');
swap?.addEventListener('click',()=>{const inputs=swap.closest('form')?.querySelectorAll('input[name="origin"],input[name="destination"]');if(!inputs||inputs.length<2)return;[inputs[0].value,inputs[1].value]=[inputs[1].value,inputs[0].value];});
const modal=document.querySelector('#routeModal');
const openModal=()=>{modal?.classList.add('is-open');modal?.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';};
const closeModal=()=>{modal?.classList.remove('is-open');modal?.setAttribute('aria-hidden','true');document.body.style.overflow='';};
document.querySelectorAll('[data-open-map]').forEach(el=>el.addEventListener('click',openModal));
document.querySelectorAll('[data-close-map]').forEach(el=>el.addEventListener('click',closeModal));
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});
loadRealRoutes();


function setText(selector,value){const el=document.querySelector(selector);if(el)el.textContent=String(value??'');}
function routePath(points){
  if(!Array.isArray(points)||points.length<2)return '';
  const lats=points.map(p=>Number(p.latitude)), lons=points.map(p=>Number(p.longitude));
  const minLat=Math.min(...lats),maxLat=Math.max(...lats),minLon=Math.min(...lons),maxLon=Math.max(...lons);
  const dx=Math.max(.000001,maxLon-minLon),dy=Math.max(.000001,maxLat-minLat);
  return points.map((p,i)=>{const x=70+((Number(p.longitude)-minLon)/dx)*860;const y=550-((Number(p.latitude)-minLat)/dy)*480;return `${i?'L':'M'}${x.toFixed(1)},${y.toFixed(1)}`}).join(' ');
}
async function loadRealTripContext(){
  try{
    const tripsPayload=await requestJson('/trips/search?passengers=1',{token:false});
    const trip=(tripsPayload.data??[])[0];
    if(!trip){document.querySelector('.floating-trip-card')?.setAttribute('hidden','');return;}
    const card=document.querySelector('.floating-trip-card');
    if(card){
      const strong=card.querySelectorAll('.trip-points strong'); const spans=card.querySelectorAll('.trip-points > div > span');
      if(strong[0])strong[0].textContent=trip.origin;if(strong[1])strong[1].textContent=trip.destination;
      if(spans[0])spans[0].textContent=(trip.departureTime??'').slice(0,5);if(spans[2])spans[2].textContent=(trip.arrivalTime??'').slice(0,5);
      setText('.trip-track span',trip.busCode??`BUS ${trip.busId??''}`);const statusEl=document.querySelector('.trip-status');if(statusEl)statusEl.innerHTML=`<i></i>${escapeHtml(String(trip.status??'scheduled').replace('_',' '))}`;
      const meta=card.querySelectorAll('.trip-card-meta span');if(meta[0])meta[0].textContent=`${trip.availableSeats??0} seats`;if(meta[1])meta[1].textContent=`${trip.durationMinutes??0} min`;if(meta[2])meta[2].textContent=`DOP ${Number(trip.baseFare??0).toLocaleString('en-US')}`;
    }
    const metric=document.querySelectorAll('.metric-stack article strong');
    if(metric[0])metric[0].textContent=String(trip.id);if(metric[1])metric[1].textContent=trip.busCode??`Bus ${trip.busId??''}`;if(metric[2])metric[2].textContent=trip.driverName??'Assigned';if(metric[3])metric[3].textContent=trip.status??'';const trackingEyebrow=document.querySelector('.tracking-copy .eyebrow');if(trackingEyebrow)trackingEyebrow.textContent='ROUTE CONTEXT';const modalTrip=document.querySelector('.route-modal-panel footer strong');if(modalTrip)modalTrip.textContent=`Trip ${trip.id} · ${trip.busCode??`Bus ${trip.busId??''}`}`;const phoneRoute=document.querySelectorAll('.phone-route div');if(phoneRoute[0]){phoneRoute[0].querySelector('b').textContent=(trip.departureTime??'').slice(0,5);phoneRoute[0].querySelector('span').textContent=routeCode(trip.origin)}if(phoneRoute[1]){phoneRoute[1].querySelector('b').textContent=(trip.arrivalTime??'').slice(0,5);phoneRoute[1].querySelector('span').textContent=routeCode(trip.destination)};setText('.phone-ticket-meta span:nth-child(2) strong',trip.busCode??`Bus ${trip.busId??''}`);setText('.phone-status','Availability from live API');
    document.querySelectorAll('.map-card iframe,.route-modal-map iframe').forEach(x=>x.remove());
    const [o,d]=await Promise.all([
      requestJson(`/maps/geocode?address=${encodeURIComponent(trip.origin)}`,{token:false}),
      requestJson(`/maps/geocode?address=${encodeURIComponent(trip.destination)}`,{token:false})
    ]);
    const op=o.data?.results?.[0]?.position, dp=d.data?.results?.[0]?.position;
    if(!op||!dp)return;
    const rp=await requestJson(`/maps/route?origin_latitude=${op.lat}&origin_longitude=${op.lon}&destination_latitude=${dp.lat}&destination_longitude=${dp.lon}`,{token:false});
    const points=(rp.data?.routes?.[0]?.legs??[]).flatMap(l=>l.points??[]); const dpath=routePath(points);
    document.querySelectorAll('.route-svg path,.route-modal-map svg path').forEach(path=>{if(dpath)path.setAttribute('d',dpath)});
    setText('.map-pin.pin-start',trip.origin);setText('.map-pin.pin-end',trip.destination);setText('#routeTitle',`${trip.origin} → ${trip.destination}`);
    const credit=document.querySelector('.map-credit');if(credit)credit.textContent='Route geometry powered by TomTom via Encore API';
  }catch(error){
    document.querySelectorAll('.map-card iframe,.route-modal-map iframe').forEach(x=>x.remove());
    const credit=document.querySelector('.map-credit');if(credit)credit.textContent=`Route preview unavailable: ${error.message}`;
  }
}
loadRealTripContext();
