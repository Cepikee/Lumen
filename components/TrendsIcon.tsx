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
  'source-users': 'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M17 4a4 4 0 0 1 0 8M20 21v-2a4 4 0 0 0-3-3.87',
  categories: 'M4 5h7v7H4zM14 5h6v6h-6zM4 15h7v6H4zM14 15h6v6h-6z',
  sort: 'M7 3v18m-4-4 4 4 4-4M17 21V3m-4 4 4-4 4 4',
  'category-politika': 'M5 21V8l7-4 7 4v13M3 21h18M8 12h8M8 16h8M12 4v17',
  'category-sport': 'M7 3c8 5 10 10 10 18M4 9l16 5M4 18l16-9M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20',
  'category-gazdasag': 'M3 20h18M5 16v-5h3v5M11 16V5h3v11M17 16V9h3v7M4 4l4-2 4 3 5-2 4 2',
  'category-tech': 'M8 3h8a5 5 0 0 1 5 5v8a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8a5 5 0 0 1 5-5M9 9h6v6H9zM12 1v2M12 21v2M1 12h2M21 12h2',
  'category-kultura': 'M3 6h18v15H3zM3 6l3-3h12l3 3M8 14l3 3 5-6',
  'category-egeszseg': 'M12 21C2 15 1 9 5 6c3-3 6-1 7 1 1-2 4-4 7-1 4 3 3 9-7 15M12 10v7M9 13h6',
  'category-oktatas': 'M2 9l10-5 10 5-10 5-10-5M6 12v6c4 3 8 3 12 0v-6M22 9v8',
  'category-kozelet': 'M4 20V8l8-5 8 5v12M2 20h20M9 11h6M9 15h6M12 3v17',
  'category-other': 'M12 2l2 7 7 3-7 2-2 8-2-8-8-2 8-3 2-7',

  search: 'M15 15l6 6M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
  calendar: 'M4 5h16v16H4zM4 10h16M8 2v6m8-6v6',
  bell: 'M5 17h14l-2-3V9a5 5 0 0 0-10 0v5zM10 21h4M12 2v2',
  chevron: 'm6 9 6 6 6-6',
  clock: 'M12 7v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  spark: 'm9 2 2 6 6 2-6 2-2 6-2-6-6-2 6-2zM19 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1z',
  filter: 'M4 5h16M7 12h10M10 19h4',
};

export default function TrendsIcon({ name }: { name: string }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] ?? paths['◎']} /></svg>;
}
