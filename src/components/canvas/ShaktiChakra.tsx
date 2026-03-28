"use client";

import { VASTU_ZONES } from "@/lib/vastu/zones";
import { hexToRgba } from "@/lib/utils";

interface ShaktiChakraProps {
  cx: number;
  cy: number;
  northDeg: number;
  opacity?: number;
  visible?: boolean;
}

const R  = 250; // outer radius
const R1 = 50;  // inner ring (zone label inner boundary)

function toRad(deg: number) {
  return (deg - 90) * (Math.PI / 180);
}

function arcPath(
  cx: number, cy: number,
  innerR: number, outerR: number,
  startDeg: number, endDeg: number
) {
  const s = toRad(startDeg);
  const e = toRad(endDeg);
  const x1 = cx + outerR * Math.cos(s),  y1 = cy + outerR * Math.sin(s);
  const x2 = cx + outerR * Math.cos(e),  y2 = cy + outerR * Math.sin(e);
  const ix1 = cx + innerR * Math.cos(s), iy1 = cy + innerR * Math.sin(s);
  const ix2 = cx + innerR * Math.cos(e), iy2 = cy + innerR * Math.sin(e);
  return `M${ix1.toFixed(1)},${iy1.toFixed(1)} L${x1.toFixed(1)},${y1.toFixed(1)} A${outerR},${outerR} 0 0,1 ${x2.toFixed(1)},${y2.toFixed(1)} L${ix2.toFixed(1)},${iy2.toFixed(1)} A${innerR},${innerR} 0 0,0 ${ix1.toFixed(1)},${iy1.toFixed(1)} Z`;
}

const ELEM_COLORS: Record<string, string> = {
  "Water":      "#4a90c4",
  "Space (Akasha)": "#6ec6e8",
  "Air":        "#48a858",
  "Fire":       "#e85050",
  "Earth":      "#c8a028",
  "Fire + Air": "#d06840",
  "Earth + Water": "#a09060",
  "Air + Water": "#6890c0",
};

