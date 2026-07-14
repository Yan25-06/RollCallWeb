-- ====================================================
-- MOCK SEED DATA — Anh Ngữ Ms.Phương (rollcall-manager)
-- ====================================================
-- MỤC ĐÍCH  : Dựng bộ dữ liệu mẫu đủ để test mọi tính năng
--             (Dashboard, Fees, Reports, Reviews, Schedule,
--              Classes, MockTest, Students Directory, Admin Panel).
--
-- CẢNH BÁO  :
--   1. Chỉ chạy trong Supabase SQL Editor (quyền owner, bypass RLS).
--      KHÔNG chạy qua app / anon key.
--   2. Ba email dưới đây PHẢI là tài khoản TEST.
--      Cleanup sẽ XÓA toàn bộ dữ liệu của 3 teacher này.
--   3. Điền đầy đủ lhtoan23@clc.fitus.edu.vn, huytoan709@gmail.com,
--      ple27121204@gmail.com trước khi chạy.
--
-- ĐỒNG BỘ   : Cập nhật file này khi đổi schema (thêm cột NOT NULL,
--             đổi CHECK constraint, đổi shape jsonb).
-- ====================================================

-- ====================================================
-- BƯỚC 0  : Điền email 3 giáo viên test vào temp table
-- ====================================================
-- Quy ước UUID mock (dễ nhận biết khi debug):
--   students        : 01000000-0000-0000-0000-0000000000NN
--   classes         : 02000000-0000-0000-0000-0000000000NN
--   enrollments     : 03000000-0000-0000-0000-0000000000NN
--   schedule        : 04000000-0000-0000-0000-0000000000NN
--   sessions        : 05000000-0000-0000-0000-0000000000NN
--   attendance      : 06000000-0000-0000-0000-0000000000NN
--   homeworks       : 07000000-0000-0000-0000-0000000000NN
--   hw_assignments  : 08000000-0000-0000-0000-0000000000NN
--   submissions     : 09000000-0000-0000-0000-0000000000NN
--   fees            : 0a000000-0000-0000-0000-0000000000NN
--   payments        : 0b000000-0000-0000-0000-0000000000NN
--   reviews         : 0c000000-0000-0000-0000-0000000000NN
--   session_reviews : 0d000000-0000-0000-0000-0000000000NN
--   general_comments: 0e000000-0000-0000-0000-0000000000NN
--   mock_tests      : 0f000000-0000-0000-0000-0000000000NN
--   mock_test_results: a0000000-0000-0000-0000-0000000000NN
--   settings        : b1000000-0000-0000-0000-0000000000NN
--   curriculum_months   : d0000000-0000-0000-0000-0000000000NN
--   curriculum_sessions : d1000000-0000-0000-0000-0000000000NN
--   curriculum_materials: d2000000-0000-0000-0000-0000000000NN

DROP TABLE IF EXISTS _seed_teachers;
CREATE TEMP TABLE _seed_teachers AS
SELECT
  (SELECT id FROM public.teachers WHERE email = 'lhtoan23@clc.fitus.edu.vn')    AS t1,
  (SELECT id FROM public.teachers WHERE email = 'huytoan709@gmail.com')    AS t2,
  (SELECT id FROM public.teachers WHERE email = 'ple27121204@gmail.com') AS ta;

-- Fail-fast: dừng nếu bất kỳ email nào không khớp
DO $$
DECLARE v RECORD;
BEGIN
  SELECT * INTO v FROM _seed_teachers;
  IF v.t1 IS NULL THEN
    RAISE EXCEPTION 'TEACHER_1: email "lhtoan23@clc.fitus.edu.vn" không tìm thấy trong bảng teachers. Kiểm tra placeholder.';
  END IF;
  IF v.t2 IS NULL THEN
    RAISE EXCEPTION 'TEACHER_2: email "huytoan709@gmail.com" không tìm thấy trong bảng teachers. Kiểm tra placeholder.';
  END IF;
  IF v.ta IS NULL THEN
    RAISE EXCEPTION 'TEACHER_ADMIN: email "ple27121204@gmail.com" không tìm thấy trong bảng teachers. Kiểm tra placeholder.';
  END IF;
  RAISE NOTICE 'Resolve teacher_id thành công. Tiến hành seed...';
END $$;

-- ====================================================
-- BƯỚC 1  : Cleanup idempotent — xóa dữ liệu mock cũ
-- ====================================================
-- Xóa theo thứ tự: settings → classes (cascade con) → students (cascade con).
-- Không đụng row trong auth.users / teachers.

DELETE FROM public.settings
  WHERE teacher_id IN (SELECT t1 FROM _seed_teachers
                       UNION SELECT t2 FROM _seed_teachers
                       UNION SELECT ta FROM _seed_teachers);

-- Cascade: classes → sessions → attendance/homeworks
--                 → schedule, enrollments, hw_assignments → submissions
--                 → reviews, session_reviews, general_comments
--                 → mock_tests → mock_test_results
--                 → class_materials (ON DELETE CASCADE)
DELETE FROM public.classes
  WHERE teacher_id IN (SELECT t1 FROM _seed_teachers
                       UNION SELECT t2 FROM _seed_teachers
                       UNION SELECT ta FROM _seed_teachers);

-- Cascade: students → fees, payments, mock_test_results, submissions,
--                    attendance, homeworks, reviews, session_reviews,
--                    general_comments, enrollments
DELETE FROM public.students
  WHERE teacher_id IN (SELECT t1 FROM _seed_teachers
                       UNION SELECT t2 FROM _seed_teachers
                       UNION SELECT ta FROM _seed_teachers);

-- ====================================================
-- BƯỚC 1b : Lương giáo viên (session_rate mock)
-- ====================================================
UPDATE public.teachers
  SET session_rate = 250000
  WHERE id = (SELECT t1 FROM _seed_teachers);

UPDATE public.teachers
  SET session_rate = 300000
  WHERE id = (SELECT t2 FROM _seed_teachers);

UPDATE public.teachers
  SET session_rate = 375000
  WHERE id = (SELECT ta FROM _seed_teachers);

-- ====================================================
-- BƯỚC 2  : Settings (1 row / teacher)
-- ====================================================
INSERT INTO public.settings
  (id, teacher_id, teacher_name, center_name, default_fee_per_session, currency)
VALUES
  ('b1000000-0000-0000-0000-000000000001',
   (SELECT t1  FROM _seed_teachers),
   'Cô Lan',        'Anh Ngữ Ms.Phương', 0, 'đ'),
  ('b1000000-0000-0000-0000-000000000002',
   (SELECT t2  FROM _seed_teachers),
   'Thầy Hùng',     'Anh Ngữ Ms.Phương', 0, 'đ'),
  ('b1000000-0000-0000-0000-000000000003',
   (SELECT ta  FROM _seed_teachers),
   'Ms. Phương',    'Anh Ngữ Ms.Phương', 0, 'đ');

-- ====================================================
-- BƯỚC 3  : Students (10 học viên)
-- ====================================================
-- s01-s03: teacher 1 (có lớp)
-- s04-s06: teacher 2 (có lớp)
-- s07-s08: admin teacher (có lớp)
-- s09: teacher 1 — KHÔNG thuộc lớp nào (test filter Students Directory)
-- s10: teacher 2 — KHÔNG thuộc lớp nào
-- Đa dạng: có email / không email, có phone / không phone
INSERT INTO public.students
  (id, teacher_id, name, grade, phone, email)
