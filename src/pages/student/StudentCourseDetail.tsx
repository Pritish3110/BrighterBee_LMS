import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useGamification } from '@/hooks/useGamification';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { XPAnimation } from '@/components/XPAnimation';
import { ArrowLeft, BookOpen, CheckCircle, Circle, ExternalLink, Loader2, Play, FileQuestion, Award, Sparkles, ClipboardList, Calendar } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';
import { format, isPast } from 'date-fns';
import { Badge } from '@/components/ui/badge';

type Course = Database['public']['Tables']['courses']['Row'];
type Lesson = Database['public']['Tables']['lessons']['Row'] & {
  completed: boolean;
  xp_awarded: boolean;
};
type Quiz = Database['public']['Tables']['quizzes']['Row'];
type Assignment = {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  has_submitted: boolean;
};

export default function StudentCourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { addXP, awardBadgeByName } = useGamification();
  
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [markingComplete, setMarkingComplete] = useState<string | null>(null);
  
  // XP Animation state
  const [showXPAnimation, setShowXPAnimation] = useState(false);
  const [xpAmount, setXpAmount] = useState(0);
  const [xpType, setXpType] = useState<'lesson' | 'course' | 'streak'>('lesson');

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
        .select('lesson_id, completed, xp_awarded')
        .eq('student_id', user!.id)
        .in('lesson_id', (lessonsData || []).map(l => l.id));

      const progressMap = new Map(
        (progressData || []).map(p => [p.lesson_id, { completed: p.completed, xp_awarded: p.xp_awarded }])
      );

      const lessonsWithProgress = (lessonsData || []).map(lesson => ({
        ...lesson,
        completed: progressMap.get(lesson.id)?.completed || false,
        xp_awarded: progressMap.get(lesson.id)?.xp_awarded || false,
      }));

      setLessons(lessonsWithProgress);

      // Fetch quizzes for this course
      const { data: quizzesData } = await supabase
        .from('quizzes')
        .select('*')
        .eq('course_id', id!)
        .order('created_at', { ascending: true });

      setQuizzes(quizzesData || []);

      // Fetch assignments for this course
      const { data: assignmentsData } = await supabase
        .from('assignments')
        .select('*')
        .eq('course_id', id!)
        .order('due_date', { ascending: true });

      // Check which assignments have submissions
      const assignmentsWithStatus = await Promise.all(
        (assignmentsData || []).map(async (assignment) => {
          const { data: submission } = await supabase
            .from('assignment_submissions')
            .select('id')
            .eq('assignment_id', assignment.id)
            .eq('student_id', user!.id)
            .maybeSingle();

          return {
            ...assignment,
            has_submitted: !!submission,
          };
        })
      );

      setAssignments(assignmentsWithStatus);
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
      // Find the lesson to check if XP was already awarded
      const lesson = lessons.find(l => l.id === lessonId);
      const alreadyAwardedXP = lesson?.xp_awarded || false;

      if (currentlyCompleted) {
        // Mark as incomplete - just update completed status, keep xp_awarded as true
        const { error } = await supabase
          .from('lesson_progress')
          .update({ completed: false })
          .eq('lesson_id', lessonId)
          .eq('student_id', user!.id);

        if (error) throw error;

        // Update local state
        setLessons(lessons.map(l => 
          l.id === lessonId ? { ...l, completed: false } : l
        ));

        toast({
          title: 'Lesson unmarked',
          description: 'Lesson marked as incomplete',
        });
      } else {
        // Mark as complete - upsert to handle existing records
        // Only set xp_awarded to true if we're about to award XP
        const shouldAwardXP = !alreadyAwardedXP;
        
        const { error } = await supabase
          .from('lesson_progress')
          .upsert({
            lesson_id: lessonId,
            student_id: user!.id,
            completed: true,
            completed_at: new Date().toISOString(),
            xp_awarded: shouldAwardXP ? true : alreadyAwardedXP,
          }, {
            onConflict: 'lesson_id,student_id',
          });

        if (error) throw error;

        // Update local state
        const updatedLessons = lessons.map(l => 
          l.id === lessonId ? { ...l, completed: true, xp_awarded: shouldAwardXP ? true : l.xp_awarded } : l
        );
        setLessons(updatedLessons);

        // Only award XP if not already awarded
        if (shouldAwardXP) {
          // Award XP for lesson completion
          const { totalXP, streakBonus } = await addXP(15, 'Lesson completed');

          // Award "Busy Bee" badge for first lesson
          await awardBadgeByName('Busy Bee');

          // Check if course is now complete
          const newCompletedCount = updatedLessons.filter(l => l.completed).length;
          const isNowComplete = newCompletedCount === lessons.length;

          if (isNowComplete) {
            // Award bonus XP for course completion
            const courseResult = await addXP(50, 'Course completed');
            // Award "Honey Hunter" badge
            await awardBadgeByName('Honey Hunter');

            // Show course completion animation
            setXpAmount(50 + courseResult.streakBonus);
            setXpType('course');
            setShowXPAnimation(true);

            toast({
              title: '🏆 Course Completed!',
              description: `+${50 + courseResult.streakBonus} XP! You completed the entire course!`,
            });
          } else {
            // Show lesson XP animation
            setXpAmount(totalXP);
            setXpType(streakBonus > 0 ? 'streak' : 'lesson');
            setShowXPAnimation(true);

            toast({
              title: 'Great job! 🎉',
              description: streakBonus > 0 
                ? `+${totalXP} XP earned (includes +${streakBonus} streak bonus)!`
                : `+${totalXP} XP earned for completing a lesson!`,
            });
          }
        } else {
          // Already awarded XP, just show completion message
          toast({
            title: 'Lesson completed',
            description: 'You already earned XP for this lesson.',
          });
        }
      }
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
      {/* XP Animation */}
      <XPAnimation
        amount={xpAmount}
        isVisible={showXPAnimation}
        type={xpType}
        onComplete={() => setShowXPAnimation(false)}
      />
      
      <div className="space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex items-start gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate('/student/courses')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
              {formatGradeLevel(course.grade_level)}
            </span>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mt-2 break-words">{course.title}</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1 line-clamp-2">{course.description || 'No description'}</p>
          </div>
        </div>

        {/* Progress Card */}
        <Card className="bg-honey-gradient-soft border-primary/20">
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-semibold text-base sm:text-lg">Your Progress</h3>
                <p className="text-muted-foreground text-xs sm:text-sm">
                  {completedCount} of {lessons.length} lessons completed
                </p>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-primary">
                {progressPercent}%
              </div>
            </div>
            <Progress value={progressPercent} className="h-2 sm:h-3" />
            {progressPercent === 100 && (
              <div className="text-center mt-4">
                <p className="text-primary font-medium mb-2 text-sm sm:text-base">
                  🎉 Congratulations! You've completed this course!
                </p>
                <Button asChild size="sm">
                  <Link to={`/student/certificate/${id}`}>
                    <Award className="mr-2 h-4 w-4" />
                    View Certificate
                  </Link>
                </Button>
              </div>
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
                  <CardContent className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4">
                    <div className="flex items-center gap-3">
                      <span className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium shrink-0 ${
                        lesson.completed 
                          ? 'bg-green-500 text-white' 
                          : 'bg-primary/10 text-primary'
                      }`}>
                        {lesson.completed ? <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" /> : index + 1}
                      </span>
                      <div className="flex-1 min-w-0 sm:hidden">
                        <h4 className={`font-medium text-sm ${lesson.completed ? 'line-through text-muted-foreground' : ''}`}>
                          {lesson.title}
                        </h4>
                        <p className="text-xs text-muted-foreground truncate">
                          {lesson.description || 'No description'}
                        </p>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 hidden sm:block">
                      <h4 className={`font-medium ${lesson.completed ? 'line-through text-muted-foreground' : ''}`}>
                        {lesson.title}
                      </h4>
                      <p className="text-sm text-muted-foreground truncate">
                        {lesson.description || 'No description'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-10 sm:ml-0">
                      {lesson.resource_url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
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
                        className="text-xs sm:text-sm"
                      >
                        {markingComplete === lesson.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : lesson.completed ? (
                          <>
                            <Circle className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="hidden xs:inline">Undo</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="hidden xs:inline">Complete</span>
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

        {/* Quizzes Section */}
        {quizzes.length > 0 && (
          <div>
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 flex items-center gap-2">
              <FileQuestion className="h-5 w-5" />
              Quizzes
            </h2>
            <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
              {quizzes.map((quiz) => (
                <Card key={quiz.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="p-4 sm:pb-2">
                    <CardTitle className="text-base sm:text-lg">{quiz.title}</CardTitle>
                    <CardDescription className="text-sm">{quiz.description || 'Test your knowledge!'}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 sm:pt-0">
                    <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3">
                      <span className="text-sm text-muted-foreground">
                        Passing score: {quiz.passing_score}%
                      </span>
                      <Button asChild size="sm" className="w-full xs:w-auto">
                        <Link to={`/student/quiz/${quiz.id}`}>
                          <Play className="mr-2 h-4 w-4" />
                          Take Quiz
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Assignments Section */}
        {assignments.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Assignments
            </h2>
            <div className="space-y-3">
              {assignments.map((assignment) => {
                const isOverdue = isPast(new Date(assignment.due_date));
                return (
                  <Card key={assignment.id} className={`hover:shadow-md transition-shadow ${assignment.has_submitted ? 'bg-green-50 border-green-200' : ''}`}>
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{assignment.title}</h4>
                          {assignment.has_submitted ? (
                            <Badge className="bg-green-100 text-green-800">Submitted</Badge>
                          ) : isOverdue ? (
                            <Badge variant="destructive">Past Due</Badge>
                          ) : (
                            <Badge variant="secondary">Open</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {assignment.description || 'No description'}
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <Calendar className="h-4 w-4" />
                          Due: {format(new Date(assignment.due_date), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                      <Button asChild variant={assignment.has_submitted ? 'outline' : 'default'}>
                        <Link to={`/student/assignments/${assignment.id}`}>
                          {assignment.has_submitted ? 'View Submission' : 'Submit'}
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
