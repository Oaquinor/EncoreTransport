const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const topbar = document.querySelector('.topbar');

const glow = document.createElement('div');
glow.className = 'pointer-glow';
document.body.append(glow);

let scrollFrame = 0;
let pointerFrame = 0;
let latestPointer = null;

function updateScrollEffects() {
  scrollFrame = 0;
  const y = window.scrollY;
  topbar?.classList.toggle('is-scrolled', y > 12);

  if (!reducedMotion) {
    const bus = document.querySelector('.hero-bus');
    if (bus) {
      bus.style.setProperty('--bus-parallax-y', `${Math.min(18, y * 0.022)}px`);
    }
  }
}

function scheduleScrollEffects() {
  if (scrollFrame) return;
  scrollFrame = window.requestAnimationFrame(() => {
    updateScrollEffects();
  });
}

window.addEventListener('scroll', scheduleScrollEffects, { passive: true });
updateScrollEffects();

if (!reducedMotion && window.matchMedia('(pointer:fine)').matches) {
  window.addEventListener('pointermove', (event) => {
    latestPointer = event;
    if (pointerFrame) return;
    pointerFrame = window.requestAnimationFrame(() => {
      pointerFrame = 0;
      if (!latestPointer) return;
      glow.style.left = `${latestPointer.clientX}px`;
      glow.style.top = `${latestPointer.clientY}px`;
      glow.classList.add('visible');
    });
  }, { passive: true });

  document.documentElement.addEventListener('mouseleave', () => {
    glow.classList.remove('visible');
  });
} else {
  glow.hidden = true;
}