VALUES
  ('01000000-0000-0000-0000-000000000001',
   (SELECT t1 FROM _seed_teachers),
   'Nguyễn Văn An',     '12',     '0901234567', 'an.nguyen@example.com'),
  ('01000000-0000-0000-0000-000000000002',
   (SELECT t1 FROM _seed_teachers),
   'Trần Thị Bình',     '11',     '0912345678', NULL),
  ('01000000-0000-0000-0000-000000000003',
   (SELECT t1 FROM _seed_teachers),
   'Lê Quốc Cường',     '10',     NULL,          NULL),
  ('01000000-0000-0000-0000-000000000004',
   (SELECT t2 FROM _seed_teachers),
   'Phạm Ngọc Dung',    '12',     '0923456789', 'dung.pham@example.com'),
  ('01000000-0000-0000-0000-000000000005',
   (SELECT t2 FROM _seed_teachers),
   'Hoàng Minh Hải',    '11',     '0934567890', NULL),
  ('01000000-0000-0000-0000-000000000006',
   (SELECT t2 FROM _seed_teachers),
   'Đặng Thị Lan',      '10',     NULL,          'lan.dang@example.com'),
  ('01000000-0000-0000-0000-000000000007',
   (SELECT ta  FROM _seed_teachers),
   'Vũ Thanh Mai',      'Adult',  '0945678901', 'mai.vu@example.com'),
  ('01000000-0000-0000-0000-000000000008',
   (SELECT ta  FROM _seed_teachers),
   'Ngô Thị Ngọc',      'Adult',  NULL,          NULL),
  ('01000000-0000-0000-0000-000000000009',
   (SELECT t1  FROM _seed_teachers),
   'Bùi Văn Phong',     '9',      '0956789012', NULL),
  ('01000000-0000-0000-0000-00000000000a',
   (SELECT t2  FROM _seed_teachers),
   'Dương Thị Quỳnh',   '11',     NULL,          'quynh.duong@example.com');

-- ====================================================
-- BƯỚC 4  : Classes (4 lớp, 2 skill_config khác nhau)
-- ====================================================
-- c01, c02: IELTS (teacher 1) — skill_config mặc định 4 kỹ năng
-- c03: TOEIC (teacher 2) — skill_config custom Listening/Reading
-- c04: Giao tiếp (admin) — skill_config custom 3 kỹ năng
-- (maxScore không còn lưu trong skill_config; lưu trong mock_tests.sections)
INSERT INTO public.classes
  (id, teacher_id, name, level, course_type, max_students,
   schedule_days, schedule_time, schedule_day_list, start_time, end_time, room,
   start_date, skill_config)
VALUES
  ('02000000-0000-0000-0000-000000000001',
   (SELECT t1 FROM _seed_teachers),
   'IELTS Cơ Bản A1', 'IELTS', 'IELTS', 10,
   'Thứ 2, Thứ 5', '08:00 – 10:00',
   '[1,4]'::jsonb, '08:00', '10:00', 'Phòng 101',
   current_date - 90,
   '[{"name":"Listening","order":0},
     {"name":"Reading","order":1},
     {"name":"Writing","order":2},
     {"name":"Speaking","order":3}]'::jsonb),

  ('02000000-0000-0000-0000-000000000002',
   (SELECT t1 FROM _seed_teachers),
   'IELTS Nâng Cao A2', 'IELTS Advanced', 'IELTS', 8,
   'Thứ 3', '14:00 – 16:00',
   '[2]'::jsonb, '14:00', '16:00', 'Phòng 102',
   current_date - 60,
   '[{"name":"Listening","order":0},
     {"name":"Reading","order":1},
     {"name":"Writing","order":2},
     {"name":"Speaking","order":3}]'::jsonb),

  ('02000000-0000-0000-0000-000000000003',
   (SELECT t2 FROM _seed_teachers),
   'TOEIC Intensive B1', 'TOEIC', 'TOEIC', 12,
   'Thứ 4', '18:00 – 20:00',
   '[3]'::jsonb, '18:00', '20:00', 'Phòng 103',
   current_date - 45,
   '[{"name":"Listening","order":0},
     {"name":"Reading","order":1}]'::jsonb),

  ('02000000-0000-0000-0000-000000000004',
   (SELECT ta  FROM _seed_teachers),
   'Giao Tiếp Cơ Bản', 'Giao tiếp', 'Giao tiếp', 6,
   'Thứ 7', '09:00 – 11:00',
   '[6]'::jsonb, '09:00', '11:00', 'Phòng 104',
   current_date - 30,
   '[{"name":"Phát âm","order":0},
     {"name":"Từ vựng","order":1},
     {"name":"Ngữ pháp","order":2}]'::jsonb);

-- ====================================================
-- BƯỚC 4b : Schedule (lịch dạy suy ra từ lịch học lớp)
-- ====================================================
INSERT INTO public.schedule (class_id, day_of_week, start_time, end_time, room)
VALUES
  ('02000000-0000-0000-0000-000000000001', 1, '08:00', '10:00', 'Phòng 101'),
  ('02000000-0000-0000-0000-000000000001', 4, '08:00', '10:00', 'Phòng 101'),
  ('02000000-0000-0000-0000-000000000002', 2, '14:00', '16:00', 'Phòng 102'),
  ('02000000-0000-0000-0000-000000000003', 3, '18:00', '20:00', 'Phòng 103'),
  ('02000000-0000-0000-0000-000000000004', 6, '09:00', '11:00', 'Phòng 104');

-- ====================================================
-- BƯỚC 5  : Enrollments (đủ status + fee_type)
-- ====================================================
-- active, paused (có paused_at), dropped (có dropped_at)
-- fee_type monthly (có monthly_fee) và course (có course_fee)
INSERT INTO public.enrollments
  (id, student_id, class_id, status, fee_type, monthly_fee, course_fee,
   goal, note, enrolled_at, paused_at, dropped_at)
VALUES
  -- c01 (IELTS Cơ Bản) — monthly
  ('03000000-0000-0000-0000-000000000001',
   '01000000-0000-0000-0000-000000000001',  -- s01 An
   '02000000-0000-0000-0000-000000000001',  -- c01
   'active', 'monthly', 2500000, NULL,
   'Đạt IELTS 6.5', NULL,
   now() - interval '90 days', NULL, NULL),

  ('03000000-0000-0000-0000-000000000002',
   '01000000-0000-0000-0000-000000000002',  -- s02 Bình
   '02000000-0000-0000-0000-000000000001',  -- c01
   'paused', 'monthly', 2500000, NULL,
   NULL, 'Tạm nghỉ do bận thi cuối kỳ',
   now() - interval '90 days', now() - interval '30 days', NULL),

  ('03000000-0000-0000-0000-000000000003',
   '01000000-0000-0000-0000-000000000003',  -- s03 Cường
   '02000000-0000-0000-0000-000000000001',  -- c01
   'active', 'monthly', 2500000, NULL,
   'Cải thiện kỹ năng Listening', NULL,
   now() - interval '85 days', NULL, NULL),

  -- c02 (IELTS Nâng Cao) — monthly
  ('03000000-0000-0000-0000-000000000004',
   '01000000-0000-0000-0000-000000000003',  -- s03 Cường học 2 lớp
   '02000000-0000-0000-0000-000000000002',  -- c02
   'active', 'monthly', 3000000, NULL,
   'Nâng band lên 7.0', NULL,
   now() - interval '60 days', NULL, NULL),

  -- c03 (TOEIC) — mixed fee_type
  ('03000000-0000-0000-0000-000000000005',
   '01000000-0000-0000-0000-000000000004',  -- s04 Dung
   '02000000-0000-0000-0000-000000000003',  -- c03
   'active', 'monthly', 1800000, NULL,
   'Đạt TOEIC 750+', NULL,
   now() - interval '45 days', NULL, NULL),

  ('03000000-0000-0000-0000-000000000006',
   '01000000-0000-0000-0000-000000000005',  -- s05 Hải
   '02000000-0000-0000-0000-000000000003',  -- c03
   'dropped', 'course', NULL, 9000000,
   NULL, 'Nghỉ giữa chừng',
   now() - interval '40 days', NULL, now() - interval '15 days'),

  ('03000000-0000-0000-0000-000000000007',
   '01000000-0000-0000-0000-000000000006',  -- s06 Lan
   '02000000-0000-0000-0000-000000000003',  -- c03
   'active', 'course', NULL, 9000000,
   'Đạt TOEIC 700', NULL,
   now() - interval '45 days', NULL, NULL),

  -- c04 (Giao tiếp) — monthly
  ('03000000-0000-0000-0000-000000000008',
   '01000000-0000-0000-0000-000000000007',  -- s07 Mai
   '02000000-0000-0000-0000-000000000004',  -- c04
   'active', 'monthly', 1500000, NULL,
   'Giao tiếp tự tin hơn', NULL,
   now() - interval '30 days', NULL, NULL),

  ('03000000-0000-0000-0000-000000000009',
   '01000000-0000-0000-0000-000000000008',  -- s08 Ngọc
   '02000000-0000-0000-0000-000000000004',  -- c04
   'active', 'monthly', 1500000, NULL,
   NULL, NULL,
   now() - interval '30 days', NULL, NULL);

