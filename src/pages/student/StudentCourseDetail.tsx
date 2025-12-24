import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, BookOpen, CheckCircle, Circle, ExternalLink, Loader2, Play } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

type Course = Database['public']['Tables']['courses']['Row'];
type Lesson = Database['public']['Tables']['lessons']['Row'] & {
  completed: boolean;
};

export default function StudentCourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [markingComplete, setMarkingComplete] = useState<string | null>(null);

  useEffect(() => {
    if (id && user) {
      fetchCourseData();
    }
  }, [id, user]);

  const fetchCourseData = async () => {
    try {
      // Check enrollment
      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('course_id', id!)
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

      // Fetch course
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id!)
        .maybeSingle();

      if (courseError) throw courseError;
      if (!courseData) {
        navigate('/student/courses');
        return;
      }

      setCourse(courseData);

      // Fetch lessons with progress
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', id!)
        .order('lesson_order', { ascending: true });

      if (lessonsError) throw lessonsError;

      // Fetch progress for all lessons
      const { data: progressData } = await supabase
        .from('lesson_progress')
        .select('lesson_id, completed')
        .eq('student_id', user!.id)
        .in('lesson_id', (lessonsData || []).map(l => l.id));

      const progressMap = new Map(
        (progressData || []).map(p => [p.lesson_id, p.completed])
      );

      const lessonsWithProgress = (lessonsData || []).map(lesson => ({
        ...lesson,
        completed: progressMap.get(lesson.id) || false,
      }));

      setLessons(lessonsWithProgress);
    } catch (error) {
      console.error('Error fetching course:', error);
      toast({
        title: 'Error',
        description: 'Failed to load course data.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleLessonComplete = async (lessonId: string, currentlyCompleted: boolean) => {
    setMarkingComplete(lessonId);
    try {
      if (currentlyCompleted) {
        // Mark as incomplete
        const { error } = await supabase
          .from('lesson_progress')
          .delete()
          .eq('lesson_id', lessonId)
          .eq('student_id', user!.id);

        if (error) throw error;
      } else {
        // Mark as complete - upsert to handle existing records
        const { error } = await supabase
          .from('lesson_progress')
          .upsert({
            lesson_id: lessonId,
            student_id: user!.id,
            completed: true,
            completed_at: new Date().toISOString(),
          }, {
            onConflict: 'lesson_id,student_id',
          });

        if (error) throw error;
      }

      // Update local state
      setLessons(lessons.map(l => 
        l.id === lessonId ? { ...l, completed: !currentlyCompleted } : l
      ));

      toast({
        title: currentlyCompleted ? 'Lesson unmarked' : 'Great job! 🎉',
        description: currentlyCompleted 
          ? 'Lesson marked as incomplete'
          : 'Lesson completed!',
      });
    } catch (error: any) {
      console.error('Error updating progress:', error);
      toast({
        title: 'Error',
        description: 'Failed to update progress.',
        variant: 'destructive',
      });
    } finally {
      setMarkingComplete(null);
    }
  };

  const formatGradeLevel = (grade: string) => {
    return grade.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const completedCount = lessons.filter(l => l.completed).length;
  const progressPercent = lessons.length > 0 
    ? Math.round((completedCount / lessons.length) * 100) 
    : 0;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!course) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/student/courses')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
              {formatGradeLevel(course.grade_level)}
            </span>
            <h1 className="text-3xl font-bold text-foreground mt-2">{course.title}</h1>
            <p className="text-muted-foreground mt-1">{course.description || 'No description'}</p>
          </div>
        </div>

        {/* Progress Card */}
        <Card className="bg-honey-gradient-soft border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg">Your Progress</h3>
                <p className="text-muted-foreground text-sm">
                  {completedCount} of {lessons.length} lessons completed
                </p>
              </div>
              <div className="text-3xl font-bold text-primary">
                {progressPercent}%
              </div>
            </div>
            <Progress value={progressPercent} className="h-3" />
            {progressPercent === 100 && (
              <p className="text-center mt-4 text-primary font-medium">
                🎉 Congratulations! You've completed this course!
              </p>
            )}
          </CardContent>
        </Card>

        {/* Lessons List */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Lessons</h2>
          
          {lessons.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No lessons yet</h3>
                <p className="text-muted-foreground text-center">
                  This course doesn't have any lessons yet. Check back later!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {lessons.map((lesson, index) => (
                <Card 
                  key={lesson.id} 
                  className={`transition-all ${lesson.completed ? 'bg-green-50 border-green-200' : 'hover:shadow-md'}`}
                >
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        lesson.completed 
                          ? 'bg-green-500 text-white' 
                          : 'bg-primary/10 text-primary'
                      }`}>
                        {lesson.completed ? <CheckCircle className="h-5 w-5" /> : index + 1}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-medium ${lesson.completed ? 'line-through text-muted-foreground' : ''}`}>
                        {lesson.title}
                      </h4>
                      <p className="text-sm text-muted-foreground truncate">
                        {lesson.description || 'No description'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {lesson.resource_url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                        >
                          <a href={lesson.resource_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      <Button
                        variant={lesson.completed ? "outline" : "default"}
                        size="sm"
                        onClick={() => toggleLessonComplete(lesson.id, lesson.completed)}
                        disabled={markingComplete === lesson.id}
                      >
                        {markingComplete === lesson.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : lesson.completed ? (
                          <>
                            <Circle className="mr-1 h-4 w-4" />
                            Undo
                          </>
                        ) : (
                          <>
                            <CheckCircle className="mr-1 h-4 w-4" />
                            Complete
                          </>
                        )}
                      </Button>
                    </div>
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
