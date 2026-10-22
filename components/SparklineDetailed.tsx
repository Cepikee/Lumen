"use client";
import { Line } from "react-chartjs-2";
import {Chart as ChartJS, LineElement,CategoryScale,LinearScale,PointElement,Tooltip,Legend,Filler,type ChartOptions} from "chart.js";
import { pointLabel } from "@/lib/trend-intelligence";
import type { SparkPoint } from "./SparklineMini";
ChartJS.register(LineElement,CategoryScale,LinearScale,PointElement,Tooltip,Legend,Filler);
export default function SparklineDetailed({history,period,series,onPointSelect}: {history:SparkPoint[];period:string;startDate?:string;endDate?:string;series?:{label:string;values:number[];color:string}[];onPointSelect?:(index:number)=>void}) {
  const points = (Array.isArray(history)?history:[]).filter(p=>p && Number.isFinite(p.freq) && p.freq>=0);
  const labels = points.map(p=>p.timestamp ? pointLabel(p.timestamp,period==="24h") : p.day ? pointLabel(p.day+"T00:00:00Z") : `${p.hour ?? "?"}:00`);
  const data = {labels,datasets:(series ?? [{label:"Cikk–kulcsszó kapcsolatok",values:points.map(p=>p.freq),color:"#16b9ff"}]).map(s=>({label:s.label,data:s.values,borderColor:s.color,backgroundColor:s.color+"18",pointBackgroundColor:s.color,fill:true,tension:0,pointRadius:points.length===1?5:2,pointHoverRadius:6,borderWidth:2}))};
  const options:ChartOptions<"line"> = {responsive:true,maintainAspectRatio:false,animation:false,interaction:{mode:"index",intersect:false},
    onClick:(_,elements)=>{if(elements[0]) onPointSelect?.(elements[0].index);},
    plugins:{legend:{display:Boolean(series),labels:{color:"#b7cce0",usePointStyle:true}},tooltip:{backgroundColor:"#07192a",borderColor:"#17699b",borderWidth:1,titleColor:"#f4f8ff",bodyColor:"#b7cce0",callbacks:{label:ctx=>`${ctx.dataset.label}: ${Number(ctx.parsed.y ?? 0).toLocaleString("hu-HU")}`}}},
    scales:{x:{ticks:{color:"#8eabc4",maxTicksLimit:8,maxRotation:0},grid:{display:false}},y:{beginAtZero:true,ticks:{color:"#8eabc4",precision:0},grid:{color:"#17334b"},title:{display:true,text:"Cikk–kulcsszó kapcsolatok",color:"#8eabc4"}}}};
  return <div style={{height:310,width:"100%",minWidth:0}}>{points.length ? <Line data={data} options={options} aria-label="Részletes kulcsszó-idősor" role="img"/> : <p role="status">Nincs történeti adat.</p>}</div>;
}
