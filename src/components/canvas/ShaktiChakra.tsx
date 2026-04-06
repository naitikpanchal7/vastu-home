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
      // Rotate around the center so the NORTH label aligns with true north
      transform={`rotate(${northDeg}, ${cx}, ${cy})`}
      // screen blend makes the black background transparent,
      // leaving only the red chakra lines visible over the floor plan
      style={{ mixBlendMode: "screen" }}
    />
  );
}
