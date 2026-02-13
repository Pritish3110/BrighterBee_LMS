import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useGamification } from '@/hooks/useGamification';
import { StreakDisplay } from '@/components/StreakDisplay';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen, GraduationCap, Trophy, ArrowRight, Loader2, Star, Award, Zap, Flame } from 'lucide-react';

interface EnrolledCourse {
  id: string;
  title: string;
  description: string;
  grade_level: string;
  thumbnail_url: string | null;
  totalLessons: number;
  completedLessons: number;
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const { xp, level, badges, streak, loading: gamificationLoading, xpForNextLevel } = useGamification();
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ enrolled: 0, completed: 0, inProgress: 0 });

  useEffect(() => {
    if (user) {
      fetchEnrolledCourses();
    }
  }, [user]);

  const fetchEnrolledCourses = async () => {
    try {
      // Fetch enrollments with course data
      const { data: enrollments, error: enrollError } = await supabase
        .from('enrollments')
        .select(`
          course_id,
          courses (
            id,
            title,
            description,
            grade_level,
            thumbnail_url
          )
        `)
        .eq('student_id', user!.id);

      if (enrollError) throw enrollError;

      // For each course, get lesson count and progress
      const coursesWithProgress = await Promise.all(
        (enrollments || []).map(async (enrollment) => {
          const course = enrollment.courses as any;
          
          // Get total lessons
          const { count: totalLessons } = await supabase
            .from('lessons')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', course.id);

          // Get completed lessons
          const { count: completedLessons } = await supabase
            .from('lesson_progress')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', user!.id)
            .eq('completed', true)
            .in('lesson_id', 
              (await supabase.from('lessons').select('id').eq('course_id', course.id)).data?.map(l => l.id) || []
            );

          return {
            id: course.id,
            title: course.title,
            description: course.description,
            grade_level: course.grade_level,
            thumbnail_url: course.thumbnail_url,
            totalLessons: totalLessons || 0,
            completedLessons: completedLessons || 0,
          };
        })
      );

      setEnrolledCourses(coursesWithProgress);

      // Calculate stats
      const completed = coursesWithProgress.filter(
        (c) => c.totalLessons > 0 && c.completedLessons === c.totalLessons
      ).length;
      const inProgress = coursesWithProgress.filter(
        (c) => c.completedLessons > 0 && c.completedLessons < c.totalLessons
      ).length;

      setStats({
        enrolled: coursesWithProgress.length,
        completed,
        inProgress,
      });
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGradeBadgeColor = (grade: string) => {
    switch (grade) {
      case 'nursery':
        return 'bg-green-100 text-green-800';
      case 'junior_kg':
        return 'bg-blue-100 text-blue-800';
      case 'senior_kg':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatGradeLevel = (grade: string) => {
    return grade.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 sm:space-y-8">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Welcome back! 🎉
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Ready to learn something new today?
            </p>
          </div>
          <Button asChild className="w-full sm:w-auto">
            <Link to="/student/browse">
              <GraduationCap className="mr-2 h-4 w-4" />
              Browse Courses
            </Link>
          </Button>
        </div>

        {/* Gamification Stats */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          <Card className="bg-honey-gradient-soft border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Level</CardTitle>
              <Star className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold">{level}</div>
              <div className="mt-2">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{xp} XP</span>
                  <span>{xpForNextLevel(level)} XP</span>
                </div>
                <Progress value={(xp % 100)} className="h-1.5" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-honey-gradient-soft border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Total XP</CardTitle>
              <Zap className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold">{xp}</div>
            </CardContent>
          </Card>
          <Card className="bg-honey-gradient-soft border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Badges</CardTitle>
              <Award className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold">{badges.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-honey-gradient-soft border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Streak</CardTitle>
              <Flame className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <StreakDisplay 
                currentStreak={streak.current_streak} 
                longestStreak={streak.longest_streak}
                compact={false}
              />
            </CardContent>
          </Card>
        </div>

        {/* Badges Display */}
        {badges.length > 0 && (
          <Card className="bg-honey-gradient-soft border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Your Badges
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {badges.map((userBadge) => (
                  <div
                    key={userBadge.badge_id}
                    className="flex items-center gap-2 bg-background rounded-full px-4 py-2 border border-primary/20"
                  >
                    <span className="text-xl">{userBadge.badge.icon === 'award' ? '🏆' : userBadge.badge.icon === 'star' ? '⭐' : userBadge.badge.icon === 'bee' ? '🐝' : '🎖️'}</span>
                    <span className="font-medium text-sm">{userBadge.badge.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Enrolled Courses */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">My Courses</h2>
            <Link 
              to="/student/courses" 
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : enrolledCourses.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <GraduationCap className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No courses yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Start your learning journey by enrolling in a course!
                </p>
                <Button asChild>
                  <Link to="/student/browse">Browse Courses</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {enrolledCourses.slice(0, 6).map((course) => (
                <Card key={course.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="h-32 bg-honey-gradient flex items-center justify-center">
                    {course.thumbnail_url ? (
                      <img 
                        src={course.thumbnail_url} 
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <BookOpen className="h-12 w-12 text-primary-foreground/60" />
                    )}
                  </div>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getGradeBadgeColor(course.grade_level)}`}>
                        {formatGradeLevel(course.grade_level)}
                      </span>
                    </div>
                    <CardTitle className="text-lg line-clamp-1">{course.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {course.description || 'No description'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">
                          {course.totalLessons > 0 
                            ? Math.round((course.completedLessons / course.totalLessons) * 100)
                            : 0}%
                        </span>
                      </div>
                      <Progress 
                        value={course.totalLessons > 0 
                          ? (course.completedLessons / course.totalLessons) * 100 
                          : 0} 
                        className="h-2"
                      />
                      <p className="text-xs text-muted-foreground">
                        {course.completedLessons} of {course.totalLessons} lessons
                      </p>
                    </div>
                    <Button asChild className="w-full mt-4" variant="outline">
                      <Link to={`/student/courses/${course.id}`}>
                        Continue Learning
                        <ArrowRight className="ml-2 h-4 w-4" />
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
