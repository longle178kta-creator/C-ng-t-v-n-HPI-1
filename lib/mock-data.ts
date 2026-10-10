// Toàn bộ dữ liệu trong file này là dữ liệu giả (mock), viết cứng để dựng UI.
// Học viên sẽ thay thế bằng dữ liệu thật từ Supabase ở các tuần sau.

export type DocStatus = "chua_nop" | "dang_xu_ly" | "hop_le" | "can_nop_lai";

export type RequestStatus = "cho_duyet" | "da_duyet" | "tu_choi";

export type ServicePackage = "co_ban" | "toan_dien";

export interface School {
  id: string;
  name: string;
  country: string;
  minGpa: number;
  minIelts: number;
}

export const countries = [
  "Mỹ",
  "Anh",
  "Úc",
  "Canada",
  "Hàn Quốc",
  "Nhật Bản",
] as const;

export const schools: School[] = [
  {
    id: "sch_01",
    name: "University of Toronto",
    country: "Canada",
    minGpa: 8.0,
    minIelts: 6.5,
  },
  {
    id: "sch_02",
    name: "RMIT University",
    country: "Úc",
    minGpa: 7.0,
    minIelts: 6.0,
  },
  {
    id: "sch_03",
    name: "University of Manchester",
    country: "Anh",
    minGpa: 7.5,
    minIelts: 6.5,
  },
  {
    id: "sch_04",
    name: "Arizona State University",
    country: "Mỹ",
    minGpa: 6.5,
    minIelts: 6.0,
  },
  {
    id: "sch_05",
    name: "Yonsei University",
    country: "Hàn Quốc",
    minGpa: 8.5,
    minIelts: 7.0,
  },
];

export interface ServiceOption {
  id: ServicePackage;
  name: string;
  price: number;
  description: string;
  benefits: string[];
}

export const servicePackages: ServiceOption[] = [
  {
    id: "co_ban",
    name: "Cơ bản",
    price: 18_000_000,
    description: "Phù hợp nếu hồ sơ của bạn đơn giản và đã chuẩn bị sẵn phần lớn giấy tờ.",
    benefits: [
      "Đối chiếu điểm chuẩn tự động",
      "Kiểm tra hợp lệ giấy tờ (bảng điểm, IELTS, CMND/hộ chiếu)",
      "Hỗ trợ qua email trong 24h",
      "1 lần nộp lại hồ sơ miễn phí",
    ],
  },
  {
    id: "toan_dien",
    name: "Toàn diện",
    price: 45_000_000,
    description: "Đồng hành trọn gói từ tư vấn trường đến nộp hồ sơ.",
    benefits: [
      "Toàn bộ quyền lợi gói Cơ bản",
      "Tư vấn chọn trường 1:1 với chuyên viên",
      "Rà soát hồ sơ không giới hạn số lần",
      "Hỗ trợ ưu tiên qua điện thoại + email",
      "Theo dõi tiến độ xét duyệt hằng tuần",
    ],
  },
];

export interface AdmissionRequest {
  id: string;
  customerName: string;
  package: ServicePackage;
  quote: number;
  status: RequestStatus;
  createdAt: string;
}

export const admissionRequests: AdmissionRequest[] = [
  {
    id: "req_2101",
    customerName: "Trần Thị Bích",
    package: "toan_dien",
    quote: 45_000_000,
    status: "cho_duyet",
    createdAt: "2026-08-06 08:20",
  },
  {
    id: "req_2100",
    customerName: "Đỗ Ngọc Lan",
    package: "toan_dien",
    quote: 45_000_000,
    status: "cho_duyet",
    createdAt: "2026-08-05 09:12",
  },
  {
    id: "req_2099",
    customerName: "Lê Văn Hùng",
    package: "co_ban",
    quote: 18_000_000,
    status: "da_duyet",
    createdAt: "2026-08-04 14:30",
  },
  {
    id: "req_2098",
    customerName: "Phạm Thu Hà",
    package: "toan_dien",
    quote: 45_000_000,
    status: "da_duyet",
    createdAt: "2026-08-03 10:05",
  },
  {
    id: "req_2097",
    customerName: "Nguyễn Đức Anh",
    package: "co_ban",
    quote: 18_000_000,
    status: "tu_choi",
    createdAt: "2026-08-02 16:47",
  },
];

