import { useId } from "react";

// Draws the Connected C mark: a green arc with two nodes.
export function ChaeMark({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  const stroke = `${id}-stroke`;

  return (
    <svg className={className} viewBox="0 0 160 160" fill="none" aria-hidden="true">
      <path
        d="M 124 30 A 62 62 0 1 0 124 130"
        fill="none"
        stroke={`url(#${stroke})`}
        strokeWidth="31"
        strokeLinecap="round"
      />
      <circle cx="124" cy="30" r="24" fill="#27d393" />
      <circle cx="124" cy="130" r="24" fill="#006b4d" />
      <defs>
        <linearGradient id={stroke} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#25d98d" />
          <stop offset="55%" stopColor="#08bd82" />
          <stop offset="100%" stopColor="#006b4d" />
        </linearGradient>
      </defs>
    </svg>
  );
}
