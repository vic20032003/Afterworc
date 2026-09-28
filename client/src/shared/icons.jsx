/* Line icons (24×24, stroke = currentColor). */
const P = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  brief: 'M9 4h6a1 1 0 0 1 1 1v2H8V5a1 1 0 0 1 1-1zM4 7h16v13H4zM8 12h8M8 16h5',
  opp: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-3.5-3.5M8 11h6M11 8v6',
  deal: 'M4 7h16v12H4zM4 11h16M9 15h2M8 7V5h8v2',
  msg: 'M4 5h16v11H8l-4 4z',
  money: 'M3 6h18v13H3zM3 10h18M7 15h3',
  bell: 'M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-3.5-3.5',
  check: 'm5 12 4 4 10-10',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
  plus: 'M12 5v14M5 12h14',
  user: 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 21c1-4 4.5-6 8-6s7 2 8 6',
  team: 'M9 4.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM17 6.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM2.5 20c.8-3.5 3.5-5.5 6.5-5.5s5.7 2 6.5 5.5M15 14.5c2.8.2 5 2 5.8 5',
  task: 'M4 4h16v16H4zM8.5 12l2.5 2.5 4.5-5',
  dept: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18',
  shield: 'M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6zm-3.5 9 2.5 2.5 4.5-5',
  gear: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.8 1.2V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3.1 14H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 3.1V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 20.9 10H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  org: 'M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 9h4a1 1 0 0 1 1 1v11M8 8h3M8 12h3M8 16h3M3 21h18',
  help: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01',
  out: 'M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3',
  file: 'M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8zM14 3v5h5',
  spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6',
  lock: 'M5 11h14v10H5zM8 11V7a4 4 0 1 1 8 0v4',
  cal: 'M3 5h18v16H3zM3 10h18M8 3v4M16 3v4',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  back: 'M19 12H5M11 6l-6 6 6 6',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
  star: 'm12 3 2.8 5.8 6.2.9-4.5 4.4 1.1 6.2L12 17.4l-5.6 2.9 1.1-6.2L3 9.7l6.2-.9z',
  dl: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  send: 'M4 12 20 4l-6 16-3-7z',
  copy: 'M8 8h11v12H8zM5 16V4h11',
  pin: 'M9 4h6l-1 5 3 3v2H7v-2l3-3zM12 14v7',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  phone: 'M6 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 4 6a2 2 0 0 1 2-2z',
  video: 'M3 7h12v10H3zM15 10l6-3v10l-6-3',
  mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3',
  micoff: 'M3 3l18 18M9 9v3a3 3 0 0 0 5 2.2M15 10V6a3 3 0 0 0-5.8-1M5 11a7 7 0 0 0 11.5 5.4M19 11a7 7 0 0 1-.6 2.8M12 18v3',
  videooff: 'M3 3l18 18M15 11.5V7H8.5M3 7v10h12v-2M15 10l6-3v10l-3-1.5',
  hang: 'M3 14c5-5 13-5 18 0l-2.5 2.5-3-1.5v-2.5a10 10 0 0 0-7 0V15l-3 1.5z',
  x: 'M6 6l12 12M18 6 6 18',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 10.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15 9h.01',
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  up: 'M12 19V5M6 11l6-6 6 6',
  down: 'M12 5v14M6 13l6 6 6-6',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  merge: 'M6 3v6a6 6 0 0 0 6 6h6M18 21v-6M15 12l3 3 3-3M6 21V15'
};
export function Ic({ n, s = 18, w = 1.8, style }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}><path d={P[n] || ''} /></svg>;
}
export function SealIc({ s = 14 }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#2f9e4a" /><path d="m7 12.5 3.2 3.2L17 9" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
export function LogoMark({ s = 16 }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden="true"><path d="M18 7.5A7.5 7.5 0 1 0 18 16.5" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" /></svg>;
}
