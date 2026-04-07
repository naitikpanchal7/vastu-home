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
      // Rotate counter-clockwise: northDeg is the bearing of the floor plan's
      // "up" direction — e.g. northDeg=90 means "up" faces East, so the N zone
      // must swing left (CCW) to point at true North. This matches real compass
      // behaviour where increasing heading rotates the rose anti-clockwise.
      transform={`rotate(${-northDeg}, ${cx}, ${cy})`}
      // screen blend makes the black background transparent,
      // leaving only the red chakra lines visible over the floor plan
      style={{ mixBlendMode: "screen" }}
    />
  );
}
