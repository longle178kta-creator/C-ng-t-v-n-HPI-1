"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function deleteConversation(conversationId: string) {
  if (!conversationId) return;

  const { client: supabaseAdmin } = getSupabaseAdmin();
  if (!supabaseAdmin) return;

  // Xoá conversations sẽ tự xoá các messages liên quan (FK on delete cascade).
  await supabaseAdmin.from("conversations").delete().eq("id", conversationId);

  revalidatePath("/admin/conversations");
  redirect("/admin/conversations");
}
