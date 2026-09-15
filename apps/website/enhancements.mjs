const topbar=document.querySelector('.topbar');
const progress=document.createElement('div');progress.className='scroll-progress';document.body.append(progress);
const glow=document.createElement('div');glow.className='pointer-glow';document.body.append(glow);
window.addEventListener('scroll',()=>{const y=window.scrollY;topbar?.classList.toggle('is-scrolled',y>12);const max=document.documentElement.scrollHeight-innerHeight;progress.style.width=`${max?Math.min(100,y/max*100):0}%`;const bus=document.querySelector('.hero-bus');if(bus)bus.style.transform=`translate3d(0,${Math.min(18,y*.022)}px,0)`},{passive:true});
window.addEventListener('pointermove',e=>{glow.style.left=`${e.clientX}px`;glow.style.top=`${e.clientY}px`;glow.classList.add('visible')},{passive:true});
window.addEventListener('pointerleave',()=>glow.classList.remove('visible'));
document.querySelectorAll('.destination-card,.platform-card').forEach(card=>{card.addEventListener('pointermove',e=>{if(matchMedia('(max-width:800px)').matches)return;const r=card.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;card.style.transform=`translateY(-5px) rotateX(${(-y*2).toFixed(2)}deg) rotateY(${(x*2).toFixed(2)}deg)`});card.addEventListener('pointerleave',()=>card.style.transform='')});