-- ====================================================
-- BƯỚC 6  : Schedule (lịch dạy cố định của từng lớp)
-- ====================================================
INSERT INTO public.schedule
  (id, class_id, day_of_week, start_time, end_time, room, note)
VALUES
  ('04000000-0000-0000-0000-000000000001',
   '02000000-0000-0000-0000-000000000001',  -- c01
   1, '08:00:00', '10:00:00', 'Phòng 101', 'Thứ 2'),
  ('04000000-0000-0000-0000-000000000002',
   '02000000-0000-0000-0000-000000000001',  -- c01
   4, '08:00:00', '10:00:00', 'Phòng 101', 'Thứ 5'),
  ('04000000-0000-0000-0000-000000000003',
   '02000000-0000-0000-0000-000000000002',  -- c02
   2, '14:00:00', '16:00:00', 'Phòng 201', 'Thứ 3'),
  ('04000000-0000-0000-0000-000000000004',
   '02000000-0000-0000-0000-000000000003',  -- c03
   3, '18:00:00', '20:00:00', 'Phòng 301', 'Thứ 4'),
  ('04000000-0000-0000-0000-000000000005',
   '02000000-0000-0000-0000-000000000004',  -- c04
   6, '09:00:00', '11:00:00', 'Phòng 401', 'Thứ 7');

-- ====================================================
-- BƯỚC 6b : Teacher attendance (chấm công giáo viên mẫu)
-- ====================================================
-- Mô hình opt-in: KHÔNG có record = "Chưa xác nhận" (không tính lương).
-- status='present' = đã dạy (tính lương); status='absent' = vắng.
-- teacher_id = giáo viên phụ trách lớp (join qua schedule → classes).
-- substitute_confirmed = true khi GV dạy thay đã xác nhận buổi đó.
-- Idempotent: cleanup BƯỚC 1 xóa classes → cascade schedule → cascade
-- teacher_attendance, nên insert luôn sạch khi re-run. Thêm
-- on conflict (schedule_id, date) do nothing để an toàn tuyệt đối.
INSERT INTO public.teacher_attendance
  (id, schedule_id, date, teacher_id, status, note, substitute_confirmed)
SELECT v.id, v.schedule_id, v.date, c.teacher_id, v.status, v.note, v.sub_confirmed
FROM (VALUES
  -- c01 ca Thứ 2 (sched01) — buổi tuần trước: có mặt (GV tự xác nhận)
  ('c0000000-0000-0000-0000-000000000001'::uuid,
   '04000000-0000-0000-0000-000000000001'::uuid,
   (current_date - 7)::date, 'present', NULL, false),
  -- c03 ca Thứ 4 (sched04) — buổi tuần trước: vắng (có lý do), chưa có dạy thay
  ('c0000000-0000-0000-0000-000000000002'::uuid,
   '04000000-0000-0000-0000-000000000004'::uuid,
   (current_date - 7)::date, 'absent', 'Giáo viên bận việc gia đình', false),
  -- c04 ca Thứ 7 (sched05) — buổi tuần trước: vắng, có người dạy thay đã xác nhận
  ('c0000000-0000-0000-0000-000000000003'::uuid,
   '04000000-0000-0000-0000-000000000005'::uuid,
   (current_date - 7)::date, 'absent', 'Bận hội thảo', false)
) AS v(id, schedule_id, date, status, note, sub_confirmed)
JOIN public.schedule s ON s.id = v.schedule_id
JOIN public.classes  c ON c.id = s.class_id
ON CONFLICT (schedule_id, date) DO NOTHING;

-- Dạy thay: record vắng c04 (sched05) → t1 dạy thay cho ta, đã xác nhận
UPDATE public.teacher_attendance
  SET substitute_teacher_id = (SELECT t1 FROM _seed_teachers),
      substitute_confirmed   = true
  WHERE id = 'c0000000-0000-0000-0000-000000000003';

-- ====================================================
-- BƯỚC 7  : Sessions (quá khứ / hôm nay / tương lai)
-- ====================================================
INSERT INTO public.sessions
  (id, class_id, date, start_time, end_time, topic, note, created_manually)
VALUES
  -- c01: 2 quá khứ + hôm nay + 1 tương lai
  ('05000000-0000-0000-0000-000000000001',
   '02000000-0000-0000-0000-000000000001',
   current_date - 14, '08:00:00', '10:00:00',
   'Unit 1: Listening Basics', NULL, true),
  ('05000000-0000-0000-0000-000000000002',
   '02000000-0000-0000-0000-000000000001',
   current_date - 7,  '08:00:00', '10:00:00',
   'Unit 2: Reading Skills', NULL, true),
  ('05000000-0000-0000-0000-000000000003',
   '02000000-0000-0000-0000-000000000001',
   current_date,      '08:00:00', '10:00:00',
   'Unit 3: Writing Techniques', 'Có bài kiểm tra nhỏ', true),
  ('05000000-0000-0000-0000-000000000004',
   '02000000-0000-0000-0000-000000000001',
   current_date + 7,  '08:00:00', '10:00:00',
   'Unit 4: Speaking Practice', NULL, true),

  -- c02: 1 quá khứ + hôm nay + 1 tương lai
  ('05000000-0000-0000-0000-000000000005',
   '02000000-0000-0000-0000-000000000002',
   current_date - 14, '14:00:00', '16:00:00',
   'Advanced Reading Strategies', NULL, true),
  ('05000000-0000-0000-0000-000000000006',
   '02000000-0000-0000-0000-000000000002',
   current_date,      '14:00:00', '16:00:00',
   'Advanced Writing Task 2', NULL, true),
  ('05000000-0000-0000-0000-000000000007',
   '02000000-0000-0000-0000-000000000002',
   current_date + 7,  '14:00:00', '16:00:00',
   'Mock Speaking Test', NULL, true),

  -- c03: 2 quá khứ + hôm nay
  ('05000000-0000-0000-0000-000000000008',
   '02000000-0000-0000-0000-000000000003',
   current_date - 21, '18:00:00', '20:00:00',
   'TOEIC Practice Test 1 – Listening', NULL, true),
  ('05000000-0000-0000-0000-000000000009',
   '02000000-0000-0000-0000-000000000003',
   current_date - 7,  '18:00:00', '20:00:00',
   'TOEIC Practice Test 1 – Reading', NULL, true),
  ('05000000-0000-0000-0000-00000000000a',
   '02000000-0000-0000-0000-000000000003',
   current_date,      '18:00:00', '20:00:00',
   'TOEIC Mock Review & Feedback', NULL, true),

  -- c04: 1 quá khứ + hôm nay
  ('05000000-0000-0000-0000-00000000000b',
   '02000000-0000-0000-0000-000000000004',
   current_date - 14, '09:00:00', '11:00:00',
   'Bài 1: Giới thiệu bản thân', NULL, true),
  ('05000000-0000-0000-0000-00000000000c',
   '02000000-0000-0000-0000-000000000004',
   current_date,      '09:00:00', '11:00:00',
   'Bài 2: Giao tiếp hàng ngày', 'Luyện tập roleplay', true);

-- ====================================================
-- BƯỚC 8  : Attendance (quá khứ + hôm nay, mix present/absent)
-- ====================================================
INSERT INTO public.attendance
  (id, session_id, student_id, date, present, note)