export default function ShaktiChakra({ cx, cy, northDeg, opacity = 0.42, visible = true }: ShaktiChakraProps) {
  if (!visible) return null;

  const bandR = R * 0.88;
  const bandW = 6;

  return (
    <g opacity={opacity}>
      {/* Outer ring */}
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(200,175,120,0.7)" strokeWidth="1.8" />
      {/* Middle ring */}
      <circle cx={cx} cy={cy} r={R1} fill="rgba(255,215,150,0.08)" stroke="rgba(200,175,120,0.4)" strokeWidth="1" />
      {/* Inner ring */}
      <circle cx={cx} cy={cy} r={20} fill="rgba(255,215,150,0.12)" stroke="rgba(200,175,120,0.6)" strokeWidth="1.2" />

      {/* Zone slices */}
      {VASTU_ZONES.map((z) => {
        const sA = z.startDeg + northDeg;
        const eA = z.endDeg + northDeg;
        return (
          <path
            key={z.shortName}
            d={arcPath(cx, cy, R1, R, sA, eA)}
            fill={hexToRgba(z.color, 0.55)}
            stroke={hexToRgba(z.color, 0.85)}
            strokeWidth="0.6"
            className="vastu-zone-slice"
          />
        );
      })}

      {/* Zone boundary lines */}
      {VASTU_ZONES.map((z, i) => {
        const sA = z.startDeg + northDeg;
        const sR = toRad(sA);
        const x1 = cx + R * Math.cos(sR);
        const y1 = cy + R * Math.sin(sR);
        const isCardinal = i % 4 === 0;
        return (
          <line
            key={`line-${z.shortName}`}
            x1={cx} y1={cy}
            x2={x1.toFixed(1)} y2={y1.toFixed(1)}
            stroke={isCardinal ? "rgba(200,175,120,0.7)" : "rgba(200,175,120,0.3)"}
            strokeWidth={isCardinal ? 1.4 : 0.7}
          />
        );
      })}

      {/* Zone name labels */}
      {VASTU_ZONES.map((z) => {
        const midA = z.startDeg + northDeg + 11.25;
        const LR = R * 0.72;
        const lx = cx + LR * Math.cos(toRad(midA));
        const ly = cy + LR * Math.sin(toRad(midA));
        return (
          <text
            key={`lbl-${z.shortName}`}
            x={lx.toFixed(1)} y={ly.toFixed(1)}
            textAnchor="middle" dominantBaseline="middle"
            fill="#ffffff"
            fontFamily="var(--font-dm-mono), monospace"
            fontSize="10"
            fontWeight="600"
          >
            {z.shortName}
          </text>
        );
      })}

      {/* Deity name labels */}
      {VASTU_ZONES.map((z) => {
        const midA = z.startDeg + northDeg + 11.25;
        const DR = R * 0.52;
        const dx = cx + DR * Math.cos(toRad(midA));
        const dy = cy + DR * Math.sin(toRad(midA));
        return (
          <text
            key={`deity-${z.shortName}`}
            x={dx.toFixed(1)} y={dy.toFixed(1)}
            textAnchor="middle" dominantBaseline="middle"
            fill={hexToRgba(z.color, 0.95)}
            fontFamily="var(--font-cormorant), Georgia, serif"
            fontSize="7.5"
            fontStyle="italic"
          >
            {z.deity}
          </text>
        );
      })}

      {/* 32 entrance tick marks */}
      {Array.from({ length: 32 }, (_, i) => {
        const a = toRad(i * 11.25 + northDeg);
        const tickLen = i % 2 === 0 ? 10 : 5;
        const x1t = cx + R * Math.cos(a);
        const y1t = cy + R * Math.sin(a);
        const x2t = cx + (R + tickLen) * Math.cos(a);
        const y2t = cy + (R + tickLen) * Math.sin(a);
        return (
          <line
            key={`tick-${i}`}
            x1={x1t.toFixed(1)} y1={y1t.toFixed(1)}
            x2={x2t.toFixed(1)} y2={y2t.toFixed(1)}
            stroke="rgba(200,175,120,0.5)"
            strokeWidth={i % 4 === 0 ? 1.5 : 0.8}
          />
        );
      })}

      {/* Degree labels every 4th tick */}
      {Array.from({ length: 8 }, (_, i) => {
        const a = toRad(i * 45 + northDeg);
        const nR = R + 18;
        const tx = cx + nR * Math.cos(a);
        const ty = cy + nR * Math.sin(a);
        return (
          <text
            key={`deg-${i}`}
            x={tx.toFixed(1)} y={ty.toFixed(1)}
            textAnchor="middle" dominantBaseline="middle"
            fill="rgba(200,175,120,0.55)"
            fontSize="7"
            fontFamily="var(--font-dm-mono), monospace"
          >
            {(i * 45).toFixed(0)}°
          </text>
        );
      })}

      {/* Element color band at 88% R */}
      {VASTU_ZONES.map((z) => {
        const sA = z.startDeg + northDeg;
        const eA = z.endDeg + northDeg;
        const col = ELEM_COLORS[z.element] ?? "#888888";
        return (
          <path
            key={`band-${z.shortName}`}
            d={arcPath(cx, cy, bandR - bandW, bandR, sA, eA)}
            fill={hexToRgba(col, 0.9)}
          />
        );
      })}

      {/* North arrow */}
      <NorthArrow cx={cx} cy={cy} northDeg={northDeg} R={R} />
    </g>
  );
}

function NorthArrow({ cx, cy, northDeg, R }: { cx: number; cy: number; northDeg: number; R: number }) {
  const aR = R * 0.94;
  const a = toRad(northDeg);
  const ax = cx + aR * Math.cos(a);
  const ay = cy + aR * Math.sin(a);
  const tipR = aR + 12;
  const tx = cx + tipR * Math.cos(a);
  const ty = cy + tipR * Math.sin(a);
  const perp = a + Math.PI / 2;

  const p0x = (tx + 13 * Math.cos(a)).toFixed(1);
  const p0y = (ty + 13 * Math.sin(a)).toFixed(1);
  const p1x = (tx + 7 * Math.cos(perp)).toFixed(1);
  const p1y = (ty + 7 * Math.sin(perp)).toFixed(1);
  const p2x = (tx - 7 * Math.cos(perp)).toFixed(1);
  const p2y = (ty - 7 * Math.sin(perp)).toFixed(1);

  const nR = tipR + 16;
  const nLx = cx + nR * Math.cos(a);
  const nLy = cy + nR * Math.sin(a);

  return (
    <>
      <line
        x1={cx} y1={cy}
        x2={ax.toFixed(1)} y2={ay.toFixed(1)}
        stroke="rgba(200,175,120,0.6)"
        strokeWidth="1.4"
        strokeDasharray="5,3"
      />
      <polygon
        points={`${p0x},${p0y} ${p1x},${p1y} ${p2x},${p2y}`}
        fill="var(--gold)"
        opacity="0.95"
      />
      <text
        x={nLx.toFixed(1)} y={nLy.toFixed(1)}
        textAnchor="middle" dominantBaseline="middle"
        fill="var(--gold-2)"
        fontSize="13" fontWeight="700"
        fontFamily="var(--font-dm-mono), monospace"
      >
        N
      </text>
    </>
  );
}
