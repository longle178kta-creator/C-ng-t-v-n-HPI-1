import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const LEAD_MODEL = process.env.GEMINI_LEAD_MODEL || "gemini-3.1-flash-lite";

export type LeadQuality = "good" | "ok" | "spam";

export interface Lead {
  conversation_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  destination_country: string | null;
  education_level: string | null;
  major: string | null;
  availability: string | null;
  wants_consultation: boolean | null;
  note: string | null;
  quality: LeadQuality | null;
  updated_at: string;
}

interface HistoryMessage {
  sender: "user" | "bot";
  content: string;
}

const LEAD_EXTRACTION_PROMPT = `Bạn là hệ thống trích xuất thông tin lead từ đoạn hội thoại tư vấn du học dưới đây (giữa chatbot "Chatbot" và khách "Khách").

Đọc toàn bộ hội thoại và trích xuất các trường theo đúng schema JSON được cung cấp. Nếu một thông tin chưa được khách nhắc tới trong hội thoại, để giá trị null — TUYỆT ĐỐI không tự suy diễn hay bịa thêm.

Giải thích từng trường:
- name: họ tên khách
- email: email khách
- phone: số điện thoại khách
- destination_country: quốc gia du học khách quan tâm
- education_level: bậc học khách nhắm tới (THPT, Đại học, Thạc sĩ, ...)
- major: ngành học khách quan tâm
- availability: thời gian/khung giờ khách rảnh để được tư vấn, nếu có đề cập
- wants_consultation: true nếu khách đồng ý đặt lịch tư vấn, false nếu khách từ chối, null nếu chưa rõ
- note: ghi chú ngắn gọn (1-2 câu) về nhu cầu hoặc điểm đáng chú ý khác của khách
- quality: đánh giá chất lượng lead —
  "good" = có thông tin liên hệ (email hoặc SĐT) và nhu cầu du học rõ ràng, nghiêm túc
  "ok" = mới có một phần thông tin, nhu cầu còn mơ hồ, chưa đủ để liên hệ ngay
  "spam" = nội dung rác, test, quấy phá, hoặc rõ ràng không phải nhu cầu du học thật`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    name: { type: "STRING", nullable: true },
    email: { type: "STRING", nullable: true },
    phone: { type: "STRING", nullable: true },
    destination_country: { type: "STRING", nullable: true },
    education_level: { type: "STRING", nullable: true },
    major: { type: "STRING", nullable: true },
    availability: { type: "STRING", nullable: true },
    wants_consultation: { type: "BOOLEAN", nullable: true },
    note: { type: "STRING", nullable: true },
    quality: { type: "STRING", enum: ["good", "ok", "spam"], nullable: true },
  },
  required: [
    "name",
    "email",
    "phone",
    "destination_country",
    "education_level",
    "major",
    "availability",
    "wants_consultation",
    "note",
    "quality",
  ],
};

// Gọi Gemini (model rẻ/nhanh) để đọc toàn bộ hội thoại và cập nhật bản ghi lead
// tương ứng trong Supabase. Thiết kế để gọi "chạy nền" sau khi đã trả lời khách
// (xem app/api/chat/route.ts), không chặn phản hồi chat.
export async function extractAndSaveLead(
  apiKey: string,
  conversationId: string,
  history: HistoryMessage[],
): Promise<void> {
  const transcript = history
    .map((m) => `${m.sender === "user" ? "Khách" : "Chatbot"}: ${m.content}`)
    .join("\n");

  let res: Response;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${LEAD_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: LEAD_EXTRACTION_PROMPT }] },
          contents: [{ role: "user", parts: [{ text: transcript }] }],
          generation_config: {
            response_mime_type: "application/json",
            response_schema: RESPONSE_SCHEMA,
          },
        }),
      },
    );
  } catch (err) {
    console.error("Gemini lead extraction fetch failed:", err);
    return;
  }

  if (!res.ok) {
    console.error("Gemini lead extraction API error:", res.status, await res.text());
    return;
  }

  const data = await res.json();
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    console.error("Gemini lead extraction returned no text:", JSON.stringify(data));
    return;
  }

  let parsed: Omit<Lead, "conversation_id" | "updated_at">;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    console.error("Failed to parse lead extraction JSON:", err, text);
    return;
  }

  const { client: supabaseAdmin, error: adminError } = getSupabaseAdmin();
  if (!supabaseAdmin) {
    console.error("Lead extraction: Supabase admin client unavailable:", adminError);
    return;
  }

  const { error } = await supabaseAdmin.from("leads").upsert(
    {
      conversation_id: conversationId,
      name: parsed.name ?? null,
      email: parsed.email ?? null,
      phone: parsed.phone ?? null,
      destination_country: parsed.destination_country ?? null,
      education_level: parsed.education_level ?? null,
      major: parsed.major ?? null,
      availability: parsed.availability ?? null,
      wants_consultation: parsed.wants_consultation ?? null,
      note: parsed.note ?? null,
      quality: parsed.quality ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "conversation_id" },
  );

  if (error) {
    console.error("Supabase upsert lead error:", error);
  }
}
