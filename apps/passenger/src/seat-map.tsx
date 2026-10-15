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

const colors: Record<
  SeatVisualState,
  {
    back: string;
    base: string;
    border: string;
    text: string;
  }
> = {
  available: {
    back: '#ffffff',
    base: '#e6eef2',
    border: '#9fb4bf',
    text: '#284a5d',
  },
  selected: {
    back: '#27ac7e',
    base: '#168c66',
    border: '#117453',
    text: '#ffffff',
  },
  occupied: {
    back: '#a5b2ba',
    base: '#7f8f98',
    border: '#708089',
    text: '#ffffff',
  },
  blocked: {
    back: '#e4b8c0',
    base: '#cb8c98',
    border: '#b7727f',
    text: '#672832',
  },
  accessible: {
    back: '#cbeaf7',
    base: '#9fd8ef',
    border: '#2a98c8',
    text: '#155f80',
  },
};

function resolveState(
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

function resolveRow(
  seat: SeatDto,
  fallback: number,
) {
  const value =
    Number(seat.row_number ?? 0);

  return value > 0
    ? value
    : Math.floor(fallback / 4) + 1;
}

function resolvePosition(
  seat: SeatDto,
  fallback: number,
) {
  const value =
    Number(
      seat.position_index ?? 0,
    );

  return value > 0
    ? value
    : fallback + 1;
}

function splitAroundAisle(
  rowSeats: SeatDto[],
) {
  const sorted =
    [...rowSeats].sort(
      (left, right) =>
        resolvePosition(left, 0) -
        resolvePosition(right, 0),
    );

  if (sorted.length <= 2) {
    const middle =
      Math.ceil(
        sorted.length / 2,
      );

    return [
      sorted.slice(0, middle),
      sorted.slice(middle),
    ] as const;
  }

  let split =
    Math.ceil(
      sorted.length / 2,
    );

  let largestGap =
    Number.NEGATIVE_INFINITY;

  for (
    let index = 0;
    index < sorted.length - 1;
    index += 1
  ) {
    const left =
      resolvePosition(
        sorted[index],
        index,
      );

    const right =
      resolvePosition(
        sorted[index + 1],
        index + 1,
      );

    const gap =
      right - left;

    if (gap > largestGap) {
      largestGap = gap;
      split = index + 1;
    }
  }

  return [
    sorted.slice(0, split),
    sorted.slice(split),
  ] as const;
}

function buildRows(
  seats: SeatDto[],
  selected: Set<number>,
): SeatRow[] {
  const grouped =
    new Map<number, SeatDto[]>();

  seats.forEach(
    (seat, index) => {
      const row =
        resolveRow(
          seat,
          index,
        );

      const current =
        grouped.get(row) ?? [];

      current.push(seat);
      grouped.set(
        row,
        current,
      );
    },
  );

  return [
    ...grouped.entries(),
  ]
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
          splitAroundAisle(
            rowSeats,
          );

        const mapSeat =
          (seat: SeatDto): SeatSlot => ({
            seat,
            state:
              resolveState(
                seat,
                selected,
              ),
          });

        return {
          rowNumber,
          firstSide:
            firstSide.map(mapSeat),
          secondSide:
            secondSide.map(mapSeat),
        };
      },
    );
}

function Legend({
  state,
  label,
}: {
  state: SeatVisualState;
  label: string;
}) {
  const tone =
    colors[state];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        color: '#607886',
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      <i
        aria-hidden="true"
        style={{
          width: 10,
          height: 10,
          display: 'inline-block',
          borderRadius: 999,
          background: tone.back,
          border:
            `1px solid ${tone.border}`,
        }}
      />
      {label}
    </span>
  );
}

