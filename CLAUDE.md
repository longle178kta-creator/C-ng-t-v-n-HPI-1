# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Tổng quan dự án

**DuHoc24** — website mẫu "Cổng Tiếp Nhận Hồ Sơ Du Học", dùng cho khoá lập trình 6 tuần. Đây là bản **Tuần 1**: chỉ dựng UI với **mock data viết cứng** trong [lib/mock-data.ts](lib/mock-data.ts), chưa nối API hay database thật. Toàn bộ nội dung UI bằng tiếng Việt.

Dự án sẽ phát triển dần qua các tuần (xem chi tiết trong [README.md](README.md)):
- Tuần 2: Chatbot QnA gọi Gemini API thật
- Tuần 3: Nối Supabase (database + form báo giá thật)
- Tuần 4: Đọc/xử lý hồ sơ giấy tờ bằng Gemini (structured output)
- Tuần 5: Tự động hoá qua Make.com (gửi email)
- Tuần 6: Authentication (magic link qua Supabase Auth), Row Level Security

Khi sửa code, cần ý thức bản hiện tại đang ở giai đoạn nào — đừng tự ý "hoàn thiện" tính năng của các tuần sau (ví dụ nối API Gemini thật, tạo bảng Supabase) trừ khi được yêu cầu rõ ràng.

## Lệnh thường dùng

```bash
npm install       # cài dependency
npm run dev       # chạy dev server tại http://localhost:3000
npm run build     # build production
npm run start     # chạy bản đã build
npm run lint      # eslint (dùng eslint-config-next, flat config)
```

Chưa có test suite nào trong repo này.

## Kiến trúc

### Next.js App Router
Toàn bộ trang là Server Component theo mặc định (file `page.tsx`/`layout.tsx` trong `app/`), chỉ các component có tương tác (state, event handler) mới đánh dấu `"use client"` ở đầu file (ví dụ [components/landing/chat-widget.tsx](components/landing/chat-widget.tsx), [components/admin/sidebar.tsx](components/admin/sidebar.tsx)). Duy nhất một route handler: [app/api/chat/route.ts](app/api/chat/route.ts) (Tuần 2 — xem mục Chatbot bên dưới). Các trang còn lại chỉ đọc mock data tĩnh, không có network call.

Cấu trúc route:
- `/` — landing page (hero, form báo giá, chatbot QnA, highlights, footer)
- `/portal` — cổng hồ sơ học viên (upload giấy tờ demo, thông tin trích xuất, đối chiếu điểm chuẩn)
- `/admin` — redirect sang `/admin/requests`
- `/admin/*` — dashboard quản trị, dùng chung [app/admin/layout.tsx](app/admin/layout.tsx) (sidebar + mobile nav từ [components/admin/sidebar.tsx](components/admin/sidebar.tsx))

`/login` chưa tồn tại — sẽ dựng ở Tuần 6, đừng tạo trước.

### Một nguồn dữ liệu duy nhất: `lib/mock-data.ts`
[lib/mock-data.ts](lib/mock-data.ts) là nguồn sự thật cho dữ liệu hiển thị còn lại chưa nối backend: `schools`, `servicePackages`, `admissionRequests`, `studentProfiles`, `qnaEntries`, và hồ sơ demo `currentStudent` dùng ở `/portal`. Riêng hội thoại chatbot (`conversations`/`messages`) đã nối Supabase thật, không còn là mock (xem mục Chatbot bên dưới). File này cũng định nghĩa các union type trạng thái dùng xuyên suốt app:
- `DocStatus`: `chua_nop | dang_xu_ly | hop_le | can_nop_lai`
- `RequestStatus`: `cho_duyet | da_duyet | tu_choi`
- `ServicePackage`: `co_ban | toan_dien`

Khi thêm trang hoặc component mới cần dữ liệu mẫu, thêm vào file này thay vì hardcode rải rác trong component.

### Ánh xạ trạng thái → UI tập trung tại `status-badge.tsx`
[components/status-badge.tsx](components/status-badge.tsx) ánh xạ mỗi giá trị `DocStatus`/`RequestStatus` sang nhãn tiếng Việt + màu sắc (`tone`) + icon, qua hai map `docStatusMeta` và `requestStatusMeta`. Dùng `<DocStatusBadge status={...} />` hoặc `<RequestStatusBadge status={...} />` thay vì tự viết class màu theo trạng thái ở nơi khác — khi cần thêm trạng thái mới, sửa ở đây.