VALUES
  -- sess01 (c01, -14d): s01 present, s02 absent, s03 present
  ('06000000-0000-0000-0000-000000000001',
   '05000000-0000-0000-0000-000000000001',
   '01000000-0000-0000-0000-000000000001',
   current_date - 14, true,  NULL),
  ('06000000-0000-0000-0000-000000000002',
   '05000000-0000-0000-0000-000000000001',
   '01000000-0000-0000-0000-000000000002',
   current_date - 14, false, 'Nghỉ không báo'),
  ('06000000-0000-0000-0000-000000000003',
   '05000000-0000-0000-0000-000000000001',
   '01000000-0000-0000-0000-000000000003',
   current_date - 14, true,  NULL),

  -- sess02 (c01, -7d): s01 present, s02 absent, s03 absent
  ('06000000-0000-0000-0000-000000000004',
   '05000000-0000-0000-0000-000000000002',
   '01000000-0000-0000-0000-000000000001',
   current_date - 7,  true,  NULL),
  ('06000000-0000-0000-0000-000000000005',
   '05000000-0000-0000-0000-000000000002',
   '01000000-0000-0000-0000-000000000002',
   current_date - 7,  false, 'Tạm nghỉ'),
  ('06000000-0000-0000-0000-000000000006',
   '05000000-0000-0000-0000-000000000002',
   '01000000-0000-0000-0000-000000000003',
   current_date - 7,  false, 'Bận thi cuối kỳ'),

  -- sess03 (c01, today): s01 present, s02 present, s03 present
  ('06000000-0000-0000-0000-000000000007',
   '05000000-0000-0000-0000-000000000003',
   '01000000-0000-0000-0000-000000000001',
   current_date, true,  NULL),
  ('06000000-0000-0000-0000-000000000008',
   '05000000-0000-0000-0000-000000000003',
   '01000000-0000-0000-0000-000000000002',
   current_date, true,  NULL),
  ('06000000-0000-0000-0000-000000000009',
   '05000000-0000-0000-0000-000000000003',
   '01000000-0000-0000-0000-000000000003',
   current_date, true,  NULL),

  -- sess05 (c02, -14d): s03 present
  ('06000000-0000-0000-0000-00000000000a',
   '05000000-0000-0000-0000-000000000005',
   '01000000-0000-0000-0000-000000000003',
   current_date - 14, true,  NULL),

  -- sess06 (c02, today): s03 present
  ('06000000-0000-0000-0000-00000000000b',
   '05000000-0000-0000-0000-000000000006',
   '01000000-0000-0000-0000-000000000003',
   current_date, true,  NULL),

  -- sess08 (c03, -21d): s04 present, s05 present, s06 absent
  ('06000000-0000-0000-0000-00000000000c',
   '05000000-0000-0000-0000-000000000008',
   '01000000-0000-0000-0000-000000000004',
   current_date - 21, true,  NULL),
  ('06000000-0000-0000-0000-00000000000d',
   '05000000-0000-0000-0000-000000000008',
   '01000000-0000-0000-0000-000000000005',
   current_date - 21, true,  NULL),
  ('06000000-0000-0000-0000-00000000000e',
   '05000000-0000-0000-0000-000000000008',
   '01000000-0000-0000-0000-000000000006',
   current_date - 21, false, 'Có việc bận'),

  -- sess09 (c03, -7d): s04 absent, s06 present  (s05 đã dropped)
  ('06000000-0000-0000-0000-00000000000f',
   '05000000-0000-0000-0000-000000000009',
   '01000000-0000-0000-0000-000000000004',
   current_date - 7,  false, 'Nghỉ phép'),
  ('06000000-0000-0000-0000-000000000010',
   '05000000-0000-0000-0000-000000000009',
   '01000000-0000-0000-0000-000000000006',
   current_date - 7,  true,  NULL),

  -- sess10 (c03, today): s04 present, s06 present
  ('06000000-0000-0000-0000-000000000011',
   '05000000-0000-0000-0000-00000000000a',
   '01000000-0000-0000-0000-000000000004',
   current_date, true,  NULL),
  ('06000000-0000-0000-0000-000000000012',
   '05000000-0000-0000-0000-00000000000a',
   '01000000-0000-0000-0000-000000000006',
   current_date, true,  NULL),

  -- sess11 (c04, -14d): s07 present, s08 absent
  ('06000000-0000-0000-0000-000000000013',
   '05000000-0000-0000-0000-00000000000b',
   '01000000-0000-0000-0000-000000000007',
   current_date - 14, true,  NULL),
  ('06000000-0000-0000-0000-000000000014',
   '05000000-0000-0000-0000-00000000000b',
   '01000000-0000-0000-0000-000000000008',
   current_date - 14, false, 'Không báo trước'),

  -- sess12 (c04, today): s07 present, s08 present
  ('06000000-0000-0000-0000-000000000015',
   '05000000-0000-0000-0000-00000000000c',
   '01000000-0000-0000-0000-000000000007',
   current_date, true,  NULL),
  ('06000000-0000-0000-0000-000000000016',
   '05000000-0000-0000-0000-00000000000c',
   '01000000-0000-0000-0000-000000000008',
   current_date, true,  NULL);

-- ====================================================
-- BƯỚC 9  : Homeworks (đủ 3 progress: not_done/in_progress/done)
-- ====================================================
INSERT INTO public.homeworks
  (id, session_id, student_id, progress, title, note)
VALUES
  -- sess01 (c01, -14d)
  ('07000000-0000-0000-0000-000000000001',
   '05000000-0000-0000-0000-000000000001',
   '01000000-0000-0000-0000-000000000001',
   'done',        'Bài tập Listening Unit 1', 'Làm đầy đủ'),
  ('07000000-0000-0000-0000-000000000002',
   '05000000-0000-0000-0000-000000000001',
   '01000000-0000-0000-0000-000000000002',
   'not_done',    'Bài tập Listening Unit 1', ''),
  ('07000000-0000-0000-0000-000000000003',
   '05000000-0000-0000-0000-000000000001',
   '01000000-0000-0000-0000-000000000003',
   'in_progress', 'Bài tập Listening Unit 1', 'Làm được 60%'),

  -- sess02 (c01, -7d)
  ('07000000-0000-0000-0000-000000000004',
   '05000000-0000-0000-0000-000000000002',
   '01000000-0000-0000-0000-000000000001',
   'done',        'Bài tập Reading Unit 2',   'Làm tốt'),
  ('07000000-0000-0000-0000-000000000005',
   '05000000-0000-0000-0000-000000000002',
   '01000000-0000-0000-0000-000000000002',
   'not_done',    'Bài tập Reading Unit 2',   ''),
  ('07000000-0000-0000-0000-000000000006',
   '05000000-0000-0000-0000-000000000002',
   '01000000-0000-0000-0000-000000000003',
   'done',        'Bài tập Reading Unit 2',   ''),

  -- sess05 (c02, -14d)
  ('07000000-0000-0000-0000-000000000007',
   '05000000-0000-0000-0000-000000000005',
   '01000000-0000-0000-0000-000000000003',
   'in_progress', 'IELTS Writing Task 2',     'Đang viết draft'),

  -- sess08 (c03, -21d)
  ('07000000-0000-0000-0000-000000000008',
   '05000000-0000-0000-0000-000000000008',
   '01000000-0000-0000-0000-000000000004',
   'done',        'TOEIC Vocab Set 1',        ''),
  ('07000000-0000-0000-0000-000000000009',
   '05000000-0000-0000-0000-000000000008',
   '01000000-0000-0000-0000-000000000005',
   'done',        'TOEIC Vocab Set 1',        ''),
  ('07000000-0000-0000-0000-00000000000a',
   '05000000-0000-0000-0000-000000000008',
   '01000000-0000-0000-0000-000000000006',
   'not_done',    'TOEIC Vocab Set 1',        ''),

  -- sess09 (c03, -7d)
  ('07000000-0000-0000-0000-00000000000b',
   '05000000-0000-0000-0000-000000000009',
   '01000000-0000-0000-0000-000000000004',
   'in_progress', 'TOEIC Reading Practice',  'Làm đến Part 6'),
  ('07000000-0000-0000-0000-00000000000c',
   '05000000-0000-0000-0000-000000000009',
   '01000000-0000-0000-0000-000000000006',
   'done',        'TOEIC Reading Practice',  ''),

  -- sess11 (c04, -14d)
  ('07000000-0000-0000-0000-00000000000d',
   '05000000-0000-0000-0000-00000000000b',
   '01000000-0000-0000-0000-000000000007',
   'done',        'Self-introduction script', 'Rất tốt'),
  ('07000000-0000-0000-0000-00000000000e',
   '05000000-0000-0000-0000-00000000000b',
   '01000000-0000-0000-0000-000000000008',
   'not_done',    'Self-introduction script', '');

