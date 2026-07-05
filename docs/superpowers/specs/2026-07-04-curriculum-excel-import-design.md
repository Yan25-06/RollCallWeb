# Import giáo trình từ Excel — Design Spec

**Ngày:** 2026-07-04
**Nhánh liên quan:** `curriculum-materials` (tính năng giáo trình đã build; import bổ sung lên trên)

## Mục tiêu

Cho phép admin import một giáo trình hoàn chỉnh (Tháng → Buổi → nhiều Tài liệu) từ file Excel `.xlsx` xuất trực tiếp từ Google Sheet, theo đúng **layout hiện tại** của sheet syllabus (không bắt người dùng đổi format). Đây là form chuẩn sẽ tái sử dụng cho các khóa sau, nên import là tính năng cố định trong UI, không phải script chạy một lần.

## Bối cảnh dữ liệu thật (file `syllabus.xlsx`)

Đã khảo sát file thật (sheet `SYLLABUS`, 3 tháng, 36 buổi):

- **Dòng Tháng**: cột A dạng `"THÁNG 1: XÂY DỰNG NỀN TẢNG..."` — mỗi tháng một dòng tiêu đề riêng.
- **Dòng header**: ngay sau dòng Tháng, cột A = `"Tuần"`, B = `"Buổi"`, C = `"Kỹ năng"`, D = `"Nội dung..."` — bỏ qua.
- **Dòng Buổi**: cột B là số buổi (1..36, đánh liên tục xuyên suốt các tháng). Cột A chỉ điền `"Tuần N"` ở buổi đầu mỗi tuần → cần **forward-fill** giá trị tuần cho các buổi sau trong cùng tháng.
- **Cột C** = Kỹ năng (Reading/Listening). **Cột D** = Nội dung giảng dạy chi tiết.
- **Cột E** = ô gộp nhiều tài liệu, mỗi dòng dạng `Label: value`:
  - Nhãn: `PPT`, `Handout`, `Đọc dịch`, `Dictation`, `Homework` (không phân biệt hoa/thường, có thể có khoảng trắng thừa).
  - `PPT` và `Homework` thường có URL đầy đủ ngay trong text (`canva.link/...`, `forms.gle/...`, `docs.google.com/forms/...`).
  - `Handout` và `Đọc dịch` **có thể có URL trong text hoặc chỉ là mã code** (VD `HANDOUT-B1`, `BTB1`) — không cố định. Parser luôn trích URL trong text trước cho mọi loại; chỉ khi không có URL mới xử lý như mã code.
  - **Hyperlink ẩn của ô E** (`cell.l.Target`): khi xuất `.xlsx`, mỗi ô Excel chỉ giữ được **đúng 1 hyperlink**. Khảo sát xác nhận link còn lại luôn ứng với mục **Handout** (VD Buổi 1 → Google Doc; Buổi 4 có `.pdf` → Google Drive file). Khi ô Handout rỗng, hyperlink ẩn đôi khi **trùng với link PPT** → phải bỏ qua trong trường hợp đó.
- **Cột F** = ghi chú buổi dạy (nhận xét nội bộ). **Cột G** = "Yêu cầu tạo bản copy...", thỉnh thoảng chứa nội dung Mini Test kèm hyperlink ẩn. **Cột H** = ghi chú lẻ (hiếm).
- Các buổi cuối (29–36) có ô tài liệu **rỗng hoàn toàn** (`PPT:\nHandout:\n...`) → không tạo tài liệu nào, không báo lỗi.
- **Ca biệt cần xử lý:**
  - Buổi 22, 25 dùng nhãn `Dictation:` thay cho `Đọc dịch:` (buổi Listening) → map **cùng type `reading`** (theo quyết định của user: "dictation chính là đọc dịch").
  - Buổi 23: 2 link Homework trong cùng ô (dòng chính + dòng "Link gg form practice: ...") → tách thành **2 tài liệu Homework** riêng.

## Quyết định đã chốt

