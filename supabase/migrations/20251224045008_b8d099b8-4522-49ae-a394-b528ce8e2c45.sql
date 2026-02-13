-- Question type enum
CREATE TYPE public.question_type AS ENUM ('mcq', 'true_false');

-- Quizzes table
CREATE TABLE public.quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  passing_score INTEGER NOT NULL DEFAULT 60,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Quiz questions table
CREATE TABLE public.quiz_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type question_type NOT NULL DEFAULT 'mcq',
  options JSONB NOT NULL DEFAULT '[]',
  correct_answer TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 10,
  question_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Quiz attempts table
CREATE TABLE public.quiz_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}',
  score INTEGER NOT NULL DEFAULT 0,
  max_score INTEGER NOT NULL DEFAULT 0,
  passed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Badges table
CREATE TABLE public.badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'award',
  xp_required INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User badges table
CREATE TABLE public.user_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- User gamification table (XP, level)
CREATE TABLE public.user_gamification (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_gamification ENABLE ROW LEVEL SECURITY;

-- Quizzes policies
CREATE POLICY "Anyone can view quizzes of published courses"
ON public.quizzes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM courses c 
    WHERE c.id = quizzes.course_id 
    AND (c.is_published = true OR c.teacher_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
);

CREATE POLICY "Teachers can manage quizzes of own courses"
ON public.quizzes FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM courses c 
    WHERE c.id = quizzes.course_id 
    AND (c.teacher_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
);

-- Quiz questions policies
CREATE POLICY "Anyone can view questions of accessible quizzes"
ON public.quiz_questions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM quizzes q 
    JOIN courses c ON c.id = q.course_id
    WHERE q.id = quiz_questions.quiz_id 
    AND (c.is_published = true OR c.teacher_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
);

CREATE POLICY "Teachers can manage questions of own quizzes"
ON public.quiz_questions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM quizzes q 
    JOIN courses c ON c.id = q.course_id
    WHERE q.id = quiz_questions.quiz_id 
    AND (c.teacher_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
);

-- Quiz attempts policies
CREATE POLICY "Students can create own attempts"
ON public.quiz_attempts FOR INSERT
WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can view own attempts"
ON public.quiz_attempts FOR SELECT
USING (student_id = auth.uid() OR has_role(auth.uid(), 'teacher') OR has_role(auth.uid(), 'admin'));

-- Badges policies (everyone can view)
CREATE POLICY "Anyone can view badges"
ON public.badges FOR SELECT
USING (true);

CREATE POLICY "Admins can manage badges"
ON public.badges FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- User badges policies
CREATE POLICY "Users can view own badges"
ON public.user_badges FOR SELECT
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert badges"
ON public.user_badges FOR INSERT
WITH CHECK (user_id = auth.uid());

-- User gamification policies
CREATE POLICY "Users can view own gamification"
ON public.user_gamification FOR SELECT
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can manage own gamification"
ON public.user_gamification FOR ALL
USING (user_id = auth.uid());

-- Insert default badges
INSERT INTO public.badges (name, description, icon, xp_required) VALUES
('Busy Bee', 'Complete your first lesson', 'award', 10),
('Star Bee', 'Earn 100 XP', 'star', 100),
('Quiz Whiz', 'Pass your first quiz', 'zap', 50),
('Honey Hunter', 'Complete a course', 'trophy', 200),
('Super Bee', 'Reach level 5', 'crown', 500);

-- Trigger for updated_at
CREATE TRIGGER update_quizzes_updated_at
BEFORE UPDATE ON public.quizzes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_gamification_updated_at
BEFORE UPDATE ON public.user_gamification
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();