-- ====================================================
-- BƯỚC 10 : HW Assignments (trải nhiều tháng)
-- ====================================================
INSERT INTO public.hw_assignments
  (id, class_id, title, description, assigned_at, due_date)
VALUES
  ('08000000-0000-0000-0000-000000000001',
   '02000000-0000-0000-0000-000000000001',
   'Listening: Cambridge IELTS Practice Test 1',
   'Làm full Listening test, ghi lại điểm từng section',
   current_date - 30, current_date - 23),

  ('08000000-0000-0000-0000-000000000002',
   '02000000-0000-0000-0000-000000000001',
   'Reading: Skimming & Scanning exercises',
   'Hoàn thành bài tập trong workbook trang 45–52',
   current_date - 25, current_date - 18),

  ('08000000-0000-0000-0000-000000000003',
   '02000000-0000-0000-0000-000000000002',
   'Writing Task 2: Opinion Essay',
   'Viết essay 250 từ về chủ đề môi trường',
   current_date - 60, current_date - 53),

  ('08000000-0000-0000-0000-000000000004',
   '02000000-0000-0000-0000-000000000003',
   'TOEIC Full Practice Test 1',
   'Làm toàn bộ Listening + Reading, ghi thời gian',
   current_date - 45, current_date - 38),

  ('08000000-0000-0000-0000-000000000005',
   '02000000-0000-0000-0000-000000000003',
   'TOEIC Vocabulary: Business & Office',
   'Học 100 từ vựng TOEIC chủ đề Business',
   current_date - 30, current_date - 23);

-- ====================================================
-- BƯỚC 11 : Submissions (submitted/not, graded/not)
-- ====================================================
INSERT INTO public.submissions
  (id, hw_assignment_id, student_id, submitted, score, comment, graded_at)
VALUES
  -- hwa01 (c01 Listening)
  ('09000000-0000-0000-0000-000000000001',
   '08000000-0000-0000-0000-000000000001',
   '01000000-0000-0000-0000-000000000001',
   true, 8.5, 'Rất tốt, cần chú ý Section 4', now() - interval '20 days'),

  ('09000000-0000-0000-0000-000000000002',
   '08000000-0000-0000-0000-000000000001',
   '01000000-0000-0000-0000-000000000002',
   false, NULL, NULL, NULL),

  ('09000000-0000-0000-0000-000000000003',
   '08000000-0000-0000-0000-000000000001',
   '01000000-0000-0000-0000-000000000003',
   true, 7.0, 'Cần cải thiện Section 2', now() - interval '22 days'),

  -- hwa02 (c01 Reading)
  ('09000000-0000-0000-0000-000000000004',
   '08000000-0000-0000-0000-000000000002',
   '01000000-0000-0000-0000-000000000001',
   true, 9.0, 'Xuất sắc!', now() - interval '15 days'),

  ('09000000-0000-0000-0000-000000000005',
   '08000000-0000-0000-0000-000000000002',
   '01000000-0000-0000-0000-000000000003',
   true, NULL, NULL, NULL),  -- submitted chưa chấm

  -- hwa03 (c02 Writing)
  ('09000000-0000-0000-0000-000000000006',
   '08000000-0000-0000-0000-000000000003',
   '01000000-0000-0000-0000-000000000003',
   true, 8.0, 'Lập luận tốt, cần check grammar', now() - interval '50 days'),

  -- hwa04 (c03 TOEIC test)
  ('09000000-0000-0000-0000-000000000007',
   '08000000-0000-0000-0000-000000000004',
   '01000000-0000-0000-0000-000000000004',
   true, 450, 'Tiến bộ tốt so với lần trước', now() - interval '35 days'),

  ('09000000-0000-0000-0000-000000000008',
   '08000000-0000-0000-0000-000000000004',
   '01000000-0000-0000-0000-000000000005',
   false, NULL, NULL, NULL),

  -- hwa05 (c03 TOEIC vocab)
  ('09000000-0000-0000-0000-000000000009',
   '08000000-0000-0000-0000-000000000005',
   '01000000-0000-0000-0000-000000000004',
   true, NULL, NULL, NULL),  -- submitted chưa chấm

  ('09000000-0000-0000-0000-00000000000a',
   '08000000-0000-0000-0000-000000000005',
   '01000000-0000-0000-0000-000000000006',
   false, NULL, NULL, NULL);

-- ====================================================
-- BƯỚC 12 : Fees (trải ≥2 tháng, mix paid T/F, có surcharge)
-- ====================================================
-- Dùng extract(year/month from ...) để tháng luôn khớp current_date
-- class_id gắn theo enrollment tương ứng (fees nay khóa theo từng lớp —
-- s03 Cường học 2 lớp c01+c02 nên chỉ gán phụ phí cho c01, c02 dùng học phí
-- gốc không phụ phí, minh hoạ đúng tính năng tách học phí theo lớp).
INSERT INTO public.fees
  (id, student_id, class_id, year, month, surcharge, paid, note)
VALUES
  -- s01 An (lớp c01): tháng hiện tại chưa đóng, tháng trước đã đóng
  ('0a000000-0000-0000-0000-000000000001',
   '01000000-0000-0000-0000-000000000001',
   '02000000-0000-0000-0000-000000000001',
   EXTRACT(YEAR  FROM current_date)::smallint,
   EXTRACT(MONTH FROM current_date)::smallint,
   0, false, NULL),
  ('0a000000-0000-0000-0000-000000000002',
   '01000000-0000-0000-0000-000000000001',
   '02000000-0000-0000-0000-000000000001',
   EXTRACT(YEAR  FROM current_date - interval '1 month')::smallint,
   EXTRACT(MONTH FROM current_date - interval '1 month')::smallint,
   0, true, NULL),

  -- s03 Cường (lớp c01): tháng này chưa đóng (có phụ phí), tháng trước đã đóng
  ('0a000000-0000-0000-0000-000000000003',
   '01000000-0000-0000-0000-000000000003',
   '02000000-0000-0000-0000-000000000001',
   EXTRACT(YEAR  FROM current_date)::smallint,
   EXTRACT(MONTH FROM current_date)::smallint,
   100000, false, 'Phụ phí học liệu'),
  ('0a000000-0000-0000-0000-000000000004',
   '01000000-0000-0000-0000-000000000003',
   '02000000-0000-0000-0000-000000000001',
   EXTRACT(YEAR  FROM current_date - interval '1 month')::smallint,
   EXTRACT(MONTH FROM current_date - interval '1 month')::smallint,
   0, true, NULL),

  -- s04 Dung (lớp c03): tháng này chưa đóng, tháng trước đã đóng
  ('0a000000-0000-0000-0000-000000000005',
   '01000000-0000-0000-0000-000000000004',
   '02000000-0000-0000-0000-000000000003',
   EXTRACT(YEAR  FROM current_date)::smallint,
   EXTRACT(MONTH FROM current_date)::smallint,
   0, false, NULL),
  ('0a000000-0000-0000-0000-000000000006',
   '01000000-0000-0000-0000-000000000004',
   '02000000-0000-0000-0000-000000000003',
   EXTRACT(YEAR  FROM current_date - interval '1 month')::smallint,
   EXTRACT(MONTH FROM current_date - interval '1 month')::smallint,
   0, true, NULL),

  -- s07 Mai (lớp c04): tháng này chưa đóng (có phụ phí), tháng trước đã đóng
  ('0a000000-0000-0000-0000-000000000007',
   '01000000-0000-0000-0000-000000000007',
   '02000000-0000-0000-0000-000000000004',
   EXTRACT(YEAR  FROM current_date)::smallint,
   EXTRACT(MONTH FROM current_date)::smallint,
   50000, false, 'Phụ phí photocopy'),
  ('0a000000-0000-0000-0000-000000000008',
   '01000000-0000-0000-0000-000000000007',
   '02000000-0000-0000-0000-000000000004',
   EXTRACT(YEAR  FROM current_date - interval '1 month')::smallint,
   EXTRACT(MONTH FROM current_date - interval '1 month')::smallint,
   0, true, NULL);

