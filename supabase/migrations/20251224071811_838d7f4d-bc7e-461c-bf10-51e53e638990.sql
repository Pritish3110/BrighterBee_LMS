-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create a more restrictive policy that allows:
-- 1. Users to view their own profile
-- 2. Teachers/Admins to view all profiles (needed for course management)
-- 3. Students to view profiles of teachers and classmates in their enrolled courses
CREATE POLICY "Users can view relevant profiles" ON public.profiles
FOR SELECT USING (
  -- Own profile
  auth.uid() = id
  OR
  -- Teachers and admins can view all profiles
  has_role(auth.uid(), 'teacher'::app_role)
  OR
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Students can view profiles of teachers of their enrolled courses
  EXISTS (
    SELECT 1 FROM enrollments e
    JOIN courses c ON c.id = e.course_id
    WHERE e.student_id = auth.uid()
    AND c.teacher_id = profiles.id
  )
  OR
  -- Students can view profiles of classmates in same courses
  EXISTS (
    SELECT 1 FROM enrollments e1
    JOIN enrollments e2 ON e1.course_id = e2.course_id
    WHERE e1.student_id = auth.uid()
    AND e2.student_id = profiles.id
  )
);