import { NextResponse } from "next/server";
import { qnaEntries } from "@/lib/mock-data";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const FALLBACK_REPLY =
  "Mình chưa có thông tin này, bạn để lại câu hỏi để tư vấn viên liên hệ trực tiếp nhé.";
const MAX_MESSAGE_LENGTH = 500;

function buildSystemInstruction() {
  const qnaText = qnaEntries
    .map((item, i) => `${i + 1}. Hỏi: ${item.question}\n   Đáp: ${item.answer}`)
    .join("\n");

  return `Bạn là trợ lý ảo của DuHoc24, tư vấn hồ sơ du học.

Đây là TOÀN BỘ kiến thức bạn được phép dùng để trả lời:
${qnaText}

Quy tắc bắt buộc:
- Chỉ trả lời dựa trên nội dung trong bộ câu hỏi - đáp án trên. Có thể diễn đạt lại cho tự nhiên, nhưng tuyệt đối không thêm thông tin, chính sách, giá cả hay cam kết nào ngoài phạm vi đó.
- Nếu câu hỏi của khách không khớp với bộ trên hoặc bạn không chắc chắn, trả lời đúng nguyên văn: "${FALLBACK_REPLY}"
- Trả lời ngắn gọn (1-3 câu), giọng thân thiện, xưng "mình", gọi khách là "bạn".`;
}

async function askGemini(apiKey: string, message: string) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: buildSystemInstruction() }] },
        contents: [{ role: "user", parts: [{ text: message }] }],
      }),
    },
  );

  if (!res.ok) {
    const errText = await res.text();
    console.error("Gemini API error:", res.status, errText);
    return null;
  }

  const data = await res.json();
  const reply: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  return reply || FALLBACK_REPLY;
}

export async function POST(request: Request) {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    return NextResponse.json(
      { error: "Server chưa cấu hình GEMINI_API_KEY." },
      { status: 500 },
    );
  }

  const { client: supabaseAdmin, error: supabaseError } = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json({ error: supabaseError }, { status: 500 });
  }

  let message = "";
  let conversationId: string | null = null;
  try {
    const body = await request.json();
    if (typeof body?.message === "string") {
      message = body.message.trim();
    }
    if (typeof body?.conversationId === "string") {
      conversationId = body.conversationId;
    }
  } catch {
    return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ." }, { status: 400 });
  }

  if (!message) {
    return NextResponse.json({ error: "Thiếu nội dung câu hỏi." }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: "Câu hỏi quá dài." }, { status: 400 });
  }

  // Tạo hội thoại mới trong DB nếu đây là tin nhắn đầu tiên của phiên chat.
  if (!conversationId) {
    const { data: conv, error } = await supabaseAdmin
      .from("conversations")
      .insert({ channel: "Web" })
      .select("id")
      .single();

    if (error || !conv) {
      console.error("Supabase insert conversation error:", error);
      return NextResponse.json(
        { error: "Không tạo được hội thoại, thử lại sau." },
        { status: 502 },
      );
    }
    conversationId = conv.id;
  }

  const { error: userMsgError } = await supabaseAdmin
    .from("messages")
    .insert({ conversation_id: conversationId, sender: "user", content: message });

  if (userMsgError) {
    console.error("Supabase insert user message error:", userMsgError);
    return NextResponse.json(
      { error: "Không lưu được tin nhắn, thử lại sau." },
      { status: 502 },
    );
  }

  let reply: string | null;
  try {
    reply = await askGemini(geminiApiKey, message);
  } catch (err) {
    console.error("Gemini API fetch failed:", err);
    reply = null;
  }

  if (!reply) {
    return NextResponse.json(
      { conversationId, error: "Không gọi được Gemini API, thử lại sau." },
      { status: 502 },
    );
  }

  const { error: botMsgError } = await supabaseAdmin
    .from("messages")
    .insert({ conversation_id: conversationId, sender: "bot", content: reply });

  if (botMsgError) {
    console.error("Supabase insert bot message error:", botMsgError);
    // Tin nhắn bot vẫn trả về cho người dùng dù lưu DB thất bại, tránh mất câu trả lời đã có.
  }

  return NextResponse.json({ conversationId, reply });
}