-- ====================================================
-- BƯỚC 13 : Payments (cash + transfer, nhiều period)
-- ====================================================
INSERT INTO public.payments
  (id, student_id, class_id, amount, paid_at, method, period, note)
VALUES
  ('0b000000-0000-0000-0000-000000000001',
   '01000000-0000-0000-0000-000000000001',
   '02000000-0000-0000-0000-000000000001',
   2500000,
   current_date - 30, 'cash',
   'Tháng ' || to_char(current_date - interval '1 month', 'MM/YYYY'),
   NULL),

  ('0b000000-0000-0000-0000-000000000002',
   '01000000-0000-0000-0000-000000000003',
   '02000000-0000-0000-0000-000000000001',
   2500000,
   current_date - 28, 'transfer',
   'Tháng ' || to_char(current_date - interval '1 month', 'MM/YYYY'),
   'Chuyển khoản Vietcombank'),

  ('0b000000-0000-0000-0000-000000000003',
   '01000000-0000-0000-0000-000000000004',
   '02000000-0000-0000-0000-000000000003',
   1800000,
   current_date - 27, 'cash',
   'Tháng ' || to_char(current_date - interval '1 month', 'MM/YYYY'),
   NULL),

  ('0b000000-0000-0000-0000-000000000004',
   '01000000-0000-0000-0000-000000000007',
   '02000000-0000-0000-0000-000000000004',
   1500000,
   current_date - 25, 'transfer',
   'Tháng ' || to_char(current_date - interval '1 month', 'MM/YYYY'),
   NULL),

  ('0b000000-0000-0000-0000-000000000005',
   '01000000-0000-0000-0000-000000000006',
   '02000000-0000-0000-0000-000000000003',
   9000000,
   current_date - 45, 'cash',
   'Học phí cả khóa',
   'Đóng một lần đầu khóa');

-- ====================================================
-- BƯỚC 14 : Reviews (scores jsonb khớp skill_config lớp)
-- ====================================================
-- c01 keys: Listening, Reading, Writing, Speaking (max 9)
-- c03 keys: Listening, Reading (max 495)
-- c04 keys: Phát âm, Từ vựng, Ngữ pháp (max 10)
INSERT INTO public.reviews
  (id, student_id, class_id, date,
   scores, score_max, remark, tags, advice,
   teacher_name, absent, absent_reason)
VALUES
  -- s01 An / c01 — 2 reviews tiến bộ
  ('0c000000-0000-0000-0000-000000000001',
   '01000000-0000-0000-0000-000000000001',
   '02000000-0000-0000-0000-000000000001',
   current_date - 14,
   '{"Listening":7,"Reading":6.5,"Writing":7.5,"Speaking":8}'::jsonb,
   '{"Listening":9,"Reading":9,"Writing":9,"Speaking":9}'::jsonb,
   'An học nghiêm túc, cần luyện thêm Reading.',
   ARRAY['chăm chỉ','tiến bộ'],
   'Tăng cường đọc sách tiếng Anh mỗi ngày.',
   'Cô Lan', false, NULL),

  ('0c000000-0000-0000-0000-000000000002',
   '01000000-0000-0000-0000-000000000001',
   '02000000-0000-0000-0000-000000000001',
   current_date - 7,
   '{"Listening":7.5,"Reading":7,"Writing":8,"Speaking":8.5}'::jsonb,
   '{"Listening":9,"Reading":9,"Writing":9,"Speaking":9}'::jsonb,
   'Tiến bộ rõ rệt so với tuần trước.',
   ARRAY['xuất sắc','tiến bộ'],
   'Tiếp tục duy trì phong độ tốt.',
   'Cô Lan', false, NULL),

  -- s02 Bình / c01 — absent
  ('0c000000-0000-0000-0000-000000000003',
   '01000000-0000-0000-0000-000000000002',
   '02000000-0000-0000-0000-000000000001',
   current_date - 7,
   '{}'::jsonb,
   '{}'::jsonb,
   NULL,
   ARRAY[]::text[],
   NULL,
   'Cô Lan', true, 'Bận việc gia đình'),

  -- s03 Cường / c01
  ('0c000000-0000-0000-0000-000000000004',
   '01000000-0000-0000-0000-000000000003',
   '02000000-0000-0000-0000-000000000001',
   current_date - 14,
   '{"Listening":6,"Reading":5.5,"Writing":6,"Speaking":7}'::jsonb,
   '{"Listening":9,"Reading":9,"Writing":9,"Speaking":9}'::jsonb,
   'Cần chú ý hơn vào phần Writing.',
   ARRAY['cần cố gắng'],
   'Làm thêm bài tập Grammar mỗi tối.',
   'Cô Lan', false, NULL),

  -- s04 Dung / c03 — TOEIC, 2 reviews xu hướng tăng
  ('0c000000-0000-0000-0000-000000000005',
   '01000000-0000-0000-0000-000000000004',
   '02000000-0000-0000-0000-000000000003',
   current_date - 21,
   '{"Listening":380,"Reading":350}'::jsonb,
   '{"Listening":495,"Reading":495}'::jsonb,
   'Listening tốt hơn Reading.',
   ARRAY['chăm chỉ'],
   'Luyện Part 7 Reading thêm.',
   'Thầy Hùng', false, NULL),

  ('0c000000-0000-0000-0000-000000000006',
   '01000000-0000-0000-0000-000000000004',
   '02000000-0000-0000-0000-000000000003',
   current_date - 7,
   '{"Listening":400,"Reading":370}'::jsonb,
   '{"Listening":495,"Reading":495}'::jsonb,
   'Cải thiện đều cả hai kỹ năng.',
   ARRAY['tiến bộ'],
   'Mục tiêu 750+ trong tháng tới.',
   'Thầy Hùng', false, NULL),

  -- s06 Lan / c03
  ('0c000000-0000-0000-0000-000000000007',
   '01000000-0000-0000-0000-000000000006',
   '02000000-0000-0000-0000-000000000003',
   current_date - 21,
   '{"Listening":350,"Reading":320}'::jsonb,
   '{"Listening":495,"Reading":495}'::jsonb,
   'Cần tập trung vào từ vựng thêm.',
   ARRAY['cần cố gắng'],
   'Học 20 từ TOEIC mỗi ngày.',
   'Thầy Hùng', false, NULL),

  -- s07 Mai / c04 — Giao tiếp
  ('0c000000-0000-0000-0000-000000000008',
   '01000000-0000-0000-0000-000000000007',
   '02000000-0000-0000-0000-000000000004',
   current_date - 14,
   '{"Phát âm":8,"Từ vựng":7,"Ngữ pháp":6}'::jsonb,
   '{"Phát âm":10,"Từ vựng":10,"Ngữ pháp":10}'::jsonb,
   'Phát âm tốt, ngữ pháp cần củng cố.',
   ARRAY['chăm chỉ'],
   'Xem lại phần tense và article.',
   'Ms. Phương', false, NULL);

-- ====================================================
-- BƯỚC 15 : Session Reviews & General Comments
-- ====================================================
INSERT INTO public.session_reviews
  (id, student_id, class_id, session_id, text)
