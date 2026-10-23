"use client";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell, PieChart, Pie, ReferenceLine } from "recharts";
import { categorySeries, categorySentiments, clickbaitRows, sentimentCounts, sentimentSeries, timeLabel } from "@/lib/insights-dashboard";
import styles from "./InsightsDashboard.module.css";

const colors = ["#0787ff", "#8b5cf6", "#ff7a32", "#21d99b", "#63d4ec", "#ee79ae"];
const tip = { background: "#0c2034", border: "1px solid #295173", color: "#eef6ff", borderRadius: 8, fontSize: 12 };
const tipLabel = { color: "#eef6ff", fontWeight: 600 };
const tipItem = { color: "#eef6ff" };
const tick = { fill: "#a8c1dc", fontSize: 10 };
type Series = ReturnType<typeof categorySeries>;

export function CategoryTrendChart({ chart, period, onCategory }: { chart: Series; period: string; onCategory?: (category:string)=>void }) {
  return <>
    <div className={styles.chart}><ResponsiveContainer width="100%" height="100%">
      <LineChart data={chart.points}>
        <CartesianGrid stroke="#183653" strokeDasharray="3 4" />
        <XAxis dataKey="time" tickFormatter={v => timeLabel(Number(v), period)} tick={tick} minTickGap={32} />
        <YAxis width={28} allowDecimals={false} tick={tick} />
        <Tooltip cursor={false} contentStyle={tip} labelStyle={tipLabel} itemStyle={tipItem} labelFormatter={v => timeLabel(Number(v), period, true)} formatter={(value, name) => [String(value) + " hír", name]} />
        {chart.categories.map((c, i) => <Line key={c} dataKey={`v${i}`} name={c} stroke={colors[i % colors.length]} strokeWidth={2} dot={chart.points.length === 1} isAnimationActive={false} />)}
      </LineChart>
    </ResponsiveContainer></div>
    <div className={styles.legend}>{chart.categories.map((c,i)=><button type="button" key={c} onClick={()=>onCategory?.(c)}><i style={{background:colors[i % colors.length]}} />{c}</button>)}</div>
    <p className={styles.caption}>Legfeljebb 6 legaktívabb kategória · Budapest</p>
  </>;
}

