import { NextResponse } from "next/server";
import { qnaEntries } from "@/lib/mock-data";

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

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server chưa cấu hình GEMINI_API_KEY." },
      { status: 500 },
    );
  }

  let message = "";
  try {
    const body = await request.json();
    if (typeof body?.message === "string") {
      message = body.message.trim();
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

  let geminiRes: Response;
  try {
    geminiRes = await fetch(
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
  } catch (err) {
    console.error("Gemini API fetch failed:", err);
    return NextResponse.json(
      { error: "Không gọi được Gemini API, thử lại sau." },
      { status: 502 },
    );
  }

  if (!geminiRes.ok) {
    const errText = await geminiRes.text();
    console.error("Gemini API error:", geminiRes.status, errText);
    return NextResponse.json(
      { error: "Không gọi được Gemini API, thử lại sau." },
      { status: 502 },
    );
  }

  const data = await geminiRes.json();
  const reply: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

  return NextResponse.json({ reply: reply || FALLBACK_REPLY });
}
