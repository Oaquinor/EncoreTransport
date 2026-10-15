import React from 'react';

export type SeatIdentifier = string | number;

export type EncoreSeatRecord = {
  id?: SeatIdentifier;
  seat_id?: SeatIdentifier;
  bus_seat_id?: SeatIdentifier;
  code?: string;
  name?: string;
  seat_number?: string | number;
  label?: string;
  row_number?: number | null;
  position_index?: number | null;
  blocked?: boolean;
  accessible?: boolean;
  available?: boolean;
  occupied?: boolean;
  status?: string | null;
  selected?: boolean;
};

export type EncoreSeatMapProps = {
  seats: EncoreSeatRecord[];
  selectedSeatIds?: SeatIdentifier[];
  onSeatToggle?: (seat: EncoreSeatRecord) => void;
  disabled?: boolean;
  maxSelectable?: number;
  className?: string;
};

type SeatVisualState = 'available' | 'selected' | 'occupied' | 'blocked' | 'accessible';

type SeatSlot = {
  key: string;
  seat: EncoreSeatRecord;
  label: string;
  state: SeatVisualState;
};

type RowShape = {
  rowNumber: number;
  top: SeatSlot[];
  bottom: SeatSlot[];
  rearBench: boolean;
};

const toSeatId = (seat: EncoreSeatRecord, fallbackIndex: number): SeatIdentifier =>
  seat.id ?? seat.bus_seat_id ?? seat.seat_id ?? seat.code ?? seat.seat_number ?? `seat-${fallbackIndex + 1}`;

const toSeatKey = (value: SeatIdentifier): string => String(value);

const toSeatLabel = (seat: EncoreSeatRecord, fallbackIndex: number): string => {
  const value = seat.label ?? seat.code ?? seat.name ?? seat.seat_number ?? toSeatId(seat, fallbackIndex);
  return String(value).trim();
};

const toSeatState = (seat: EncoreSeatRecord, selectedSet: Set<string>): SeatVisualState => {
  const key = toSeatKey(toSeatId(seat, 0));
  const selected = seat.selected || selectedSet.has(key);
  const status = String(seat.status ?? '').toLowerCase();
  const occupied = seat.occupied || status === 'occupied' || seat.available === false;
  const blocked = seat.blocked || status === 'blocked';
  const accessible = seat.accessible || status === 'accessible';

  if (selected) return 'selected';
  if (blocked) return 'blocked';
  if (occupied) return 'occupied';
  if (accessible) return 'accessible';
  return 'available';
};

const getPosition = (seat: EncoreSeatRecord, fallbackIndex: number): number => {
  if (typeof seat.position_index === 'number' && seat.position_index > 0) {
    return seat.position_index;
  }
  return fallbackIndex + 1;
};

const getRowNumber = (seat: EncoreSeatRecord, fallbackIndex: number): number => {
  if (typeof seat.row_number === 'number' && seat.row_number > 0) {
    return seat.row_number;
  }
  return Math.floor(fallbackIndex / 4) + 1;
};

function splitAroundAisle(sorted: EncoreSeatRecord[]): [EncoreSeatRecord[], EncoreSeatRecord[]] {
  if (sorted.length <= 2) {
    const cut = Math.ceil(sorted.length / 2);
    return [sorted.slice(0, cut), sorted.slice(cut)];
  }

  const positions = sorted.map((seat, index) => getPosition(seat, index));
  let cutIndex = Math.max(1, Math.ceil(sorted.length / 2));
  let bestGap = -1;

  for (let index = 0; index < positions.length - 1; index += 1) {
    const gap = positions[index + 1] - positions[index];
    if (gap > bestGap) {
      bestGap = gap;
      cutIndex = index + 1;
    }
  }

  return [sorted.slice(0, cutIndex), sorted.slice(cutIndex)];
}

function buildRows(seats: EncoreSeatRecord[], selectedSet: Set<string>): RowShape[] {
  const indexed = seats.map((seat, index) => ({
    seat,
    index,
    rowNumber: getRowNumber(seat, index),
    position: getPosition(seat, index),
  }));

  const byRow = new Map<number, typeof indexed>();

  for (const item of indexed) {
    const list = byRow.get(item.rowNumber) ?? [];
    list.push(item);
    byRow.set(item.rowNumber, list);
  }

  const rowNumbers = Array.from(byRow.keys()).sort((left, right) => left - right);
  const lastRowNumber = rowNumbers[rowNumbers.length - 1] ?? 0;

  return rowNumbers.map((rowNumber) => {
    const current = (byRow.get(rowNumber) ?? []).sort((left, right) => left.position - right.position);
    const seatsOnly = current.map((item) => item.seat);
    const [topGroup, bottomGroup] = splitAroundAisle(seatsOnly);
    const rearBench = rowNumber === lastRowNumber && current.length <= 2;

    const mapSlot = (seat: EncoreSeatRecord, localIndex: number): SeatSlot => {
      const globalIndex = seats.findIndex((item) => item === seat);
      const id = toSeatId(seat, globalIndex >= 0 ? globalIndex : localIndex);
      return {
        key: toSeatKey(id),
        seat,
        label: toSeatLabel(seat, globalIndex >= 0 ? globalIndex : localIndex),
        state: toSeatState(seat, selectedSet),
      };
    };

    return {
      rowNumber,
      top: topGroup.map(mapSlot),
      bottom: bottomGroup.map(mapSlot),
      rearBench,
    };
  });
}

