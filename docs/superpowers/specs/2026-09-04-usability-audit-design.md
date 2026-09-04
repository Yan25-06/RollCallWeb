# Thiết kế: Chuẩn hóa skill usability-review + Audit UI/UX toàn bộ

Ngày: 2026-09-04

## Bối cảnh

Repo có sẵn skill `.claude/skills/usability-review/` (SKILL.md + 10 file `references/`) tổng
hợp từ giáo trình Thiết Kế Giao Diện của HCMUS. Nhưng skill được viết cho **một dự án khác** —
DictationHub, app luyện dictation với hai nhóm người dùng Teacher/Student — và tham chiếu các
file không tồn tại trong repo này (`GapSentence.jsx`, `LibraryPage`, `ResultView.jsx`,
`AppShell.jsx`, `Breadcrumb.jsx`).

Phần lý thuyết áp dụng được nguyên vẹn. Phần bối cảnh thì sai đối tượng.

Mục tiêu của đợt này: chuẩn hóa skill cho CRM trước, rồi dùng skill đã chuẩn để chạy một đợt
heuristic evaluation toàn bộ, ra **báo cáo xếp hạng ưu tiên** — chưa sửa code.

## Người dùng và bối cảnh sử dụng

ISO 9241-11 buộc phải trả lời *usable cho ai, làm gì, trong bối cảnh nào*. Đã xác nhận với chủ
sản phẩm:

| | **Admin** | **Giáo viên** |
|---|---|---|
| Ai | Chủ trung tâm / người quản lý | Giáo viên đứng lớp |
| Thiết bị | Desktop | Desktop |
| Bối cảnh | Ngồi máy, làm dày, hàng ngày | Ngồi máy **sau giờ dạy**, làm theo đợt |
| Trang chính | `AdminPanelPage`, `FeesPage`, `ReportsPage`, `PayrollTab` | `AttendanceTab`, `HomeworkTab`, `ReviewsPage`, `MockTestTab` |
| Tối ưu | **Efficiency** — ít click, bulk action, default tốt | **Memorability** — nghỉ một tuần quay lại vẫn làm được ngay |
| Giá của lỗi | Cao (sai tiền, sai phân quyền) → confirm + hoàn tác | Trung bình (sai điểm, sai điểm danh) → sửa tại chỗ, không modal |

**Không có người dùng mobile-primary. Không có phụ huynh/học viên đăng nhập.** Mobile hạ xuống
mức "không được vỡ", không phải mục tiêu tối ưu — đây là thay đổi lớn nhất so với skill gốc,
vốn dành hẳn một mục cho ràng buộc điện thoại.

## Phần 1 — Chuẩn hóa skill

### Giữ nguyên

Toàn bộ lý thuyết: Nielsen H2-1…H2-10, thang severity 0–4, quy trình bốn pha, con số phủ
1 evaluator ≈ 35% / 5 evaluator ≈ 75%, Gestalt, Fitts, affordance/signifier 2×2, bảy kênh
tương phản, giới hạn bộ nhớ làm việc ~7 chunk. Đây là HCI phổ quát.

### Sửa

**a) Bảng "First, name the user"** — thay Teacher/Student bằng bảng Admin/Giáo viên ở trên.
Bỏ mục ràng buộc mobile-first.

**b) 13 hard rules** — giữ 11, sửa 2, thêm 1:

- **Rule 2** (*không truyền tin bằng âm thanh đơn kênh*) vô nghĩa với CRM → thay bằng
  **"Không được mất dữ liệu đang nhập"**: form dài như điểm danh cả lớp hay nhập điểm mock
  test cả lớp không được mất khi lỡ đóng modal hoặc rớt mạng. Repo đã có `OfflineBanner` và
  `utils/retryQueue.js` nên đây là rủi ro có thật.
- **Rule 12** (*constrain student input, not teacher input*) → **"Ràng buộc chặt ô tiền và ô
  điểm, nới ô admin nhập nhanh"**.
- **Rule 14 mới** — **"Mọi con số tổng phải truy ngược được về dòng chi tiết."** Admin không
  tin con số tiền không giải thích được. Áp cho `FeesPage`, `PayrollTab`, các card
  `ReportsPage`.

**Rule 10** (bốn câu hỏi điều hướng) là mũi nhọn của đợt audit: app không dùng react-router,
**URL không bao giờ đổi**, nên không có breadcrumb, không share được link tới một lớp, và
"where have I been" chỉ được mô phỏng bằng History API.

**c) Reference implementations** — skill gốc trỏ tới các component đã đạt chuẩn làm ví dụ. Ở
repo này chưa biết component nào đạt chuẩn, nên **để trống và điền sau khi audit xong**. Trỏ
vào ví dụ chưa kiểm chứng tệ hơn là không trỏ.

**d)** Sửa các chỗ nhắc DictationHub/dictation nằm rải trong 8 file `references/` (grep hiện
~24 lần), gồm cả taxonomy thông tin (Test → Part → Lesson → Segment ⇒ Lớp → Buổi → Học viên)
và trường `description:` ở frontmatter SKILL.md.

