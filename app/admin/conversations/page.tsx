import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/page-header";
import { DeleteConversationButton } from "@/components/admin/delete-conversation-button";
import { LeadQualityBadge } from "@/components/admin/lead-quality-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { LeadQuality } from "@/lib/leads";
import { deleteConversation } from "./actions";

interface ConversationRow {
  id: string;
  channel: string;
  started_at: string;
  messageCount: number;
  leadName: string | null;
  leadQuality: LeadQuality | null;
}

async function getConversations(): Promise<{ rows: ConversationRow[]; error: string | null }> {
  const { client: supabaseAdmin, error } = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return { rows: [], error };
  }

  const { data: conversations, error: convError } = await supabaseAdmin
    .from("conversations")
    .select("id, channel, started_at")
    .order("started_at", { ascending: false });

  if (convError || !conversations) {
    return { rows: [], error: "Không tải được danh sách hội thoại." };
  }

  const { data: messages, error: msgError } = await supabaseAdmin
    .from("messages")
    .select("conversation_id");

  if (msgError) {
    return { rows: [], error: "Không tải được số lượng tin nhắn." };
  }

  const { data: leads, error: leadsError } = await supabaseAdmin
    .from("leads")
    .select("conversation_id, name, quality");

  if (leadsError) {
    return { rows: [], error: "Không tải được dữ liệu lead." };
  }

  const countByConversation = new Map<string, number>();
  for (const m of messages ?? []) {
    countByConversation.set(
      m.conversation_id,
      (countByConversation.get(m.conversation_id) ?? 0) + 1,
    );
  }

  const leadByConversation = new Map<string, { name: string | null; quality: LeadQuality | null }>();
  for (const l of leads ?? []) {
    leadByConversation.set(l.conversation_id, { name: l.name, quality: l.quality });
  }

  return {
    rows: conversations.map((c) => ({
      id: c.id,
      channel: c.channel,
      started_at: c.started_at,
      messageCount: countByConversation.get(c.id) ?? 0,
      leadName: leadByConversation.get(c.id)?.name ?? null,
      leadQuality: leadByConversation.get(c.id)?.quality ?? null,
    })),
    error: null,
  };
}

export default async function AdminConversationsPage() {
  const { rows, error } = await getConversations();

  return (
    <>
      <AdminPageHeader
        title="Hội thoại"
        description="Lịch sử hội thoại của khách với chatbot hỏi đáp trên trang chủ, đọc trực tiếp từ database."
      />

      <Card>
        {error ? (
          <p className="p-6 text-sm text-destructive">{error}</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">Chưa có hội thoại nào.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kênh</TableHead>
                <TableHead>Số tin nhắn</TableHead>
                <TableHead>Thời gian bắt đầu</TableHead>
                <TableHead>Lead</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((conv) => (
                <TableRow key={conv.id}>
                  <TableCell className="font-medium">{conv.channel}</TableCell>
                  <TableCell>{conv.messageCount} tin nhắn</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(conv.started_at).toLocaleString("vi-VN")}
                  </TableCell>
                  <TableCell>
                    {conv.leadQuality ? (
                      <div className="flex items-center gap-2">
                        <LeadQualityBadge quality={conv.leadQuality} />
                        {conv.leadName && (
                          <span className="text-muted-foreground">{conv.leadName}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        nativeButton={false}
                        render={<Link href={`/admin/conversations/${conv.id}`}>Xem chi tiết</Link>}
                      />
                      <DeleteConversationButton action={deleteConversation.bind(null, conv.id)} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  );
}
