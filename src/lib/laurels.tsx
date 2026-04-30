// SVG laurel branches — imported as React components via vite-plugin-svgr.
// The raw SVG files live in src/assets/ and are processed at build time,
// so no path-data strings ever appear in component files.
import LeftLaurelSVG  from "../assets/laurel-left.svg?react";
import RightLaurelSVG from "../assets/laurel-right.svg?react";
import { SVGProps } from "react";

// Re-export with typed fill + size props so TrustAssets can drive the color
export interface LaurelProps extends SVGProps<SVGSVGElement> {
  lc?: string;   // fill color driven by badge text/logo color
  size?: number; // rendered width in px (height auto)
}

export function LeftLaurel({ lc = "#d1d5db", size = 52, style, ...rest }: LaurelProps) {
  return (
    <LeftLaurelSVG
      fill={lc}
      width={size}
      height="auto"
      style={{ flexShrink: 0, opacity: 0.85, ...style }}
      {...rest}
    />
  );
}

export function RightLaurel({ lc = "#d1d5db", size = 52, style, ...rest }: LaurelProps) {
  return (
    <RightLaurelSVG
      fill={lc}
      width={size}
      height="auto"
      style={{ flexShrink: 0, opacity: 0.85, ...style }}
      {...rest}
    />
  );
}
