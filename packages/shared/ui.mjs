import {
  escapeHtml,
} from './html.mjs';

/**
 * Shared HTML render helpers.
 *
 * New code should use the descriptive render* names. The short legacy
 * aliases are kept temporarily so existing applications continue to work.
 */

export function renderStatusBadge(
  label,
  tone = 'neutral',
) {
  return `
    <span class="et-ui-badge badge badge--${escapeHtml(tone)}">
      ${escapeHtml(label)}
    </span>`;
}

export function renderMetricCard(
  title,
  value,
  detail = '',
) {
  return `
    <article class="et-ui-card card card--tight">
      <div class="et-ui-metric kpi">
        <span>${escapeHtml(title)}</span>
        <strong>${escapeHtml(value)}</strong>
        ${
          detail
            ? `<small>${escapeHtml(detail)}</small>`
            : ''
        }
      </div>
    </article>`;
}

export function renderEmptyState(
  title,
  detail,
  actionLabel = '',
) {
  return `
    <div class="et-ui-empty empty-state card card--pad">
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(detail)}</p>
      ${
        actionLabel
          ? `<button class="et-ui-button button button--primary">${escapeHtml(actionLabel)}</button>`
          : ''
      }
    </div>`;
}

export function renderSkeletonCard(
  lines = 3,
) {
  const safeLines =
    Math.max(
      1,
      Math.min(
        8,
        Number(lines) || 1,
      ),
    );

  return `
    <div class="et-ui-card card card--pad motion-enter">
      <div class="et-ui-stack grid" style="gap: 12px;">
        ${
          Array.from(
            { length: safeLines },
            (_, index) =>
              `<div class="skeleton" style="height:${index === 0 ? 20 : 14}px;border-radius:999px;"></div>`,
          ).join('')
        }
      </div>
    </div>`;
}

export function renderProgressBar(
  value,
) {
  const safeValue =
    Math.max(
      0,
      Math.min(
        100,
        Number(value) || 0,
      ),
    );

  return `
    <div class="et-ui-progress progress">
      <div class="progress__bar">
        <div class="progress__fill" style="width:${safeValue}%"></div>
      </div>
      <small>${safeValue}% complete</small>
    </div>`;
}

/* Backward-compatible aliases. Do not use in new modules. */
export const badge =
  renderStatusBadge;

export const statCard =
  renderMetricCard;

export const emptyState =
  renderEmptyState;

export const skeletonCard =
  renderSkeletonCard;

export const progressBar =
  renderProgressBar;
