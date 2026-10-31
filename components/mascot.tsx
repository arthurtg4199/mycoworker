const sizeClass = {
  hero: "h-28 w-28",
  fab: "h-8 w-8",
  empty: "h-16 w-16",
  inline: "h-10 w-10",
} as const;

type MascotSize = keyof typeof sizeClass;

export function Mascot({
  size = "inline",
  className,
}: {
  size?: MascotSize;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className={`mcw-mascot ${sizeClass[size]} ${className ?? ""}`}
      aria-hidden="true"
    >
      <path
        d="M14 6h36c6.6 0 12 5.4 12 12v18c0 6.6-5.4 12-12 12H30l-11 9v-9h-5C7.4 48 2 42.6 2 36V18C2 11.4 7.4 6 14 6Z"
        fill="#6C4CE0"
      />
      <g className="mcw-gaze">
        <g className="mcw-eye">
          <ellipse cx="23.5" cy="23" rx="4.6" ry="5.6" fill="#FFFFFF" />
          <ellipse
            className="mcw-pupil"
            cx="23.5"
            cy="23.7"
            rx="1.75"
            ry="2.2"
            fill="#2C2166"
          />
        </g>
      </g>
      <g className="mcw-gaze">
        <g className="mcw-eye">
          <ellipse cx="40.5" cy="23" rx="4.6" ry="5.6" fill="#FFFFFF" />
          <ellipse
            className="mcw-pupil"
            cx="40.5"
            cy="23.7"
            rx="1.75"
            ry="2.2"
            fill="#2C2166"
          />
        </g>
      </g>
      <circle cx="16" cy="33" r="1.8" fill="#FFFFFF" opacity="0.35" />
      <circle cx="48" cy="33" r="1.8" fill="#FFFFFF" opacity="0.35" />
      <path
        d="M26 34.2c3 2.6 9 2.6 12 0"
        stroke="#FFFFFF"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
