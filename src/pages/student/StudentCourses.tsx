import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen, Search, ArrowRight, Loader2, GraduationCap } from 'lucide-react';

interface EnrolledCourse {
  id: string;
  title: string;
  description: string;
  grade_level: string;
  thumbnail_url: string | null;
  totalLessons: number;
  completedLessons: number;
}

export default function StudentCourses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user) {
      fetchEnrolledCourses();
    }
  }, [user]);

  const fetchEnrolledCourses = async () => {
    try {
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

      const coursesWithProgress = await Promise.all(
        (enrollments || []).map(async (enrollment) => {
          const course = enrollment.courses as any;
          
          const { data: lessons } = await supabase
            .from('lessons')
            .select('id')
            .eq('course_id', course.id);

          const lessonIds = lessons?.map(l => l.id) || [];
          
          let completedLessons = 0;
          if (lessonIds.length > 0) {
            const { count } = await supabase
              .from('lesson_progress')
              .select('*', { count: 'exact', head: true })
              .eq('student_id', user!.id)
              .eq('completed', true)
              .in('lesson_id', lessonIds);
            completedLessons = count || 0;
          }

          return {
            id: course.id,
            title: course.title,
            description: course.description,
            grade_level: course.grade_level,
            thumbnail_url: course.thumbnail_url,
            totalLessons: lessonIds.length,
            completedLessons,
          };
        })
      );

      setCourses(coursesWithProgress);
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

  const filteredCourses = courses.filter(course =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Courses</h1>
            <p className="text-muted-foreground mt-1">
              Continue your learning journey
            </p>
          </div>
          <Button asChild>
            <Link to="/student/browse">
              <GraduationCap className="mr-2 h-4 w-4" />
              Browse More
            </Link>
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search your courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Courses Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredCourses.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchQuery ? 'No courses found' : 'No enrolled courses'}
              </h3>
              <p className="text-muted-foreground text-center mb-4">
                {searchQuery 
                  ? 'Try adjusting your search'
                  : 'Start your learning journey by enrolling in a course!'
                }
              </p>
              {!searchQuery && (
                <Button asChild>
                  <Link to="/student/browse">Browse Courses</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredCourses.map((course) => (
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
    </DashboardLayout>
  );
}
