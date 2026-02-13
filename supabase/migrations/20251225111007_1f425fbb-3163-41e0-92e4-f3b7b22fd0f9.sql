-- Extend profiles table with additional fields for students and teachers
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS pincode TEXT,
ADD COLUMN IF NOT EXISTS branch TEXT,
ADD COLUMN IF NOT EXISTS grade TEXT,
ADD COLUMN IF NOT EXISTS course_level TEXT,
ADD COLUMN IF NOT EXISTS courses_taught TEXT,
ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.course_level IS 'Small Bee or Big Bee - for students only';
COMMENT ON COLUMN public.profiles.courses_taught IS 'For teachers only';
COMMENT ON COLUMN public.profiles.grade IS 'Standard/Grade - for students only';