VALUES
  ('0d000000-0000-0000-0000-000000000001',
   '01000000-0000-0000-0000-000000000001',
   '02000000-0000-0000-0000-000000000001',
   '05000000-0000-0000-0000-000000000001',
   'An tiến bộ rõ rệt trong bài Listening, phát âm cải thiện nhiều so với tuần trước.'),
  ('0d000000-0000-0000-0000-000000000002',
   '01000000-0000-0000-0000-000000000003',
   '02000000-0000-0000-0000-000000000001',
   '05000000-0000-0000-0000-000000000002',
   'Cường cần chú ý hơn vào kỹ năng skimming khi đọc bài dài.'),
  ('0d000000-0000-0000-0000-000000000003',
   '01000000-0000-0000-0000-000000000004',
   '02000000-0000-0000-0000-000000000003',
   '05000000-0000-0000-0000-000000000009',
   'Dung cần ôn lại từ vựng phần Part 5 và luyện tốc độ đọc cho Part 7.');

INSERT INTO public.general_comments
  (id, student_id, class_id, text)
VALUES
  ('0e000000-0000-0000-0000-000000000001',
   '01000000-0000-0000-0000-000000000001',
   '02000000-0000-0000-0000-000000000001',
   'Học viên có tiềm năng tốt, cần tăng cường luyện tập tại nhà và làm thêm mock test.'),
  ('0e000000-0000-0000-0000-000000000002',
   '01000000-0000-0000-0000-000000000004',
   '02000000-0000-0000-0000-000000000003',
   'Cần tập trung cải thiện Reading comprehension và time management cho Part 7.'),
  ('0e000000-0000-0000-0000-000000000003',
   '01000000-0000-0000-0000-000000000007',
   '02000000-0000-0000-0000-000000000004',
   'Phát âm và intonation cần được chú ý thêm; giao tiếp tự nhiên đang cải thiện tốt.');

-- ====================================================
-- BƯỚC 16 : Mock Tests (≥2 mốc tháng / lớp)
-- ====================================================
-- sections shape: [{name, maxScore, order}] — khớp skill_config của lớp
INSERT INTO public.mock_tests
  (id, class_id, title, date, sections, teacher_note)
VALUES
  -- c01 IELTS — 2 mốc (~tháng này và tháng trước)
  ('0f000000-0000-0000-0000-000000000001',
   '02000000-0000-0000-0000-000000000001',
   'IELTS Mock Test #1',
   current_date - 30,
   '[{"name":"Listening","maxScore":9,"order":0},
     {"name":"Reading","maxScore":9,"order":1},
     {"name":"Writing","maxScore":9,"order":2},
     {"name":"Speaking","maxScore":9,"order":3}]'::jsonb,
   'Đề Cambridge Academic Test 1'),

  ('0f000000-0000-0000-0000-000000000002',
   '02000000-0000-0000-0000-000000000001',
   'IELTS Mock Test #2',
   current_date - 60,
   '[{"name":"Listening","maxScore":9,"order":0},
     {"name":"Reading","maxScore":9,"order":1},
     {"name":"Writing","maxScore":9,"order":2},
     {"name":"Speaking","maxScore":9,"order":3}]'::jsonb,
   'Đề Cambridge Academic Test 2'),

  -- c03 TOEIC — 2 mốc
  ('0f000000-0000-0000-0000-000000000003',
   '02000000-0000-0000-0000-000000000003',
   'TOEIC Practice Test #1',
   current_date - 30,
   '[{"name":"Listening","maxScore":495,"order":0},
     {"name":"Reading","maxScore":495,"order":1}]'::jsonb,
   'ETS Official Practice'),

  ('0f000000-0000-0000-0000-000000000004',
   '02000000-0000-0000-0000-000000000003',
   'TOEIC Practice Test #2',
   current_date - 60,
   '[{"name":"Listening","maxScore":495,"order":0},
     {"name":"Reading","maxScore":495,"order":1}]'::jsonb,
   'ETS Official Practice');

-- ====================================================
-- BƯỚC 17 : Mock Test Results (scores keyed theo section)
-- ====================================================
INSERT INTO public.mock_test_results
  (id, mock_test_id, student_id, scores, total_score, teacher_note)
VALUES
  -- mt01 IELTS #1
  ('a0000000-0000-0000-0000-000000000001',
   '0f000000-0000-0000-0000-000000000001',
   '01000000-0000-0000-0000-000000000001',
   '{"Listening":7,"Reading":6.5,"Writing":7.5,"Speaking":8}'::jsonb,
   29, 'Band 7.25 overall'),

  ('a0000000-0000-0000-0000-000000000002',
   '0f000000-0000-0000-0000-000000000001',
   '01000000-0000-0000-0000-000000000003',
   '{"Listening":5.5,"Reading":5,"Writing":6,"Speaking":6.5}'::jsonb,
   23, 'Cần nâng Reading'),

  -- mt02 IELTS #2 (older, trend data)
  ('a0000000-0000-0000-0000-000000000003',
   '0f000000-0000-0000-0000-000000000002',
   '01000000-0000-0000-0000-000000000001',
   '{"Listening":7.5,"Reading":7,"Writing":8,"Speaking":8.5}'::jsonb,
   31, 'Tiến bộ rõ so với Test 1'),

  ('a0000000-0000-0000-0000-000000000004',
   '0f000000-0000-0000-0000-000000000002',
   '01000000-0000-0000-0000-000000000003',
   '{"Listening":6,"Reading":5.5,"Writing":6.5,"Speaking":7}'::jsonb,
   25, 'Cải thiện đều'),

  -- mt03 TOEIC #1
  ('a0000000-0000-0000-0000-000000000005',
   '0f000000-0000-0000-0000-000000000003',
   '01000000-0000-0000-0000-000000000004',
   '{"Listening":380,"Reading":350}'::jsonb,
   730, NULL),

  ('a0000000-0000-0000-0000-000000000006',
   '0f000000-0000-0000-0000-000000000003',
   '01000000-0000-0000-0000-000000000006',
   '{"Listening":360,"Reading":340}'::jsonb,
   700, NULL),

  -- mt04 TOEIC #2 (older, trend data)
  ('a0000000-0000-0000-0000-000000000007',
   '0f000000-0000-0000-0000-000000000004',
   '01000000-0000-0000-0000-000000000004',
   '{"Listening":410,"Reading":370}'::jsonb,
   780, 'Tăng 50 điểm so với lần 1'),

  ('a0000000-0000-0000-0000-000000000008',
   '0f000000-0000-0000-0000-000000000004',
   '01000000-0000-0000-0000-000000000006',
   '{"Listening":380,"Reading":360}'::jsonb,
   740, 'Tiến bộ tốt');

-- ====================================================
-- BƯỚC 17b: Tài liệu giảng dạy (class_materials)
-- ====================================================
-- UUID prefix: c0000000-0000-0000-0000-0000000000NN
INSERT INTO public.class_materials
  (id, class_id, title, url, type, created_by)
VALUES
  ('c0000000-0000-0000-0000-000000000001',
   '02000000-0000-0000-0000-000000000001',
   'Slide Unit 5 - Present Perfect',
   'https://drive.google.com/file/d/mock-slide-u5',
   'slide',
   (SELECT t1 FROM _seed_teachers)),

  ('c0000000-0000-0000-0000-000000000002',
   '02000000-0000-0000-0000-000000000001',
   'Handout Grammar Unit 5',
   'https://docs.google.com/document/d/mock-handout-u5',
   'handout',
   (SELECT t1 FROM _seed_teachers)),

  ('c0000000-0000-0000-0000-000000000003',
   '02000000-0000-0000-0000-000000000002',
   'Listening Practice IELTS 6.5',
   'https://www.youtube.com/watch?v=mock-listening',
   'listening',
   (SELECT t1 FROM _seed_teachers)),

  ('c0000000-0000-0000-0000-000000000004',
   '02000000-0000-0000-0000-000000000002',
   'Speaking Part 2 Cue Cards',
   'https://drive.google.com/file/d/mock-speaking',
   'speaking',
   (SELECT t1 FROM _seed_teachers));