### shadcn/ui (style `base-nova`) trên nền Base UI
`components/ui/*` là các component do shadcn CLI sinh ra (xem [components.json](components.json)): style `base-nova`, base color `neutral`, không prefix class, icon từ `lucide-react`, nền tảng [Base UI](https://base-ui.com) (không phải Radix). Alias import: `@/components`, `@/components/ui`, `@/lib`, `@/hooks` (khớp `paths` trong [tsconfig.json](tsconfig.json)). Có registry riêng `@tailark-oss` trỏ tới `oss.tailark.com` — khối giao diện landing page dựng từ `@tailark-oss/dusk-landing-2`, đã chuyển sang light theme và tuỳ biến nội dung du học.

### Tailwind CSS v4, không có file config riêng
Không có `tailwind.config.ts` — theme và CSS variables khai báo thẳng trong [app/globals.css](app/globals.css) theo cách của Tailwind v4 (`@theme`). Dùng helper `cn()` từ [lib/utils.ts](lib/utils.ts) (clsx + tailwind-merge) để gộp class có điều kiện, đã dùng nhất quán trong toàn bộ component.

### Chatbot QnA dùng Gemini + lưu hội thoại vào Supabase (Tuần 2-3)
Widget chat ở landing page ([components/landing/chat-widget.tsx](components/landing/chat-widget.tsx)) gọi `POST /api/chat` ([app/api/chat/route.ts](app/api/chat/route.ts)). Route handler này:
1. Tạo (hoặc nối tiếp) một `conversation` trong bảng Supabase `conversations`, lưu tin nhắn của khách vào bảng `messages` (`sender: "user"`).
2. Gọi Gemini REST API (`generateContent`) với `system_instruction` liệt kê **toàn bộ** `qnaEntries` từ [lib/mock-data.ts](lib/mock-data.ts), yêu cầu model chỉ trả lời trong phạm vi đó — không tự bịa thêm.
3. Lưu câu trả lời vào `messages` (`sender: "bot"`) rồi trả về `{ conversationId, reply }`.

Client chỉ giữ `conversationId` (một UUID, trong `useRef`) để nối tiếp cùng hội thoại khi gửi tin nhắn tiếp theo — **không** giữ nội dung hội thoại ở bộ nhớ trình duyệt làm nguồn dữ liệu chính; nguồn sự thật là Supabase. Trang [app/admin/conversations/page.tsx](app/admin/conversations/page.tsx) là Server Component, đọc trực tiếp từ 2 bảng này để hiển thị danh sách hội thoại thật (không còn dùng mock).

Muốn thêm/sửa câu hỏi chatbot biết trả lời thì sửa `qnaEntries` trong `lib/mock-data.ts`, không sửa prompt rải rác nơi khác.

### Supabase chỉ truy cập được từ server, không bao giờ từ trình duyệt
[lib/supabase-admin.ts](lib/supabase-admin.ts) là **điểm truy cập Supabase duy nhất**, dùng `createAdminClient()` từ `@supabase/server/core` (secret key, bỏ qua RLS). File này import `server-only` ở đầu — build sẽ lỗi ngay nếu lỡ import nó vào một component `"use client"`. Chỉ gọi `getSupabaseAdmin()` từ route handler (`app/api/*/route.ts`) hoặc Server Component (`page.tsx`/`layout.tsx` không có `"use client"`), không bao giờ từ component client. Bảng `conversations`/`messages` bật RLS nhưng **không có policy nào** — publishable/anon key (nếu lỡ lộ) bị từ chối hoàn toàn, chỉ secret key mới đọc/ghi được. Xem skill [.agents/skills/supabase-server/SKILL.md](.agents/skills/supabase-server/SKILL.md) trước khi sửa code liên quan đến `@supabase/server` (auth mode, migrate code cũ, v.v.).

### Biến môi trường
[.env.example](.env.example) liệt kê đầy đủ. Hai nhóm biến **bắt buộc** để chạy đủ tính năng hiện tại (`npm run dev` vẫn chạy được UI mà thiếu chúng, nhưng chatbot sẽ báo lỗi):
- `GEMINI_API_KEY` (+ `GEMINI_MODEL` tuỳ chọn) — chatbot trả lời.
- `SUPABASE_URL`, `SUPABASE_SECRET_KEY` — admin client phía server, lưu hội thoại. **Không** thêm prefix `NEXT_PUBLIC_` cho 2 biến này.

`NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` (client-side, cho đăng nhập magic link) vẫn **chưa cần** — đó là việc của Tuần 6, đừng thêm logic đọc trước khi tính năng đó được triển khai.

## Quy tắc Git

- Luôn hỏi xác nhận trước khi push lên Github
- Không bao giờ commit file .env hoặc bất kỳ file chứa API key
