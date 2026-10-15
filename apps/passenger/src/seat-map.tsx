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
  const sorted =
    [...rowSeats].sort(
      (left, right) =>
        seatPosition(left, 0) -
        seatPosition(right, 0),
    );

  if (sorted.length <= 2) {
    const middle =
      Math.ceil(sorted.length / 2);

    return [
      sorted.slice(0, middle),
      sorted.slice(middle),
    ] as const;
  }

  let cutIndex =
    Math.ceil(sorted.length / 2);
  let largestGap = -1;

  for (
    let index = 0;
    index < sorted.length - 1;
    index += 1
  ) {
    const current =
      seatPosition(
        sorted[index],
        index,
      );

    const next =
      seatPosition(
        sorted[index + 1],
        index + 1,
      );

    const gap =
      next - current;

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
      seatRowNumber(
        seat,
        index,
      );

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
    .map(
      ([rowNumber, rowSeats]) => {
        const [
          firstSide,
          secondSide,
        ] =
          splitRow(rowSeats);

        return {
          rowNumber,
          firstSide:
            firstSide.map(
              (seat) => ({
                seat,
                state:
                  seatState(
                    seat,
                    selected,
                  ),
              }),
            ),
          secondSide:
            secondSide.map(
              (seat) => ({
                seat,
                state:
                  seatState(
                    seat,
                    selected,
                  ),
              }),
            ),
        };
      },
    );
}

const COLORS: Record<
  SeatVisualState,
  {
    shell: string;
    back: string;
    base: string;
    stroke: string;
    text: string;
  }
> = {
  available: {
    shell: '#ffffff',
    back: '#ffffff',
    base: '#e8f0f4',
    stroke: '#9fb4c0',
    text: '#24475b',
  },
  selected: {
    shell: '#1fa378',
    back: '#2bb687',
    base: '#188864',
    stroke: '#13775a',
    text: '#ffffff',
  },
  occupied: {
    shell: '#aab7c0',
    back: '#9eabb4',
    base: '#83929c',
    stroke: '#73838d',
    text: '#ffffff',
  },
  blocked: {
    shell: '#ebc9cf',
    back: '#e0adb6',
    base: '#cc8f9a',
    stroke: '#b87783',
    text: '#6b2631',
  },
  accessible: {
    shell: '#dff3fb',
    back: '#caebf8',
    base: '#a8dbf0',
    stroke: '#329dcc',
    text: '#165f7f',
  },
};

function LegendItem({
  state,
  label,
}: {
  state: SeatVisualState;
  label: string;
}) {
  const color =
    COLORS[state];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        color: '#5f7785',
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      <i
        aria-hidden="true"
        style={{
          width: 10,
          height: 10,
          borderRadius: 999,
          background: color.back,
          border: `1px solid ${color.stroke}`,
          display: 'inline-block',
        }}
      />
      {label}
    </span>
  );
}

