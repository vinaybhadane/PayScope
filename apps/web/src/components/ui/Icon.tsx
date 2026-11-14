import type { CSSProperties } from "react";
const paths: Record<string, string> = {
  arrow: "M4 12h16m-6-6 6 6-6 6",
  chevron: "m9 5 7 7-7 7",
  down: "m6 9 6 6 6-6",
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  repeat:
    "m17 2 4 4-4 4M3 11V8a2 2 0 0 1 2-2h16M7 22l-4-4 4-4m14-1v3a2 2 0 0 1-2 2H3",
  spark:
    "m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4ZM20 2v4m-2-2h4",
  chart: "M4 3v18h17M8 16v-4m5 4V8m5 8V5",
  wallet:
    "M20 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h15V8H5a3 3 0 0 1 0-6m15 10h-5v5h5m-3-2.5h.01",
  shield: "M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7l-9-4Zm-4 9 3 3 5-6",
  upload: "M12 16V3m-5 5 5-5 5 5M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4",
  search: "M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Zm5.5-2 5 5",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4",
  close: "m6 6 12 12M6 18 18 6",
  menu: "M4 6h16M4 12h16M4 18h16",
  check: "m5 12 4 4L19 6",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  clock: "M12 8v5l3 2m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  lock: "M6 10V7a6 6 0 0 1 12 0v3M4 10h16v12H4zM12 14v4",
  file: "M14 2H5v20h14V7l-5-5Zm0 0v6h5M8 13h8m-8 4h5",
  globe:
    "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z",
  trend: "m3 17 6-6 4 4 8-11m-6 0h6v6",
  exit: "M9 4H3v16h6m5-13 5 5-5 5m-7-5h14",
  help: "M9 8a3 3 0 0 1 6 0c0 3-3 2-3 5m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  network:
    "M12 6v3M5 17l5-6m9 6-5-6M9 3a3 3 0 1 0 6 0 3 3 0 0 0-6 0ZM2 20a3 3 0 1 0 6 0 3 3 0 0 0-6 0Zm14 0a3 3 0 1 0 6 0 3 3 0 0 0-6 0Z",
  card: "M3 4h18v16H3zM3 9h18M7 15h4",
  settings:
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2",
  play: "m9 5 11 7-11 7V5Z",
  download: "M12 3v13m-5-5 5 5 5-5M4 18v3h16v-3",
  calendar: "M4 5h16v16H4zM8 2v6m8-6v6M4 10h16",
};
export function Icon({
  name,
  size = 20,
  className = "",
  style,
}: {
  name: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path d={paths[name] || paths.spark} />
    </svg>
  );
}
