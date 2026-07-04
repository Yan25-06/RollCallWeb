-- Giáo trình dùng chung theo courseType: Tháng → Buổi → Tài liệu.
-- Admin toàn quyền; giáo viên chỉ đọc (giáo trình dùng chung mọi lớp cùng loại).

-- ── curriculum_months ─────────────────────────────────────────
create table if not exists public.curriculum_months (
  id uuid primary key default gen_random_uuid(),
  course_type text not null,
  month_no int not null,
  title text,
  created_by uuid references public.teachers(id),
  created_at timestamptz default now(),
  unique (course_type, month_no)
);
create index if not exists curriculum_months_course_type_idx
  on public.curriculum_months(course_type);

-- ── curriculum_sessions ───────────────────────────────────────
create table if not exists public.curriculum_sessions (
  id uuid primary key default gen_random_uuid(),
  month_id uuid not null references public.curriculum_months(id) on delete cascade,
  week_no int,
  session_no int not null,
  skill text,
  content text,
  note text,
  created_by uuid references public.teachers(id),
  created_at timestamptz default now()
);
create index if not exists curriculum_sessions_month_id_idx
  on public.curriculum_sessions(month_id);

-- ── curriculum_materials ──────────────────────────────────────
create table if not exists public.curriculum_materials (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.curriculum_sessions(id) on delete cascade,
  type text not null check (type in ('ppt', 'handout', 'reading', 'homework', 'other')),
  title text not null,
  url text not null,
  order_index int not null default 0,
  created_by uuid references public.teachers(id),
  created_at timestamptz default now()
);
create index if not exists curriculum_materials_session_id_idx
  on public.curriculum_materials(session_id);

-- ── RLS ───────────────────────────────────────────────────────
alter table public.curriculum_months   enable row level security;
alter table public.curriculum_sessions enable row level security;
alter table public.curriculum_materials enable row level security;

-- Admin: toàn quyền đọc/ghi
create policy "curriculum_months: admin all"
  on public.curriculum_months for all using (is_admin()) with check (is_admin());
create policy "curriculum_sessions: admin all"
  on public.curriculum_sessions for all using (is_admin()) with check (is_admin());
create policy "curriculum_materials: admin all"
  on public.curriculum_materials for all using (is_admin()) with check (is_admin());

-- Giáo viên (mọi authenticated): chỉ SELECT
create policy "curriculum_months: teacher select"
  on public.curriculum_months for select using (auth.uid() is not null);
create policy "curriculum_sessions: teacher select"
  on public.curriculum_sessions for select using (auth.uid() is not null);
create policy "curriculum_materials: teacher select"
  on public.curriculum_materials for select using (auth.uid() is not null);
