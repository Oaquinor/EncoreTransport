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

type SeatRow = {
  number: number;
  seats: SeatDto[];
};

function seatState(
  seat: SeatDto,
  selected: number[],
) {
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
    (!isSelected &&
      selected.length >= maxSelection);

  return (
    <button
      type="button"
      disabled={disabled}
      className={[
        'reference-seat',
        `reference-seat--${state}`,
        seat.accessible
          ? 'reference-seat--accessible'
          : '',
      ].filter(Boolean).join(' ')}
      onClick={() => onToggle(seat.id)}
      aria-pressed={isSelected}
      aria-label={`Seat ${seat.seat_number}, ${state}${seat.accessible ? ', accessible' : ''}`}
      title={`${seat.seat_number} · ${state}${seat.accessible ? ' · accessible' : ''}`}
    >
      <span
        className="reference-seat__back"
        aria-hidden="true"
      />
      <span
        className="reference-seat__base"
        aria-hidden="true"
      />
      <span
        className="reference-seat__arm reference-seat__arm--left"
        aria-hidden="true"
      />
      <span
        className="reference-seat__arm reference-seat__arm--right"
        aria-hidden="true"
      />

      <b>{seat.seat_number}</b>

      {seat.accessible && (
        <small aria-hidden="true">♿</small>
      )}
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
  const rows = useMemo<SeatRow[]>(() => {
    const groups = new Map<number, SeatDto[]>();

    for (const seat of seats) {
      const row = Number(
        seat.row_number ?? 0,
      );

      if (row <= 0) continue;

      groups.set(
        row,
        [
          ...(groups.get(row) ?? []),
          seat,
        ].sort(
          (left, right) =>
            Number(
              left.position_index ?? 0,
            ) -
            Number(
              right.position_index ?? 0,
            ),
        ),
      );
    }

    return [...groups.entries()]
      .sort(
        ([left], [right]) =>
          left - right,
      )
      .map(
        ([number, rowSeats]) => ({
          number,
          seats: rowSeats,
        }),
      );
  }, [seats]);

  if (!rows.length) {
    return (
      <div className="smart-banner">
        <b>No seat layout configured.</b>
        <span>
          Operations must configure row_number and position_index for this vehicle.
        </span>
      </div>
    );
  }

  const normalRows =
    rows.length > 1
      ? rows.slice(0, -1)
      : rows;

  const candidateRear =
    rows.length > 1
      ? rows[rows.length - 1]
      : null;

  /*
   * A last row with 3+ configured seats is rendered
   * vertically against the rear wall, matching the
   * physical reference supplied for Encore.
   *
   * If the persisted layout does not contain that
   * configuration, all rows remain standard 2+2.
   */
  const rearSeats =
    candidateRear &&
    candidateRear.seats.length >= 3
      ? candidateRear.seats
      : [];

  const cabinRows =
    rearSeats.length
      ? normalRows
      : rows;

  const coachStyle = {
    '--seat-columns':
      Math.max(
        cabinRows.length,
        1,
      ),
  } as CSSProperties;

  return (
    <section className="reference-seat-stage">
      <header className="reference-seat-toolbar">
        <div className="reference-seat-orientation">
          <span aria-hidden="true">←</span>
          <div>
            <strong>Front of bus</strong>
            <small>
              Driver and boarding door
            </small>
          </div>
        </div>

        <div
          className="reference-seat-legend"
          aria-label="Seat legend"
        >
          <span>
            <i className="legend-available" />
            Available
          </span>
          <span>
            <i className="legend-selected" />
            Selected
          </span>
          <span>
            <i className="legend-occupied" />
            Occupied
          </span>
          <span>
            <i className="legend-blocked" />
            Blocked
          </span>
          <span>
            <i className="legend-accessible" />
            Accessible
          </span>
        </div>

        <div className="reference-seat-orientation reference-seat-orientation--rear">
          <div>
            <strong>Rear</strong>
            <small>Emergency exit</small>
          </div>
          <span aria-hidden="true">→</span>
        </div>
      </header>

      <div
        className="reference-coach"
        style={coachStyle}
      >
        <aside
          className="reference-coach__front"
          aria-hidden="true"
        >
          <div className="reference-coach__windshield">
            <span>ENCORE</span>
          </div>

          <div className="reference-coach__driver">
            <i>◉</i>
            <small>Driver</small>
          </div>

          <div className="reference-coach__door">
            <span>Front door</span>
          </div>
        </aside>

        <div className="reference-coach__cabin">
          <div className="reference-coach__upper">
            {cabinRows.map(
              (row) => (
                <SeatColumn
                  key={`upper-${row.number}`}
                  row={row}
                  side="upper"
                  selected={selected}
                  maxSelection={maxSelection}
                  onToggle={onToggle}
                />
              ),
            )}
          </div>

          <div
            className="reference-coach__aisle"
            aria-hidden="true"
          >
            <span />
          </div>

          <div className="reference-coach__lower">
            {cabinRows.map(
              (row) => (
                <SeatColumn
                  key={`lower-${row.number}`}
                  row={row}
                  side="lower"
                  selected={selected}
                  maxSelection={maxSelection}
                  onToggle={onToggle}
                />
              ),
            )}
          </div>
        </div>

        <aside className="reference-coach__rear">
          {rearSeats.length > 0 ? (
            <div className="reference-coach__rear-seats">
              {rearSeats.map(
                (seat) => (
                  <SeatButton
                    key={seat.id}
                    seat={seat}
                    selected={selected}
                    maxSelection={maxSelection}
                    onToggle={onToggle}
                  />
                ),
              )}
            </div>
          ) : (
            <div
              className="reference-coach__rear-panel"
              aria-hidden="true"
            >
              <span>EXIT</span>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

function SeatColumn({
  row,
  side,
  selected,
  maxSelection,
  onToggle,
}: {
  row: SeatRow;
  side: 'upper' | 'lower';
  selected: number[];
  maxSelection: number;
  onToggle: (id: number) => void;
}) {
  const midpoint =
    Math.ceil(
      row.seats.length / 2,
    );

  const sideSeats =
    side === 'upper'
      ? row.seats.slice(0, midpoint)
      : row.seats.slice(midpoint);

  return (
    <div className="reference-seat-column">
      <em>{row.number}</em>

      <div className="reference-seat-pair">
        {sideSeats.map(
          (seat) => (
            <SeatButton
              key={seat.id}
              seat={seat}
              selected={selected}
              maxSelection={maxSelection}
              onToggle={onToggle}
            />
          ),
        )}

        {Array.from(
          {
            length:
              Math.max(
                0,
                2 - sideSeats.length,
              ),
          },
          (_, index) => (
            <span
              className="reference-seat-placeholder"
              key={`${row.number}-${side}-${index}`}
              aria-hidden="true"
            />
          ),
        )}
      </div>
    </div>
  );
}
