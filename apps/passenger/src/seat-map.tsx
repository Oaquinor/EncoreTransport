import React from 'react';

export type SeatDto = {
  id: number;
  seat_number: string;
  row_number?: number | null;
  position_index?: number | null;
  accessible?: boolean;
  blocked?: boolean;
  available: boolean;
  occupied?: boolean;
  status?: string | null;
  selected?: boolean;
};

type SeatVisualState =
  | 'available'
  | 'selected'
  | 'occupied'
  | 'blocked'
  | 'accessible';

type SeatSlot = {
  seat: SeatDto;
  state: SeatVisualState;
};

type SeatRow = {
  rowNumber: number;
  firstSide: SeatSlot[];
  secondSide: SeatSlot[];
};

type SeatMapProps = {
  seats: SeatDto[];
  selected: number[];
  maxSelection: number;
  onToggle: (id: number) => void;
  disabled?: boolean;
};

function seatState(
  seat: SeatDto,
  selected: Set<number>,
): SeatVisualState {
  if (selected.has(seat.id)) {
    return 'selected';
  }

  const status =
    String(seat.status ?? '')
      .trim()
      .toLowerCase();

  if (
    seat.blocked ||
    status === 'blocked'
  ) {
    return 'blocked';
  }

  if (
    seat.occupied ||
    seat.available === false ||
    status === 'occupied'
  ) {
    return 'occupied';
  }

  if (
    seat.accessible ||
    status === 'accessible'
  ) {
    return 'accessible';
  }

  return 'available';
}

function seatPosition(
  seat: SeatDto,
  fallback: number,
) {
  const position =
    Number(seat.position_index ?? 0);

  return position > 0
    ? position
    : fallback + 1;
}

function seatRowNumber(
  seat: SeatDto,
  fallback: number,
) {
  const row =
    Number(seat.row_number ?? 0);

  return row > 0
    ? row
    : Math.floor(fallback / 4) + 1;
}

function splitRow(
  rowSeats: SeatDto[],
) {
  if (rowSeats.length <= 2) {
    const middle =
      Math.ceil(rowSeats.length / 2);

    return [
      rowSeats.slice(0, middle),
      rowSeats.slice(middle),
    ] as const;
  }

  const sorted =
    [...rowSeats].sort(
      (left, right) =>
        seatPosition(left, 0) -
        seatPosition(right, 0),
    );

  let cutIndex =
    Math.ceil(sorted.length / 2);
  let largestGap = -1;

  for (
    let index = 0;
    index < sorted.length - 1;
    index += 1
  ) {
    const current =
      seatPosition(sorted[index], index);
    const next =
      seatPosition(
        sorted[index + 1],
        index + 1,
      );
    const gap = next - current;

    if (gap > largestGap) {
      largestGap = gap;
      cutIndex = index + 1;
    }
  }

  return [
    sorted.slice(0, cutIndex),
    sorted.slice(cutIndex),
  ] as const;
}

function buildRows(
  seats: SeatDto[],
  selected: Set<number>,
): SeatRow[] {
  const grouped =
    new Map<number, SeatDto[]>();

  seats.forEach((seat, index) => {
    const row =
      seatRowNumber(seat, index);
    const list =
      grouped.get(row) ?? [];

    list.push(seat);
    grouped.set(row, list);
  });

  return [...grouped.entries()]
    .sort(
      ([left], [right]) =>
        left - right,
    )
    .map(([rowNumber, rowSeats]) => {
      const [firstSide, secondSide] =
        splitRow(rowSeats);

      return {
        rowNumber,
        firstSide: firstSide.map(
          (seat) => ({
            seat,
            state: seatState(
              seat,
              selected,
            ),
          }),
        ),
        secondSide: secondSide.map(
          (seat) => ({
            seat,
            state: seatState(
              seat,
              selected,
            ),
          }),
        ),
      };
    });
}

function LegendItem({
  state,
  label,
}: {
  state: SeatVisualState;
  label: string;
}) {
  return (
    <span className="et-seat-legend__item">
      <i
        className={`et-seat-dot et-seat-dot--${state}`}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}

function SeatButton({
  slot,
  disabled,
  onToggle,
}: {
  slot: SeatSlot;
  disabled: boolean;
  onToggle: (id: number) => void;
}) {
  const unavailable =
    slot.state === 'occupied' ||
    slot.state === 'blocked';

  const isDisabled =
    disabled || unavailable;

  return (
    <button
      type="button"
      className={`et-seat et-seat--${slot.state}`}
      disabled={isDisabled}
      aria-pressed={slot.state === 'selected'}
      aria-label={`Seat ${slot.seat.seat_number} ${slot.state}`}
      onClick={() =>
        onToggle(slot.seat.id)
      }
    >
      <span className="et-seat__shell">
        <span className="et-seat__headrest" />
        <span className="et-seat__back" />
        <span className="et-seat__base" />
        <span className="et-seat__arm et-seat__arm--left" />
        <span className="et-seat__arm et-seat__arm--right" />
        <strong className="et-seat__label">
          {slot.seat.seat_number}
        </strong>
        {slot.state === 'accessible' && (
          <span className="et-seat__badge">
            ♿
          </span>
        )}
      </span>
    </button>
  );
}

export function SeatMap({
  seats,
  selected,
  maxSelection,
  onToggle,
  disabled = false,
}: SeatMapProps) {
  const selectedSet =
    new Set(selected);

  const rows =
    buildRows(
      seats,
      selectedSet,
    );

  const selectionLocked =
    selected.length >= maxSelection;

  return (
    <section
      className="et-seat-layout"
      aria-label="Seat selection"
    >
      <div className="et-seat-layout__legend">
        <LegendItem
          state="available"
          label="Available"
        />
        <LegendItem
          state="selected"
          label="Selected"
        />
        <LegendItem
          state="occupied"
          label="Occupied"
        />
        <LegendItem
          state="blocked"
          label="Blocked"
        />
        <LegendItem
          state="accessible"
          label="Accessible"
        />
      </div>

      <div
        className="et-seat-bus"
        role="group"
        aria-label="Bus seat map"
      >
        <div className="et-seat-bus__front-marker">
          Panoramic front
        </div>
        <div className="et-seat-bus__driver-marker">
          Driver
        </div>
        <div className="et-seat-bus__front-door">
          Front door
        </div>
        <div className="et-seat-bus__rear-exit">
          Rear · emergency exit
        </div>

        <div
          className="et-seat-bus__cockpit"
          aria-hidden="true"
        >
          <div className="et-seat-bus__wheel" />
          <div className="et-seat-bus__driver-seat" />
        </div>

        <div className="et-seat-bus__grid">
          {rows.map((row) => (
            <div
              key={row.rowNumber}
              className="et-seat-column"
            >
              <span className="et-seat-column__number">
                {row.rowNumber}
              </span>

              <div className="et-seat-column__top">
                {row.firstSide.map((slot) => (
                  <SeatButton
                    key={slot.seat.id}
                    slot={slot}
                    onToggle={onToggle}
                    disabled={
                      disabled ||
                      (
                        selectionLocked &&
                        slot.state !== 'selected'
                      )
                    }
                  />
                ))}
              </div>

              <div
                className="et-seat-column__aisle"
                aria-hidden="true"
              />

              <div className="et-seat-column__bottom">
                {row.secondSide.map((slot) => (
                  <SeatButton
                    key={slot.seat.id}
                    slot={slot}
                    onToggle={onToggle}
                    disabled={
                      disabled ||
                      (
                        selectionLocked &&
                        slot.state !== 'selected'
                      )
                    }
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default SeatMap;
