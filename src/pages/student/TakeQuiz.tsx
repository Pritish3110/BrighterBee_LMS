import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useGamification } from '@/hooks/useGamification';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, ArrowRight, Loader2, Trophy, XCircle, CheckCircle, Sparkles } from 'lucide-react';

// Question interface without correct_answer for security
interface Question {
  id: string;
  question_text: string;
  question_type: 'mcq' | 'true_false';
  options: string[];
  points: number;
}

// Result from server-side verification
interface QuestionResult {
  question_id: string;
  question_text: string;
  user_answer: string | null;
  correct_answer: string;
  is_correct: boolean;
  points: number;
}

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  passing_score: number;
  course_id: string;
}

export default function TakeQuiz() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addXP, awardBadgeByName } = useGamification();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    maxScore: number;
    passed: boolean;
    percentage: number;
    questionResults: QuestionResult[];
  } | null>(null);

  useEffect(() => {
    if (quizId && user) {
      fetchQuiz();
    }
  }, [quizId, user]);

  const fetchQuiz = async () => {
    try {
      // First fetch the quiz to get course_id
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId!)
        .maybeSingle();

      if (quizError) throw quizError;
      if (!quizData) {
        toast({
          title: 'Error',
          description: 'Quiz not found.',
          variant: 'destructive',
        });
        navigate('/student/courses');
        return;
      }

      // Check enrollment using the quiz's course_id
      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('course_id', quizData.course_id)
        .eq('student_id', user!.id)
        .maybeSingle();

      if (!enrollment) {
        toast({
          title: 'Not enrolled',
          description: 'You need to enroll in this course first.',
          variant: 'destructive',
        });
        navigate('/student/browse');
        return;
      }

      setQuiz(quizData);

      // SECURITY FIX: Use secure RPC function that excludes correct_answer
      const { data: questionsData, error: questionsError } = await supabase
        .rpc('get_quiz_questions_for_student', { p_quiz_id: quizId! });

      if (questionsError) throw questionsError;

      setQuestions(
        (questionsData || []).map((q: any) => ({
          id: q.id,
          question_text: q.question_text,
          question_type: q.question_type,
          options: Array.isArray(q.options) ? (q.options as string[]) : [],
          points: q.points,
        }))
      );
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching quiz:', error);
      }
      toast({
        title: 'Error',
        description: 'Failed to load quiz.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers({ ...answers, [questionId]: answer });
  };

  const handleSubmit = async () => {
    if (!user || !quiz) return;

    setSubmitting(true);
    try {
      // SECURITY FIX: Use server-side verification RPC function
      const { data, error } = await supabase.rpc('verify_quiz_answers', {
        p_quiz_id: quiz.id,
        p_student_id: user.id,
        p_answers: answers,
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const resultData = data[0];
        const questionResults = Array.isArray(resultData.question_results) 
          ? (resultData.question_results as unknown as QuestionResult[])
          : [];
        
        setResult({
          score: resultData.score,
          maxScore: resultData.max_score,
          passed: resultData.passed,
          percentage: resultData.percentage,
          questionResults,
        });
        setSubmitted(true);

        // Award XP based on score
        const xpEarned = Math.round(resultData.score / 2);
        if (xpEarned > 0) {
          await addXP(xpEarned);
        }

        // Award quiz badge if passed
        if (resultData.passed) {
          await awardBadgeByName('Quiz Whiz');
        }

        toast({
          title: resultData.passed ? 'Quiz Passed! 🎉' : 'Quiz Complete',
          description: `You scored ${resultData.percentage}% (${resultData.score}/${resultData.max_score} points)`,
        });
      }
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('Error submitting quiz:', error);
      }
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit quiz.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const currentQuestion = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;
  const allAnswered = questions.every((q) => answers[q.id]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!quiz || questions.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-24">
          <p className="text-muted-foreground mb-4">No questions in this quiz.</p>
          <Button asChild>
            <Link to={`/student/courses/${quiz?.course_id}`}>Back to Course</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // Show results
  if (submitted && result) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto">
          <Card className="text-center">
            <CardHeader>
              <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4 ${
                result.passed ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {result.passed ? (
                  <Trophy className="h-10 w-10 text-green-600" />
                ) : (
                  <XCircle className="h-10 w-10 text-red-600" />
                )}
              </div>
              <CardTitle className="text-2xl">
                {result.passed ? 'Congratulations! 🎉' : 'Keep Practicing!'}
              </CardTitle>
              <CardDescription>
                {result.passed 
                  ? 'You passed the quiz!' 
                  : `You need ${quiz.passing_score}% to pass.`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-5xl font-bold text-primary">
                {result.percentage}%
              </div>
              <p className="text-muted-foreground">
                {result.score} out of {result.maxScore} points
              </p>

              {result.passed && (
                <div className="flex items-center justify-center gap-2 text-sm text-primary">
                  <Sparkles className="h-4 w-4" />
                  +{Math.round(result.score / 2)} XP earned!
                </div>
              )}

              <div className="space-y-4 pt-4">
                <h3 className="font-medium">Review Your Answers</h3>
                {result.questionResults.map((qr, index) => (
                  <div key={qr.question_id} className="text-left p-4 rounded-lg bg-muted">
                    <div className="flex items-start gap-2">
                      {qr.is_correct ? (
                        <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="font-medium">{index + 1}. {qr.question_text}</p>
                        <p className={`text-sm mt-1 ${qr.is_correct ? 'text-green-600' : 'text-red-600'}`}>
                          Your answer: {qr.user_answer || 'Not answered'}
                        </p>
                        {!qr.is_correct && (
                          <p className="text-sm text-green-600 mt-1">
                            Correct answer: {qr.correct_answer}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-4 pt-4">
                <Button asChild variant="outline" className="flex-1">
                  <Link to={`/student/courses/${quiz?.course_id}`}>Back to Course</Link>
                </Button>
                <Button onClick={() => {
                  setAnswers({});
                  setCurrentIndex(0);
                  setSubmitted(false);
                  setResult(null);
                }} className="flex-1">
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Show quiz
  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/student/courses/${quiz?.course_id}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{quiz.title}</h1>
            <p className="text-muted-foreground text-sm">
              Question {currentIndex + 1} of {questions.length}
            </p>
          </div>
        </div>

        {/* Progress */}
        <Progress value={progress} className="h-2" />

        {/* Question Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs bg-muted px-2 py-0.5 rounded-full capitalize">
                {currentQuestion.question_type === 'true_false' ? 'True/False' : 'Multiple Choice'}
              </span>
              <span className="text-xs text-muted-foreground">
                {currentQuestion.points} points
              </span>
            </div>
            <CardTitle className="text-xl">{currentQuestion.question_text}</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={answers[currentQuestion.id] || ''}
              onValueChange={(v) => handleAnswer(currentQuestion.id, v)}
              className="space-y-3"
            >
              {currentQuestion.options.map((option, index) => (
                <div 
                  key={index} 
                  className={`flex items-center space-x-3 p-4 rounded-lg border transition-colors cursor-pointer ${
                    answers[currentQuestion.id] === option 
                      ? 'border-primary bg-primary/5' 
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => handleAnswer(currentQuestion.id, option)}
                >
                  <RadioGroupItem value={option} id={`q-${currentQuestion.id}-${index}`} />
                  <Label 
                    htmlFor={`q-${currentQuestion.id}-${index}`} 
                    className="flex-1 cursor-pointer font-normal"
                  >
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentIndex(currentIndex - 1)}
            disabled={currentIndex === 0}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>

          {currentIndex === questions.length - 1 ? (
            <Button 
              onClick={handleSubmit} 
              disabled={!allAnswered || submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Quiz'
              )}
            </Button>
          ) : (
            <Button onClick={() => setCurrentIndex(currentIndex + 1)}>
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Question Navigator */}
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-3">Jump to question:</p>
            <div className="flex flex-wrap gap-2">
              {questions.map((q, index) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                    index === currentIndex
                      ? 'bg-primary text-primary-foreground'
                      : answers[q.id]
                        ? 'bg-green-100 text-green-800'
                        : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}