import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, Loader2, Users, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

interface CourseWithTeacher {
  id: string;
  title: string;
  description: string | null;
  grade_level: string;
  is_published: boolean;
  created_at: string;
  teacher_id: string;
  teacher_name: string | null;
  enrollment_count: number;
}

export default function AdminCourses() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<CourseWithTeacher[]>([]);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      // Fetch all courses
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });

      if (coursesError) throw coursesError;

      if (!coursesData || coursesData.length === 0) {
        setCourses([]);
        setLoading(false);
        return;
      }

      // Get unique teacher IDs
      const teacherIds = [...new Set(coursesData.map(c => c.teacher_id))];

      // Fetch teacher profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', teacherIds);

      const profilesMap = new Map(
        (profilesData || []).map(p => [p.id, p.full_name])
      );

      // Fetch enrollment counts for each course
      const { data: enrollmentsData } = await supabase
        .from('enrollments')
        .select('course_id');

      const enrollmentCounts = new Map<string, number>();
      (enrollmentsData || []).forEach(e => {
        enrollmentCounts.set(e.course_id, (enrollmentCounts.get(e.course_id) || 0) + 1);
      });

      // Combine all data
      const coursesWithTeachers: CourseWithTeacher[] = coursesData.map(course => ({
        id: course.id,
        title: course.title,
        description: course.description,
        grade_level: course.grade_level,
        is_published: course.is_published,
        created_at: course.created_at,
        teacher_id: course.teacher_id,
        teacher_name: profilesMap.get(course.teacher_id) || 'Unknown Teacher',
        enrollment_count: enrollmentCounts.get(course.id) || 0,
      }));

      setCourses(coursesWithTeachers);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast({
        title: 'Error',
        description: 'Failed to load courses.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatGradeLevel = (grade: string) => {
    return grade.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
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
      <div className="space-y-6 sm:space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">All Courses</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            View all courses published by teachers
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{courses.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Published</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">
                {courses.filter(c => c.is_published).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Enrollments</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">
                {courses.reduce((sum, c) => sum + c.enrollment_count, 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Courses Table */}
        {courses.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No courses yet</h3>
              <p className="text-muted-foreground text-center">
                Teachers haven't created any courses yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Course List</CardTitle>
              <CardDescription>
                All courses created by teachers in the system
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course Title</TableHead>
                      <TableHead>Teacher</TableHead>
                      <TableHead>Grade Level</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Enrollments</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {courses.map((course) => (
                      <TableRow key={course.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{course.title}</p>
                            {course.description && (
                              <p className="text-sm text-muted-foreground truncate max-w-xs">
                                {course.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-muted-foreground">
                            {course.teacher_name}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {formatGradeLevel(course.grade_level)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {course.is_published ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Published
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <XCircle className="h-3 w-3 mr-1" />
                              Draft
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            {course.enrollment_count}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(course.created_at), 'MMM d, yyyy')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-border">
                {courses.map((course) => (
                  <div key={course.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{course.title}</p>
                        <p className="text-sm text-muted-foreground">{course.teacher_name}</p>
                      </div>
                      {course.is_published ? (
                        <Badge className="bg-green-100 text-green-800 shrink-0">Published</Badge>
                      ) : (
                        <Badge variant="secondary" className="shrink-0">Draft</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <Badge variant="outline">{formatGradeLevel(course.grade_level)}</Badge>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {course.enrollment_count} students
                      </span>
                      <span className="text-muted-foreground">
                        {format(new Date(course.created_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
