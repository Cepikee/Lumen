"use client";
import { useId } from "react";
export type SparkPoint = { timestamp?: string; day?: string; hour?: number; freq: number };
export default function SparklineMini({ history, width = 150, height = 42, tone = "blue" }: {history: SparkPoint[]; period?: string; width?: number; height?: number; tone?: "blue" | "purple"}) {
  const id = useId().replaceAll(":", "");
  const points = Array.isArray(history) ? history.filter(p=>p && Number.isFinite(p.freq) && p.freq >= 0) : [];
  if (!points.length) return <span role="status" style={{display:"inline-grid",placeItems:"center",width,height,color:"#7895ae",fontSize:11}}>Nincs idősor</span>;
  const max = Math.max(1,...points.map(p=>p.freq));
  const coords = points.map((p,i)=>[points.length===1 ? 75 : 4+i/(points.length-1)*142,38-p.freq/max*32]);
  const path = coords.map(([x,y],i)=>`${i?'L':'M'}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const color = tone === "purple" ? "#a35aff" : "#10b6ff";
  return <svg width={width} height={height} viewBox="0 0 150 42" style={{maxWidth:"100%",color}} role="img" aria-label={`Kulcsszó-idősor: ${points.length} mérési pont`}>
    <defs><linearGradient id={id} x2="0" y2="1"><stop stopColor={color} stopOpacity=".28"/><stop offset="1" stopColor={color} stopOpacity="0"/></linearGradient></defs>
    {points.length > 1 && <><path d={`${path} L146 42 L4 42 Z`} fill={`url(#${id})`}/><path d={path} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" style={{filter:`drop-shadow(0 0 3px ${color})`}}/></>}
    {points.length === 1 && <circle cx={coords[0][0]} cy={coords[0][1]} r="3" fill={color}/>}
  </svg>;
}
