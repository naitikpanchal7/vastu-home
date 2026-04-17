"use client";

interface ShaktiChakraProps {
  cx: number;
  cy: number;
  northDeg: number;
  opacity?: number;
  visible?: boolean;
}

// Radius to match the canvas coordinate space
const R = 250;

export default function ShaktiChakra({
  cx,
  cy,
  northDeg,
  opacity = 0.42,
  visible = true,
}: ShaktiChakraProps) {
  if (!visible) return null;

  const size = R * 2;

  return (
    <image
      href="/vastuchakra.png"
      x={cx - R}
      y={cy - R}
      width={size}
      height={size}
      opacity={opacity}
      transform={`rotate(${-northDeg}, ${cx}, ${cy})`}
      style={{ mixBlendMode: "multiply" }}
    />
  );
}
