/* eslint-disable @next/next/no-img-element */

/** The full Toolbeat logo (mark + wordmark) for light backgrounds. */
export function Logo({ height = 20 }: { height?: number }) {
  // The logo file is 336.5 × 56, so keep that shape.
  const width = Math.round((336.5 / 56) * height);
  return (
    <img
      src="/brand/toolbeat-logo-light.svg"
      alt="Toolbeat"
      width={width}
      height={height}
      style={{ height, width: "auto" }}
    />
  );
}
