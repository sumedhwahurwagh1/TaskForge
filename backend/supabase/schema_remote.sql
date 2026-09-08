-- TaskForge Supabase schema for the real database.
-- This script is designed for a fresh TaskForge Supabase project.
-- IMPORTANT: it creates a demo-friendly profile table and uses TEXT IDs so
-- the existing hackathon demo identities remain stable.
--
-- Backend authorization is authoritative for protected mutations.
-- RLS is an additional database guard for direct Supabase access.
--
create extension if not exists "pgcrypto";

create table if not exists public.users (
  id text primary key,
  name text not null,
  email text unique not null,
  role text not null check (role in ('STUDENT','TEACHER')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subjects (
  id text primary key,
  code text not null unique,
  name text not null,
  color text,
  created_at timestamptz not null default now()
);

create table if not exists public.teacher_subjects (
  teacher_id text not null references public.users(id) on delete cascade,
  subject_id text not null references public.subjects(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (teacher_id, subject_id)
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  subject_id text not null references public.subjects(id) on delete restrict,
  created_by text not null references public.users(id) on delete restrict,
  title text not null check (char_length(trim(title)) > 0),
  description text,
  due_date timestamptz not null,
  priority text not null default 'MEDIUM' check (priority in ('LOW','MEDIUM','HIGH')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_assignment_progress (
  student_id text not null references public.users(id) on delete cascade,
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  status text not null default 'NOT_STARTED'
    check (status in ('NOT_STARTED','IN_PROGRESS','COMPLETED')),
  updated_at timestamptz not null default now(),
  primary key (student_id, assignment_id)
);

create table if not exists public.notices (
  id text primary key,
  title text not null,
  summary text not null,
  category text not null,
  source text not null,
  published_at timestamptz not null default now(),
  importance text not null default 'medium',
  read boolean not null default false
);

create index if not exists idx_assignments_subject_id on public.assignments(subject_id);
create index if not exists idx_assignments_due_date on public.assignments(due_date);
create index if not exists idx_progress_student_id on public.student_assignment_progress(student_id);
create index if not exists idx_teacher_subjects_teacher_id on public.teacher_subjects(teacher_id);

insert into public.users (id,name,email,role) values
('usr-student-alex','Alex Rivera','alex.rivera@student.edu','STUDENT'),
('usr-student-bob','Bob Smith','bob.smith@student.edu','STUDENT'),
('usr-teacher-chen','Dr. Sarah Chen','sarah.chen@university.edu','TEACHER'),
('usr-teacher-vance','Prof. Marcus Vance','marcus.vance@university.edu','TEACHER')
on conflict (id) do update set name=excluded.name,email=excluded.email,role=excluded.role;

insert into public.subjects (id,code,name,color) values
('cs301','CS 301','Distributed Systems','#6366f1'),
('cs201','CS 201','Algorithms & Data Structures','#8b5cf6'),
('econ201','ECON 201','Macroeconomics','#0ea5e9'),
('math301','MATH 301','Calculus III','#14b8a6'),
('psy101','PSY 101','Cognitive Psychology','#f59e0b'),
('chem201','CHEM 201','Organic Chemistry','#ef4444'),
('bio201','BIO 201','Bioenergetics','#22c55e')
on conflict (id) do update set code=excluded.code,name=excluded.name,color=excluded.color;

insert into public.teacher_subjects (teacher_id,subject_id) values
('usr-teacher-chen','cs301'),
('usr-teacher-chen','cs201'),
('usr-teacher-vance','econ201'),
('usr-teacher-vance','math301')
on conflict do nothing;

-- Seed notices. Demo assignment/progress rows are intentionally left to the
-- application bootstrap so dates remain relative to the current day.
insert into public.notices (id,title,summary,category,source,importance,read) values
('notice-1','Mid-Semester Exam Schedule Released','The mid-semester examination schedule has been published.','exam','Examination Cell','high',false),
('notice-2','Library Hours Extended During Exam Week','The central library will remain open until 11:00 PM during exam week.','academic','Central Library','medium',false),
('notice-3','Guest Lecture: AI in Modern Education','Guest lecture on the role of AI in higher education.','event','CS Department','medium',true),
('notice-4','Course Registration Deadline Reminder','Last date to add/drop courses is approaching.','important','Registrar Office','high',false),
('notice-5','Lab Safety Training Mandatory','All students in laboratory courses must complete safety training.','academic','Science Department','medium',true),
('notice-6','Hackathon Registration Open','Annual inter-college hackathon registration is open.','event','Student Council','low',false)
on conflict (id) do nothing;

alter table public.users enable row level security;
alter table public.subjects enable row level security;
alter table public.teacher_subjects enable row level security;
alter table public.assignments enable row level security;
alter table public.student_assignment_progress enable row level security;
alter table public.notices enable row level security;

drop policy if exists "authenticated can read subjects" on public.subjects;
create policy "authenticated can read subjects" on public.subjects
for select to authenticated using (true);

drop policy if exists "authenticated can read assignments" on public.assignments;
create policy "authenticated can read assignments" on public.assignments
for select to authenticated using (true);

drop policy if exists "students can read own progress" on public.student_assignment_progress;
create policy "students can read own progress" on public.student_assignment_progress
for select to authenticated using (student_id = auth.uid()::text);

drop policy if exists "students can upsert own progress" on public.student_assignment_progress;
create policy "students can upsert own progress" on public.student_assignment_progress
for insert to authenticated with check (
  student_id = auth.uid()::text
  and exists (select 1 from public.users u where u.id = auth.uid()::text and u.role = 'STUDENT')
);

drop policy if exists "students can update own progress" on public.student_assignment_progress;
create policy "students can update own progress" on public.student_assignment_progress
for update to authenticated using (
  student_id = auth.uid()::text
  and exists (select 1 from public.users u where u.id = auth.uid()::text and u.role = 'STUDENT')
)
with check (
  student_id = auth.uid()::text
  and exists (select 1 from public.users u where u.id = auth.uid()::text and u.role = 'STUDENT')
);

drop policy if exists "authenticated can read notices" on public.notices;
create policy "authenticated can read notices" on public.notices
for select to authenticated using (true);

-- Assignment mutations are intentionally left to the FastAPI service.
-- The backend validates identity, role, and teacher_subjects authorization.
