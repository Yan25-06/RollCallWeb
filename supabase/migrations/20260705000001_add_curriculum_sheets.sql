-- Link Google Sheet giáo trình theo loại khóa.
-- Google Sheet là nguồn chân lý cho giáo trình (thay 3 bảng curriculum_* — để orphan, không drop).
-- RLS cùng pattern curriculum_*: mọi GV đã đăng nhập đọc được, chỉ admin ghi.
create table if not exists public.curriculum_sheets (
  course_type text primary key,
  sheet_url text not null,
  updated_at timestamptz not null default now()
);

alter table public.curriculum_sheets enable row level security;

create policy "curriculum_sheets: authenticated select"
  on public.curriculum_sheets for select
  using (auth.uid() is not null);

create policy "curriculum_sheets: admin insert"
  on public.curriculum_sheets for insert
  with check (is_admin());

create policy "curriculum_sheets: admin update"
  on public.curriculum_sheets for update
  using (is_admin()) with check (is_admin());

create policy "curriculum_sheets: admin delete"
  on public.curriculum_sheets for delete
  using (is_admin());
