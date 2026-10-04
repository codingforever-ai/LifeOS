const P = {
  today: 'M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4M12 8a4 4 0 100 8 4 4 0 000-8z',
  tasks: 'M9 6h11M9 12h11M9 18h11M3.5 6l1.2 1.2L7 4.8M3.5 12l1.2 1.2L7 10.8M3.5 18l1.2 1.2L7 16.8',
  calendar: 'M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z',
  goals: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 16.5a4.5 4.5 0 100-9 4.5 4.5 0 000 9zM12 12.01V12',
  projects: 'M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5',
  focus: 'M12 7v5l3 2M12 21a9 9 0 100-18 9 9 0 000 18z',
  progress: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  agent: 'M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3zM18.5 15l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2z',
  capture: 'M12 5v14M5 12h14',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-4-4',
  domains: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM17 14v6M14 17h6',
  settings: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 4v6M9 14v6',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  plus: 'M12 5v14M5 12h14',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  'chevron-right': 'M9 6l6 6-6 6',
  'chevron-left': 'M15 6l-6 6 6 6',
  'chevron-down': 'M6 9l6 6 6-6',
  close: 'M6 6l12 12M18 6L6 18',
  clock: 'M12 7v5l3 2M12 21a9 9 0 100-18 9 9 0 000 18z',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
  send: 'M5 12l14-7-5 14-2.5-5.5L5 12z',
  pause: 'M8 5v14M16 5v14',
  play: 'M7 5l12 7-12 7V5z',
  link: 'M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1',
  image: 'M5 4h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1zM4 16l5-5 4 4 2-2 5 5M9 9h.01',
  doc: 'M7 3h7l5 5v12a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1zM14 3v5h5M9 13h6M9 17h6',
  mic: 'M12 15a3 3 0 003-3V6a3 3 0 00-6 0v6a3 3 0 003 3zM6 11a6 6 0 0012 0M12 17v4',
  note: 'M5 4h14v12l-5 5H5V4zM14 21v-5h5M8 9h8M8 13h4',
  idea: 'M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z',
  bell: 'M6 16V11a6 6 0 0112 0v5l2 2H4l2-2zM10 21h4',
  lock: 'M6 11h12v9H6zM8 11V8a4 4 0 018 0v3',
  plug: 'M9 3v5M15 3v5M6 8h12v3a6 6 0 01-12 0V8zM12 17v4',
  database: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
  sliders: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 4v6M9 14v6',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0',
  palette: 'M12 3a9 9 0 100 18c1.2 0 2-.8 2-1.8 0-.5-.2-.9-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1 .8-1.6 1.8-1.6H17a4 4 0 004-4c0-4.5-4-8-9-8zM7.5 11h.01M10 7.5h.01M14.5 7.5h.01',
  filter: 'M4 5h16l-6 8v6l-4-2v-4L4 5z',
  sort: 'M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3',
  book: 'M5 4h10a3 3 0 013 3v13H8a3 3 0 01-3-3V4zM5 17a3 3 0 013-3h10',
  briefcase: 'M4 8h16v11H4zM9 8V5h6v3M4 13h16',
  leaf: 'M5 19c0-9 5-14 15-14 0 10-5 15-14 15M5 19c2-4 5-7 9-9',
  apple: 'M12 8c-2-1.5-6-1-6 4 0 4 2.5 8 4.5 8 1 0 1-.5 1.5-.5s.5.5 1.5.5c2 0 4.5-4 4.5-8 0-5-4-5.5-6-4zM12 8c0-2 1-3.5 3-4',
  dumbbell: 'M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12',
  wallet: 'M4 7a2 2 0 012-2h12v4M4 7v11a2 2 0 002 2h14V9H6a2 2 0 01-2-2zM16.5 14.5h.01',
  graduation: 'M2 9l10-5 10 5-10 5L2 9zM6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5',
  sparkle: 'M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6z',
  home: 'M4 11l8-7 8 7M6 10v10h12V10M10 20v-6h4v6',
  plane: 'M10 14L3 11l1-2 8 1 5-6 2 1-3 8 4 2-1 2-7-2-3 5-2-1 1-5z',
  users: 'M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2 20a7 7 0 0114 0M16 4.5a3.5 3.5 0 010 6.5M18 14a6 6 0 013 6',
  building: 'M5 21V4h9v17M14 9h5v12M9 8h1M9 12h1M9 16h1M17 13h.01M17 17h.01M3 21h18',
  flask: 'M9 3h6M10 3v6L4.5 19a1.5 1.5 0 001.3 2h12.4a1.5 1.5 0 001.3-2L14 9V3M7.5 15h9',
  trend: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  alert: 'M12 8v5M12 16.5v.01M12 3l10 18H2L12 3z',
  info: 'M12 11v6M12 7.5v.01M12 21a9 9 0 100-18 9 9 0 000 18z',
  edit: 'M4 20h4L19 9l-4-4L4 16v4zM13 7l4 4',
  stop: 'M7 7h10v10H7z',
} as const;

export type IconName = keyof typeof P;

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={P[name]} />
    </svg>
  );
}

export const isIconName = (n: string): n is IconName => n in P;
