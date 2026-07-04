# Giáo trình & Tài liệu theo Loại khóa (Curriculum Materials)

**Ngày:** 2026-07-04
**Trạng thái:** Đã duyệt thiết kế, chờ viết plan

## Bối cảnh & Vấn đề

Tab "Tài Liệu" hiện tại (`MaterialsTab.jsx`) là một danh sách link **phẳng theo từng lớp** (`class_materials`).
Thực tế giảng dạy tổ chức theo **giáo trình có cấu trúc**: Tháng → Tuần → Buổi, và **mỗi buổi có nhiều tài liệu** khác loại
(PPT, Handout, Đọc dịch, Homework). Cách up hiện tại khiến tài liệu "lẻ tẻ, khó tìm".

Nguồn tham khảo cấu trúc: một Google Sheet giáo trình (cột Tháng có tiêu đề chủ đề, Tuần, Buổi, Kỹ năng,
Nội dung giảng dạy chi tiết, và các slot tài liệu PPT/Handout/Đọc dịch/Homework, cột Ghi chú).

## Quyết định đã chốt

1. **Không tích hợp Google Sheet** — nhập tay trên web bằng UI mới. Sheet chỉ là mẫu tham khảo cấu trúc.
2. **Giáo trình dùng chung theo `courseType`** (TOEIC / IELTS / Giao Tiếp / Trẻ Em / Khác), KHÔNG per-lớp.
   "Buổi 1..N" là số thứ tự bài học theo giáo trình, không phải ngày dạy cụ thể của một lớp.
3. **Mỗi buổi lưu:** Kỹ năng, Nội dung giảng dạy chi tiết, Ghi chú, và danh sách tài liệu. Nhóm theo Tháng/Tuần.
4. **Loại tài liệu:** PPT / Handout / Đọc dịch / Homework / Khác.
5. **Tài liệu = chữ hiển thị + link** (vd title "HANDOUT-B1" gắn URL). Link vẫn bắt buộc (mô hình `title + url` sẵn có).
6. **Data model: 3 bảng phân cấp** (Tháng → Buổi → Tài liệu).
7. **Bảng `class_materials` cũ:** giữ orphan (không drop, theo quy ước project), tab chuyển hẳn sang model mới. Không migrate data.
8. **Phân quyền:** admin full CRUD; giáo viên chỉ xem (SELECT) — khớp RLS hiện có của tài liệu.

## Data Model (migration mới)

### `curriculum_months`
| cột | kiểu | ghi chú |
|---|---|---|
| `id` | uuid PK | |
| `course_type` | text NOT NULL | 'IELTS' \| 'TOEIC' \| 'Giao Tiếp' \| 'Trẻ Em' \| 'Khác' |
| `month_no` | int NOT NULL | số thứ tự tháng trong khóa |
| `title` | text | tiêu đề chủ đề của tháng (vd "XÂY DỰNG NỀN TẢNG...") |
| `created_by` | uuid FK teachers | gắn qua `getUid()` |
| `created_at` | timestamptz default now() | |

- Unique `(course_type, month_no)`.

### `curriculum_sessions`
| cột | kiểu | ghi chú |
|---|---|---|
| `id` | uuid PK | |
| `month_id` | uuid FK curriculum_months ON DELETE CASCADE | |
| `week_no` | int | số tuần (nullable) — chỉ để nhóm hiển thị |
| `session_no` | int NOT NULL | "Buổi" — tuần tự trong khóa |
| `skill` | text | Reading / Listening / ... (nullable) |
| `content` | text | Nội dung giảng dạy chi tiết (nullable) |
| `note` | text | Ghi chú (nullable) |
| `created_by` | uuid FK teachers | |
| `created_at` | timestamptz default now() | |

- Sắp xếp hiển thị theo `month_no`, `week_no`, `session_no`.

### `curriculum_materials`
| cột | kiểu | ghi chú |
|---|---|---|
| `id` | uuid PK | |
| `session_id` | uuid FK curriculum_sessions ON DELETE CASCADE | |
| `type` | text NOT NULL | CHECK: 'ppt' \| 'handout' \| 'reading' \| 'homework' \| 'other' |
| `title` | text NOT NULL | chữ hiển thị (vd "HANDOUT-B1") |
| `url` | text NOT NULL | link http/https |
| `order_index` | int default 0 | thứ tự trong buổi |
| `created_by` | uuid FK teachers | |
| `created_at` | timestamptz default now() | |

