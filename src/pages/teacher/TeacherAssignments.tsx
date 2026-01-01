import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, ClipboardList, Calendar, Users, BookOpen } from 'lucide-react';
import { format, isPast } from 'date-fns';

interface Assignment {
  id: string;
  title: string;
  due_date: string;
  course_id: string;
  course_title: string;
  submission_count: number;
  is_overdue: boolean;
}

export default function TeacherAssignments() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user) fetchAssignments();
  }, [user]);

  const fetchAssignments = async () => {
    try {
      // Get teacher's courses first
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('id, title')
        .eq('teacher_id', user!.id);

      if (coursesError) throw coursesError;

      if (!courses || courses.length === 0) {
        setAssignments([]);
        setLoading(false);
        return;
      }

      const courseIds = courses.map((c) => c.id);
      const courseMap = new Map(courses.map((c) => [c.id, c.title]));

      // Get assignments for all teacher's courses
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('assignments')
        .select('*')
        .in('course_id', courseIds)
        .order('due_date', { ascending: false });

      if (assignmentsError) throw assignmentsError;

      // Get submission counts
      const assignmentsWithDetails = await Promise.all(
        (assignmentsData || []).map(async (assignment) => {
          const { count } = await supabase
            .from('assignment_submissions')
            .select('*', { count: 'exact', head: true })
            .eq('assignment_id', assignment.id);

          return {
            ...assignment,
            course_title: courseMap.get(assignment.course_id) || 'Unknown Course',
            submission_count: count || 0,
            is_overdue: isPast(new Date(assignment.due_date)),
          };
        })
      );

      setAssignments(assignmentsWithDetails);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast({ title: 'Error loading assignments', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const filteredAssignments = assignments.filter(
    (a) =>
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.course_title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: assignments.length,
    open: assignments.filter((a) => !a.is_overdue).length,
    totalSubmissions: assignments.reduce((sum, a) => sum + a.submission_count, 0),
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
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Assignments</h1>
          <p className="text-muted-foreground mt-1">
            Manage and grade student assignments
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="bg-honey-gradient-soft border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
              <ClipboardList className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card className="bg-honey-gradient-soft border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Open Assignments</CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.open}</div>
            </CardContent>
          </Card>
          <Card className="bg-honey-gradient-soft border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalSubmissions}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search assignments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Assignments List */}
        {filteredAssignments.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No assignments found</h3>
              <p className="text-muted-foreground text-center mb-4">
                {assignments.length === 0
                  ? "Create assignments from your course pages"
                  : "No assignments match your search"}
              </p>
              {assignments.length === 0 && (
                <Button asChild>
                  <Link to="/teacher/courses">
                    <BookOpen className="mr-2 h-4 w-4" />
                    Go to Courses
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredAssignments.map((assignment) => (
              <Card key={assignment.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h4 className="font-medium truncate">{assignment.title}</h4>
                        <Badge variant={assignment.is_overdue ? 'destructive' : 'secondary'}>
                          {assignment.is_overdue ? 'Past Due' : 'Open'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{assignment.course_title}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 shrink-0" />
                          Due: {format(new Date(assignment.due_date), 'MMM d, yyyy')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4 shrink-0" />
                          {assignment.submission_count} submissions
                        </span>
                      </div>
                    </div>
                    <Button asChild className="shrink-0 w-full sm:w-auto">
                      <Link to={`/teacher/assignments/${assignment.id}/submissions`}>
                        View Submissions
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}