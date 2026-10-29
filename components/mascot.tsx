export function Mascot({
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className={`mcw-mascot ${className ?? ""}`}
      aria-hidden="true"
    >
      <path
        d="M14 6h36c6.6 0 12 5.4 12 12v18c0 6.6-5.4 12-12 12H30l-11 9v-9h-5C7.4 48 2 42.6 2 36V18C2 11.4 7.4 6 14 6Z"
        fill="#6C4CE0"
      />
      <g className="mcw-eye">
        <ellipse cx="24" cy="24" rx="3.2" ry="4.2" fill="#FFFFFF" />
        <ellipse cx="40" cy="24" rx="3.2" ry="4.2" fill="#FFFFFF" />
      </g>
      <circle cx="17" cy="32" r="2" fill="#FFFFFF" opacity="0.35" />
      <circle cx="47" cy="32" r="2" fill="#FFFFFF" opacity="0.35" />
      <path
        d="M26 33c3 3 9 3 12 0"
        stroke="#FFFFFF"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
