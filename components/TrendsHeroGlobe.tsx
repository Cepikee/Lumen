import styles from "./TrendsDashboard.module.css";

export default function TrendsHeroGlobe() {
  return (
    <div className={styles.globeScene} aria-hidden="true">
      <svg className={styles.globeArtwork} viewBox="0 0 620 190" role="presentation">
        <defs>
          <radialGradient id="trends-haze" cx="50%" cy="58%" r="58%">
            <stop offset="0" stopColor="#167dff" stopOpacity=".36" />
            <stop offset=".52" stopColor="#183aaf" stopOpacity=".14" />
            <stop offset="1" stopColor="#020b16" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="trends-globe" cx="36%" cy="25%" r="78%">
            <stop offset="0" stopColor="#26d9ff" stopOpacity=".92" />
            <stop offset=".25" stopColor="#116ee8" stopOpacity=".94" />
            <stop offset=".58" stopColor="#4424a8" stopOpacity=".88" />
            <stop offset="1" stopColor="#03122d" stopOpacity=".96" />
          </radialGradient>
          <linearGradient id="trends-orbit" x1="0" x2="1">
            <stop offset="0" stopColor="#176cff" stopOpacity="0" />
            <stop offset=".24" stopColor="#1dbaff" stopOpacity=".65" />
            <stop offset=".72" stopColor="#8957ff" stopOpacity=".72" />
            <stop offset="1" stopColor="#b83cff" stopOpacity="0" />
          </linearGradient>
          <pattern id="trends-dots" width="8" height="8" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.45" fill="#58ddff" />
          </pattern>
          <pattern id="trends-land-dots" width="6" height="6" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.55" fill="#c35cff" />
          </pattern>
          <clipPath id="trends-sphere-clip"><ellipse cx="315" cy="111" rx="105" ry="101" /></clipPath>
          <filter id="trends-glow"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>

        <ellipse cx="315" cy="115" rx="292" ry="105" fill="url(#trends-haze)" />
        <g className={styles.particleField}>
          {[[48,82],[73,131],[112,42],[149,104],[181,29],[455,35],[492,96],[539,49],[575,123],[524,153],[93,160],[417,159]].map(([cx, cy], index) => <circle key={index} cx={cx} cy={cy} r={index % 3 === 0 ? 2 : 1.2} />)}
        </g>

        <g fill="none" stroke="url(#trends-orbit)" strokeWidth="1.15">
          <ellipse cx="315" cy="105" rx="278" ry="67" transform="rotate(-8 315 105)" />
          <ellipse cx="315" cy="105" rx="230" ry="91" transform="rotate(11 315 105)" />
          <ellipse cx="315" cy="106" rx="166" ry="104" transform="rotate(-31 315 106)" />
          <ellipse cx="315" cy="105" rx="119" ry="111" transform="rotate(58 315 105)" opacity=".55" />
        </g>

        <ellipse cx="315" cy="111" rx="106" ry="102" fill="url(#trends-globe)" stroke="#2ab7ff" strokeOpacity=".62" />
        <g clipPath="url(#trends-sphere-clip)">
          <rect x="203" y="4" width="224" height="214" fill="url(#trends-dots)" opacity=".77" />
          <path d="M260 36l31-15 28 13 13 20 31 12 12 24-26 6-9 21-21 9-2 29-17 22-20-9-5-31-22-20-18-28 10-23z" fill="url(#trends-land-dots)" opacity=".96" />
          <path d="M356 121l22-7 22 16-4 24-19 25-17-9-10-23z" fill="url(#trends-land-dots)" opacity=".82" />
          <path d="M215 89h201M220 61h191M220 139h192M244 31c-18 47-16 111 3 154M277 13c-12 54-12 139 0 187M354 10c13 62 13 143 0 195M391 26c20 51 18 112-2 166" fill="none" stroke="#6d8cff" strokeOpacity=".22" strokeWidth=".8" />
        </g>

        <g className={styles.globeNodes} filter="url(#trends-glow)">
          <circle cx="82" cy="85" r="4"/><circle cx="150" cy="49" r="3"/><circle cx="208" cy="129" r="3.4"/><circle cx="252" cy="52" r="3.4"/><circle cx="331" cy="22" r="3.2"/><circle cx="410" cy="74" r="3.8"/><circle cx="479" cy="49" r="3.1"/><circle cx="543" cy="116" r="4"/>
        </g>
      </svg>
    </div>
  );
}
