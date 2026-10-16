import Link from "next/link";
import { cn } from "@/lib/utils";

/** Word mark: "PazarLab" in ink, "AI" in the primary green (DESIGN.md §4). */
export default function PazarLabBrand({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 rounded-full font-display text-[23px] font-extrabold leading-none tracking-tight", className)}>
      <span aria-hidden className="grid h-8 w-8 place-items-center rounded-blob border-2 border-foreground bg-watch text-base shadow-sticker-ink">
        ◐
      </span>
      <span>
        PazarLab <span className="text-primary">AI</span>
      </span>
    </Link>
  );
}
