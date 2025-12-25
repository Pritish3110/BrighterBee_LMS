-- Create assignments table
CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create assignment submissions table
CREATE TABLE public.assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  file_url TEXT,
  file_name TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_late BOOLEAN NOT NULL DEFAULT false,
  grade TEXT,
  feedback TEXT,
  graded_at TIMESTAMP WITH TIME ZONE,
  graded_by UUID,
  UNIQUE(assignment_id, student_id)
);

-- Create course prerequisites table
CREATE TABLE public.course_prerequisites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  prerequisite_course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(course_id, prerequisite_course_id),
  CHECK (course_id != prerequisite_course_id)
);

-- Enable RLS on all tables
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_prerequisites ENABLE ROW LEVEL SECURITY;

-- Assignments RLS policies
-- Teachers can manage assignments for their own courses
CREATE POLICY "Teachers can manage assignments for own courses"
ON public.assignments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = assignments.course_id
    AND (c.teacher_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
);

-- Students can view assignments for courses they're enrolled in
CREATE POLICY "Students can view assignments for enrolled courses"
ON public.assignments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.course_id = assignments.course_id
    AND e.student_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = assignments.course_id
    AND (c.teacher_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
);

-- Assignment submissions RLS policies
-- Students can insert their own submissions
CREATE POLICY "Students can submit assignments"
ON public.assignment_submissions FOR INSERT
WITH CHECK (student_id = auth.uid());

-- Students can view their own submissions
CREATE POLICY "Students can view own submissions"
ON public.assignment_submissions FOR SELECT
USING (
  student_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.assignments a
    JOIN public.courses c ON c.id = a.course_id
    WHERE a.id = assignment_submissions.assignment_id
    AND (c.teacher_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
);

-- Students can update their own submissions (re-submit)
CREATE POLICY "Students can update own submissions"
ON public.assignment_submissions FOR UPDATE
USING (student_id = auth.uid())
WITH CHECK (student_id = auth.uid());

-- Teachers can grade submissions (update grade/feedback)
CREATE POLICY "Teachers can grade submissions"
ON public.assignment_submissions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.assignments a
    JOIN public.courses c ON c.id = a.course_id
    WHERE a.id = assignment_submissions.assignment_id
    AND c.teacher_id = auth.uid()
  )
);

-- Course prerequisites RLS policies
-- Anyone can view prerequisites
CREATE POLICY "Anyone can view prerequisites"
ON public.course_prerequisites FOR SELECT
USING (true);

-- Teachers can manage prerequisites for own courses
CREATE POLICY "Teachers can manage prerequisites"
ON public.course_prerequisites FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = course_prerequisites.course_id
    AND (c.teacher_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
);

-- Create updated_at trigger for assignments
CREATE TRIGGER update_assignments_updated_at
BEFORE UPDATE ON public.assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for assignment files
INSERT INTO storage.buckets (id, name, public)
VALUES ('assignments', 'assignments', false);

-- Storage policies for assignments bucket
CREATE POLICY "Students can upload assignment submissions"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'assignments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own assignment files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'assignments'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR has_role(auth.uid(), 'teacher')
    OR has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Students can update own assignment files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'assignments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Students can delete own assignment files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'assignments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);