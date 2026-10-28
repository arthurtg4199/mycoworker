import { useId } from "react";

export function Mascot({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const hair = `${uid}-hair`;
  const sleeve = `${uid}-sleeve`;

  return (
    <svg
      viewBox={compact ? "12 14 112 112" : "0 0 160 160"}
      className={`mcw-mascot ${className ?? ""}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={hair} x1="68" y1="24" x2="68" y2="120" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#DDD2FF" />
          <stop offset="55%" stopColor="#C0AEFB" />
          <stop offset="100%" stopColor="#8E74EE" />
        </linearGradient>
        <linearGradient id={sleeve} x1="70" y1="104" x2="70" y2="152" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#D5C8FF" />
          <stop offset="100%" stopColor="#8D72EA" />
        </linearGradient>
      </defs>

      <path
        d="M30 124c0-20 16-32 38-34 22 2 38 14 38 34 0 12-16 20-38 20s-38-8-38-20Z"
        fill={`url(#${sleeve})`}
      />
      <path d="M52 116c0-10 6-16 16-16s16 6 16 16v8H52Z" fill="#F4F0FF" />

      <path
        d="M68 28c22 0 40 16 40 40 0 16-6 28-16 36H44c-10-8-16-20-16-36 0-24 18-40 40-40Z"
        fill={`url(#${hair})`}
      />
      <ellipse cx="68" cy="74" rx="25" ry="23" fill="#ffffff" />

      <path
        d="M32 70c0-24 16-40 36-40s36 16 36 40"
        fill="none"
        stroke="#9A84F2"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <ellipse cx="30" cy="72" rx="10" ry="12" fill="#B7A4F8" />
      <ellipse cx="30" cy="72" rx="5" ry="6.5" fill="#F7F3FF" />
      <ellipse cx="106" cy="72" rx="10" ry="12" fill="#B7A4F8" />
      <ellipse cx="106" cy="72" rx="5" ry="6.5" fill="#F7F3FF" />
      <path
        d="M106 84c4 14-6 22-18 22"
        fill="none"
        stroke="#8E74EE"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <circle cx="86" cy="106" r="4.2" fill="#6C4CE0" />

      <g className="mcw-eye">
        <ellipse cx="57" cy="72" rx="6" ry="7.2" fill="#ffffff" stroke="#5436C4" strokeWidth="1.5" />
        <circle className="mcw-pupil" cx="57.4" cy="73.2" r="2.5" fill="#2C2166" />
      </g>
      <g className="mcw-eye">
        <ellipse cx="79" cy="72" rx="6" ry="7.2" fill="#ffffff" stroke="#5436C4" strokeWidth="1.5" />
        <circle className="mcw-pupil" cx="79.4" cy="73.2" r="2.5" fill="#2C2166" />
      </g>
      <path
        d="M58 86c3.2 5 6.6 7 10 7s6.8-2 10-7"
        fill="none"
        stroke="#5436C4"
        strokeWidth="2.3"
        strokeLinecap="round"
      />

      <g>
        <rect x="114" y="98" width="42" height="24" rx="11" fill="#E6DEFF" />
        <circle className="mcw-dot" cx="128" cy="110" r="2.2" fill="#6C4CE0" />
        <circle className="mcw-dot" cx="135" cy="110" r="2.2" fill="#6C4CE0" />
        <circle className="mcw-dot" cx="142" cy="110" r="2.2" fill="#6C4CE0" />
      </g>
    </svg>
  );
}
