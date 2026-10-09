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
  const rows = useMemo(() => {
    const map = new Map<number, SeatDto[]>();

    for (const seat of seats) {
      const parsed = Number.parseInt(seat.seat_number, 10);
      const row = Number(
        seat.row_number ?? (Number.isFinite(parsed) ? parsed : 0),
      );

      map.set(row, [...(map.get(row) ?? []), seat]);
    }

    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [seats]);

  if (!rows.length) {
    return (
      <div className="smart-banner">
        <b>No seat layout configured.</b>
        <span>
          Operations must configure the vehicle seats before this trip can be booked.
        </span>
      </div>
    );
  }

  return (
    <div className="coach coach--flexible">
      <div className="windshield">
        PANORAMIC FRONT <b>DRIVER</b>
      </div>

      <div className="legend legend--professional" aria-label="Seat legend">
        <span><i className="legend-dot legend-dot--available" /> Available</span>
        <span><i className="legend-dot legend-dot--selected" /> Selected</span>
        <span><i className="legend-dot legend-dot--occupied" /> Occupied</span>
        <span><i className="legend-dot legend-dot--blocked" /> Blocked</span>
        <span><i className="legend-dot legend-dot--accessible" /> Accessible</span>
      </div>

      {rows.map(([row, rowSeats]) => {
        const maxPosition = Math.max(
          ...rowSeats.map((seat) => Number(seat.position_index ?? 0)),
          1,
        );

        const byPosition = new Map<number, SeatDto>(
          rowSeats.map(
            (seat) => [Number(seat.position_index ?? 0), seat] as [number, SeatDto],
          ),
        );

        const cells = [];

        for (let position = 1; position <= maxPosition; position += 1) {
          const seat = byPosition.get(position);

          if (!seat) {
            cells.push(
              <i
                className="seat-gap"
                key={`gap-${row}-${position}`}
                aria-hidden="true"
              />,
            );
            continue;
          }

          const isSelected = selected.includes(seat.id);
          const isOccupied = !seat.available && !seat.blocked;
          const disabled =
            seat.blocked ||
            isOccupied ||
            (!isSelected && selected.length >= maxSelection);

          const classNames = [
            'seat',
            isSelected ? 'selected' : '',
            isOccupied ? 'occupied' : '',
            seat.blocked ? 'blocked' : '',
            seat.accessible ? 'accessible' : '',
          ].filter(Boolean).join(' ');

          const state = seat.blocked
            ? 'blocked'
            : isOccupied
              ? 'occupied'
              : isSelected
                ? 'selected'
                : 'available';

          cells.push(
            <button
              key={seat.id}
              type="button"
              disabled={disabled}
              className={classNames}
              onClick={() => onToggle(seat.id)}
              aria-pressed={isSelected}
              aria-label={`Seat ${seat.seat_number}, ${state}${seat.accessible ? ', accessible' : ''}`}
              title={`${seat.seat_number} · ${state}${seat.accessible ? ' · accessible' : ''}`}
            >
              <span className="seat-back" aria-hidden="true">◉</span>
              <span className="seat-base" aria-hidden="true" />
              <b>{seat.seat_number}</b>
              {seat.accessible && <small aria-hidden="true">♿</small>}
            </button>,
          );
        }

        const rowStyle = {
          '--seat-columns': maxPosition,
        } as CSSProperties;

        return (
          <div className="seat-row seat-row--flexible" style={rowStyle} key={row}>
            <em>{row || ''}</em>
            {cells}
          </div>
        );
      })}

      <div className="rear">REAR · EMERGENCY EXIT</div>
    </div>
  );
}
