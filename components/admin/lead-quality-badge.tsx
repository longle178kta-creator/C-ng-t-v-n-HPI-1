import { cn } from "@/lib/utils";
import type { LeadQuality } from "@/lib/leads";

const qualityMeta: Record<LeadQuality, { label: string; className: string }> = {
  good: { label: "Lead tốt", className: "bg-green-100 text-green-700 ring-green-200" },
  ok: { label: "Lead tạm ổn", className: "bg-yellow-100 text-yellow-700 ring-yellow-200" },
  spam: { label: "Spam", className: "bg-red-100 text-red-700 ring-red-200" },
};

export function LeadQualityBadge({ quality }: { quality: LeadQuality }) {
  const meta = qualityMeta[quality];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        meta.className,
      )}
    >
      {meta.label}
    </span>
  );
}
