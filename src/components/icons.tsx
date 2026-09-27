/** Small line icons for the homepage. Hand-drawn to match the brand, not a library. */
interface IconProps { className?: string }

const base = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };

export function WifiOffIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 8.5a12 12 0 0 1 16 0" />
      <path d="M7 12a8 8 0 0 1 10 0" />
      <path d="M10 15.5a4 4 0 0 1 4 0" />
      <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
      <path d="M3 3l18 18" />
    </svg>
  );
}

export function GlobeIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.4 2.6 3.8 5.8 3.8 9s-1.4 6.4-3.8 9c-2.4-2.6-3.8-5.8-3.8-9s1.4-6.4 3.8-9z" />
    </svg>
  );
}

export function ShieldCheckIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3l7 3v6c0 5-3.2 7.9-7 9-3.8-1.1-7-4-7-9V6l7-3z" />
      <path d="M9 12.2l2 2 4-4.4" />
    </svg>
  );
}

export function PinIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

export function PinCheckIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z" />
      <path d="M9 9.3l2 2 3-3.4" />
    </svg>
  );
}

export function BagIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M8 7l1.3-2.6a2 2 0 0 1 1.8-1.1h1.8a2 2 0 0 1 1.8 1.1L16 7" />
      <path d="M6 7h12l-1.1 12.1A3 3 0 0 1 13.9 22h-3.8a3 3 0 0 1-3-2.9L6 7z" />
      <path d="M9.5 11v5M12 11v5M14.5 11v5" />
    </svg>
  );
}

export function KeyIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="8" cy="15" r="4" />
      <path d="M11 12l7.5-7.5" />
      <path d="M15.5 7.5l2 2" />
      <path d="M17.5 5.5l2 2" />
    </svg>
  );
}

export function CheckCircleIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5L16 9.5" />
    </svg>
  );
}
