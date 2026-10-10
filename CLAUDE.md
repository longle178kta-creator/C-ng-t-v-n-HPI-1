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
[lib/mock-data.ts](lib/mock-data.ts) là nguồn sự thật duy nhất cho mọi dữ liệu hiển thị: `schools`, `servicePackages`, `admissionRequests`, `studentProfiles`, `conversations`, và hồ sơ demo `currentStudent` dùng ở `/portal`. File này cũng định nghĩa các union type trạng thái dùng xuyên suốt app:
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

### Chatbot QnA dùng Gemini (Tuần 2)
Widget chat ở landing page ([components/landing/chat-widget.tsx](components/landing/chat-widget.tsx)) gọi `POST /api/chat` ([app/api/chat/route.ts](app/api/chat/route.ts)), route handler này gọi Gemini REST API (`generateContent`) với `system_instruction` liệt kê **toàn bộ** `qnaEntries` từ [lib/mock-data.ts](lib/mock-data.ts) và yêu cầu model chỉ trả lời trong phạm vi đó — không tự bịa thêm. Cần biến `GEMINI_API_KEY` trong `.env`/`.env.local` để chạy được (xem bên dưới). Muốn thêm/sửa câu hỏi chatbot biết trả lời thì sửa `qnaEntries`, không sửa prompt rải rác nơi khác.

### Biến môi trường
[.env.example](.env.example) liệt kê biến cho Gemini, Supabase và magic link. `GEMINI_API_KEY` **bắt buộc** để chatbot ở `/` trả lời được (route `/api/chat`); các biến Supabase/magic link vẫn **chưa cần** để chạy `npm run dev` — đừng thêm logic đọc các biến đó trước khi tính năng tương ứng (Tuần 3/6) thực sự được triển khai.

## Quy tắc Git

- Luôn hỏi xác nhận trước khi push lên Github
- Không bao giờ commit file .env hoặc bất kỳ file chứa API key
