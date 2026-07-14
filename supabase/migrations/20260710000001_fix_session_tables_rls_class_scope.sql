-- =========================================================================
-- Fix: quyền ghi/đọc các bảng nghiệp vụ theo buổi/học sinh khóa theo NGƯỜI
-- PHỤ TRÁCH LỚP, không theo người sở hữu học sinh (students.teacher_id).
--
-- Vấn đề: policy cũ (20260602000001) khóa attendance/homeworks/submissions/
-- mock_test_results theo `students.teacher_id = auth.uid()`. Nhưng trong mô
-- hình multi-teacher, admin tạo học sinh (students.teacher_id = admin) rồi GIAO
-- lớp cho giáo viên thường. Giáo viên đó thấy lớp + học sinh (qua quyền sở hữu
-- lớp — enrollments/sessions khóa theo classes.teacher_id) nhưng KHÔNG ghi được
-- điểm danh, bài tập, nộp bài, điểm mock test vì học sinh không "thuộc" họ →
-- Postgres chặn INSERT/UPDATE ("new row violates row-level security policy").
--
-- Sửa: căn quyền theo lớp mà buổi/bài/đề thuộc về:
--   attendance         : session_id      → sessions.class_id      → classes.teacher_id
--   homeworks          : session_id      → sessions.class_id      → classes.teacher_id
--   submissions        : hw_assignment_id→ hw_assignments.class_id→ classes.teacher_id
--   mock_test_results  : mock_test_id    → mock_tests.class_id    → classes.teacher_id
-- (reviews/session_reviews/general_comments đã khóa theo class_id nên không đụng.
--  fees/payments giữ nguyên — chỉ admin thao tác ở UI, admin có full write riêng.)
--
-- Admin vẫn full write qua policy độc lập ở 20260604000001 — không đụng tới.
--
-- Rollback: drop 16 policy tạo ở đây, re-create policy student-keyed gốc
-- (nội dung trong 20260602000001).
-- =========================================================================

-- -------------------------------------------------------------------------
-- attendance
-- -------------------------------------------------------------------------
drop policy if exists "attendance: teacher or admin select" on public.attendance;
drop policy if exists "attendance: teacher insert" on public.attendance;
drop policy if exists "attendance: teacher update" on public.attendance;
drop policy if exists "attendance: teacher delete" on public.attendance;

create policy "attendance: teacher or admin select"
  on public.attendance for select
  using (
    is_admin() or
    exists (
      select 1 from public.sessions s
      join public.classes c on c.id = s.class_id
      where s.id = session_id and c.teacher_id = auth.uid()
    )
  );

create policy "attendance: teacher insert"
  on public.attendance for insert
  with check (
    exists (
      select 1 from public.sessions s
      join public.classes c on c.id = s.class_id
      where s.id = session_id and c.teacher_id = auth.uid()
    )
  );

create policy "attendance: teacher update"
  on public.attendance for update
  using (
    exists (
      select 1 from public.sessions s
      join public.classes c on c.id = s.class_id
      where s.id = session_id and c.teacher_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.sessions s
      join public.classes c on c.id = s.class_id
      where s.id = session_id and c.teacher_id = auth.uid()
    )
  );

create policy "attendance: teacher delete"
  on public.attendance for delete
  using (
    exists (
      select 1 from public.sessions s
      join public.classes c on c.id = s.class_id
      where s.id = session_id and c.teacher_id = auth.uid()
    )
  );

-- -------------------------------------------------------------------------
-- homeworks
-- -------------------------------------------------------------------------
drop policy if exists "homeworks: teacher or admin select" on public.homeworks;
drop policy if exists "homeworks: teacher insert" on public.homeworks;
drop policy if exists "homeworks: teacher update" on public.homeworks;
drop policy if exists "homeworks: teacher delete" on public.homeworks;

create policy "homeworks: teacher or admin select"
  on public.homeworks for select
  using (
    is_admin() or
    exists (
      select 1 from public.sessions s
      join public.classes c on c.id = s.class_id
      where s.id = session_id and c.teacher_id = auth.uid()
    )
  );