export function ClickbaitChart({ data, onSource }: { data: ReturnType<typeof clickbaitRows>; onSource?: (source:string)=>void }) {
  return <>
    <div className={styles.chart}><ResponsiveContainer width="100%" height="100%">
      <BarChart data={data.slice(0,8)} layout="vertical" margin={{right:12}}>
        <XAxis type="number" domain={[0,100]} tick={tick} />
        <YAxis dataKey="name" type="category" width={80} tick={tick} />
        <Tooltip cursor={false} contentStyle={tip} labelStyle={tipLabel} itemStyle={tipItem} formatter={(value, name, item) => [`${Number(value).toFixed(1)} / 100 · ${item.payload.articles} cikk`, name]} />
        <Bar barSize={16} dataKey="score" name="Clickbait pontszám" radius={[0,4,4,0]} isAnimationActive={false}>
          {data.slice(0,8).map(r=><Cell key={r.name} fill={r.score>=60?"#ff4d57":r.score>=45?"#ff7a32":"#348aff"} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer></div>
    <details><summary>Források és mintanagyság ({data.length})</summary><ul className={styles.scrollList}>{data.map(r=><li key={r.name}><button type="button" onClick={()=>onSource?.(r.name)}>{r.name}</button>: {r.score.toFixed(1)} / 100 · {r.articles} cikk</li>)}</ul></details>
  </>;
}

export function SentimentDonut({ data }: { data: ReturnType<typeof sentimentCounts> }) {
  const labels=["Pozitív","Semleges","Negatív"], palette=["#1dd78a","#98b9e9","#ff4d57"];
  return <>
    <div className={styles.donutRow}><div className={styles.donut}>
      <ResponsiveContainer width="100%" height="100%"><PieChart>
        <Pie data={data.values.map((value,i)=>({value,name:labels[i]}))} dataKey="value" innerRadius="65%" outerRadius="95%" stroke="none" isAnimationActive={false}>
          {palette.map(c=><Cell key={c} fill={c} />)}
        </Pie><Tooltip cursor={false} contentStyle={tip} labelStyle={tipLabel} itemStyle={tipItem} />
      </PieChart></ResponsiveContainer>
      <div className={styles.donutLabel}><span>Átlag</span><strong>{data.average?.toFixed(2) ?? "—"}</strong></div>
    </div><div className={styles.donutLegend}>{labels.map((label,i)=><div key={label}><i style={{background:palette[i]}} />{label}<strong>{data.total ? (data.values[i]/data.total*100).toFixed(0):"—"}%</strong></div>)}</div></div>
    <p className={styles.caption}>{data.total} elemzett cikk alapján</p>
  </>;
}

export function ActivityHeatmap({ chart, period }: { chart: Series; period: string }) {
  const max=Math.max(1,...chart.points.flatMap(p=>chart.categories.map((_,i)=>Number(p[`v${i}`])||0)));
  return <><div className={styles.heatmap}>
    {chart.categories.map((category,i)=><div className={styles.heatRow} key={category}><span>{category}</span><div style={{gridTemplateColumns:`repeat(${chart.points.length}, minmax(8px,1fr))`}}>
      {chart.points.map(p=><i key={p.time} tabIndex={0} role="img" aria-label={`${category}, ${timeLabel(p.time,period,true)}: ${p[`v${i}`]} hír`} title={`${category} · ${timeLabel(p.time,period,true)} · ${p[`v${i}`]} hír`} style={{background:p[`v${i}`] ? `rgba(0,153,255,${.25+.75*p[`v${i}`]/max})`:"#122b47"}} />)}
    </div></div>)}
    <div className={styles.heatTicks}><span>{chart.points[0] && timeLabel(chart.points[0].time,period)}</span><span>{chart.points.length>1 && timeLabel(chart.points[chart.points.length-1].time,period)}</span></div>
  </div><div className={styles.heatScale} aria-label={`Aktivitási színskála: nulla és ${max} hír között`}><span>0 hír</span><i /><i /><i /><i /><i /><span>{max} hír</span></div><p className={styles.caption}>{period==="24h"||period==="today"?"Budapesti helyi idő, óránként":"Budapesti naponként"} · a sötét cella nulla megfigyelt hírt jelent; teljesen hiányzó adatsor helyett külön üres állapot jelenik meg</p></>;
}

export function CategorySentimentChart({ data }: { data: ReturnType<typeof categorySentiments> }) {
  return <div className={styles.ratios}>{data.map(c=><div key={c.category} tabIndex={0} title={`Pozitív: ${c.values[0]}, semleges: ${c.values[1]}, negatív: ${c.values[2]}; összesen ${c.total} cikk`}>
    <span>{c.category}</span><meter min={0} max={100} value={c.ratio} aria-label={`${c.category}: negatív arány, ${c.total} elemzett cikk`} /><strong>{c.ratio.toFixed(0)}%</strong>
  </div>)}</div>;
}

export function SentimentTimelineChart({ data, period }: { data: ReturnType<typeof sentimentSeries>; period: string }) {
  return <><div className={styles.chart}><ResponsiveContainer width="100%" height="100%">
    <LineChart data={data}><CartesianGrid stroke="#183653" strokeDasharray="3 4" />
      <XAxis dataKey="time" tickFormatter={v=>timeLabel(Number(v),period)} tick={tick} minTickGap={32} />
      <YAxis width={32} domain={[-1,1]} ticks={[-1,-.5,0,.5,1]} tick={tick} />
      <ReferenceLine y={0} stroke="#91bde9" strokeDasharray="4 4" />
      <Tooltip cursor={false} contentStyle={tip} labelStyle={tipLabel} itemStyle={tipItem} labelFormatter={v=>timeLabel(Number(v),period,true)} formatter={(value,name,item)=>[value==null?"Nincs mérés":`${Number(value).toFixed(2)} · ${item.payload.total} cikk`,name]} />
      <Line dataKey="score" name="Átlagos hangulat" stroke="#1dd78a" strokeWidth={2} dot={data.length===1} connectNulls={false} isAnimationActive={false} />
    </LineChart>
  </ResponsiveContainer></div><p className={styles.caption}>−1 negatív · 0 semleges · +1 pozitív · Budapest</p></>;
}
