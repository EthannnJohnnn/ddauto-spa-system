const paths = {
  dashboard: [
    <rect key="a" height="7" rx="2" width="7" x="3" y="3" />,
    <rect key="b" height="7" rx="2" width="7" x="14" y="3" />,
    <rect key="c" height="7" rx="2" width="7" x="3" y="14" />,
    <rect key="d" height="7" rx="2" width="7" x="14" y="14" />,
  ],
  services: [
    <path key="a" d="M4 14a8 8 0 1 1 16 0" />,
    <path key="b" d="M8 14a4 4 0 0 1 8 0" />,
    <path key="c" d="M12 14v7" />,
  ],
  tires: [
    <circle key="a" cx="12" cy="12" r="9" />,
    <circle key="b" cx="12" cy="12" r="3" />,
    <path
      key="c"
      d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1m0-12.8-2.1 2.1m-8.6 8.6-2.1 2.1"
    />,
  ],
  canteen: [
    <path key="a" d="M7 4h10l-1 17H8L7 4Z" />,
    <path key="b" d="M6 8h12" />,
    <path key="c" d="m10 4 1-2h4" />,
  ],
  equipment: [
    <path
      key="a"
      d="m14.7 6.3 3-3a4 4 0 0 1-5.1 5.1l-7.2 7.2a2 2 0 0 0 2.8 2.8l7.2-7.2a4 4 0 0 1 5.1-5.1l-3 3"
    />,
  ],
  expenses: [
    <path key="a" d="M3 6h18v14H3z" />,
    <path key="b" d="M16 13h5" />,
    <path key="c" d="M3 9h18" />,
  ],
  payroll: [
    <path key="a" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />,
    <circle key="b" cx="9" cy="7" r="4" />,
    <path key="c" d="M19 8v6m3-3h-6" />,
  ],
  reports: [<path key="a" d="M4 20V10m6 10V4m6 16v-7m4 7H2" />],
  close: [<circle key="a" cx="12" cy="12" r="9" />, <path key="b" d="m8 12 2.5 2.5L16 9" />],
  settings: [
    <circle key="a" cx="12" cy="12" r="3" />,
    <path
      key="b"
      d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"
    />,
  ],
  menu: [<path key="a" d="M4 7h16M4 12h16M4 17h16" />],
  logout: [
    <path key="a" d="M10 17l5-5-5-5m5 5H3" />,
    <path key="b" d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" />,
  ],
  arrow: [<path key="a" d="m9 18 6-6-6-6" />],
  trend: [<path key="a" d="m3 17 6-6 4 4 8-8m-5 0h5v5" />],
  check: [<path key="a" d="m5 12 4 4L19 6" />],
  peso: [<path key="a" d="M7 21V3h6a5 5 0 0 1 0 10H7" />, <path key="b" d="M5 7h10M5 10h10" />],
};

export function AppIcon({ name, className = 'h-5 w-5' }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      {paths[name] ?? paths.dashboard}
    </svg>
  );
}
