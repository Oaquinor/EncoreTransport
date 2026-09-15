const destinations = [
  { city: 'Santiago', route: 'Santo Domingo → Santiago', time: '2h 15m', price: 'DOP 685', tag: 'Most popular' },
  { city: 'Punta Cana', route: 'Santo Domingo → Punta Cana', time: '2h 45m', price: 'DOP 1,048', tag: 'Beach route' },
  { city: 'La Romana', route: 'Santo Domingo → La Romana', time: '1h 50m', price: 'DOP 820', tag: 'Daily departures' },
  { city: 'Puerto Plata', route: 'Santiago → Puerto Plata', time: '1h 35m', price: 'DOP 620', tag: 'North coast' },
];

const grid = document.querySelector('#destinationGrid');
if (grid) {
  grid.innerHTML = destinations.map((item, index) => `
    <a class="destination-card" href="/passenger/?origin=${encodeURIComponent(item.route.split(' → ')[0])}&destination=${encodeURIComponent(item.city)}" data-reveal style="--delay:${index * 70}ms">
      <div class="destination-card__visual"><span>${String(index + 1).padStart(2, '0')}</span><i></i></div>
      <div class="destination-card__copy">
        <small>${item.tag}</small>
        <h3>${item.city}</h3>
        <p>${item.route}</p>
        <div><span>${item.time}</span><strong>${item.price}</strong></div>
      </div>
    </a>
  `).join('');
}

const seatPreview = document.querySelector('#seatPreview');
if (seatPreview) {
  const selected = new Set(['4B', '4C']);
  const occupied = new Set(['3B', '5C', '6B']);
  seatPreview.innerHTML = Array.from({ length: 8 }, (_, row) => {
    const seats = ['A', 'B', 'C', 'D'].map((letter, index) => {
      const id = `${row + 1}${letter}`;
      const state = selected.has(id) ? 'selected' : occupied.has(id) ? 'occupied' : 'available';
      return `<button type="button" class="seat-preview seat-preview--${state}" aria-label="Seat ${id}"><span>◢</span><strong>${id}</strong></button>${index === 1 ? '<i class="seat-aisle"></i>' : ''}`;
    }).join('');
    return `<div class="seat-preview-row"><em>${row + 1}</em>${seats}</div>`;
  }).join('');

  seatPreview.addEventListener('click', (event) => {
    const button = event.target.closest('.seat-preview');
    if (!button || button.classList.contains('seat-preview--occupied')) return;
    button.classList.toggle('seat-preview--selected');
    button.classList.toggle('seat-preview--available');
  });
}

const qr = document.querySelector('#phoneQr');
if (qr) {
  const dark = new Set([0,1,2,4,5,6,7,8,10,12,13,14,16,17,19,21,22,23,24,26,28,29,30,31,33,35,36,38,39,40,42,44,45,47,48,49,51,53,55,56,57,58,60,62,63]);
  qr.innerHTML = Array.from({ length: 64 }, (_, index) => `<i class="${dark.has(index) ? 'is-dark' : ''}"></i>`).join('');
}

const swapButton = document.querySelector('.swap-route');
if (swapButton) {
  swapButton.addEventListener('click', () => {
    const inputs = [...document.querySelectorAll('.booking-field--wide input')];
    if (inputs.length !== 2) return;
    const current = inputs[0].value;
    inputs[0].value = inputs[1].value;
    inputs[1].value = current;
  });
}

const modal = document.querySelector('#routeModal');
const openButtons = document.querySelectorAll('[data-open-map]');
const closeButtons = document.querySelectorAll('[data-close-map]');
function setModal(open) {
  if (!modal) return;
  modal.setAttribute('aria-hidden', String(!open));
  modal.classList.toggle('is-open', open);
  document.body.classList.toggle('modal-open', open);
}
openButtons.forEach((button) => button.addEventListener('click', () => setModal(true)));
closeButtons.forEach((button) => button.addEventListener('click', () => setModal(false)));
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') setModal(false); });

const revealElements = [...document.querySelectorAll('[data-reveal]')];
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-visible');
    observer.unobserve(entry.target);
  });
}, { threshold: 0.14, rootMargin: '0px 0px -40px' });
revealElements.forEach((element) => observer.observe(element));

const bus = document.querySelector('.hero-bus');
window.addEventListener('scroll', () => {
  if (!bus || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const offset = Math.min(window.scrollY * 0.06, 32);
  bus.style.transform = `translate3d(0, ${offset}px, 0)`;
}, { passive: true });
