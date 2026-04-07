"use client";

interface CompassRoseProps {
  northDeg: number;
}

export default function CompassRose({ northDeg }: CompassRoseProps) {
  return (
    <div className="absolute top-[14px] right-[14px] w-[72px] h-[72px] z-10 pointer-events-none">
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r="32" fill="rgba(12,11,9,0.9)" stroke="rgba(200,175,120,0.28)" strokeWidth="1" />
        <g style={{ transformOrigin: "36px 36px", transform: `rotate(${-northDeg}deg)` }}>
          <line x1="36" y1="7" x2="36" y2="65" stroke="rgba(200,175,120,0.22)" strokeWidth="0.5" />
          <line x1="7" y1="36" x2="65" y2="36" stroke="rgba(200,175,120,0.22)" strokeWidth="0.5" />
          <line x1="14" y1="14" x2="58" y2="58" stroke="rgba(200,175,120,0.1)" strokeWidth="0.4" />
          <line x1="58" y1="14" x2="14" y2="58" stroke="rgba(200,175,120,0.1)" strokeWidth="0.4" />
          <polygon points="36,8 32.5,22 39.5,22" fill="var(--gold)" opacity="0.9" />
          <polygon points="36,64 32.5,50 39.5,50" fill="rgba(112,96,80,0.5)" />
          <circle cx="36" cy="36" r="3" fill="var(--gold)" />
          <text x="36" y="5.5" textAnchor="middle" fill="var(--gold-2)" fontSize="8" fontWeight="600" fontFamily="monospace">N</text>
          <text x="36" y="70" textAnchor="middle" fill="rgba(112,96,80,0.8)" fontSize="7" fontFamily="monospace">S</text>
          <text x="68" y="39" textAnchor="middle" fill="rgba(112,96,80,0.8)" fontSize="7" fontFamily="monospace">E</text>
          <text x="4"  y="39" textAnchor="middle" fill="rgba(112,96,80,0.8)" fontSize="7" fontFamily="monospace">W</text>
        </g>
      </svg>
    </div>
  );
}
