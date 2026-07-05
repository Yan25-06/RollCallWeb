# Redesign tab Tài Liệu (MaterialsTab) — Sidebar master-detail

**Ngày:** 2026-07-05
**Trạng thái:** Đã duyệt qua brainstorm (mockup visual companion)

## Vấn đề

Giao diện hiện tại của tab "Tài Liệu" (SchedulePage → `MaterialsTab.jsx`) là accordion dọc Tháng → Tuần → Buổi → tài liệu:

- **Quá dài, cuộn mỏi** — mọi tháng/buổi/tài liệu xếp dọc một cột, tìm 1 buổi cụ thể phải cuộn rất nhiều.
- **Đơn điệu, thiếu điểm nhấn** — card trắng viền xám giống nhau, khó phân biệt cấp tháng/tuần/buổi ngay lập tức.

Cách dùng chính: giáo viên vào để **tìm nhanh tài liệu của buổi sắp dạy**.

## Giải pháp đã chốt

Layout **master-detail 2 cột**: sidebar trái là cây điều hướng gọn (chỉ tháng + buổi, KHÔNG hiện tài liệu), panel phải hiện chi tiết buổi đang chọn với tài liệu to rõ.

### Toolbar (giữ nguyên)

Chọn loại khóa (`COURSE_TYPES`) + nút "Import Excel" + "Thêm tháng" (chỉ admin). Không đổi.

### Sidebar trái (~280px, cố định)

- Mỗi **tháng** là 1 header đóng/mở được: nền navy đậm (gradient `navy-900 → navy-800`), chữ trắng, hiện "Tháng {n} · {title}" + đếm số buổi bên phải, icon chevron ▾/▸.
- Bên trong tháng: nhãn **Tuần {n}** nhỏ (uppercase, `text-navy-500`), dưới mỗi tuần là các dòng **buổi** gọn: badge "B{n}" + tiêu đề (ưu tiên `content` dòng đầu, fallback skill).
- **Buổi đang chọn**: nền `navy-50` + viền trái `navy-800` + chữ đậm. Buổi khác: chữ `navy-500`, hover nền nhạt.
- **Mặc định:** mở tháng đầu tiên, tự chọn buổi đầu tiên. Đổi loại khóa → reset về mặc định.
- Tháng không có buổi: hiện dòng "Chưa có buổi" mờ bên trong khi mở.

### Panel phải (chiếm phần còn lại)

- Header: badge "Buổi {n}" (navy đậm) + badge skill (teal) + breadcrumb nhỏ "Tháng {x} · Tuần {y}".
- Tiêu đề buổi = `content` (to, đậm, `text-navy-900`); `note` in nghiêng mờ bên dưới.
- Mục "TÀI LIỆU · {count}" với đường kẻ ngang + nút "＋ Thêm tài liệu" (admin).
- Mỗi **tài liệu là 1 hàng lớn** (padding rộng, bo góc, viền): badge loại (màu theo `MATERIAL_TYPES`) + tiêu đề + icon ExternalLink.
  - **Có `url`: cả hàng là thẻ `<a>` bấm trực tiếp mở link** (target `_blank`), KHÔNG có chữ "Mở link". Hover đổi viền/nền để báo hiệu bấm được.
  - **Không có `url`** (vd Đọc dịch chỉ có mã code): hàng không phải link, không có icon ExternalLink, hiện tiêu đề bình thường (mã code nằm trong tiêu đề).
- Chưa chọn buổi / giáo trình rỗng: panel hiện `<Empty />`.
- Buổi không có tài liệu: hiện empty nhỏ "Chưa có tài liệu" trong panel.

### Vị trí nút admin (`isAdmin`)

- **Toolbar:** Thêm tháng, Import Excel (như cũ).
- **Header tháng (sidebar):** nút ＋ Buổi, ✏️ Sửa tháng, 🗑 Xóa tháng (icon nhỏ, chữ trắng mờ trên nền navy). Giữ nguyên UX **xóa 2 bước** (bấm lần 1 vũ trang, 3s tự hủy).
- **Panel phải:** ✏️ Sửa buổi, 🗑 Xóa buổi (2 bước) ở header; ＋ Thêm tài liệu ở mục tài liệu; ✏️/🗑 (2 bước) trên từng hàng tài liệu — các nút này nằm ngoài vùng `<a>` để không kích hoạt link khi bấm.
- Giáo viên thường: ẩn toàn bộ nút trên, chỉ xem + bấm link.

### Responsive (mobile)

Breakpoint `lg`: dưới `lg` hai khối xếp dọc — sidebar thành khối trên (full width), panel chi tiết bên dưới. Trên `lg` mới là 2 cột ngang.

## Kiến trúc component

- **`MaterialsTab.jsx`** (container, giữ nguyên vai trò): state `courseType`, `tree`, `loading`, modal states, các handler CRUD gọi `curriculumService` — **không đổi logic data**. Thêm state `selectedSessionId` (+ derive session/month/week đang chọn từ `tree`).
  - Sau khi xóa buổi đang chọn hoặc xóa tháng chứa nó → tự chọn lại buổi đầu tiên còn lại (hoặc null).
  - Sau `load()` nếu `selectedSessionId` không còn tồn tại trong tree → reset về buổi đầu.
- **`CurriculumSidebar.jsx`** (mới, `src/components/schedule/`): nhận `tree`, `selectedSessionId`, `isAdmin`, callbacks (`onSelectSession`, `onAddSession`, `onEditMonth`, `onDeleteMonth`, `onAddMonth`). Quản lý state đóng/mở tháng cục bộ.
- **`SessionDetailPanel.jsx`** (mới, `src/components/schedule/`): nhận `session` (kèm thông tin tháng/tuần), `isAdmin`, callbacks (`onEditSession`, `onDeleteSession`, `onAddMaterial`, `onEditMaterial`, `onDeleteMaterial`).
- Cơ chế xóa 2 bước hiện lặp 3 lần trong file cũ → tách thành hook nhỏ `useArmedDelete` (trong file dùng chung hoặc cục bộ) để tái dùng.
- Modal `MonthModal` / `SessionModal` / `MaterialModal` / `ImportCurriculumModal` giữ nguyên, vẫn render từ container.

## Không đổi

- `curriculumService` và schema DB — chỉ đổi tầng trình bày.
- Toàn bộ modal CRUD, parser import Excel.
- Quy ước design system: navy tokens, `clsx`, component từ `@/components/ui`, không hard-code hex.

## Kiểm thử

Không có test runner trong project. Kiểm thử thủ công qua `npm run dev`:

1. Xem với dữ liệu nhiều tháng — chọn buổi, đổi tháng, đổi loại khóa.
2. Tài liệu có link (bấm cả hàng mở tab mới) và không link (không bấm được, không icon).
3. Admin: đủ nút CRUD ở đúng vị trí, xóa 2 bước hoạt động, xóa buổi đang chọn không crash.
4. Giáo viên thường (`isAdmin=false`): không thấy nút CRUD nào.
5. Thu hẹp cửa sổ < breakpoint `lg`: 2 khối xếp dọc dùng được.