create policy "homeworks: teacher insert"
  on public.homeworks for insert
  with check (
    exists (
      select 1 from public.sessions s
      join public.classes c on c.id = s.class_id
      where s.id = session_id and c.teacher_id = auth.uid()
    )
  );

create policy "homeworks: teacher update"
  on public.homeworks for update
  using (
    exists (
      select 1 from public.sessions s
      join public.classes c on c.id = s.class_id
      where s.id = session_id and c.teacher_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.sessions s
      join public.classes c on c.id = s.class_id
      where s.id = session_id and c.teacher_id = auth.uid()
    )
  );

create policy "homeworks: teacher delete"
  on public.homeworks for delete
  using (
    exists (
      select 1 from public.sessions s
      join public.classes c on c.id = s.class_id
      where s.id = session_id and c.teacher_id = auth.uid()
    )
  );

-- -------------------------------------------------------------------------
-- submissions
-- -------------------------------------------------------------------------
drop policy if exists "submissions: teacher or admin select" on public.submissions;
drop policy if exists "submissions: teacher insert" on public.submissions;
drop policy if exists "submissions: teacher update" on public.submissions;
drop policy if exists "submissions: teacher delete" on public.submissions;

create policy "submissions: teacher or admin select"
  on public.submissions for select
  using (
    is_admin() or
    exists (
      select 1 from public.hw_assignments h
      join public.classes c on c.id = h.class_id
      where h.id = hw_assignment_id and c.teacher_id = auth.uid()
    )
  );

create policy "submissions: teacher insert"
  on public.submissions for insert
  with check (
    exists (
      select 1 from public.hw_assignments h
      join public.classes c on c.id = h.class_id
      where h.id = hw_assignment_id and c.teacher_id = auth.uid()
    )
  );

create policy "submissions: teacher update"
  on public.submissions for update
  using (
    exists (
      select 1 from public.hw_assignments h
      join public.classes c on c.id = h.class_id
      where h.id = hw_assignment_id and c.teacher_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.hw_assignments h
      join public.classes c on c.id = h.class_id
      where h.id = hw_assignment_id and c.teacher_id = auth.uid()
    )
  );

create policy "submissions: teacher delete"
  on public.submissions for delete
  using (
    exists (
      select 1 from public.hw_assignments h
      join public.classes c on c.id = h.class_id
      where h.id = hw_assignment_id and c.teacher_id = auth.uid()
    )
  );

-- -------------------------------------------------------------------------
-- mock_test_results
-- -------------------------------------------------------------------------
drop policy if exists "mock_test_results: teacher or admin select" on public.mock_test_results;
drop policy if exists "mock_test_results: teacher insert" on public.mock_test_results;
drop policy if exists "mock_test_results: teacher update" on public.mock_test_results;
drop policy if exists "mock_test_results: teacher delete" on public.mock_test_results;

create policy "mock_test_results: teacher or admin select"
  on public.mock_test_results for select
  using (
    is_admin() or
    exists (
      select 1 from public.mock_tests m
      join public.classes c on c.id = m.class_id
      where m.id = mock_test_id and c.teacher_id = auth.uid()
    )
  );

create policy "mock_test_results: teacher insert"
  on public.mock_test_results for insert
  with check (
    exists (
      select 1 from public.mock_tests m
      join public.classes c on c.id = m.class_id
      where m.id = mock_test_id and c.teacher_id = auth.uid()
    )
  );

create policy "mock_test_results: teacher update"
  on public.mock_test_results for update
  using (
    exists (
      select 1 from public.mock_tests m
      join public.classes c on c.id = m.class_id
      where m.id = mock_test_id and c.teacher_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.mock_tests m
      join public.classes c on c.id = m.class_id
      where m.id = mock_test_id and c.teacher_id = auth.uid()
    )
  );

create policy "mock_test_results: teacher delete"
  on public.mock_test_results for delete
  using (
    exists (
      select 1 from public.mock_tests m
      join public.classes c on c.id = m.class_id
      where m.id = mock_test_id and c.teacher_id = auth.uid()
    )
  );
