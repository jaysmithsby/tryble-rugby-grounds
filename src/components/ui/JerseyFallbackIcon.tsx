import { cn } from "@/lib/utils";

interface JerseyFallbackIconProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: { width: 32, height: 32, fontSize: 5 },
  md: { width: 40, height: 40, fontSize: 6 },
  lg: { width: 56, height: 56, fontSize: 7 },
};

export const JerseyFallbackIcon = ({ size = "md", className }: JerseyFallbackIconProps) => {
  const { width, height, fontSize } = sizeMap[size];

  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      className={cn("opacity-60", className)}
    >
      {/* Jersey body */}
      <path
        d="M12 20L8 14L16 8L24 12H40L48 8L56 14L52 20V56H12V20Z"
        fill="currentColor"
        fillOpacity="0.15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Left sleeve */}
      <path
        d="M8 14L4 26L12 28V20L8 14Z"
        fill="currentColor"
        fillOpacity="0.1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Right sleeve */}
      <path
        d="M56 14L60 26L52 28V20L56 14Z"
        fill="currentColor"
        fillOpacity="0.1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Collar */}
      <path
        d="M24 12C24 12 28 16 32 16C36 16 40 12 40 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* "Pending" text */}
      <text
        x="32"
        y="40"
        textAnchor="middle"
        fill="currentColor"
        fontSize={fontSize}
        fontWeight="600"
        fontFamily="system-ui, sans-serif"
      >
        Pending
      </text>
    </svg>
  );
};
