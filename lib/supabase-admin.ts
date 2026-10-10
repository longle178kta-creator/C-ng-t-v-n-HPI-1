import "server-only";
import { createAdminClient } from "@supabase/server/core";
import type { SupabaseClient } from "@supabase/supabase-js";

// Dùng secret key, bỏ qua RLS — CHỈ được import từ route handler / Server Component.
// `server-only` ở trên sẽ làm build lỗi ngay nếu lỡ import vào code chạy ở trình duyệt.
export function getSupabaseAdmin(): { client: SupabaseClient | null; error: string | null } {
  try {
    return { client: createAdminClient(), error: null };
  } catch {
    return {
      client: null,
      error: "Server chưa cấu hình SUPABASE_URL / SUPABASE_SECRET_KEY.",
    };
  }
}
