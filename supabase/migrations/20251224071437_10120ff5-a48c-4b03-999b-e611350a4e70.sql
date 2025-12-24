-- Create a secure function to verify quiz answers server-side
-- This prevents students from seeing correct answers before submission

CREATE OR REPLACE FUNCTION public.verify_quiz_answers(
  p_quiz_id UUID,
  p_student_id UUID,
  p_answers JSONB
)
RETURNS TABLE (
  score INTEGER,
  max_score INTEGER,
  passed BOOLEAN,
  percentage INTEGER,
  question_results JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_passing_score INTEGER;
  v_total_score INTEGER := 0;
  v_max_score INTEGER := 0;
  v_percentage INTEGER;
  v_passed BOOLEAN;
  v_results JSONB := '[]'::JSONB;
  v_question RECORD;
  v_user_answer TEXT;
  v_is_correct BOOLEAN;
BEGIN
  -- Get the quiz passing score
  SELECT quizzes.passing_score INTO v_passing_score
  FROM quizzes
  WHERE quizzes.id = p_quiz_id;
  
  IF v_passing_score IS NULL THEN
    RAISE EXCEPTION 'Quiz not found';
  END IF;

  -- Process each question
  FOR v_question IN
    SELECT id, question_text, correct_answer, points
    FROM quiz_questions
    WHERE quiz_id = p_quiz_id
    ORDER BY question_order
  LOOP
    v_max_score := v_max_score + v_question.points;
    v_user_answer := p_answers->>v_question.id::text;
    v_is_correct := (v_user_answer = v_question.correct_answer);
    
    IF v_is_correct THEN
      v_total_score := v_total_score + v_question.points;
    END IF;
    
    -- Add to results array (correct answers only revealed after submission)
    v_results := v_results || jsonb_build_object(
      'question_id', v_question.id,
      'question_text', v_question.question_text,
      'user_answer', v_user_answer,
      'correct_answer', v_question.correct_answer,
      'is_correct', v_is_correct,
      'points', v_question.points
    );
  END LOOP;

  -- Calculate percentage and pass status
  IF v_max_score > 0 THEN
    v_percentage := ROUND((v_total_score::NUMERIC / v_max_score::NUMERIC) * 100);
  ELSE
    v_percentage := 0;
  END IF;
  
  v_passed := v_percentage >= v_passing_score;

  -- Save the quiz attempt
  INSERT INTO quiz_attempts (quiz_id, student_id, answers, score, max_score, passed)
  VALUES (p_quiz_id, p_student_id, p_answers, v_total_score, v_max_score, v_passed);

  RETURN QUERY SELECT v_total_score, v_max_score, v_passed, v_percentage, v_results;
END;
$$;

-- Create a secure view/function to get quiz questions WITHOUT correct answers for students
CREATE OR REPLACE FUNCTION public.get_quiz_questions_for_student(p_quiz_id UUID)
RETURNS TABLE (
  id UUID,
  question_text TEXT,
  question_type question_type,
  options JSONB,
  points INTEGER,
  question_order INTEGER
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    qq.id,
    qq.question_text,
    qq.question_type,
    qq.options,
    qq.points,
    qq.question_order
  FROM quiz_questions qq
  WHERE qq.quiz_id = p_quiz_id
  ORDER BY qq.question_order;
$$;