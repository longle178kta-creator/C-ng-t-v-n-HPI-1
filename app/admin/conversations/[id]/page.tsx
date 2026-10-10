import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

interface MessageRow {
  id: string;
  sender: "user" | "bot";
  content: string;
  created_at: string;
}

interface ConversationDetail {
  id: string;
  channel: string;
  started_at: string;
  messages: MessageRow[];
}

async function getConversationDetail(
  id: string,
): Promise<{ conversation: ConversationDetail | null; error: string | null }> {
  const { client: supabaseAdmin, error } = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return { conversation: null, error };
  }

  const { data: conversation, error: convError } = await supabaseAdmin
    .from("conversations")
    .select("id, channel, started_at")
    .eq("id", id)
    .single();

  if (convError || !conversation) {
    return { conversation: null, error: null };
  }

  const { data: messages, error: msgError } = await supabaseAdmin
    .from("messages")
    .select("id, sender, content, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  if (msgError) {
    return { conversation: null, error: "Không tải được tin nhắn của hội thoại này." };
  }

  return {
    conversation: { ...conversation, messages: messages ?? [] },
    error: null,
  };
}

export default async function AdminConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { conversation, error } = await getConversationDetail(id);

  if (!error && !conversation) {
    notFound();
  }

  return (
    <>
      <AdminPageHeader
        title="Chi tiết hội thoại"
        description={
          conversation
            ? `Kênh ${conversation.channel} · bắt đầu lúc ${new Date(conversation.started_at).toLocaleString("vi-VN")}`
            : undefined
        }
        action={
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={
              <Link href="/admin/conversations">
                <ArrowLeft className="size-3.5" />
                Quay lại
              </Link>
            }
          />
        }
      />

      <Card className="p-6">
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : !conversation || conversation.messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">Hội thoại này chưa có tin nhắn nào.</p>
        ) : (
          <div className="space-y-4">
            {conversation.messages.map((m) => (
              <div
                key={m.id}
                className={cn("flex", m.sender === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[75%] space-y-1 rounded-2xl px-4 py-2.5 text-sm",
                    m.sender === "user"
                      ? "rounded-br-sm bg-primary text-primary-foreground"
                      : "rounded-bl-sm bg-muted text-foreground",
                  )}
                >
                  <p>{m.content}</p>
                  <p
                    className={cn(
                      "text-[0.7rem]",
                      m.sender === "user" ? "text-primary-foreground/70" : "text-muted-foreground",
                    )}
                  >
                    {m.sender === "user" ? "Khách" : "Chatbot"} ·{" "}
                    {new Date(m.created_at).toLocaleTimeString("vi-VN")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
