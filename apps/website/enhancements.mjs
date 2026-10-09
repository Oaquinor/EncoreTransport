const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const topbar = document.querySelector('.topbar');

const progress = document.createElement('div');
progress.className = 'scroll-progress';
document.body.append(progress);

const glow = document.createElement('div');
glow.className = 'pointer-glow';
document.body.append(glow);

function updateScrollEffects() {
  const y = window.scrollY;
  topbar?.classList.toggle('is-scrolled', y > 12);

  const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  progress.style.width = `${max ? Math.min(100, y / max * 100) : 0}%`;

  if (!reducedMotion) {
    const bus = document.querySelector('.hero-bus');
    if (bus) {
      bus.style.setProperty('--bus-parallax-y', `${Math.min(18, y * 0.022)}px`);
    }
  }
}

window.addEventListener('scroll', updateScrollEffects, { passive: true });
updateScrollEffects();

if (!reducedMotion && window.matchMedia('(pointer:fine)').matches) {
  window.addEventListener('pointermove', (event) => {
    glow.style.left = `${event.clientX}px`;
    glow.style.top = `${event.clientY}px`;
    glow.classList.add('visible');
  }, { passive: true });

  document.documentElement.addEventListener('mouseleave', () => {
    glow.classList.remove('visible');
  });
} else {
  glow.hidden = true;
}