function SeatShape({
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
  const tone =
    colors[slot.state];

  const unavailable =
    slot.state === 'occupied' ||
    slot.state === 'blocked';

  const interactive =
    !disabled &&
    !unavailable;

  const activate = () => {
    if (interactive) {
      onToggle(
        slot.seat.id,
      );
    }
  };

  const onKeyDown = (
    event:
      React.KeyboardEvent<SVGGElement>,
  ) => {
    if (
      event.key === 'Enter' ||
      event.key === ' '
    ) {
      event.preventDefault();
      activate();
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
      aria-label={
        `Seat ${slot.seat.seat_number} ${slot.state}`
      }
      onClick={activate}
      onKeyDown={onKeyDown}
      style={{
        cursor:
          interactive
            ? 'pointer'
            : 'not-allowed',
      }}
    >
      <rect
        x="0"
        y="0"
        width="34"
        height="47"
        rx="7"
        fill="#f9fcfd"
        stroke={tone.border}
        strokeWidth="1.5"
      />

      <rect
        x="5"
        y="4"
        width="24"
        height="28"
        rx="6"
        fill={tone.back}
        stroke={tone.border}
        strokeWidth="1"
      />

      <rect
        x="7"
        y="33"
        width="20"
        height="10"
        rx="4"
        fill={tone.base}
        stroke={tone.border}
        strokeWidth="1"
      />

      <rect
        x="-2"
        y="18"
        width="4"
        height="17"
        rx="2"
        fill={tone.border}
      />

      <rect
        x="32"
        y="18"
        width="4"
        height="17"
        rx="2"
        fill={tone.border}
      />

      <text
        x="17"
        y="24"
        textAnchor="middle"
        dominantBaseline="middle"
        fill={tone.text}
        fontSize="8.5"
        fontWeight="800"
        fontFamily="Inter, Arial, sans-serif"
      >
        {slot.seat.seat_number}
      </text>

      {slot.state ===
        'accessible' && (
        <>
          <circle
            cx="31"
            cy="-1"
            r="7"
            fill="#168fc5"
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
        </>
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

  const frontWidth =
    182;

  const columnWidth =
    82;

  const rearWidth =
    82;

  const contentWidth =
    frontWidth +
    Math.max(
      rows.length,
      1,
    ) *
      columnWidth +
    rearWidth;

  const viewHeight =
    360;

  const seatDisabled = (
    slot: SeatSlot,
  ) =>
    disabled ||
    (
      selectionLocked &&
      slot.state !==
        'selected'
    );

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
          alignItems: 'center',
          gap: 14,
          padding:
            '10px 14px',
          border:
            '1px solid #d8e5eb',
          borderRadius: 14,
          background:
            'rgba(255,255,255,.96)',
        }}
      >
        <Legend
          state="available"
          label="Available"
        />
        <Legend
          state="selected"
          label="Selected"
        />
        <Legend
          state="occupied"
          label="Occupied"
        />
        <Legend
          state="blocked"
          label="Blocked"
        />
        <Legend
          state="accessible"
          label="Accessible"
        />
      </div>

      <div
        style={{
          width: '100%',
          minWidth: 0,
          overflowX: 'auto',
          overflowY: 'hidden',
          border:
            '1px solid #d5e3ea',
          borderRadius: 28,
          background: '#f7fbfd',
          boxShadow:
            '0 18px 44px rgba(18,63,85,.08)',
        }}
      >
        <svg
          viewBox={
            `0 0 ${contentWidth} ${viewHeight}`
          }
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
              id="encoreBusBody"
              x1="0"
              x2="1"
            >
              <stop
                offset="0"
                stopColor="#5c8eac"
              />
              <stop
                offset=".15"
                stopColor="#d9e7ee"
              />
              <stop
                offset=".86"
                stopColor="#eef4f7"
              />
              <stop
                offset="1"
                stopColor="#c9dde6"
              />
            </linearGradient>

            <linearGradient
              id="encoreWindshield"
              x1="0"
              y1="0"
              x2="1"
              y2="1"
            >
              <stop
                offset="0"
                stopColor="#bce0ed"
              />
              <stop
                offset=".6"
                stopColor="#2c5b73"
              />
              <stop
                offset="1"
                stopColor="#17394d"
              />
            </linearGradient>
          </defs>

          <path
            d={`
              M 96 20
              H ${contentWidth - 38}
              Q ${contentWidth - 18} 20
                ${contentWidth - 18} 40
              V ${viewHeight - 40}
              Q ${contentWidth - 18} ${viewHeight - 20}
                ${contentWidth - 38} ${viewHeight - 20}
              H 100
              Q 42 ${viewHeight - 20}
                23 ${viewHeight - 78}
              V 78
              Q 42 20
                96 20
              Z
            `}
            fill="url(#encoreBusBody)"
            stroke="#6e9bb4"
            strokeWidth="3"
          />

          <path
            d="
              M 55 72
              Q 70 46 105 46
              H 147
              V 151
              H 64
              Q 45 141 45 113
              V 90
              Q 47 78 55 72
              Z
            "
            fill="url(#encoreWindshield)"
          />

          <rect
            x="53"
            y="205"
            width="94"
            height="92"
            rx="38"
            fill="#5c8aa5"
            opacity=".92"
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
            x="151"
            y="139"
            width="42"
            height="76"
            rx="7"
            fill="#e7f1f5"
            stroke="#91aebd"
            strokeWidth="1.5"
          />

          <line
            x1="172"
            y1="140"
            x2="172"
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
            x1={frontWidth + 12}
            y1="180"
            x2={
              frontWidth +
              rows.length *
                columnWidth -
              14
            }
            y2="180"
            stroke="#aec4cf"
            strokeWidth="2"
            strokeDasharray="12 10"
          />

          <text
            x="77"
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
            y="228"
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
              (
                rows.length *
                columnWidth
              ) /
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
                    y="53"
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
                      <SeatShape
                        key={
                          slot.seat.id
                        }
                        slot={slot}
                        x={x}
                        y={
                          topY[
                            Math.min(
                              index,
                              1,
                            )
                          ]
                        }
                        disabled={
                          seatDisabled(
                            slot,
                          )
                        }
                        onToggle={
                          onToggle
                        }
                      />
                    ),
                  )}

                  {row.secondSide.map(
                    (
                      slot,
                      index,
                    ) => (
                      <SeatShape
                        key={
                          slot.seat.id
                        }
                        slot={slot}
                        x={x}
                        y={
                          bottomY[
                            Math.min(
                              index,
                              1,
                            )
                          ]
                        }
                        disabled={
                          seatDisabled(
                            slot,
                          )
                        }
                        onToggle={
                          onToggle
                        }
                      />
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
            y="255"
            width="24"
            height="24"
            rx="4"
            fill="#c95764"
          />

          <text
            x={
              contentWidth - 50
            }
            y="270"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="7"
            fontWeight="800"
            fontFamily="Arial, sans-serif"
          >
            EXIT
          </text>

          <text
            x="76"
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
            x={
              contentWidth - 74
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
