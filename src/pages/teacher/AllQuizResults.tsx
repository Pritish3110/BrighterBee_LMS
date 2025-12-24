import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { BarChart3, BookOpen, FileQuestion, Loader2, Users, ArrowRight } from 'lucide-react';

interface CourseWithQuizzes {
  id: string;
  title: string;
  quizCount: number;
  attemptCount: number;
}

export default function AllQuizResults() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<CourseWithQuizzes[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalStats, setTotalStats] = useState({ quizzes: 0, attempts: 0 });

  useEffect(() => {
    if (user) {
      fetchCoursesWithQuizzes();
    }
  }, [user]);

  const fetchCoursesWithQuizzes = async () => {
    try {
      // Get teacher's courses
      const { data: coursesData } = await supabase
        .from('courses')
        .select('id, title')
        .eq('teacher_id', user!.id);

      if (!coursesData) {
        setLoading(false);
        return;
      }

      const coursesWithStats = await Promise.all(
        coursesData.map(async (course) => {
          // Get quiz count
          const { count: quizCount } = await supabase
            .from('quizzes')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', course.id);

          // Get quiz IDs for this course
          const { data: quizzes } = await supabase
            .from('quizzes')
            .select('id')
            .eq('course_id', course.id);

          // Get attempt count for all quizzes
          let attemptCount = 0;
          if (quizzes && quizzes.length > 0) {
            const { count } = await supabase
              .from('quiz_attempts')
              .select('*', { count: 'exact', head: true })
              .in('quiz_id', quizzes.map(q => q.id));
            attemptCount = count || 0;
          }

          return {
            id: course.id,
            title: course.title,
            quizCount: quizCount || 0,
            attemptCount,
          };
        })
      );

      setCourses(coursesWithStats);
      setTotalStats({
        quizzes: coursesWithStats.reduce((sum, c) => sum + c.quizCount, 0),
        attempts: coursesWithStats.reduce((sum, c) => sum + c.attemptCount, 0),
      });
    } catch (error) {
      console.error('Error fetching courses:', error);
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
        <div>
          <h1 className="text-3xl font-bold text-foreground">Quiz Results Overview</h1>
          <p className="text-muted-foreground mt-1">
            View student performance across all your courses
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-honey-gradient-soft border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
              <BookOpen className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{courses.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-honey-gradient-soft border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Quizzes</CardTitle>
              <FileQuestion className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalStats.quizzes}</div>
            </CardContent>
          </Card>
          <Card className="bg-honey-gradient-soft border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
              <Users className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalStats.attempts}</div>
            </CardContent>
          </Card>
        </div>

        {/* Courses List */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Courses with Quizzes</h2>
          
          {courses.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileQuestion className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No courses yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create a course and add quizzes to see results here.
                </p>
                <Button asChild>
                  <Link to="/teacher/courses">Go to Courses</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {courses.map((course) => (
                <Card key={course.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">{course.title}</CardTitle>
                    <CardDescription>
                      {course.quizCount} quiz{course.quizCount !== 1 ? 'zes' : ''} • {course.attemptCount} attempt{course.attemptCount !== 1 ? 's' : ''}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button asChild variant="outline" className="w-full">
                      <Link to={`/teacher/courses/${course.id}/results`}>
                        <BarChart3 className="mr-2 h-4 w-4" />
                        View Results
                        <ArrowRight className="ml-auto h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}