-- Create user_streaks table to track daily activity streaks
CREATE TABLE public.user_streaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

-- Users can view their own streak
CREATE POLICY "Users can view own streak" 
ON public.user_streaks 
FOR SELECT 
USING (user_id = auth.uid());

-- Users can manage their own streak
CREATE POLICY "Users can manage own streak" 
ON public.user_streaks 
FOR ALL 
USING (user_id = auth.uid());

-- Allow public viewing of user_gamification for leaderboard (read only)
CREATE POLICY "Anyone can view leaderboard data" 
ON public.user_gamification 
FOR SELECT 
USING (true);