export interface StudentProfile {
  id: string;
  studentName: string;
  email: string;
  submittedAt: string;
  docs: {
    transcript: DocStatus;
    ielts: DocStatus;
    identity: DocStatus;
  };
  matchedSchools: number;
  totalSchools: number;
}

export const studentProfiles: StudentProfile[] = [
  {
    id: "stu_501",
    studentName: "Nguyễn Minh Anh",
    email: "minhanh.nguyen@example.com",
    submittedAt: "2026-08-01",
    docs: { transcript: "hop_le", ielts: "dang_xu_ly", identity: "can_nop_lai" },
    matchedSchools: 2,
    totalSchools: 5,
  },
  {
    id: "stu_502",
    studentName: "Vũ Thị Mai",
    email: "mai.vu@example.com",
    submittedAt: "2026-07-30",
    docs: { transcript: "hop_le", ielts: "hop_le", identity: "hop_le" },
    matchedSchools: 3,
    totalSchools: 5,
  },
  {
    id: "stu_503",
    studentName: "Hoàng Gia Bảo",
    email: "bao.hoang@example.com",
    submittedAt: "2026-08-02",
    docs: { transcript: "hop_le", ielts: "hop_le", identity: "dang_xu_ly" },
    matchedSchools: 1,
    totalSchools: 5,
  },
  {
    id: "stu_504",
    studentName: "Trịnh Thu Trang",
    email: "trang.trinh@example.com",
    submittedAt: "2026-08-04",
    docs: { transcript: "can_nop_lai", ielts: "hop_le", identity: "hop_le" },
    matchedSchools: 0,
    totalSchools: 5,
  },
  {
    id: "stu_505",
    studentName: "Bùi Anh Tuấn",
    email: "tuan.bui@example.com",
    submittedAt: "2026-08-05",
    docs: { transcript: "dang_xu_ly", ielts: "dang_xu_ly", identity: "dang_xu_ly" },
    matchedSchools: 0,
    totalSchools: 5,
  },
];

export interface QnaEntry {
  question: string;
  answer: string;
}

// Bộ câu hỏi - đáp án dùng làm "kiến thức nền" cho chatbot (systemInstruction).
// Chatbot chỉ được trả lời trong phạm vi này, không tự bịa thêm.
export const qnaEntries: QnaEntry[] = [
  {
    question: "Dịch vụ này gồm những gì?",
    answer:
      "Bên mình lo phần đối chiếu điểm chuẩn, kiểm tra hồ sơ và tư vấn chọn trường, chia làm 2 gói: Cơ bản và Toàn diện.",
  },
  {
    question: "Bao lâu thì có kết quả xét duyệt?",
    answer:
      "Nộp đủ giấy tờ là có kết quả đối chiếu điểm chuẩn ngay. Sau đó tư vấn viên sẽ gọi xác nhận lại với bạn trong vòng 24h.",
  },
  {
    question: "Chi phí dịch vụ là bao nhiêu?",
    answer:
      "Gói Cơ bản 18.000.000₫, gói Toàn diện 45.000.000₫ nhé. Bạn kéo lên phần báo giá phía trên để xem chi tiết quyền lợi từng gói.",
  },
  {
    question: "Tôi cần chuẩn bị giấy tờ gì?",
    answer:
      "3 thứ thôi: bảng điểm (PDF), ảnh chứng chỉ IELTS, và ảnh CMND/CCCD hoặc hộ chiếu.",
  },
];

// Hồ sơ của học viên đang đăng nhập demo tại /portal
export const currentStudent = {
  name: "Nguyễn Minh Anh",
  email: "minhanh.nguyen@example.com",
  documents: {
    transcript: {
      status: "hop_le" as DocStatus,
      fileName: "bang-diem-minh-anh.pdf",
    },
    ielts: {
      status: "dang_xu_ly" as DocStatus,
      fileName: "ielts-certificate.jpg",
    },
    identity: {
      status: "can_nop_lai" as DocStatus,
      fileName: "cccd-mat-truoc.jpg",
      reason: "Ảnh mờ, không đọc rõ thông tin",
    },
  },
  extracted: {
    fullName: "Nguyễn Minh Anh",
    dateOfBirth: "12/05/2005",
    gpa: 8.2,
    ielts: 6.5,
  },
  matches: [
    { school: schools[0], passed: true },
    { school: schools[4], passed: false },
  ],
};
