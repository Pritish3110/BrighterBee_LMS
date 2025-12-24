import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, CheckCircle, XCircle, Users, Target, TrendingUp } from 'lucide-react';

interface QuizAttempt {
  id: string;
  student_id: string;
  score: number;
  max_score: number;
  passed: boolean;
  completed_at: string;
  student_name: string;
}

interface Quiz {
  id: string;
  title: string;
  passing_score: number;
  course_id: string;
}

export default function QuizResults() {
  const { courseId, quizId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [stats, setStats] = useState({
    totalAttempts: 0,
    averageScore: 0,
    passRate: 0,
  });

  useEffect(() => {
    if (quizId) {
      fetchData();
    }
  }, [quizId]);

  const fetchData = async () => {
    try {
      // Fetch quiz
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('id, title, passing_score, course_id')
        .eq('id', quizId!)
        .maybeSingle();

      if (quizError) throw quizError;
      if (!quizData) {
        navigate(`/teacher/courses/${courseId}/quizzes`);
        return;
      }

      setQuiz(quizData);

      // Fetch attempts
      const { data: attemptsData, error: attemptsError } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('quiz_id', quizId!)
        .order('completed_at', { ascending: false });

      if (attemptsError) throw attemptsError;

      // Get student names
      const attemptsWithNames = await Promise.all(
        (attemptsData || []).map(async (attempt) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', attempt.student_id)
            .maybeSingle();

          return {
            ...attempt,
            student_name: profile?.full_name || 'Unknown Student',
          };
        })
      );

      setAttempts(attemptsWithNames);

      // Calculate stats
      if (attemptsWithNames.length > 0) {
        const totalScore = attemptsWithNames.reduce((sum, a) => sum + (a.max_score > 0 ? (a.score / a.max_score) * 100 : 0), 0);
        const passed = attemptsWithNames.filter(a => a.passed).length;

        setStats({
          totalAttempts: attemptsWithNames.length,
          averageScore: Math.round(totalScore / attemptsWithNames.length),
          passRate: Math.round((passed / attemptsWithNames.length) * 100),
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load results.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/teacher/courses/${courseId}/quizzes`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Quiz Results</h1>
            <p className="text-muted-foreground mt-1">{quiz?.title}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-honey-gradient-soft border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalAttempts}</div>
            </CardContent>
          </Card>
          <Card className="bg-honey-gradient-soft border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Average Score</CardTitle>
              <Target className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.averageScore}%</div>
            </CardContent>
          </Card>
          <Card className="bg-honey-gradient-soft border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.passRate}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Results Table */}
        <Card>
          <CardHeader>
            <CardTitle>Student Attempts</CardTitle>
            <CardDescription>View all quiz submissions</CardDescription>
          </CardHeader>
          <CardContent>
            {attempts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No attempts yet
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Percentage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attempts.map((attempt) => {
                    const percentage = attempt.max_score > 0 
                      ? Math.round((attempt.score / attempt.max_score) * 100) 
                      : 0;
                    
                    return (
                      <TableRow key={attempt.id}>
                        <TableCell className="font-medium">{attempt.student_name}</TableCell>
                        <TableCell>{attempt.score} / {attempt.max_score}</TableCell>
                        <TableCell>{percentage}%</TableCell>
                        <TableCell>
                          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                            attempt.passed 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {attempt.passed ? (
                              <CheckCircle className="h-3 w-3" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            {attempt.passed ? 'Passed' : 'Failed'}
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(attempt.completed_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
