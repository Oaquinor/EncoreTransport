import { CSSProperties, useMemo } from 'react';

export type SeatDto = {
  id: number;
  seat_number: string;
  row_number?: number | null;
  position_index?: number | null;
  seat_class?: string;
  seat_type?: string;
  window?: boolean;
  aisle?: boolean;
  accessible?: boolean;
  blocked?: boolean;
  available: boolean;
};

type CoachRow = {
  row: number;
  byPosition: Map<number, SeatDto>;
};

function fallbackRow(seat: SeatDto) {
  const match = String(seat.seat_number ?? '').match(/^(\d+)/);
  return match ? Number(match[1]) : 0;
}

function seatState(seat: SeatDto, selected: number[]) {
  if (seat.blocked) return 'blocked';
  if (!seat.available) return 'occupied';
  if (selected.includes(seat.id)) return 'selected';
  return 'available';
}

function SeatButton({
  seat,
  selected,
  maxSelection,
  onToggle,
}: {
  seat: SeatDto;
  selected: number[];
  maxSelection: number;
  onToggle: (id: number) => void;
}) {
  const state = seatState(seat, selected);
  const isSelected = state === 'selected';
  const disabled =
    seat.blocked ||
    state === 'occupied' ||
    (!isSelected && selected.length >= maxSelection);

  return (
    <button
      type="button"
      disabled={disabled}
      className={[
        'coach-seat',
        `coach-seat--${state}`,
        seat.accessible ? 'coach-seat--accessible' : '',
        seat.window ? 'coach-seat--window' : '',
        seat.aisle ? 'coach-seat--aisle' : '',
      ].filter(Boolean).join(' ')}
      onClick={() => onToggle(seat.id)}
      aria-pressed={isSelected}
      aria-label={`Seat ${seat.seat_number}, ${state}${seat.accessible ? ', accessible' : ''}`}
      title={`${seat.seat_number} · ${state}${seat.accessible ? ' · accessible' : ''}`}
    >
      <span className="coach-seat__headrest" aria-hidden="true" />
      <span className="coach-seat__back" aria-hidden="true" />
      <span className="coach-seat__cushion" aria-hidden="true" />
      <span className="coach-seat__arm coach-seat__arm--left" aria-hidden="true" />
      <span className="coach-seat__arm coach-seat__arm--right" aria-hidden="true" />
      <b>{seat.seat_number}</b>
      {seat.accessible && <small aria-hidden="true">♿</small>}
    </button>
  );
}

export function SeatMap({
  seats,
  selected,
  maxSelection,
  onToggle,
}: {
  seats: SeatDto[];
  selected: number[];
  maxSelection: number;
  onToggle: (id: number) => void;
}) {
  const layout = useMemo(() => {
    const grouped = new Map<number, SeatDto[]>();

    for (const seat of seats) {
      const row = Number(seat.row_number ?? fallbackRow(seat));
      if (!row) continue;
      grouped.set(row, [...(grouped.get(row) ?? []), seat]);
    }

    const rows: CoachRow[] = [...grouped.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([row, rowSeats]) => ({
        row,
        byPosition: new Map(
          rowSeats
            .filter((seat) => Number(seat.position_index ?? 0) > 0)
            .map((seat) => [
              Number(seat.position_index),
              seat,
            ] as [number, SeatDto]),
        ),
      }));

    const maxPosition = Math.max(
      1,
      ...seats.map((seat) => Number(seat.position_index ?? 0)),
    );

    const possiblePositions = Array.from(
      new Set(
        seats
          .map((seat) => Number(seat.position_index ?? 0))
          .filter((position) => position > 0),
      ),
    ).sort((a, b) => a - b);

    const firstGap = possiblePositions.findIndex(
      (position, index) =>
        index > 0 &&
        position - possiblePositions[index - 1] > 1,
    );

    const split =
      firstGap > 0
        ? possiblePositions[firstGap - 1]
        : Math.max(1, Math.floor(maxPosition / 2));

    return {
      rows,
      maxPosition,
      split,
    };
  }, [seats]);

  if (!layout.rows.length) {
    return (
      <div className="smart-banner">
        <b>No seat layout configured.</b>
        <span>
          Operations must configure the vehicle seats before this trip can be booked.
        </span>
      </div>
    );
  }

  const shellStyle = {
    '--coach-columns': layout.rows.length,
  } as CSSProperties;

  const renderSide = (
    row: CoachRow,
    positions: number[],
  ) => (
    <div className="coach-column" key={`${row.row}-${positions.join('-')}`}>
      <span className="coach-column__number">{row.row}</span>

      {positions.map((position) => {
        const seat = row.byPosition.get(position);

        return seat ? (
          <SeatButton
            key={seat.id}
            seat={seat}
            selected={selected}
            maxSelection={maxSelection}
            onToggle={onToggle}
          />
        ) : (
          <span
            className="coach-seat-placeholder"
            key={`gap-${row.row}-${position}`}
            aria-hidden="true"
          />
        );
      })}
    </div>
  );

  const topPositions = Array.from(
    { length: layout.split },
    (_, index) => index + 1,
  );

  const bottomPositions = Array.from(
    { length: Math.max(0, layout.maxPosition - layout.split - 1) },
    (_, index) => layout.split + index + 2,
  );

  return (
    <section className="coach-stage">
      <div className="coach-orientation">
        <div>
          <span className="coach-orientation__arrow">←</span>
          <strong>Front of bus</strong>
          <small>Driver and boarding door</small>
        </div>

        <div className="coach-legend" aria-label="Seat legend">
          <span><i className="coach-legend__seat coach-legend__seat--available" />Available</span>
          <span><i className="coach-legend__seat coach-legend__seat--selected" />Selected</span>
          <span><i className="coach-legend__seat coach-legend__seat--occupied" />Occupied</span>
          <span><i className="coach-legend__seat coach-legend__seat--blocked" />Blocked</span>
          <span><i className="coach-legend__seat coach-legend__seat--accessible" />Accessible</span>
        </div>

        <div className="coach-orientation__rear">
          <strong>Rear of bus</strong>
          <small>Emergency exit</small>
          <span className="coach-orientation__arrow">→</span>
        </div>
      </div>

      <div className="coach-realistic" style={shellStyle}>
        <aside className="coach-cockpit" aria-hidden="true">
          <div className="coach-windshield" />
          <div className="coach-steering">◉</div>
          <div className="coach-driver-seat" />
          <div className="coach-door">
            <span>Front</span>
            <b>Door</b>
          </div>
        </aside>

        <div className="coach-cabin">
          <div className="coach-side coach-side--top">
            {layout.rows.map((row) => renderSide(row, topPositions))}
          </div>

          <div className="coach-aisle">
            <span>aisle</span>
          </div>

          <div className="coach-side coach-side--bottom">
            {layout.rows.map((row) => renderSide(row, bottomPositions))}
          </div>
        </div>

        <aside className="coach-rear-module" aria-hidden="true">
          <span>EXIT</span>
          <div className="coach-rear-panel" />
          <small>Rear</small>
        </aside>
      </div>
    </section>
  );
}