| Vấn đề | Quyết định |
|---|---|
| "Đọc dịch"/"Dictation" có thể có URL hoặc chỉ là mã code | Nếu có URL trong text → dùng URL. Nếu chỉ có mã code → **vẫn tạo tài liệu**, `url` để trống (NULL). Cần nới ràng buộc `url NOT NULL`. |
| Nhãn "Dictation" | Map type `reading` (giống "Đọc dịch"). |
| Cột G (Mini Test + link ẩn) | **Gộp text vào `note` của buổi**, bỏ qua hyperlink ẩn trong G. Không tạo tài liệu riêng. |
| courseType đích của file này | **TOEIC** (mặc định gợi ý trong modal). |
| Tháng/Buổi đã tồn tại trong DB | **Bỏ qua** (không ghi đè), báo trong kết quả — nhất quán với hành vi seed. |

## Kiến trúc

Ba đơn vị tách bạch, mỗi phần một trách nhiệm rõ ràng:

### 1. Migration (sửa file có sẵn, chưa chạy lên Supabase)

`supabase/migrations/20260704000001_create_curriculum.sql`: đổi
```sql
url text not null,
```
→
```sql
url text,
```
trong bảng `curriculum_materials`. (Migration này chưa từng chạy lên Supabase production nên sửa trực tiếp, không tạo migration mới.)

> ⚠️ Đồng bộ: `curriculumService.materialToDB/materialFromDB` không đổi (đã map `url` như optional field). CLAUDE.md mục "Model giáo trình" cần cập nhật ghi chú `url` giờ nullable.

### 2. Parser thuần — `src/utils/curriculumImportParser.js`

Hàm thuần, không side-effect, không phụ thuộc React/Supabase → kiểm tra độc lập được.

**Interface:**
```js
// input: worksheet object của SheetJS (đã đọc với hyperlink)
// output: { months: [...], warnings: [...] }
export function parseCurriculumSheet(worksheet) → {
  months: [
    { monthNo, title, sessions: [
      { weekNo, sessionNo, skill, content, note, materials: [
        { type, title, url }   // url có thể null
      ] }
    ] }
  ],
  warnings: [ { row, message } ]   // buổi thiếu sessionNo, dòng không parse được...
}
```

**Logic duyệt (theo thứ tự dòng):**
1. Cột A khớp `/^\s*THÁNG\s+(\d+)\s*:?\s*(.*)$/i` → mở tháng mới `{ monthNo, title }`, reset `currentWeekNo = null`.
2. Cột A (trim, lowercase) === `"tuần"` (dòng header) → bỏ qua.
3. Cột A khớp `/tuần\s+(\d+)/i` → cập nhật `currentWeekNo`.
4. Cột B là số (hoặc chuỗi số) → tạo buổi:
   - `sessionNo = Number(B)`, `weekNo = currentWeekNo`, `skill = C`, `content = D`.
   - `note` = nối cột F + G + H (các ô có text), phân tách `\n`; bỏ hyperlink.
   - `materials` = kết quả `parseMaterialsCell(E)` (xem dưới).
   - Nếu chưa có tháng đang mở (dữ liệu lỗi) → thêm warning, bỏ qua.
5. Dòng khác → bỏ qua.

**`parseMaterialsCell(cell)`** (E là ô có `.v` text + `.l.Target` hyperlink tùy chọn):
- Tách `cell.v` theo `\n`. Duyệt từng dòng, giữ "nhãn hiện tại":
  - Dòng khớp `/^(PPT|Handout|Đọc dịch|Dictation|Homework)\s*:(.*)$/i` → xác định `type` theo bảng map, `value = phần sau dấu ":"`.
  - Dòng không có nhãn nhưng chứa URL → coi là tài liệu bổ sung **cùng type nhãn liền trước** (VD Homework thứ 2 của Buổi 23).
- Với mỗi `(type, value)`:
  - Trích URL đầu tiên trong `value` bằng regex `/https?:\/\/\S+/`.
  - **Nếu có URL**: `{ type, title: (text còn lại sau khi bỏ URL, hoặc nhãn mặc định), url }`.
  - **Nếu không có URL nhưng `value` có code** (VD `HANDOUT-B1`):
    - `title = value.trim()`.
    - Với `type === 'handout'`: thử `url = cell.l.Target` **chỉ khi** link đó ≠ URL của PPT đã parse trong cùng ô (tránh trùng link PPT khi Handout rỗng). Các type khác: `url = null`.
  - **Nếu `value` rỗng**: bỏ qua nhãn (không tạo tài liệu).
