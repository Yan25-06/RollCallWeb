-- =========================================================================
-- Tách học phí/thanh toán theo TỪNG LỚP thay vì gộp theo học sinh.
--
-- Vấn đề: fees(student_id, year, month) và payments không phân biệt lớp.
-- Học sinh học ≥2 lớp bị buildFeesRows() chỉ lấy 1 enrollment active đầu
-- tiên (dòng học phí thiếu 1 lớp), còn "đã đóng" thì cộng dồn MỌI khoản
-- thanh toán của học sinh bất kể trả cho lớp nào.
--
-- Sửa: thêm fees.class_id, đổi unique key sang (student_id, class_id,
-- year, month). Backfill fees/payments cũ: học sinh chỉ có đúng 1
-- enrollment active → gán class_id đó; học sinh đa lớp → giữ NULL (không
-- đoán được thuộc lớp nào — app tầng service sẽ loại các dòng NULL này
-- khỏi "đã đóng" theo từng lớp).
--
-- Không đổi RLS: cột mới không ảnh hưởng quyền ghi, chỉ ảnh hưởng ý nghĩa
-- dữ liệu. fees/payments vẫn admin-only UI như trước.
--
-- Rollback: drop constraint "fees_student_class_year_month_key", drop
-- column fees.class_id, re-create unique (student_id, year, month).
-- payments.class_id đã tồn tại từ đầu (20260101000005) nên không rollback
-- cột đó — chỉ cần bỏ phần backfill (không thể tự động undo backfill).
-- =========================================================================

alter table public.fees add column class_id uuid references public.classes(id) on delete cascade;

-- Backfill fees: học sinh chỉ có đúng 1 enrollment active tại thời điểm chạy
-- (uuid không có aggregate min/max sẵn trong Postgres → dùng array_agg lấy
-- phần tử duy nhất).
update public.fees f
set class_id = e.only_class_id
from (
  select student_id, (array_agg(class_id))[1] as only_class_id
  from public.enrollments
  where status <> 'dropped'
  group by student_id
  having count(*) = 1
) e
where f.student_id = e.student_id
  and f.class_id is null;

-- Backfill payments cũ theo cùng quy tắc (giữ NULL nếu học sinh đa lớp)
update public.payments p
set class_id = e.only_class_id
from (
  select student_id, (array_agg(class_id))[1] as only_class_id
  from public.enrollments
  where status <> 'dropped'
  group by student_id
  having count(*) = 1
) e
where p.student_id = e.student_id
  and p.class_id is null;

alter table public.fees drop constraint fees_student_id_year_month_key;
alter table public.fees add constraint fees_student_class_year_month_key
  unique (student_id, class_id, year, month);
