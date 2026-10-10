import { AdminPageHeader } from "@/components/admin/page-header";
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

interface ConversationRow {
  id: string;
  channel: string;
  started_at: string;
  messageCount: number;
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

  const countByConversation = new Map<string, number>();
  for (const m of messages ?? []) {
    countByConversation.set(
      m.conversation_id,
      (countByConversation.get(m.conversation_id) ?? 0) + 1,
    );
  }

  return {
    rows: conversations.map((c) => ({
      id: c.id,
      channel: c.channel,
      started_at: c.started_at,
      messageCount: countByConversation.get(c.id) ?? 0,
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  );
}
