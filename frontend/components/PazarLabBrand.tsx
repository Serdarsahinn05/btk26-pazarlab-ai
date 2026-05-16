import { Beaker } from "lucide-react";
import { cn } from "@/lib/utils";

interface PazarLabBrandProps {
  className?: string;
  iconClassName?: string;
  size?: "sm" | "md";
}

export default function PazarLabBrand({
  className,
  iconClassName,
  size = "md",
}: PazarLabBrandProps) {
  const iconSize = size === "sm" ? "w-5 h-5" : "w-6 h-6";
  const textSize = size === "sm" ? "text-lg" : "text-xl";

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "rounded-lg bg-violet-500/20 p-2 shadow-[0_0_20px_-5px_rgba(139,92,246,0.35)] shrink-0",
          iconClassName
        )}
      >
        <Beaker className={cn(iconSize, "text-violet-400")} />
      </div>
      <span className={cn("font-bold tracking-tight", textSize)}>
        <span className="text-white">PazarLab </span>
        <span className="text-violet-400">AI</span>
      </span>
    </div>
  );
}
