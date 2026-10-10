import { NextResponse, after } from "next/server";
import { chatGreeting } from "@/lib/mock-data";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { extractAndSaveLead } from "@/lib/leads";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const FALLBACK_REPLY = "Xin lỗi, mình chưa trả lời được câu này, bạn thử lại giúp mình nhé.";
const MAX_MESSAGE_LENGTH = 500;
// Giới hạn số tin nhắn gửi kèm làm lịch sử hội thoại cho Gemini, tránh payload phình to vô hạn.
const MAX_HISTORY_MESSAGES = 20;

const SYSTEM_INSTRUCTION = `## Persona
Bạn là Trợ lý AI Tư vấn Du học — một trợ lý ảo thân thiện, nhiệt tình, hỗ trợ học sinh/phụ huynh tìm hiểu về du học.

## Core Task/Objective
💬 Nhiệm vụ của bạn là dẫn dắt cuộc trò chuyện có cấu trúc để hiểu nhu cầu du học của người dùng, thu thập thông tin liên hệ và giới thiệu dịch vụ tư vấn phù hợp. Trả lời ngắn gọn, hữu ích.
💬 Trả lời bằng đúng ngôn ngữ người dùng đang sử dụng.
💬 Mỗi lượt chỉ hỏi một câu hỏi.

## Constraints/Rules
⚠️ QUY TẮC KHÁC:
- Không đề cập chi phí/học phí trừ khi người dùng chủ động hỏi
- Không tự đưa ra cam kết về tỷ lệ đậu visa hoặc học bổng

## Additional Information
🧠 LUỒNG HỘI THOẠI:
1. Hỏi người dùng đang quan tâm du học nước nào (hoặc đang phân vân giữa các nước)
2. Hỏi về mục tiêu/bậc học (THPT, Đại học, Thạc sĩ...) và ngành học quan tâm
3. Dựa trên nhu cầu, giới thiệu dịch vụ tư vấn phù hợp (chọn trường, hồ sơ, xin visa, học bổng...)
4. Hỏi họ có muốn tìm hiểu thêm chi tiết không
5. Nếu có, thu thập lần lượt: họ tên → email → số điện thoại
6. Sau đó, cung cấp thông tin chi tiết hơn về quy trình tư vấn và mời đặt lịch tư vấn miễn phí
7. Hỏi họ có ghi chú/câu hỏi nào khác trước khi kết thúc

## Dịch vụ
Tư vấn chọn trường & ngành học, hỗ trợ hồ sơ apply, tư vấn xin visa, tìm học bổng, đào tạo kỹ năng trước khi du học (ngôn ngữ, phỏng vấn).
Trụ sở: Số 1 Hai Bà Trưng, Hà Nội
Liên hệ: 0912 345 6789

## Configuration
- Mục tiêu: Thu thập lead và đặt lịch tư vấn
- Phong cách trả lời: Cân bằng, đi thẳng vào trọng tâm, tối đa 2-3 câu mỗi lượt trừ khi cần chi tiết hơn`;

interface HistoryMessage {
  sender: "user" | "bot";
  content: string;
}

async function askGemini(apiKey: string, history: HistoryMessage[]) {
  const contents = history.slice(-MAX_HISTORY_MESSAGES).map((m) => ({
    role: m.sender === "bot" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents,
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

    // Lưu lời chào mở đầu làm tin nhắn đầu tiên, để lịch sử gửi cho Gemini
    // khớp với những gì người dùng thấy trên UI ngay từ lượt đầu.
    const { error: greetingError } = await supabaseAdmin
      .from("messages")
      .insert({ conversation_id: conversationId, sender: "bot", content: chatGreeting });

    if (greetingError) {
      console.error("Supabase insert greeting error:", greetingError);
    }
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

  // Lấy lại toàn bộ lịch sử (bao gồm tin nhắn vừa lưu) để Gemini trả lời đúng mạch hội thoại.
  const { data: history, error: historyError } = await supabaseAdmin
    .from("messages")
    .select("sender, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (historyError || !history) {
    console.error("Supabase fetch history error:", historyError);
    return NextResponse.json(
      { conversationId, error: "Không đọc được lịch sử hội thoại, thử lại sau." },
      { status: 502 },
    );
  }

  let reply: string | null;
  try {
    reply = await askGemini(geminiApiKey, history);
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

  // Trích xuất/cập nhật thông tin lead chạy SAU khi đã trả lời khách (after()),
  // không làm chậm phản hồi chat. Dùng model rẻ/nhanh riêng, xem lib/leads.ts.
  const finalConversationId = conversationId!;
  after(() => {
    extractAndSaveLead(geminiApiKey, finalConversationId, [
      ...history,
      { sender: "bot", content: reply },
    ]).catch((err) => {
      console.error("Lead extraction failed:", err);
    });
  });

  return NextResponse.json({ conversationId, reply });
}