## Phần 2 — Quy trình audit

### Bước 0 — môi trường quan sát

`npm run dev` + Playwright chạy qua `npx` (Chromium đã có sẵn trong `~/.cache/ms-playwright`).
**Không thêm dependency vào `package.json`** — đợt audit không để lại dấu vết trong repo.
Chụp ở 1280px là chính; 768px và 375px chỉ để kiểm tra "không vỡ".

Dữ liệu: Supabase thật trong `.env` hiện tại.

### Ràng buộc: read-only

Không bấm bất kỳ nút ghi nào (Lưu / Tạo / Xóa) trên dữ liệu thật.

**Đánh đổi phải ghi vào báo cáo:** bước submit và toàn bộ feedback sau khi lưu (toast, trạng
thái "xong", xử lý lỗi) chỉ được đánh giá bằng **đọc code**, không quan sát trực tiếp. Các phát
hiện thuộc nhóm này phải được đánh dấu rõ là suy ra từ code.

### Vòng 1 — overview

Duyệt lần lượt toàn bộ màn hình — 9 route cộng các tab con, tổng 15 màn (`dashboard`, `classes` list, `classes` detail × 4 tab, `students`,
`fees`, `reports`, `reviews`, `schedule` × 3 tab, `settings`, `admin`). Mỗi trang trả lời:

- Bốn câu hỏi điều hướng: tôi đang ở đâu, đi được đâu, đã đi qua đâu, giờ làm được gì.
- Xếp hạng hành động theo tần suất — hành động hay dùng nhất có chiếm vị trí đắc địa không.
- Có quá ~7 lựa chọn top-level mà không nhóm không.
- Nhóm bằng khoảng trắng và proximity, hay bằng viền.

### Vòng 2 — detail

Đi hết sáu task nghiệp vụ, mỗi task ghi **số click**, **số lần phải nhớ dữ liệu từ màn hình
trước**, và mọi **dead-end** (trạng thái lỗi/rỗng/chờ không có lối đi tiếp):

1. Điểm danh một buổi
2. Thu học phí tháng
3. Ghi danh học viên vào lớp
4. Viết phiếu nhận xét và xuất PDF
5. Nhập điểm mock test
6. Chấm công và xem bảng lương

Mỗi task chạy **hai lượt: vai admin và vai giáo viên thường**. Hai vai thấy giao diện khác nhau
(`usePermissions` + RLS), và nhánh giáo viên là nhánh ít được nhìn nhất nên nhiều khả năng hỏng
nhất.

### Ghi nhận phát hiện

Theo đúng format của giáo trình:

```
N. [H2-x Tên heuristic] [Severity 0-4] [Fix 0-4]
   Mô tả vấn đề — vì sao người dùng nhầm — trang/file cụ thể.
```

Severity chấm **sau khi đã đi hết**, không chấm dọc đường: severity = tần suất × tác động ×
tính lặp lại, mà tần suất chỉ biết được khi đã thấy toàn cảnh. Fix difficulty chấm **riêng
biệt** — đó là cách tách ra nhóm "severity 3, fix 0" đáng làm ngay.

### Giới hạn phải ghi thẳng vào báo cáo

- Một người đánh giá bắt được khoảng **35%** vấn đề. Báo cáo không phải bản đầy đủ.
- Heuristic evaluation **không** trả lời được câu "giao diện có giải đúng bài toán không" —
  nó chỉ phát hiện giao diện dị dạng. Muốn trả lời câu kia cần quan sát người dùng thật.
- Các phát hiện ở bước ghi dữ liệu là suy ra từ code, không phải quan sát.

## Phần 3 — Sản phẩm giao

1. **Skill đã chuẩn hóa** — sửa tại chỗ trong `.claude/skills/usability-review/`, một commit riêng.
2. **Báo cáo audit** — `docs/usability-audit-2026-09-04.md`: bảng phát hiện sắp theo severity
   giảm dần, nhóm theo trang; một mục **"Làm ngay"** gom các mục `severity ≥ 3` và `fix ≤ 1`;
   một mục giới hạn như trên.
3. **Spec này**.

## Ngoài phạm vi

**Không sửa code UI trong đợt này.** Audit ra danh sách ưu tiên, chủ sản phẩm duyệt, rồi việc
sửa mới thành một change riêng — nhiều khả năng là một OpenSpec change vì nó đổi hành vi sản
phẩm. Trộn chẩn đoán và điều trị vào một lượt buộc người duyệt phải đọc code trước khi kịp
duyệt chẩn đoán.

## Phụ thuộc còn chờ

Cần **hai tài khoản đăng nhập** trước khi chạy được vòng 1: một admin, một giáo viên thường.
Chủ sản phẩm sẽ cung cấp. Không có tài khoản giáo viên thường thì mất hẳn một nửa vòng 2 và
báo cáo sẽ thiên lệch có hệ thống về phía admin.