- Map nhãn → type: `PPT→ppt`, `Handout→handout`, `Đọc dịch|Dictation→reading`, `Homework→homework`.
- `order_index` gán tăng dần theo thứ tự xuất hiện trong ô.

### 3. UI — `src/components/schedule/ImportCurriculumModal.jsx`

Theo pattern `ImportStudentsModal` (upload → preview → import có progress → result). Lazy-load `xlsx` trong handler (nhất quán với CLAUDE.md).

- **State đầu:** dropdown chọn courseType đích (options = `COURSE_TYPES`). Giá trị khởi tạo = prop `defaultCourseType` truyền từ `MaterialsTab` (= courseType tab đang hiển thị); người dùng vẫn đổi được trước khi import.
- **Upload:** input `.xlsx`. Đọc `XLSX.read(arrayBuffer, { type:'array' })` → `parseCurriculumSheet(ws)`.
- **Preview:** cây thu gọn — mỗi tháng: `Tháng {monthNo}: {title} — {N} buổi, {M} tài liệu`, mở rộng xem từng buổi (Buổi X, Tuần Y, số tài liệu, badge loại). Hiện `warnings` (buổi thiếu số, dòng lỗi) dạng cảnh báo vàng. Buổi không có tài liệu vẫn tạo (không phải lỗi).
- **Import:** tuần tự qua `curriculumService`:
  - Với mỗi tháng: gọi `curriculumService.getByCourseType(courseType)` một lần đầu để biết `monthNo` nào đã tồn tại → nếu tháng đã có thì **bỏ qua toàn bộ tháng** (đếm vào `skippedMonths`). Ngược lại: `createMonth({courseType, monthNo, title})` → mỗi buổi `createSession({monthId, ...})` → mỗi tài liệu `createMaterial({sessionId, ...})`.
  - Progress theo tổng số buổi. Toast kết quả cuối: `X tháng, Y buổi, Z tài liệu đã import; K tháng bị bỏ qua (đã tồn tại)`.
  - `onImportDone?.()` để `MaterialsTab` reload cây.

### 4. Wiring — `src/components/schedule/MaterialsTab.jsx`

Thêm nút "Import Excel" (icon `Upload` từ lucide-react) cạnh nút "Thêm tháng" trong toolbar, chỉ hiện khi `isAdmin`. Bấm → mở `ImportCurriculumModal` với `defaultCourseType={courseType}` (courseType tab đang hiển thị) và `onImportDone={load}`.

> Lưu ý: courseType đích của file `syllabus.xlsx` là **TOEIC** — người dùng chọn tab TOEIC trước khi import, hoặc đổi dropdown trong modal.

## Xử lý lỗi

- File không phải `.xlsx`/`.xls` → báo lỗi inline (giống `ImportStudentsModal`).
- Đọc file lỗi → toast + báo inline, không crash.
- Mỗi `create*` bọc try/catch: lỗi 1 buổi/tài liệu → đếm `failed`, tiếp tục phần còn lại (không dừng toàn bộ). Kết quả cuối hiển thị số thành công/lỗi/bỏ qua.
- Tháng trùng → bỏ qua sạch (không tạo buổi con lẻ tẻ), tránh trạng thái nửa vời.

## Testing (thủ công — dự án không có test runner)

- `npm run build` xanh.
- Import `syllabus.xlsx` vào courseType TOEIC (sau khi đã chạy migration lên Supabase): kỳ vọng 3 tháng, 36 buổi; buổi 1 có 3 tài liệu (PPT link canva, Handout link Google Doc, Homework link forms.gle) + 1 tài liệu Đọc dịch "BTB1" không link; buổi 23 có 2 Homework; buổi 29–36 không tài liệu.
- Import lại lần 2 → cả 3 tháng bị bỏ qua (không nhân đôi).
- Giáo viên thường không thấy nút Import.

## Ngoài phạm vi (YAGNI)

- Không ghi đè/merge tháng đã tồn tại (chỉ bỏ qua).
- Không sửa/xóa hàng loạt qua import.
- Không phục hồi link "Đọc dịch" đã mất khi xuất CSV/xlsx (giới hạn của Google Sheets export — chấp nhận để trống).
- Không hỗ trợ nhiều sheet trong 1 workbook (chỉ đọc sheet đầu).
