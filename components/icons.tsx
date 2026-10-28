import { useId } from "react";
import type { Channel } from "@/lib/demo-data";

type IconProps = {
  className?: string;
};

export function ChannelIcon({
  channel,
  className,
}: {
  channel: Channel;
  className?: string;
}) {
  if (channel === "whatsapp") return <WhatsAppIcon className={className} />;
  if (channel === "instagram") return <InstagramIcon className={className} />;
  return <EmailIcon className={className} />;
}

export function WhatsAppIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#25D366" />
      <path
        fill="#ffffff"
        d="M12.04 6.3a5.55 5.55 0 0 0-4.72 8.4l-.62 2.26 2.32-.61a5.55 5.55 0 1 0 3.02-10.05Zm3.15 7.85c-.13.36-.75.69-1.05.73-.27.04-.61.06-1.86-.4-1.56-.68-2.56-2.3-2.64-2.4-.08-.11-.66-.88-.66-1.68 0-.8.42-1.19.57-1.35.15-.16.33-.2.44-.2h.32c.1 0 .24-.04.37.28.14.33.47 1.14.51 1.22.04.08.07.18.01.29l-.23.28c-.08.08-.16.17-.07.33.09.16.4.66.86 1.07.59.52 1.09.69 1.25.76.16.08.25.07.34-.04l.35-.4c.1-.11.2-.09.34-.05.14.04 1.05.5 1.23.59.18.09.3.13.34.21.04.07.04.43-.09.79Z"
      />
    </svg>
  );
}

export function InstagramIcon({ className }: IconProps) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="24" x2="24" y2="0">
          <stop offset="0%" stopColor="#FEDA77" />
          <stop offset="28%" stopColor="#F58529" />
          <stop offset="62%" stopColor="#DD2A7B" />
          <stop offset="100%" stopColor="#8134AF" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="12" fill={`url(#${id})`} />
      <rect
        x="7"
        y="7"
        width="10"
        height="10"
        rx="3"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.5"
      />
      <circle
        cx="12"
        cy="12"
        r="2.3"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.5"
      />
      <circle cx="15.7" cy="8.4" r="0.8" fill="#ffffff" />
    </svg>
  );
}

export function EmailIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#E7EEFF" />
      <rect
        x="5.2"
        y="7.2"
        width="13.6"
        height="9.6"
        rx="2"
        fill="none"
        stroke="#4F6FE8"
        strokeWidth="1.6"
      />
      <path
        d="M5.6 8.4 12 12.5l6.4-4.1"
        fill="none"
        stroke="#4F6FE8"
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SparklesIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path
        fill="#6C4CE0"
        d="M13 2.2 15.3 9.4 22.4 11.6 15.3 13.8 13 21 10.7 13.8 3.6 11.6 10.7 9.4 13 2.2Z"
      />
      <path
        fill="#8B6CF0"
        d="M23.6 16.2 25 20.2 29 21.6 25 23 23.6 27 22.2 23 18.2 21.6 22.2 20.2 23.6 16.2Z"
      />
    </svg>
  );
}

export function ArrowIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function SlidersIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4 8h16M4 16h16" />
      <circle cx="9" cy="8" r="2.1" fill="white" />
      <circle cx="15" cy="16" r="2.1" fill="white" />
    </svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 12.5 4.2 4.2L19 7.2" />
    </svg>
  );
}

export function ChevronLeftIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14.5 5.5 8 12l6.5 6.5" />
    </svg>
  );
}

export function BellIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6.2 16.4h11.6c-.7-1.1-1.4-2.3-1.4-4.4V10a4.4 4.4 0 0 0-8.8 0v2c0 2.1-.7 3.3-1.4 4.4Z" />
      <path d="M10 16.6a2 2 0 0 0 4 0" strokeLinecap="round" />
    </svg>
  );
}

export function MenuIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M5 7h14M5 12h14M5 17h14" />
    </svg>
  );
}

export function InboxNavIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <path
        d="M5.2 6.4h13.6A2.2 2.2 0 0 1 21 8.6v7a2.2 2.2 0 0 1-2.2 2.2H10l-3.7 2.5v-2.5H5.2A2.2 2.2 0 0 1 3 15.6v-7a2.2 2.2 0 0 1 2.2-2.2Z"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BuyersNavIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="9" cy="8.6" r="2.3" />
      <circle cx="16" cy="9.3" r="1.8" />
      <path d="M4.7 18.2c.5-2.5 2.4-3.9 4.3-3.9s3.8 1.4 4.3 3.9" />
      <path d="M13.3 14.8c.8-.5 1.7-.8 2.7-.7 1.5.1 2.7 1.1 3.2 3.1" />
    </svg>
  );
}

export function AnalyticsNavIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <rect x="4" y="12" width="3.5" height="7" rx="1.2" fill="currentColor" />
      <rect x="10.25" y="5" width="3.5" height="14" rx="1.2" fill="currentColor" />
      <rect x="16.5" y="9" width="3.5" height="10" rx="1.2" fill="currentColor" />
    </svg>
  );
}

export function SettingsNavIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.6v2.1M12 18.3v2.1M3.6 12h2.1M18.3 12h2.1M6.1 6.1l1.5 1.5M16.4 16.4l1.5 1.5M17.9 6.1l-1.5 1.5M7.6 16.4l-1.5 1.5" strokeLinecap="round" />
    </svg>
  );
}
