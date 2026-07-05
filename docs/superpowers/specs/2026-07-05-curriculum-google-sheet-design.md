# Thiết kế: Tab Tài Liệu đọc trực tiếp từ Google Sheet

**Ngày:** 2026-07-05
**Trạng thái:** Đã duyệt (brainstorming với user)

## Mục tiêu

Google Sheet trở thành **nguồn chân lý duy nhất** cho giáo trình. Tab "Tài Liệu"
(SchedulePage → `MaterialsTab`) đọc trực tiếp dữ liệu từ Google Sheet mỗi phiên,
thay thế hoàn toàn luồng hiện tại (import `.xlsx` thủ công + lưu vào 3 bảng
`curriculum_*` trong Supabase + CRUD trên web).

- Web **chỉ đọc** — mọi chỉnh sửa giáo trình làm trực tiếp trên Google Sheet.
- Mỗi loại khóa (`COURSE_TYPES`: IELTS, TOEIC, TOEIC SW, KHÁC) là **một file
  Sheet riêng**; admin cấu hình link trong app, không cần deploy lại.

## Kiến trúc & luồng dữ liệu

### Cấu hình link Sheet
- Lưu trong bảng `settings` hiện có, qua `settingsService`: thêm key
  `curriculumSheets` (jsonb) dạng `{ "IELTS": "<url>", "TOEIC": "<url>", ... }`.
- Admin cấu hình qua modal "Cấu hình Sheet" trong tab Tài Liệu (một ô dán link
  cho mỗi loại khóa trong `COURSE_TYPES`).

### Đọc dữ liệu — service mới `src/services/googleSheetCurriculumService.js`
- Input: URL Sheet → trích `spreadsheetId` bằng regex
  (`/spreadsheets/d/<id>/`).
- Gọi **Google Sheets API v4**:
  `GET https://sheets.googleapis.com/v4/spreadsheets/{id}?includeGridData=true&key=<API_KEY>`
  - API key đọc từ `.env`: `VITE_GOOGLE_SHEETS_API_KEY` (bắt buộc cho tính năng
    này; thiếu key → tab hiện thông báo cấu hình).
  - Sheet phải ở chế độ chia sẻ "Ai có link đều xem được".
- Chuyển `rowData` của API về grid `[{ value, link }][]` — đúng định dạng input
  của parser hiện tại `src/utils/curriculumImportParser.js` (giữ nguyên parser,
  chỉ đổi nguồn). Hyperlink ẩn trong ô lấy từ field `hyperlink`/`textFormatRuns`
  của API (cần cho tài liệu Handout).
- Output: cây `[{ ...month, sessions: [{ ...session, materials: [] }] }]` — cùng
  shape `curriculumService.getByCourseType` cũ để UI con không phải sửa.

### Cache
- Cache **trong phiên** (state/ref theo `courseType` ở `MaterialsTab`): chỉ gọi
  API lần đầu mở mỗi khóa; nút "Làm mới" xóa cache khóa hiện tại và gọi lại.
- Không lưu bản sao vào Supabase.

## Thay đổi UI (`MaterialsTab.jsx`)

Giữ nguyên layout master-detail (`CurriculumSidebar` + `SessionDetailPanel`).

**Bỏ:**
- Nút "Import Excel" + `ImportCurriculumModal.jsx`.
- 3 modal CRUD: `MonthModal.jsx`, `SessionModal.jsx` (curriculum),
  `MaterialModal.jsx` + mọi nút Thêm/Sửa/Xóa tháng–buổi–tài liệu.
- `useArmedDelete` khỏi tab này (giữ hook nếu nơi khác dùng).

**Thêm:**
- Nút "Làm mới" (mọi user) — gọi lại API cho khóa đang xem.
- Nút "Mở Google Sheet" (mọi user) — mở link Sheet của khóa đang xem ở tab mới.
- Nút "Cấu hình Sheet" (chỉ admin, qua `usePermissions().isAdmin`) — modal dán
  link cho từng loại khóa, lưu qua `settingsService`.

**Trạng thái đặc biệt:**
- Khóa chưa có link → `<Empty />` với hướng dẫn (admin: "bấm Cấu hình Sheet";
  giáo viên: "liên hệ admin").
- Lỗi API (link sai, sheet không public, mất mạng, thiếu API key) → thông báo
  lỗi rõ trong panel + `toast.error`; nút "Thử lại".
- Loading state khi đang fetch.

## Dọn dẹp (orphan, không drop)

Theo tiền lệ `class_materials`:
- `src/services/curriculumService.js` và 3 bảng `curriculum_months` /
  `curriculum_sessions` / `curriculum_materials`: **để orphan** — không còn UI
  import, không migration drop. Dữ liệu cũ giữ nguyên phòng khi cần quay lại.
- `curriculumImportParser.js` **giữ và tiếp tục dùng** (đổi nguồn dữ liệu từ
  xlsx sang Sheets API). Test `node scripts/test-curriculum-parser.mjs` giữ
  nguyên.
- Cập nhật `CLAUDE.md` + `README.md` phần model giáo trình sau khi implement.

## Việc user làm ngoài code (một lần)

1. Google Cloud Console: tạo project + API key miễn phí, bật **Google Sheets
   API**, giới hạn key theo HTTP referrer (domain web) → dán vào `.env`
   (`VITE_GOOGLE_SHEETS_API_KEY`).
2. Đặt các file Sheet giáo trình sang "Ai có link đều xem được".
3. Trên web: bấm "Cấu hình Sheet", dán link từng khóa.

## Ngoài phạm vi

- Ghi ngược từ web vào Sheet (hai chiều) — đã loại trong brainstorming.
- Đồng bộ tự động định kỳ / lưu cache vào Supabase.
- Drop bảng/cột orphan.
