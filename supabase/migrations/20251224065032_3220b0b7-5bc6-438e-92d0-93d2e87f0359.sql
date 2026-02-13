-- Add xp_awarded column to lesson_progress to prevent XP farming
ALTER TABLE public.lesson_progress 
ADD COLUMN xp_awarded boolean NOT NULL DEFAULT false;

-- Update existing completed records to have xp_awarded = true (assuming they already got XP)
UPDATE public.lesson_progress 
SET xp_awarded = true 
WHERE completed = true;