const LegendItem = ({ tone, label }: { tone: string; label: string }) => (
  <span className="et-seat-legend__item">
    <i className={`et-seat-dot et-seat-dot--${tone}`} aria-hidden="true" />
    {label}
  </span>
);

const SeatButton = ({
  slot,
  onClick,
  disabled,
  wide = false,
}: {
  slot: SeatSlot;
  onClick?: () => void;
  disabled?: boolean;
  wide?: boolean;
}) => {
  const unavailable = slot.state === 'occupied' || slot.state === 'blocked';
  const ariaDisabled = disabled || unavailable;

  return (
    <button
      type="button"
      className={`et-seat et-seat--${slot.state}${wide ? ' et-seat--wide' : ''}`}
      onClick={onClick}
      disabled={ariaDisabled}
      aria-pressed={slot.state === 'selected'}
      aria-label={`Seat ${slot.label} ${slot.state}`}>
      <span className="et-seat__shell">
        <span className="et-seat__headrest" />
        <span className="et-seat__back" />
        <span className="et-seat__base" />
        <span className="et-seat__arm et-seat__arm--left" />
        <span className="et-seat__arm et-seat__arm--right" />
        <strong className="et-seat__label">{slot.label}</strong>
        {slot.state === 'accessible' ? <span className="et-seat__badge">♿</span> : null}
      </span>
    </button>
  );
};

export default function SeatMap({
  seats,
  selectedSeatIds = [],
  onSeatToggle,
  disabled = false,
  maxSelectable,
  className = '',
}: EncoreSeatMapProps) {
  const selectedSet = new Set(selectedSeatIds.map(toSeatKey));
  const rows = buildRows(seats, selectedSet);

  const selectedCount = rows
    .flatMap((row) => [...row.top, ...row.bottom])
    .filter((slot) => slot.state === 'selected').length;

  const handleToggle = (slot: SeatSlot) => {
    if (!onSeatToggle) return;
    if (slot.state === 'blocked' || slot.state === 'occupied') return;
    if (maxSelectable && slot.state !== 'selected' && selectedCount >= maxSelectable) return;
    onSeatToggle(slot.seat);
  };

  return (
    <section className={`et-seat-layout ${className}`.trim()} aria-label="Seat selection">
      <div className="et-seat-layout__legend">
        <LegendItem tone="available" label="Available" />
        <LegendItem tone="selected" label="Selected" />
        <LegendItem tone="occupied" label="Occupied" />
        <LegendItem tone="blocked" label="Blocked" />
        <LegendItem tone="accessible" label="Accessible" />
      </div>

      <div className="et-seat-bus" role="group" aria-label="Bus seat map">
        <div className="et-seat-bus__front-marker">Panoramic front</div>
        <div className="et-seat-bus__driver-marker">Driver</div>
        <div className="et-seat-bus__front-door">Front door</div>
        <div className="et-seat-bus__rear-exit">Rear · emergency exit</div>

        <div className="et-seat-bus__cockpit" aria-hidden="true">
          <div className="et-seat-bus__wheel" />
          <div className="et-seat-bus__driver-seat" />
        </div>

        <div className="et-seat-bus__grid">
          {rows.map((row) => (
            <div key={row.rowNumber} className="et-seat-column">
              <span className="et-seat-column__number">{row.rowNumber}</span>

              <div className="et-seat-column__top">
                {row.top.map((slot) => (
                  <SeatButton
                    key={slot.key}
                    slot={slot}
                    onClick={() => handleToggle(slot)}
                    disabled={disabled}
                    wide={row.rearBench}
                  />
                ))}
              </div>

              <div className="et-seat-column__aisle" aria-hidden="true" />

              <div className="et-seat-column__bottom">
                {row.bottom.map((slot) => (
                  <SeatButton
                    key={slot.key}
                    slot={slot}
                    onClick={() => handleToggle(slot)}
                    disabled={disabled}
                    wide={row.rearBench}
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