-- ====================================================
-- BƯỚC 17c : Giáo trình mẫu (curriculum_months/sessions/materials)
-- ====================================================
-- Giáo trình dùng CHUNG theo course_type (không gắn teacher_id) nên cleanup
-- scope theo course_type + month_no thay vì theo teacher mock.
-- UUID prefix: months d0000000-..., sessions d1000000-..., materials d2000000-...
DELETE FROM public.curriculum_months WHERE course_type = 'IELTS' AND month_no = 1;

WITH m AS (
  INSERT INTO public.curriculum_months (id, course_type, month_no, title, created_by)
  VALUES (
    'd0000000-0000-0000-0000-000000000001',
    'IELTS', 1, 'XÂY DỰNG NỀN TẢNG CƠ BẢN',
    (SELECT ta FROM _seed_teachers)
  )
  RETURNING id
), s1 AS (
  INSERT INTO public.curriculum_sessions (id, month_id, week_no, session_no, skill, content, note, created_by)
  SELECT
    'd1000000-0000-0000-0000-000000000001', m.id, 1, 1,
    'Reading', 'Khởi động: từ loại, cụm từ & mệnh đề. Paraphrasing.', NULL,
    (SELECT ta FROM _seed_teachers)
  FROM m
  RETURNING id
)
INSERT INTO public.curriculum_materials (id, session_id, type, title, url, order_index, created_by)
SELECT 'd2000000-0000-0000-0000-000000000001', s1.id, 'ppt', 'Slide Unit 1', 'https://example.com/slide1', 0, (SELECT ta FROM _seed_teachers) FROM s1
UNION ALL
SELECT 'd2000000-0000-0000-0000-000000000002', s1.id, 'homework', 'Homework Unit 1', 'https://forms.gle/example1', 1, (SELECT ta FROM _seed_teachers) FROM s1;

-- ====================================================
-- BƯỚC 18 : Verification — đếm row đã seed
-- ====================================================
SELECT 'settings'         AS bảng, count(*) AS rows FROM public.settings         WHERE teacher_id IN (SELECT t1 FROM _seed_teachers UNION SELECT t2 FROM _seed_teachers UNION SELECT ta FROM _seed_teachers)
UNION ALL
SELECT 'students',               count(*) FROM public.students         WHERE teacher_id IN (SELECT t1 FROM _seed_teachers UNION SELECT t2 FROM _seed_teachers UNION SELECT ta FROM _seed_teachers)
UNION ALL
SELECT 'classes',                count(*) FROM public.classes          WHERE teacher_id IN (SELECT t1 FROM _seed_teachers UNION SELECT t2 FROM _seed_teachers UNION SELECT ta FROM _seed_teachers)
UNION ALL
SELECT 'enrollments',            count(*) FROM public.enrollments      WHERE student_id IN (SELECT id FROM public.students WHERE teacher_id IN (SELECT t1 FROM _seed_teachers UNION SELECT t2 FROM _seed_teachers UNION SELECT ta FROM _seed_teachers))
UNION ALL
SELECT 'schedule',               count(*) FROM public.schedule         WHERE class_id   IN (SELECT id FROM public.classes  WHERE teacher_id IN (SELECT t1 FROM _seed_teachers UNION SELECT t2 FROM _seed_teachers UNION SELECT ta FROM _seed_teachers))
UNION ALL
SELECT 'sessions',               count(*) FROM public.sessions         WHERE class_id   IN (SELECT id FROM public.classes  WHERE teacher_id IN (SELECT t1 FROM _seed_teachers UNION SELECT t2 FROM _seed_teachers UNION SELECT ta FROM _seed_teachers))
UNION ALL
SELECT 'teacher_attendance',      count(*) FROM public.teacher_attendance WHERE schedule_id IN (SELECT id FROM public.schedule WHERE class_id IN (SELECT id FROM public.classes WHERE teacher_id IN (SELECT t1 FROM _seed_teachers UNION SELECT t2 FROM _seed_teachers UNION SELECT ta FROM _seed_teachers)))
UNION ALL
SELECT 'attendance',             count(*) FROM public.attendance       WHERE student_id IN (SELECT id FROM public.students WHERE teacher_id IN (SELECT t1 FROM _seed_teachers UNION SELECT t2 FROM _seed_teachers UNION SELECT ta FROM _seed_teachers))
UNION ALL
SELECT 'homeworks',              count(*) FROM public.homeworks        WHERE student_id IN (SELECT id FROM public.students WHERE teacher_id IN (SELECT t1 FROM _seed_teachers UNION SELECT t2 FROM _seed_teachers UNION SELECT ta FROM _seed_teachers))
UNION ALL
SELECT 'hw_assignments',         count(*) FROM public.hw_assignments   WHERE class_id   IN (SELECT id FROM public.classes  WHERE teacher_id IN (SELECT t1 FROM _seed_teachers UNION SELECT t2 FROM _seed_teachers UNION SELECT ta FROM _seed_teachers))
UNION ALL
SELECT 'submissions',            count(*) FROM public.submissions      WHERE student_id IN (SELECT id FROM public.students WHERE teacher_id IN (SELECT t1 FROM _seed_teachers UNION SELECT t2 FROM _seed_teachers UNION SELECT ta FROM _seed_teachers))
UNION ALL
SELECT 'fees',                   count(*) FROM public.fees             WHERE student_id IN (SELECT id FROM public.students WHERE teacher_id IN (SELECT t1 FROM _seed_teachers UNION SELECT t2 FROM _seed_teachers UNION SELECT ta FROM _seed_teachers))
UNION ALL
SELECT 'payments',               count(*) FROM public.payments         WHERE student_id IN (SELECT id FROM public.students WHERE teacher_id IN (SELECT t1 FROM _seed_teachers UNION SELECT t2 FROM _seed_teachers UNION SELECT ta FROM _seed_teachers))
UNION ALL
SELECT 'reviews',                count(*) FROM public.reviews          WHERE student_id IN (SELECT id FROM public.students WHERE teacher_id IN (SELECT t1 FROM _seed_teachers UNION SELECT t2 FROM _seed_teachers UNION SELECT ta FROM _seed_teachers))
UNION ALL
SELECT 'session_reviews',        count(*) FROM public.session_reviews  WHERE student_id IN (SELECT id FROM public.students WHERE teacher_id IN (SELECT t1 FROM _seed_teachers UNION SELECT t2 FROM _seed_teachers UNION SELECT ta FROM _seed_teachers))
UNION ALL
SELECT 'general_comments',       count(*) FROM public.general_comments WHERE student_id IN (SELECT id FROM public.students WHERE teacher_id IN (SELECT t1 FROM _seed_teachers UNION SELECT t2 FROM _seed_teachers UNION SELECT ta FROM _seed_teachers))
UNION ALL
SELECT 'mock_tests',             count(*) FROM public.mock_tests       WHERE class_id   IN (SELECT id FROM public.classes  WHERE teacher_id IN (SELECT t1 FROM _seed_teachers UNION SELECT t2 FROM _seed_teachers UNION SELECT ta FROM _seed_teachers))
UNION ALL
SELECT 'mock_test_results',      count(*) FROM public.mock_test_results WHERE student_id IN (SELECT id FROM public.students WHERE teacher_id IN (SELECT t1 FROM _seed_teachers UNION SELECT t2 FROM _seed_teachers UNION SELECT ta FROM _seed_teachers))
UNION ALL
SELECT 'class_materials',        count(*) FROM public.class_materials  WHERE class_id   IN (SELECT id FROM public.classes  WHERE teacher_id IN (SELECT t1 FROM _seed_teachers UNION SELECT t2 FROM _seed_teachers UNION SELECT ta FROM _seed_teachers))
ORDER BY 1;

-- Kết quả mong đợi (lần đầu và lần re-run phải như nhau — idempotent):
--   settings         3
--   students         10
--   classes          4
--   enrollments      9
--   schedule         5
--   sessions         12
--   teacher_attendance 3
--   attendance       22
--   homeworks        14
--   hw_assignments   5
--   submissions      10
--   fees             8
--   payments         5
--   reviews          8
--   session_reviews  3
--   general_comments 3
--   class_materials  4
--   mock_tests       4
--   mock_test_results 8
