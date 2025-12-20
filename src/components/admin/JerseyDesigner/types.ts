export type JerseyLayout = "solid" | "horizontal_stripes" | "vertical_stripes";

export interface StripeConfig {
  color: string;
  order: number;
}

export interface JerseyConfig {
  layout: JerseyLayout;
  baseColor: string;
  stripes: StripeConfig[];
  collarColor: string;
  sleeveTrimColor: string;
}

export const DEFAULT_JERSEY_CONFIG: JerseyConfig = {
  layout: "solid",
  baseColor: "#1e3a5f",
  stripes: [],
  collarColor: "#ffffff",
  sleeveTrimColor: "#c9a227",
};

export const LAYOUT_OPTIONS: { value: JerseyLayout; label: string }[] = [
  { value: "solid", label: "Solid Color" },
  { value: "horizontal_stripes", label: "Horizontal Stripes" },
  { value: "vertical_stripes", label: "Vertical Stripes" },
];