### RLS
- **admin:** full INSERT/UPDATE/DELETE trên cả 3 bảng (điều kiện `is_admin()`) — theo pattern policy admin độc lập.
- **giáo viên:** chỉ SELECT (mọi giáo viên đọc được vì giáo trình dùng chung).
- Cascade delete: xóa tháng → xóa buổi → xóa tài liệu.

### Seed
- Cập nhật `supabase/seed/seed_mock_data.sql`: thêm vài tháng/buổi/tài liệu mẫu cho ít nhất 1 courseType để test.

## Service Layer — `src/services/curriculumService.js`

Pattern chuẩn `fromDB/toDB`, mọi lỗi `throw new Error(error.message)`, `create*` gắn `created_by` qua `getUid()`.

- `getByCourseType(courseType)` → trả cây: `[{ ...month, sessions: [{ ...session, materials: [...] }] }]`
  (query 3 bảng rồi lồng ở client, hoặc join/nest — chọn cách đơn giản: 3 query lọc theo courseType/id-in rồi gộp).
- Tháng: `createMonth(data)`, `updateMonth(id, data)`, `removeMonth(id)`.
- Buổi: `createSession(data)`, `updateSession(id, data)`, `removeSession(id)`.
- Tài liệu: `createMaterial(data)`, `updateMaterial(id, data)`, `removeMaterial(id)`.

## Loại tài liệu — `src/components/schedule/materialType.js`

Thay `MATERIAL_TYPES` sang:
```
ppt      → 'PPT'        (badge xanh dương)
handout  → 'Handout'    (badge xanh lá)
reading  → 'Đọc dịch'   (badge tím)
homework → 'Homework'   (badge cam)
other    → 'Khác'       (badge navy)
```
`getMaterialType(value)` giữ nguyên (fallback `other`).

## UI — thay ruột tab "Tài Liệu" trong `SchedulePage`

### Top bar (`MaterialsTab.jsx` viết lại)
- Đổi dropdown "Lớp" → dropdown **Loại khóa** (5 courseType).
- Admin: nút "＋ Thêm tháng".

### Thân — accordion phân cấp
- **Tháng**: header (badge "Tháng N" + tiêu đề chủ đề). Admin: nút sửa/xóa tháng + "＋ Thêm buổi".
- **Tuần**: nhãn phân nhóm các buổi cùng `week_no` (vd "Tuần 1").
- **Buổi (card)**: badge "Buổi N" + badge kỹ năng + nội dung + ghi chú.
  Danh sách **tài liệu**: badge loại + tên (link mở tab mới). Admin: sửa/xóa buổi, thêm/sửa/xóa tài liệu inline.
- Giáo viên: read-only, không nút chỉnh sửa (khớp RLS).
- Loading skeleton + Empty state khi chưa có tháng nào.

### Modal
- `MonthModal.jsx` (mới): `month_no` + `title`.
- `SessionModal.jsx` (mới): `month_id` (ẩn/ngữ cảnh), `week_no`, `session_no`, `skill`, `content` (textarea), `note`.
- `MaterialModal.jsx` (nâng cấp cái hiện có): dùng bộ `type` mới; `title` + `url` (validate http/https).

## Xử lý code cũ

- `class_materials` (bảng) + `classMaterialService.js`: để orphan, KHÔNG drop / không xóa service (tránh vỡ import ngoài ý muốn — kiểm tra reference; nếu chỉ `MaterialsTab` dùng thì có thể xóa service sau).
- `MaterialsTab.jsx`: viết lại hoàn toàn theo model mới.
- Cập nhật **CLAUDE.md** + **README.md** phần "Model tài liệu giảng dạy" và mô tả tab "Tài Liệu".

## Ngoài phạm vi (YAGNI)

- Không kéo-thả sắp xếp buổi (dùng `session_no`/`week_no`/`month_no` để sắp).
- Không import từ Google Sheet / Excel.
- Không gán giáo trình xuống ngày dạy thực tế của lớp.
- Không cho giáo viên tự cấu hình loại tài liệu.

## Testing / Verify

- Không có test runner. Verify thủ công: chạy `npm run dev`, đăng nhập admin → thêm Tháng/Buổi/Tài liệu cho 1 courseType,
  kiểm tra hiển thị nhóm đúng; đăng nhập giáo viên thường → chỉ xem, không thấy nút sửa; đổi courseType thấy giáo trình tương ứng.
- Kiểm RLS: giáo viên thường không INSERT/UPDATE/DELETE được (thử qua service sẽ lỗi policy).
