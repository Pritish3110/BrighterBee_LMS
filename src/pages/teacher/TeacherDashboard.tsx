import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen, Users, FileText, Plus, ArrowRight, Loader2 } from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description: string;
  grade_level: string;
  is_published: boolean;
  created_at: string;
  lessonCount: number;
  enrollmentCount: number;
}

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalCourses: 0, totalStudents: 0, totalLessons: 0 });

  useEffect(() => {
    if (user) {
      fetchCourses();
    }
  }, [user]);

  const fetchCourses = async () => {
    try {
      const { data: coursesData, error } = await supabase
        .from('courses')
        .select('*')
        .eq('teacher_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch lesson counts and enrollment counts for each course
      const coursesWithCounts = await Promise.all(
        (coursesData || []).map(async (course) => {
          const { count: lessonCount } = await supabase
            .from('lessons')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', course.id);

          const { count: enrollmentCount } = await supabase
            .from('enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', course.id);

          return {
            ...course,
            lessonCount: lessonCount || 0,
            enrollmentCount: enrollmentCount || 0,
          };
        })
      );

      setCourses(coursesWithCounts);

      // Calculate totals
      const totalLessons = coursesWithCounts.reduce((sum, c) => sum + c.lessonCount, 0);
      const totalStudents = coursesWithCounts.reduce((sum, c) => sum + c.enrollmentCount, 0);

      setStats({
        totalCourses: coursesWithCounts.length,
        totalStudents,
        totalLessons,
      });
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
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
              Teacher Dashboard 📚
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Manage your courses and track student progress
            </p>
          </div>
          <Button asChild className="w-full sm:w-auto">
            <Link to="/teacher/courses/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Course
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
          <Card className="bg-honey-gradient-soft border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">My Courses</CardTitle>
              <BookOpen className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold">{stats.totalCourses}</div>
            </CardContent>
          </Card>
          <Card className="bg-honey-gradient-soft border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold">{stats.totalStudents}</div>
            </CardContent>
          </Card>
          <Card className="bg-honey-gradient-soft border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Total Lessons</CardTitle>
              <FileText className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold">{stats.totalLessons}</div>
            </CardContent>
          </Card>
        </div>

        {/* My Courses */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">My Courses</h2>
            <Link 
              to="/teacher/courses" 
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : courses.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No courses yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create your first course to get started!
                </p>
                <Button asChild>
                  <Link to="/teacher/courses/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Course
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {courses.slice(0, 6).map((course) => (
                <Card key={course.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                        {formatGradeLevel(course.grade_level)}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        course.is_published 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {course.is_published ? 'Published' : 'Draft'}
                      </span>
                    </div>
                    <CardTitle className="text-lg line-clamp-1">{course.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {course.description || 'No description'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        {course.lessonCount} lessons
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {course.enrollmentCount} students
                      </div>
                    </div>
                    <Button asChild className="w-full" variant="outline">
                      <Link to={`/teacher/courses/${course.id}`}>
                        Manage Course
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
