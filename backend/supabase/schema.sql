-- ==============================================================================
-- TASKFORGE SUPABASE POSTGRESQL SCHEMA & ROW LEVEL SECURITY (RLS) AUDIT SPECIFICATION
-- ==============================================================================
-- 
-- CORE RBAC PRINCIPLE:
-- - Students consume assignments and update ONLY their own progress.
-- - Teachers create and manage assignments ONLY for subjects in teacher_subjects.
-- - Shared assignments DO NOT store student completion status.
-- ==============================================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. TABLE: users
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('STUDENT', 'TEACHER')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 2. TABLE: subjects
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 3. TABLE: teacher_subjects (Teacher Subject Authorization Junction)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teacher_subjects (
    teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (teacher_id, subject_id)
);

-- ------------------------------------------------------------------------------
-- 4. TABLE: assignments (Teacher-Owned Course Definitions)
-- Notice: No shared 'status' field exists here!
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    title TEXT NOT NULL CHECK (char_length(trim(title)) > 0),
    description TEXT,
    due_date TIMESTAMPTZ NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 5. TABLE: student_assignment_progress (Decoupled Personal Student State)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_assignment_progress (
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'NOT_STARTED' CHECK (status IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (student_id, assignment_id)
);

-- ------------------------------------------------------------------------------
-- INDEXES FOR QUERY OPTIMIZATION
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_assignments_subject_id ON public.assignments(subject_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON public.assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_progress_student_id ON public.student_assignment_progress(student_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_assignment_progress ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- RLS: users
-- ------------------------------------------------------------------------------
-- Anyone authenticated can read user profiles (needed for showing teacher names)
CREATE POLICY "Allow authenticated read users"
    ON public.users FOR SELECT
    TO authenticated
    USING (true);

-- ------------------------------------------------------------------------------
-- RLS: subjects
-- ------------------------------------------------------------------------------
CREATE POLICY "Allow authenticated read subjects"
    ON public.subjects FOR SELECT
    TO authenticated
    USING (true);

-- ------------------------------------------------------------------------------
-- RLS: teacher_subjects
-- ------------------------------------------------------------------------------
CREATE POLICY "Allow authenticated read teacher_subjects"
    ON public.teacher_subjects FOR SELECT
    TO authenticated
    USING (true);

-- ------------------------------------------------------------------------------
-- RLS: assignments
-- ------------------------------------------------------------------------------
-- 1. SELECT: Both Students and Teachers can read assignments
CREATE POLICY "Allow authenticated users to read assignments"
    ON public.assignments FOR SELECT
    TO authenticated
    USING (true);

-- 2. INSERT: ONLY Teachers authorized for the specific subject can create
CREATE POLICY "Teachers can insert assignments for authorized subjects only"
    ON public.assignments FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.teacher_subjects ts ON ts.teacher_id = u.id
            WHERE u.id = auth.uid()
              AND u.role = 'TEACHER'
              AND ts.subject_id = public.assignments.subject_id
        )
        AND created_by = auth.uid()
    );

-- 3. UPDATE: ONLY Teachers authorized for the specific subject can update
CREATE POLICY "Teachers can update assignments for authorized subjects only"
    ON public.assignments FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.teacher_subjects ts ON ts.teacher_id = u.id
            WHERE u.id = auth.uid()
              AND u.role = 'TEACHER'
              AND ts.subject_id = public.assignments.subject_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.teacher_subjects ts ON ts.teacher_id = u.id
            WHERE u.id = auth.uid()
              AND u.role = 'TEACHER'
              AND ts.subject_id = public.assignments.subject_id
        )
    );

-- 4. DELETE: ONLY Teachers authorized for the specific subject can delete
CREATE POLICY "Teachers can delete assignments for authorized subjects only"
    ON public.assignments FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.teacher_subjects ts ON ts.teacher_id = u.id
            WHERE u.id = auth.uid()
              AND u.role = 'TEACHER'
              AND ts.subject_id = public.assignments.subject_id
        )
    );

-- ------------------------------------------------------------------------------
-- RLS: student_assignment_progress
-- ------------------------------------------------------------------------------
-- 1. SELECT: Students read ONLY their own progress; Teachers read student progress for monitoring
CREATE POLICY "Students can read own progress"
    ON public.student_assignment_progress FOR SELECT
    TO authenticated
    USING (
        student_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'TEACHER'
        )
    );

-- 2. INSERT: Students can insert ONLY their own progress row
CREATE POLICY "Students can insert own progress"
    ON public.student_assignment_progress FOR INSERT
    TO authenticated
    WITH CHECK (
        student_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'STUDENT'
        )
    );

-- 3. UPDATE: Students can update ONLY their own progress row
CREATE POLICY "Students can update own progress"
    ON public.student_assignment_progress FOR UPDATE
    TO authenticated
    USING (
        student_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'STUDENT'
        )
    )
    WITH CHECK (
        student_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'STUDENT'
        )
    );

-- 4. DELETE: Disallow modifying other students' progress
CREATE POLICY "Students can delete own progress"
    ON public.student_assignment_progress FOR DELETE
    TO authenticated
    USING (student_id = auth.uid());


-- ==============================================================================
-- 6. TABLE: assignment_submissions
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.assignment_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL DEFAULT 'application/octet-stream',
    file_size BIGINT NOT NULL CHECK (file_size >= 0),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
    status TEXT NOT NULL CHECK (status IN ('SUBMITTED', 'LATE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (assignment_id, student_id, version)
);

CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON public.assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student_id ON public.assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON public.assignment_submissions(submitted_at);

ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can read own submissions" ON public.assignment_submissions;
CREATE POLICY "Students can read own submissions"
    ON public.assignment_submissions FOR SELECT
    TO authenticated
    USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Students can insert own submissions" ON public.assignment_submissions;
CREATE POLICY "Students can insert own submissions"
    ON public.assignment_submissions FOR INSERT
    TO authenticated
    WITH CHECK (
        student_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid() AND u.role = 'STUDENT'
        )
    );

DROP POLICY IF EXISTS "Teachers can read submissions for authorized subjects" ON public.assignment_submissions;
CREATE POLICY "Teachers can read submissions for authorized subjects"
    ON public.assignment_submissions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.users u
            JOIN public.teacher_subjects ts ON ts.teacher_id = u.id
            JOIN public.assignments a ON a.id = assignment_submissions.assignment_id
            WHERE u.id = auth.uid()
              AND u.role = 'TEACHER'
              AND ts.subject_id = a.subject_id
        )
    );

-- Private storage bucket; file access is mediated by FastAPI.
INSERT INTO storage.buckets (id, name, public)
VALUES ('assignment-submissions', 'assignment-submissions', false)
ON CONFLICT (id) DO NOTHING;
