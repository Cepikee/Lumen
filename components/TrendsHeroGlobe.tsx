"use client";

import Image from "next/image";
import { useState } from "react";
import styles from "./TrendsDashboard.module.css";

// Coarse geographic silhouettes, projected onto a sphere rather than a flat pattern.
const land = [
  [[-17,36],[10,37],[35,31],[51,11],[40,-12],[19,-35],[10,-24],[-1,5],[-17,15]],
  [[-10,36],[-9,58],[10,71],[33,70],[44,48],[29,38],[18,43],[5,43]],
  [[30,72],[80,76],[140,60],[160,48],[130,18],[105,-5],[70,10],[44,32]],
  [[-80,12],[-55,7],[-35,-8],[-50,-35],[-68,-55],[-77,-16]],
  [[-160,70],[-60,72],[-52,48],[-82,10],[-105,20],[-130,50]],
];
function inside(x: number, y: number, polygon: number[][]) {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]; const [xj, yj] = polygon[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) result = !result;
  }
  return result;
}
const dots: { x: number; y: number; z: number; land: boolean }[] = [];
for (let lat = -86; lat < 86; lat += 2.6) {
  for (let lon = -180; lon < 180; lon += 2.6 / Math.max(.2, Math.cos(lat * Math.PI / 180))) {
    const a = lat * Math.PI / 180, b = (lon - 16) * Math.PI / 180;
    const z = Math.cos(a) * Math.cos(b);
    if (z <= 0) continue;
    const x = Math.cos(a) * Math.sin(b), y = -Math.sin(a);
    dots.push({
      x: Number((310 + 119 * (x * .94 + y * .34)).toFixed(3)),
      y: Number((150 + 119 * (y * .94 - x * .34)).toFixed(3)),
      z: Number(z.toFixed(3)),
      land: land.some(p => inside(lon, lat, p)),
    });
  }
}
export default function TrendsHeroGlobe() {
  const [imageReady, setImageReady] = useState(false);
  return <div className={styles.globeScene} aria-hidden="true"><svg className={styles.globeArtwork} viewBox="0 0 620 270" style={{ opacity: imageReady ? 0 : 1 }}>
    <defs>
      <radialGradient id="trends-haze"><stop stopColor="#1467ff" stopOpacity=".36"/><stop offset="1" stopColor="#1467ff" stopOpacity="0"/></radialGradient>
      <radialGradient id="trends-earth" cx="30%" cy="20%"><stop stopColor="#103d8d"/><stop offset="1" stopColor="#030c20"/></radialGradient>
      <linearGradient id="trends-orbit"><stop stopColor="#008cff" stopOpacity=".08"/><stop offset=".5" stopColor="#238cff" stopOpacity=".7"/><stop offset="1" stopColor="#9548ff" stopOpacity=".4"/></linearGradient>
      <filter id="trends-node-glow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <ellipse cx="310" cy="150" rx="290" ry="160" fill="url(#trends-haze)"/>
    {Array.from({length: 65}, (_, i) => <circle key={i} cx={(i * 137.5) % 610} cy={(i * 47.3) % 265} r={i % 4 === 0 ? 1.1 : .6} fill="#1b8fff" opacity=".5"/>)}
    <circle cx="310" cy="150" r="120" fill="url(#trends-earth)" stroke="#167eff" strokeOpacity=".45"/>
    <g id="trends-land-dots">{dots.map((d,i) => <circle key={i} cx={d.x} cy={d.y} r={d.land ? .75 + d.z * .55 : .5} fill={d.land ? (d.x > 325 ? '#9152ff' : '#20a9ff') : '#16388c'} opacity={d.land ? .55 + d.z * .45 : .5}/>)}</g>
    <g fill="none" stroke="url(#trends-orbit)" strokeWidth=".65">
      {[[-22,278,79],[-30,240,90],[-40,205,106],[-14,260,64],[18,225,100],[55,155,112]].map(([angle,rx,ry],i)=><ellipse key={i} cx="310" cy="150" rx={rx} ry={ry} transform={`rotate(${angle} 310 150)`}/>)}
    </g>
    <g filter="url(#trends-node-glow)">{[[88,165],[174,76],[235,38],[424,60],[503,113],[410,203],[316,244],[126,220]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r={i%3===0?3.2:2} fill={i%2?'#845dff':'#20d6ff'}/>)}</g>
  </svg><Image src="/trends-reference-globe.png" unoptimized width={520} height={118}
    className={styles.globeReferenceArtwork} alt="" style={{ opacity: imageReady ? 1 : 0, height: "auto" }}
    onLoad={() => setImageReady(true)} onError={() => setImageReady(false)} /></div>;
}
