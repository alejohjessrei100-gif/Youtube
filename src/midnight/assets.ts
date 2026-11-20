// Fitted real-world sizes (metres) for the Midnight School's imported assets (public/assets/midnight).
import type { AssetProps } from "../inkbeat/core/asset";
type Fit = Pick<AssetProps, "fit" | "pre" | "tint" | "ground" | "center">;
export const FIT: Record<string, Fit> = {
  wallclock: { fit: { axis: "max", size: 0.5 }, ground: false },
  clock2: { fit: { axis: "max", size: 0.16 } },
  bucket: { fit: { axis: "y", size: 0.34 } },
  oillamp: { fit: { axis: "y", size: 0.4 } },
};
