const destinations=[
  {code:'STI',name:'Santiago',from:'DOP 685',time:'2h 15m',depart:'08:30'},
  {code:'PUJ',name:'Punta Cana',from:'DOP 1,048',time:'2h 45m',depart:'11:15'},
  {code:'LRM',name:'La Romana',from:'DOP 820',time:'1h 55m',depart:'18:10'},
  {code:'POP',name:'Puerto Plata',from:'DOP 940',time:'3h 10m',depart:'07:20'}
];

const destinationGrid=document.querySelector('#destinationGrid');
if(destinationGrid){
  destinationGrid.innerHTML=destinations.map((d)=>`<a class="destination-card" href="/passenger/" data-reveal><div class="destination-visual"><span class="destination-code">${d.code}</span></div><div class="destination-body"><small>From Santo Domingo</small><h3>${d.name}</h3><p>Premium intercity service</p><div class="destination-meta"><span>${d.depart}</span><span>${d.time}</span><strong>${d.from}</strong></div></div></a>`).join('');
}

const seatPreview=document.querySelector('#seatPreview');
if(seatPreview){
  const occupied=new Set(['3B','5C','7A']);
  const reserved=new Set(['8D']);
  const selected=new Set(['4B','4C']);
  seatPreview.innerHTML=Array.from({length:9},(_,r)=>{
    const row=r+1;
    const ids=['A','B','C','D'].map((c)=>`${row}${c}`);
    const seat=(id)=>`<button class="seat ${selected.has(id)?'selected':occupied.has(id)?'occupied':reserved.has(id)?'reserved':''}" ${occupied.has(id)||reserved.has(id)?'disabled':''}>${id}</button>`;
    return `<div class="seat-row"><em>${row}</em>${seat(ids[0])}${seat(ids[1])}<span class="aisle"></span>${seat(ids[2])}${seat(ids[3])}</div>`;
  }).join('');
  seatPreview.addEventListener('click',(e)=>{
    const button=e.target.closest('.seat');
    if(!button||button.disabled)return;
    button.classList.toggle('selected');
  });
}

const phoneQr=document.querySelector('#phoneQr');
if(phoneQr){
  const dark=new Set([0,1,2,4,5,6,7,8,10,12,13,14,16,17,19,21,22,23,24,26,28,29,30,31,33,35,36,38,39,40,42,44,45,47,48,49,51,53,55,56,57,58,60,62,63]);
  phoneQr.innerHTML=Array.from({length:64},(_,i)=>`<i style="opacity:${dark.has(i)?1:0}"></i>`).join('');
}

const observer=new IntersectionObserver((entries)=>{entries.forEach((entry)=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}})},{threshold:.12});
document.querySelectorAll('[data-reveal]').forEach((el)=>observer.observe(el));

const counters=document.querySelectorAll('[data-count]');
const counterObserver=new IntersectionObserver((entries)=>{entries.forEach((entry)=>{if(!entry.isIntersecting)return;const el=entry.target;const target=Number(el.dataset.count||0);let start=0;const duration=900;const initial=performance.now();function frame(now){const p=Math.min(1,(now-initial)/duration);const eased=1-Math.pow(1-p,3);el.textContent=String(Math.round(target*eased));if(p<1)requestAnimationFrame(frame)}requestAnimationFrame(frame);counterObserver.unobserve(el);})},{threshold:.5});
counters.forEach((el)=>counterObserver.observe(el));

const heroBus=document.querySelector('.hero-bus');
window.addEventListener('scroll',()=>{if(!heroBus)return;const y=Math.min(24,window.scrollY*.025);heroBus.style.transform=`translate3d(0,${y}px,0)`;},{passive:true});

const swap=document.querySelector('.swap');
swap?.addEventListener('click',()=>{const form=swap.closest('form');const inputs=form?.querySelectorAll('input[name="origin"],input[name="destination"]');if(!inputs||inputs.length<2)return;const a=inputs[0].value;inputs[0].value=inputs[1].value;inputs[1].value=a;});

const modal=document.querySelector('#routeModal');
const openModal=()=>{modal?.classList.add('is-open');modal?.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';};
const closeModal=()=>{modal?.classList.remove('is-open');modal?.setAttribute('aria-hidden','true');document.body.style.overflow='';};
document.querySelectorAll('[data-open-map]').forEach((el)=>el.addEventListener('click',openModal));
document.querySelectorAll('[data-close-map]').forEach((el)=>el.addEventListener('click',closeModal));
document.addEventListener('keydown',(e)=>{if(e.key==='Escape')closeModal();});
