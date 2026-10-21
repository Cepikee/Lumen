const paths: Record<string, string> = {
  '⌂': 'M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9',
  '⌘': 'M4 19V9m5 10V5m5 14v-7m5 7V3',
  '◎': 'M12 3 20 7v10l-8 4-8-4V7zM8 12l3 3 5-6',
  '⌁': 'm3 17 6-6 4 3 8-10m-6 0h6v6',
  '△': 'M7 3h7l5 5v13H5V3h2m7 0v6h5M9 13h6m-6 4h6',
  '▧': 'M7 3h7l5 5v13H5V3h2m3 8h4m-4 4h6m-6 3h6',
  '♧': 'M8 21H3v-4a4 4 0 0 1 4-4m10 8h4v-4a4 4 0 0 0-4-4M8 21v-4a4 4 0 0 1 8 0v4M9 7a3 3 0 1 0 6 0 3 3 0 0 0-6 0M3 7a2 2 0 0 1 4-2m10 0a2 2 0 0 1 4 2',
  '✉': 'M3 5h18v14H3zM3 6l9 7 9-7',
  '▤': 'M6 2h8l5 5v15H5V2h1m8 0v6h5M8 12h8m-8 4h8',
  '↗': 'M3 21v-5m6 5V11m6 10v-8m6 8V5M3 12l6-6 5 3 7-7m-6 0h6v6',
  'ϟ': 'm14 2-11 13h8l-1 7L21 9h-8z',
  search: 'M15 15l6 6M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
  calendar: 'M4 5h16v16H4zM4 10h16M8 2v6m8-6v6',
  bell: 'M5 17h14l-2-3V9a5 5 0 0 0-10 0v5zM10 21h4M12 2v2',
  chevron: 'm6 9 6 6 6-6',
  clock: 'M12 7v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  spark: 'm9 2 2 6 6 2-6 2-2 6-2-6-6-2 6-2zM19 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1z',
};

export default function TrendsIcon({ name }: { name: string }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] ?? paths['◎']} /></svg>;
}
