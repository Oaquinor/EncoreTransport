export function badge(label, tone = 'neutral') {
  return `<span class="badge badge--${tone}">${label}</span>`;
}

export function statCard(title, value, detail = '') {
  return `
    <article class="card card--tight">
      <div class="kpi">
        <span>${title}</span>
        <strong>${value}</strong>
        ${detail ? `<small>${detail}</small>` : ''}
      </div>
    </article>
  `;
}

export function emptyState(title, detail, actionLabel = '') {
  return `
    <div class="empty-state card card--pad">
      <strong>${title}</strong>
      <p>${detail}</p>
      ${actionLabel ? `<button class="button button--primary">${actionLabel}</button>` : ''}
    </div>
  `;
}

export function skeletonCard(lines = 3) {
  return `
    <div class="card card--pad motion-enter">
      <div class="grid" style="gap: 12px;">
        ${Array.from({ length: lines }, (_, index) => `<div class="skeleton" style="height: ${index === 0 ? 20 : 14}px; border-radius: 999px;"></div>`).join('')}
      </div>
    </div>
  `;
}

export function progressBar(value) {
  return `
    <div class="progress">
      <div class="progress__bar"><div class="progress__fill" style="width:${Math.max(0, Math.min(100, value))}%"></div></div>
      <small>${value}% completado</small>
    </div>
  `;
}
