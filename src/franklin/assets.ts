// Fitted real-world sizes (metres) and pre-rotations for the Franklin film's imported assets (public/assets/franklin).
// Raw sizes come from tools/assets/bbox.py; the fit makes them true scale next to the 1.7 m cast.
import type { AssetProps } from "../inkbeat/core/asset";
type Fit = Pick<AssetProps, "fit" | "pre" | "tint">;
export const FIT: Record<string, Fit> = {
  bookshelf: { fit: { axis: "y", size: 2.0 } },
  table: { fit: { axis: "x", size: 1.5 } },
  chair: { fit: { axis: "y", size: 0.98 } },
  armchair: { fit: { axis: "y", size: 1.0 } },
  mantelclock: { fit: { axis: "x", size: 0.34 } },
  oillamp: { fit: { axis: "y", size: 0.5 } },
  frame: { fit: { axis: "x", size: 0.6 } },
  officedesk: { fit: { axis: "x", size: 1.5 } },
  desklamp: { fit: { axis: "y", size: 0.5 } },
  quill: { fit: { axis: "max", size: 0.3 } },
  rarebook: { fit: { axis: "x", size: 0.3 } },
  gift: { fit: { axis: "max", size: 0.35 } },
  pen: { fit: { axis: "max", size: 0.15 } },
  chalkboard: { fit: { axis: "x", size: 1.6 } },
  reel: { fit: { axis: "max", size: 0.35 } },
  teacup: { fit: { axis: "x", size: 0.12 } },
};
