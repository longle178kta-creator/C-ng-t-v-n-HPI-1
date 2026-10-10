import {
  Mail,
  Phone,
  Globe,
  GraduationCap,
  BookOpen,
  Clock,
  CalendarCheck,
  CalendarX,
  StickyNote,
  User,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { LeadQualityBadge } from "@/components/admin/lead-quality-badge";
import type { Lead } from "@/lib/leads";

function Field({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm">{value || "—"}</p>
      </div>
    </div>
  );
}

export function LeadCard({ lead }: { lead: Lead | null }) {
  if (!lead) {
    return (
      <Card className="p-6">
        <h2 className="mb-1 text-sm font-medium">Thông tin lead</h2>
        <p className="text-sm text-muted-foreground">
          Chưa có dữ liệu — hệ thống sẽ tự trích xuất bằng Gemini ngay sau tin nhắn kế tiếp.
        </p>
      </Card>
    );
  }

  const consultationLabel =
    lead.wants_consultation === null ? null : lead.wants_consultation ? "Có" : "Không";

  return (
    <Card className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium">Thông tin lead (Gemini tự động trích xuất)</h2>
        {lead.quality && <LeadQualityBadge quality={lead.quality} />}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field icon={User} label="Họ tên" value={lead.name} />
        <Field icon={Mail} label="Email" value={lead.email} />
        <Field icon={Phone} label="Số điện thoại" value={lead.phone} />
        <Field icon={Globe} label="Quốc gia du học" value={lead.destination_country} />
        <Field icon={GraduationCap} label="Bậc học" value={lead.education_level} />
        <Field icon={BookOpen} label="Ngành học" value={lead.major} />
        <Field icon={Clock} label="Availability" value={lead.availability} />
        <Field
          icon={lead.wants_consultation ? CalendarCheck : CalendarX}
          label="Đặt lịch tư vấn"
          value={consultationLabel}
        />
      </div>

      {lead.note && (
        <div className="mt-4 flex items-start gap-2.5 border-t pt-4">
          <StickyNote className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{lead.note}</p>
        </div>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        Cập nhật lúc {new Date(lead.updated_at).toLocaleString("vi-VN")}
      </p>
    </Card>
  );
}
