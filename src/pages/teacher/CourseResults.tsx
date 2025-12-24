import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, Users, FileQuestion, BookOpen, Eye } from 'lucide-react';

interface Quiz {
  id: string;
  title: string;
  passing_score: number;
  attempts_count: number;
  pass_rate: number;
}

interface EnrolledStudent {
  id: string;
  student_id: string;
  student_name: string;
  enrolled_at: string;
  lessons_completed: number;
  total_lessons: number;
  progress_percent: number;
}

interface Course {
  id: string;
  title: string;
}

export default function CourseResults() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<Course | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [totalLessons, setTotalLessons] = useState(0);

  useEffect(() => {
    if (courseId) {
      fetchData();
    }
  }, [courseId]);

  const fetchData = async () => {
    try {
      // Fetch course
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('id, title')
        .eq('id', courseId!)
        .maybeSingle();

      if (courseError) throw courseError;
      if (!courseData) {
        navigate('/teacher/courses');
        return;
      }

      setCourse(courseData);

      // Fetch lessons count
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('id')
        .eq('course_id', courseId!);

      const lessonIds = (lessonsData || []).map(l => l.id);
      setTotalLessons(lessonIds.length);

      // Fetch quizzes with attempt stats
      const { data: quizzesData } = await supabase
        .from('quizzes')
        .select('id, title, passing_score')
        .eq('course_id', courseId!)
        .order('created_at', { ascending: true });

      const quizzesWithStats = await Promise.all(
        (quizzesData || []).map(async (quiz) => {
          const { data: attempts } = await supabase
            .from('quiz_attempts')
            .select('passed')
            .eq('quiz_id', quiz.id);

          const attemptsCount = attempts?.length || 0;
          const passedCount = attempts?.filter(a => a.passed).length || 0;
          const passRate = attemptsCount > 0 ? Math.round((passedCount / attemptsCount) * 100) : 0;

          return {
            ...quiz,
            attempts_count: attemptsCount,
            pass_rate: passRate,
          };
        })
      );

      setQuizzes(quizzesWithStats);

      // Fetch enrolled students with progress
      const { data: enrollmentsData } = await supabase
        .from('enrollments')
        .select('id, student_id, enrolled_at')
        .eq('course_id', courseId!)
        .order('enrolled_at', { ascending: false });

      const studentsWithProgress = await Promise.all(
        (enrollmentsData || []).map(async (enrollment) => {
          // Get student name
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', enrollment.student_id)
            .maybeSingle();

          // Get lesson progress
          let lessonsCompleted = 0;
          if (lessonIds.length > 0) {
            const { data: progressData } = await supabase
              .from('lesson_progress')
              .select('id')
              .eq('student_id', enrollment.student_id)
              .eq('completed', true)
              .in('lesson_id', lessonIds);

            lessonsCompleted = progressData?.length || 0;
          }

          const progressPercent = lessonIds.length > 0 
            ? Math.round((lessonsCompleted / lessonIds.length) * 100) 
            : 0;

          return {
            ...enrollment,
            student_name: profile?.full_name || 'Unknown Student',
            lessons_completed: lessonsCompleted,
            total_lessons: lessonIds.length,
            progress_percent: progressPercent,
          };
        })
      );

      setStudents(studentsWithProgress);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load course data.',
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
          <Button variant="ghost" size="icon" onClick={() => navigate(`/teacher/courses/${courseId}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Course Results</h1>
            <p className="text-muted-foreground mt-1">{course?.title}</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-honey-gradient-soft border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Enrolled Students</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{students.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-honey-gradient-soft border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Lessons</CardTitle>
              <BookOpen className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalLessons}</div>
            </CardContent>
          </Card>
          <Card className="bg-honey-gradient-soft border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Quizzes</CardTitle>
              <FileQuestion className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{quizzes.length}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="students" className="space-y-4">
          <TabsList>
            <TabsTrigger value="students">Enrolled Students</TabsTrigger>
            <TabsTrigger value="quizzes">Quiz Results</TabsTrigger>
          </TabsList>

          <TabsContent value="students">
            <Card>
              <CardHeader>
                <CardTitle>Student Progress</CardTitle>
                <CardDescription>View enrolled students and their lesson completion</CardDescription>
              </CardHeader>
              <CardContent>
                {students.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No students enrolled yet
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Enrolled</TableHead>
                        <TableHead>Lessons Completed</TableHead>
                        <TableHead>Progress</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">{student.student_name}</TableCell>
                          <TableCell>
                            {new Date(student.enrolled_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {student.lessons_completed} / {student.total_lessons}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Progress value={student.progress_percent} className="h-2 w-24" />
                              <span className="text-sm text-muted-foreground">
                                {student.progress_percent}%
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quizzes">
            <Card>
              <CardHeader>
                <CardTitle>Quiz Performance</CardTitle>
                <CardDescription>View quiz attempts and pass rates</CardDescription>
              </CardHeader>
              <CardContent>
                {quizzes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No quizzes created yet
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Quiz</TableHead>
                        <TableHead>Passing Score</TableHead>
                        <TableHead>Attempts</TableHead>
                        <TableHead>Pass Rate</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quizzes.map((quiz) => (
                        <TableRow key={quiz.id}>
                          <TableCell className="font-medium">{quiz.title}</TableCell>
                          <TableCell>{quiz.passing_score}%</TableCell>
                          <TableCell>{quiz.attempts_count}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={quiz.pass_rate} className="h-2 w-16" />
                              <span className="text-sm">{quiz.pass_rate}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" asChild>
                              <Link to={`/teacher/courses/${courseId}/quizzes/${quiz.id}/results`}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
