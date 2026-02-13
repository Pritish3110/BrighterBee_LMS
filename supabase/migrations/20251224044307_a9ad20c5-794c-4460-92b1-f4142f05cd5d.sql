-- Add unique constraint for lesson_progress to enable upsert
ALTER TABLE public.lesson_progress 
ADD CONSTRAINT lesson_progress_lesson_student_unique 
UNIQUE (lesson_id, student_id);