function VectorSeat({
  slot,
  x,
  y,
  disabled,
  onToggle,
}: {
  slot: SeatSlot;
  x: number;
  y: number;
  disabled: boolean;
  onToggle: (id: number) => void;
}) {
  const color =
    COLORS[slot.state];

  const unavailable =
    slot.state === 'occupied' ||
    slot.state === 'blocked';

  const interactive =
    !disabled &&
    !unavailable;

  const handleActivate = () => {
    if (interactive) {
      onToggle(
        slot.seat.id,
      );
    }
  };

  const handleKeyDown = (
    event:
      React.KeyboardEvent<SVGGElement>,
  ) => {
    if (
      event.key === 'Enter' ||
      event.key === ' '
    ) {
      event.preventDefault();
      handleActivate();
    }
  };

  return (
    <g
      transform={`translate(${x} ${y})`}
      role="button"
      tabIndex={
        interactive
          ? 0
          : -1
      }
      aria-disabled={!interactive}
      aria-pressed={
        slot.state === 'selected'
      }
      aria-label={`Seat ${slot.seat.seat_number} ${slot.state}`}
      onClick={handleActivate}
      onKeyDown={handleKeyDown}
      style={{
        cursor:
          interactive
            ? 'pointer'
            : 'not-allowed',
        outline: 'none',
      }}
    >
      <rect
        x="0"
        y="0"
        width="34"
        height="46"
        rx="7"
        fill={color.shell}
        stroke={color.stroke}
        strokeWidth="1.5"
      />

      <rect
        x="5"
        y="4"
        width="24"
        height="27"
        rx="6"
        fill={color.back}
        stroke={color.stroke}
        strokeWidth="1"
      />

      <rect
        x="7"
        y="32"
        width="20"
        height="10"
        rx="4"
        fill={color.base}
        stroke={color.stroke}
        strokeWidth="1"
      />

      <rect
        x="-2"
        y="17"
        width="4"
        height="17"
        rx="2"
        fill={color.stroke}
      />

      <rect
        x="32"
        y="17"
        width="4"
        height="17"
        rx="2"
        fill={color.stroke}
      />

      <text
        x="17"
        y="24"
        textAnchor="middle"
        dominantBaseline="middle"
        fill={color.text}
        fontSize="9"
        fontWeight="800"
        fontFamily="Inter, Arial, sans-serif"
      >
        {slot.seat.seat_number}
      </text>

      {slot.state ===
        'accessible' && (
        <g>
          <circle
            cx="31"
            cy="-1"
            r="7"
            fill="#159ed7"
          />
          <text
            x="31"
            y="1.5"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="7"
            fontWeight="900"
            fontFamily="Arial, sans-serif"
          >
            ♿
          </text>
        </g>
      )}
    </g>
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
    selected.length >=
    maxSelection;

  const columnWidth = 82;
  const frontWidth = 180;
  const rearWidth = 88;

  const contentWidth =
    frontWidth +
    Math.max(
      rows.length,
      1,
    ) *
      columnWidth +
    rearWidth;

  const viewHeight = 360;

  return (
    <section
      aria-label="Seat selection"
      style={{
        width: '100%',
        minWidth: 0,
        display: 'grid',
        gap: 14,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 14,
          alignItems: 'center',
          padding:
            '10px 14px',
          border:
            '1px solid #d8e5eb',
          borderRadius: 14,
          background:
            'rgba(255,255,255,.95)',
        }}
      >
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
        style={{
          width: '100%',
          overflowX: 'auto',
          overflowY: 'hidden',
          borderRadius: 28,
          background:
            '#f7fbfd',
          border:
            '1px solid #d4e2e9',
          boxShadow:
            '0 18px 44px rgba(18,63,85,.08)',
        }}
      >
        <svg
          viewBox={`0 0 ${contentWidth} ${viewHeight}`}
          width="100%"
          height="auto"
          role="group"
          aria-label="Bus seat map"
          style={{
            display: 'block',
            minWidth:
              Math.max(
                980,
                contentWidth,
              ),
          }}
        >
          <defs>
            <linearGradient
              id="busBody"
              x1="0"
              x2="1"
            >
              <stop
                offset="0"
                stopColor="#5d8ca9"
              />
              <stop
                offset=".15"
                stopColor="#d8e7ee"
              />
              <stop
                offset=".86"
                stopColor="#eef4f7"
              />
              <stop
                offset="1"
                stopColor="#c7dce6"
              />
            </linearGradient>

            <linearGradient
              id="windshield"
              x1="0"
              y1="0"
              x2="1"
              y2="1"
            >
              <stop
                offset="0"
                stopColor="#b8ddea"
              />
              <stop
                offset=".6"
                stopColor="#2b5a72"
              />
              <stop
                offset="1"
                stopColor="#17384b"
              />
            </linearGradient>

            <filter
              id="seatShadow"
              x="-20%"
              y="-20%"
              width="140%"
              height="150%"
            >
              <feDropShadow
                dx="0"
                dy="2"
                stdDeviation="2"
                floodColor="#173f54"
                floodOpacity=".12"
              />
            </filter>
          </defs>

          <path
            d={`
              M 94 20
              H ${contentWidth - 38}
              Q ${contentWidth - 18} 20
                ${contentWidth - 18} 40
              V ${viewHeight - 40}
              Q ${contentWidth - 18} ${viewHeight - 20}
                ${contentWidth - 38} ${viewHeight - 20}
              H 98
              Q 40 ${viewHeight - 20}
                22 ${viewHeight - 78}
              V 78
              Q 40 20
                94 20
              Z
            `}
            fill="url(#busBody)"
            stroke="#6e9bb4"
            strokeWidth="3"
          />

          <path
            d={`
              M 108 34
              H ${contentWidth - 50}
              Q ${contentWidth - 34} 34
                ${contentWidth - 34} 50
              V ${viewHeight - 50}
              Q ${contentWidth - 34} ${viewHeight - 34}
                ${contentWidth - 50} ${viewHeight - 34}
              H 112
              Q 58 ${viewHeight - 34}
                40 ${viewHeight - 84}
              V 84
              Q 58 34
                108 34
              Z
            `}
            fill="none"
            stroke="#c4d4dc"
            strokeWidth="2"
          />

          <path
            d="
              M 54 72
              Q 68 46 104 46
              H 146
              V 152
              H 63
              Q 44 142 44 113
              V 90
              Q 46 78 54 72
              Z
            "
            fill="url(#windshield)"
          />

          <rect
            x="52"
            y="205"
            width="94"
            height="92"
            rx="38"
            fill="#5c8aa5"
            opacity=".9"
          />

          <circle
            cx="112"
            cy="178"
            r="22"
            fill="#17384b"
          />
          <circle
            cx="112"
            cy="178"
            r="12"
            fill="none"
            stroke="#ffffff"
            strokeWidth="4"
          />
          <circle
            cx="112"
            cy="178"
            r="3"
            fill="#ffffff"
          />

          <rect
            x="150"
            y="139"
            width="42"
            height="76"
            rx="7"
            fill="#e7f1f5"
            stroke="#91aebd"
            strokeWidth="1.5"
          />

          <line
            x1="171"
            y1="140"
            x2="171"
            y2="214"
            stroke="#aec2cc"
            strokeWidth="1"
          />

          <rect
            x={frontWidth - 6}
            y="158"
            width={
              rows.length *
              columnWidth
            }
            height="44"
            rx="22"
            fill="#dce8ee"
          />

          <line
            x1={frontWidth + 10}
            y1="180"
            x2={
              frontWidth +
              rows.length *
                columnWidth -
              12
            }
            y2="180"
            stroke="#aec4cf"
            strokeWidth="2"
            strokeDasharray="12 10"
          />

          <text
            x="83"
            y="325"
            fill="#496779"
            fontSize="9"
            fontWeight="800"
            letterSpacing="1"
            fontFamily="Inter, Arial, sans-serif"
          >
            FRONT
          </text>

          <text
            x="79"
            y="198"
            fill="#ffffff"
            fontSize="9"
            fontWeight="800"
            fontFamily="Inter, Arial, sans-serif"
          >
            DRIVER
          </text>

          <text
            x="151"
            y="229"
            fill="#667f8d"
            fontSize="8"
            fontWeight="800"
            fontFamily="Inter, Arial, sans-serif"
          >
            FRONT DOOR
          </text>

          <text
            x={
              frontWidth +
              (rows.length *
                columnWidth) /
                2
            }
            y="184"
            textAnchor="middle"
            fill="#78909d"
            fontSize="8"
            fontWeight="800"
            letterSpacing=".7"
            fontFamily="Inter, Arial, sans-serif"
          >
            AISLE
          </text>

          {rows.map(
            (
              row,
              rowIndex,
            ) => {
              const x =
                frontWidth +
                rowIndex *
                  columnWidth;

              const topY =
                [72, 119];

              const bottomY =
                [213, 260];

              return (
                <g
                  key={
                    row.rowNumber
                  }
                >
                  <text
                    x={x + 17}
                    y="52"
                    textAnchor="middle"
                    fill="#748b98"
                    fontSize="8"
                    fontWeight="800"
                    fontFamily="Inter, Arial, sans-serif"
                  >
                    {row.rowNumber}
                  </text>

                  {row.firstSide.map(
                    (
                      slot,
                      index,
                    ) => (
                      <g
                        key={
                          slot.seat.id
                        }
                        filter="url(#seatShadow)"
                      >
                        <VectorSeat
                          slot={
                            slot
                          }
                          x={x}
                          y={
                            topY[
                              Math.min(
                                index,
                                1,
                              )
                            ]
                          }
                          onToggle={
                            onToggle
                          }
                          disabled={
                            disabled ||
                            (
                              selectionLocked &&
                              slot.state !==
                                'selected'
                            )
                          }
                        />
                      </g>
                    ),
                  )}

                  {row.secondSide.map(
                    (
                      slot,
                      index,
                    ) => (
                      <g
                        key={
                          slot.seat.id
                        }
                        filter="url(#seatShadow)"
                      >
                        <VectorSeat
                          slot={
                            slot
                          }
                          x={x}
                          y={
                            bottomY[
                              Math.min(
                                index,
                                1,
                              )
                            ]
                          }
                          onToggle={
                            onToggle
                          }
                          disabled={
                            disabled ||
                            (
                              selectionLocked &&
                              slot.state !==
                                'selected'
                            )
                          }
                        />
                      </g>
                    ),
                  )}
                </g>
              );
            },
          )}

          <rect
            x={
              contentWidth - 66
            }
            y="64"
            width="32"
            height="228"
            rx="9"
            fill="#c8dbe4"
          />

          <rect
            x={
              contentWidth - 62
            }
            y="256"
            width="24"
            height="24"
            rx="4"
            fill="#c95764"
          />

          <text
            x={
              contentWidth - 50
            }
            y="271"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="7"
            fontWeight="800"
            fontFamily="Arial, sans-serif"
          >
            EXIT
          </text>

          <text
            x={
              contentWidth - 71
            }
            y="325"
            textAnchor="middle"
            fill="#496779"
            fontSize="9"
            fontWeight="800"
            letterSpacing="1"
            fontFamily="Inter, Arial, sans-serif"
          >
            REAR
          </text>
        </svg>
      </div>
    </section>
  );
}

export default SeatMap;
