import { useMemo } from 'react';

export type SeatDto={
  id:number;
  seat_number:string;
  row_number?:number|null;
  position_index?:number|null;
  seat_class?:string;
  seat_type?:string;
  window?:boolean;
  aisle?:boolean;
  accessible?:boolean;
  blocked?:boolean;
  available:boolean;
};

export function SeatMap({seats,selected,maxSelection,onToggle}:{seats:SeatDto[];selected:number[];maxSelection:number;onToggle:(id:number)=>void}){
  const rows=useMemo(()=>{
    const map=new Map<number,SeatDto[]>();
    for(const seat of seats){
      const parsed=parseInt(seat.seat_number,10);
      const row=Number(seat.row_number ?? (Number.isFinite(parsed)?parsed:0));
      map.set(row,[...(map.get(row)??[]),seat]);
    }
    return [...map.entries()].sort((a,b)=>a[0]-b[0]);
  },[seats]);

  if(!rows.length)return <div className="smart-banner"><b>No seat layout configured.</b><span>Operations must configure the vehicle seats before this trip can be booked.</span></div>;

  return <div className="coach">
    <div className="windshield">PANORAMIC FRONT <b>DRIVER</b></div>
    <div className="legend"><span>○ Available</span><span>● Selected</span><span>◌ Unavailable</span><span>◎ Accessible</span></div>
    {rows.map(([row,rowSeats])=>{
      const max=Math.max(...rowSeats.map(s=>Number(s.position_index??0)),1);
      const byPosition=new Map<number,SeatDto>(rowSeats.map(s=>[Number(s.position_index??0),s] as [number,SeatDto]));
      const cells=[];
      for(let position=1;position<=max;position++){
        const seat=byPosition.get(position);
        if(!seat){cells.push(<i className="aisle" key={`gap-${row}-${position}`} aria-hidden="true"/>);continue;}
        const isSelected=selected.includes(seat.id);
        const disabled=!seat.available || seat.blocked || (!isSelected && selected.length>=maxSelection);
        cells.push(<button key={seat.id} disabled={disabled} className={`seat ${isSelected?'selected':''} ${!seat.available||seat.blocked?'occupied':''} ${seat.accessible?'accessible':''}`} onClick={()=>onToggle(seat.id)} aria-pressed={isSelected} aria-label={`Seat ${seat.seat_number}, ${seat.available?'available':'unavailable'}${seat.accessible?', accessible':''}`}><span className="seat-back">◉</span><span className="seat-base"></span><b>{seat.seat_number}</b></button>);
      }
      return <div className="seat-row" key={row}><em>{row||''}</em>{cells}</div>;
    })}
    <div className="rear">REAR · EMERGENCY EXIT</div>
  </div>;
}
