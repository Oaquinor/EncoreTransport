import { clamp, cx } from '@encore/utilities';
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';

type Tone = 'primary' | 'ghost' | 'danger';
type BadgeTone = 'primary' | 'info' | 'success' | 'warning' | 'neutral';

export function Button({ tone = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone }) {
  return <button className={cx('button', `button--${tone}`, className)} {...props} />;
}

export function Card({ className = '', padded = true, ...props }: HTMLAttributes<HTMLElement> & { padded?: boolean }) {
  return <section className={cx('card', padded ? 'card--pad' : 'card--tight', className)} {...props} />;
}

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}

export function Progress({ value, label }: { value: number; label?: string }) {
  const safeValue = clamp(value, 0, 100);
  return (
    <div className="progress" aria-label={label ?? `${safeValue}% completado`}>
      <div className="progress__bar">
        <div className="progress__fill" style={{ width: `${safeValue}%` }} />
      </div>
      <small>{label ?? `${safeValue}% completado`}</small>
    </div>
  );
}

export function EmptyState({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return (
    <div className="empty-state card card--pad">
      <strong>{title}</strong>
      <p>{detail}</p>
      {action}
    </div>
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="card card--pad motion-enter">
      <div className="grid" style={{ gap: 12 }}>
        {Array.from({ length: lines }, (_, index) => (
          <div key={index} className="skeleton" style={{ height: index === 0 ? 20 : 14, borderRadius: 999 }} />
        ))}
      </div>
    </div>
  );
}
