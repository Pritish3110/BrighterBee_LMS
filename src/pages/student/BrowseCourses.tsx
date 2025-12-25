import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, GraduationCap, Search, Loader2, CheckCircle, Lock, ExternalLink } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type Course = Database['public']['Tables']['courses']['Row'] & {
  lessonCount: number;
  isEnrolled: boolean;
  prerequisites: { id: string; title: string; isCompleted: boolean; isEnrolled: boolean }[];
  canEnroll: boolean;
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

      // Fetch all prerequisites
      const { data: allPrerequisites } = await supabase
        .from('course_prerequisites')
        .select('course_id, prerequisite_course_id');

      // Fetch completed courses (all lessons completed)
      const completedCourseIds = new Set<string>();
      for (const courseId of enrolledCourseIds) {
        const { data: lessons } = await supabase
          .from('lessons')
          .select('id')
          .eq('course_id', courseId);
        
        if (lessons && lessons.length > 0) {
          const { data: progress } = await supabase
            .from('lesson_progress')
            .select('lesson_id')
            .eq('student_id', user!.id)
            .eq('completed', true)
            .in('lesson_id', lessons.map(l => l.id));
          
          if (progress && progress.length === lessons.length) {
            completedCourseIds.add(courseId);
          }
        }
      }

      // Get lesson counts and prerequisites for each course
      const coursesWithDetails = await Promise.all(
        (coursesData || []).map(async (course) => {
          const { count } = await supabase
            .from('lessons')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', course.id);

          // Get prerequisites for this course
          const coursePrereqs = allPrerequisites?.filter(p => p.course_id === course.id) || [];
          const prerequisites = await Promise.all(
            coursePrereqs.map(async (prereq) => {
              const prereqCourse = coursesData?.find(c => c.id === prereq.prerequisite_course_id);
              return {
                id: prereq.prerequisite_course_id,
                title: prereqCourse?.title || 'Unknown Course',
                isCompleted: completedCourseIds.has(prereq.prerequisite_course_id),
                isEnrolled: enrolledCourseIds.has(prereq.prerequisite_course_id),
              };
            })
          );

          const canEnroll = prerequisites.length === 0 || prerequisites.every(p => p.isCompleted);

          return {
            ...course,
            lessonCount: count || 0,
            isEnrolled: enrolledCourseIds.has(course.id),
            prerequisites,
            canEnroll,
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
    const course = courses.find(c => c.id === courseId);
    if (!course?.canEnroll) {
      toast({
        title: 'Prerequisites Required',
        description: 'You must complete prerequisite courses before enrolling.',
        variant: 'destructive',
      });
      return;
    }

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
            {filteredCourses.map((course) => {
              const completedCount = course.prerequisites.filter(p => p.isCompleted).length;
              const totalPrereqs = course.prerequisites.length;
              const progressPercent = totalPrereqs > 0 ? (completedCount / totalPrereqs) * 100 : 100;

              return (
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
                  <CardContent className="space-y-3">
                    {/* Prerequisites section with progress */}
                    {course.prerequisites.length > 0 && !course.isEnrolled && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-muted-foreground">Prerequisites</span>
                          <span className={completedCount === totalPrereqs ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                            {completedCount}/{totalPrereqs} completed
                          </span>
                        </div>
                        <Progress 
                          value={progressPercent} 
                          className="h-2"
                        />
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {course.prerequisites.map((prereq) => (
                            <TooltipProvider key={prereq.id}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  {prereq.isEnrolled ? (
                                    <Link
                                      to={`/student/courses/${prereq.id}`}
                                      className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-colors ${
                                        prereq.isCompleted 
                                          ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                          : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                      }`}
                                    >
                                      {prereq.title}
                                      {prereq.isCompleted ? (
                                        <CheckCircle className="h-3 w-3" />
                                      ) : (
                                        <ExternalLink className="h-3 w-3" />
                                      )}
                                    </Link>
                                  ) : (
                                    <span
                                      className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-destructive/10 text-destructive cursor-default"
                                    >
                                      {prereq.title}
                                      <Lock className="h-3 w-3" />
                                    </span>
                                  )}
                                </TooltipTrigger>
                                <TooltipContent>
                                  {prereq.isCompleted 
                                    ? 'Completed! Click to review' 
                                    : prereq.isEnrolled 
                                      ? 'In progress - click to continue'
                                      : 'Enroll in this course first'
                                  }
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Enrollment button */}
                    {course.isEnrolled ? (
                      <Button asChild className="w-full" variant="outline">
                        <Link to={`/student/courses/${course.id}`}>
                          <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                          Continue Learning
                        </Link>
                      </Button>
                    ) : !course.canEnroll ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button className="w-full" variant="secondary" disabled>
                              <Lock className="mr-2 h-4 w-4" />
                              Prerequisites Required
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Complete the prerequisite courses before enrolling.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
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
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
