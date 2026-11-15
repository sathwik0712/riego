import Image from "next/image";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showName?: boolean;
  tone?: "dark" | "light";
  className?: string;
}

// Proportional dimensions based on the 405x525 SVG viewBox (taller than wide)
const DIMENSIONS: Record<
  "sm" | "md" | "lg",
  { width: number; height: number; textSize: string; gap: string }
> = {
  sm: { width: 25, height: 32, textSize: "text-lg sm:text-xl", gap: "gap-2" },
  md: { width: 31, height: 40, textSize: "text-xl sm:text-2xl", gap: "gap-2.5" },
  lg: { width: 43, height: 56, textSize: "text-2xl sm:text-3xl", gap: "gap-3" },
};

export default function Logo({
  size = "md",
  showName = true,
  tone = "dark",
  className = "",
}: LogoProps) {
  const config = DIMENSIONS[size] || DIMENSIONS.md;
  const textColor = tone === "light" ? "text-white" : "text-[#1B2D21]";

  return (
    <div className={`inline-flex items-center ${config.gap} ${className}`}>
      <Image
        src="/riego-logo.svg"
        alt="Riego logo"
        width={config.width}
        height={config.height}
        priority
        className="shrink-0"
        style={{
          width: `${config.width}px`,
          height: `${config.height}px`,
        }}
      />
      {showName && (
        <span className={`font-extrabold tracking-tight ${config.textSize} ${textColor}`}>
          Riego
        </span>
      )}
    </div>
  );
}
