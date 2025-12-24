import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, GraduationCap, Search, Loader2, CheckCircle } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

type Course = Database['public']['Tables']['courses']['Row'] & {
  lessonCount: number;
  isEnrolled: boolean;
};

type GradeLevel = Database['public']['Enums']['grade_level'] | 'all';

export default function BrowseCourses() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<GradeLevel>('all');
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchCourses();
    }
  }, [user]);

  const fetchCourses = async () => {
    try {
      // Fetch published courses
      const { data: coursesData, error } = await supabase
        .from('courses')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user's enrollments
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('student_id', user!.id);

      const enrolledCourseIds = new Set(enrollments?.map(e => e.course_id) || []);

      // Get lesson counts for each course
      const coursesWithDetails = await Promise.all(
        (coursesData || []).map(async (course) => {
          const { count } = await supabase
            .from('lessons')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', course.id);

          return {
            ...course,
            lessonCount: count || 0,
            isEnrolled: enrolledCourseIds.has(course.id),
          };
        })
      );

      setCourses(coursesWithDetails);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (courseId: string) => {
    setEnrollingId(courseId);
    try {
      const { error } = await supabase
        .from('enrollments')
        .insert({
          course_id: courseId,
          student_id: user!.id,
        });

      if (error) throw error;

      toast({
        title: 'Enrolled successfully!',
        description: 'You can now access this course.',
      });

      // Update local state
      setCourses(courses.map(c => 
        c.id === courseId ? { ...c, isEnrolled: true } : c
      ));
    } catch (error: any) {
      console.error('Error enrolling:', error);
      toast({
        title: 'Enrollment failed',
        description: error.message || 'Could not enroll in this course.',
        variant: 'destructive',
      });
    } finally {
      setEnrollingId(null);
    }
  };

  const formatGradeLevel = (grade: string) => {
    return grade.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
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

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGrade = gradeFilter === 'all' || course.grade_level === gradeFilter;
    return matchesSearch && matchesGrade;
  });

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Browse Courses</h1>
          <p className="text-muted-foreground mt-1">
            Discover new courses to start your learning journey
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={gradeFilter} onValueChange={(v) => setGradeFilter(v as GradeLevel)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Grade Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              <SelectItem value="nursery">Nursery</SelectItem>
              <SelectItem value="junior_kg">Junior KG</SelectItem>
              <SelectItem value="senior_kg">Senior KG</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Courses Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredCourses.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <GraduationCap className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No courses found</h3>
              <p className="text-muted-foreground text-center">
                {searchQuery || gradeFilter !== 'all' 
                  ? 'Try adjusting your filters'
                  : 'Check back later for new courses!'
                }
              </p>
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
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getGradeBadgeColor(course.grade_level)}`}>
                      {formatGradeLevel(course.grade_level)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {course.lessonCount} lessons
                    </span>
                  </div>
                  <CardTitle className="text-lg line-clamp-1">{course.title}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {course.description || 'No description'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {course.isEnrolled ? (
                    <Button asChild className="w-full" variant="outline">
                      <Link to={`/student/courses/${course.id}`}>
                        <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                        Continue Learning
                      </Link>
                    </Button>
                  ) : (
                    <Button 
                      className="w-full"
                      onClick={() => handleEnroll(course.id)}
                      disabled={enrollingId === course.id}
                    >
                      {enrollingId === course.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Enrolling...
                        </>
                      ) : (
                        'Enroll Now'
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
