export type JerseyLayout = "solid" | "horizontal_stripes" | "vertical_stripes";
export type CollarStyle = "polo" | "v-neck";

export interface StripeConfig {
  color: string;
  order: number;
}

export interface JerseyConfig {
  layout: JerseyLayout;
  collarStyle: CollarStyle;
  baseColor: string;
  stripes: StripeConfig[];
  collarColor: string;
  sleeveTrimColor: string;
}

export const DEFAULT_JERSEY_CONFIG: JerseyConfig = {
  layout: "solid",
  collarStyle: "polo",
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

export const COLLAR_OPTIONS: { value: CollarStyle; label: string }[] = [
  { value: "polo", label: "Polo Collar" },
  { value: "v-neck", label: "V-Neck" },
];
