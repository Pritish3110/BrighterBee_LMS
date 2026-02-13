import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, isPast, isFuture, parseISO } from 'date-fns';
import { ClipboardList, Calendar, CheckCircle, AlertTriangle, Clock, Loader2, ExternalLink } from 'lucide-react';

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  course_id: string;
  course_title: string;
  is_submitted: boolean;
  is_graded: boolean;
  grade: string | null;
}

export default function StudentAssignments() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('upcoming');

  // Fetch enrolled course IDs
  const { data: enrolledCourseIds = [] } = useQuery({
    queryKey: ['student-enrolled-courses', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('student_id', user.id);

      if (error) throw error;
      return data.map((e) => e.course_id);
    },
    enabled: !!user,
  });

  // Fetch assignments for enrolled courses
  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['student-all-assignments', enrolledCourseIds, user?.id],
    queryFn: async () => {
      if (enrolledCourseIds.length === 0 || !user) return [];

      const { data: assignmentsData, error } = await supabase
        .from('assignments')
        .select('*, course:courses(title)')
        .in('course_id', enrolledCourseIds)
        .order('due_date', { ascending: true });

      if (error) throw error;

      // Get submissions for these assignments
      const assignmentIds = assignmentsData?.map(a => a.id) || [];
      const { data: submissions } = await supabase
        .from('assignment_submissions')
        .select('assignment_id, grade')
        .eq('student_id', user.id)
        .in('assignment_id', assignmentIds);

      const submissionMap = new Map(submissions?.map(s => [s.assignment_id, s]) || []);

      return (assignmentsData || []).map((a: any) => {
        const submission = submissionMap.get(a.id);
        return {
          id: a.id,
          title: a.title,
          description: a.description,
          due_date: a.due_date,
          course_id: a.course_id,
          course_title: a.course?.title || 'Unknown Course',
          is_submitted: !!submission,
          is_graded: !!submission?.grade,
          grade: submission?.grade || null,
        };
      });
    },
    enabled: enrolledCourseIds.length > 0 && !!user,
  });

  // Categorize assignments
  const now = new Date();
  const upcomingAssignments = assignments.filter(
    (a) => isFuture(parseISO(a.due_date)) && !a.is_submitted
  );
  const pastDueAssignments = assignments.filter(
    (a) => isPast(parseISO(a.due_date)) && !a.is_submitted
  );
  const completedAssignments = assignments.filter((a) => a.is_submitted);

  const getStatusBadge = (assignment: Assignment) => {
    if (assignment.is_graded) {
      return <Badge className="bg-green-100 text-green-800">Graded: {assignment.grade}</Badge>;
    }
    if (assignment.is_submitted) {
      return <Badge variant="secondary">Submitted</Badge>;
    }
    if (isPast(parseISO(assignment.due_date))) {
      return <Badge variant="destructive">Past Due</Badge>;
    }
    return <Badge variant="outline">Pending</Badge>;
  };

  const getDaysRemaining = (dueDate: string) => {
    const due = parseISO(dueDate);
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    return `${diffDays} days left`;
  };

  const AssignmentCard = ({ assignment }: { assignment: Assignment }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h4 className="font-medium truncate">{assignment.title}</h4>
              {getStatusBadge(assignment)}
            </div>
            <p className="text-sm text-muted-foreground truncate">{assignment.course_title}</p>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4 shrink-0" />
                {format(parseISO(assignment.due_date), 'MMM d, yyyy h:mm a')}
              </span>
              {!assignment.is_submitted && (
                <span className={`flex items-center gap-1 ${isPast(parseISO(assignment.due_date)) ? 'text-destructive' : 'text-primary'}`}>
                  <Clock className="h-4 w-4 shrink-0" />
                  {getDaysRemaining(assignment.due_date)}
                </span>
              )}
            </div>
          </div>
          <Button asChild size="sm" className="shrink-0 w-full sm:w-auto">
            <Link to={`/student/assignments/${assignment.id}`}>
              View
              <ExternalLink className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const EmptyState = ({ icon: Icon, message }: { icon: any; message: string }) => (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Icon className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground text-center">{message}</p>
      </CardContent>
    </Card>
  );

  if (isLoading) {
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
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">My Assignments</h1>
          <p className="text-muted-foreground mt-1">Track and submit your assignments</p>
        </div>

        {/* Stats */}
        <div className="grid gap-3 grid-cols-3">
          <Card className="bg-honey-gradient-soft border-primary/20">
            <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-primary shrink-0" />
                <span className="hidden sm:inline">Upcoming</span>
                <span className="sm:hidden">Due</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-2xl sm:text-3xl font-bold">{upcomingAssignments.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-destructive/10 border-destructive/20">
            <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2">
                <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-destructive shrink-0" />
                <span className="hidden sm:inline">Past Due</span>
                <span className="sm:hidden">Late</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-2xl sm:text-3xl font-bold">{pastDueAssignments.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800/30">
            <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2">
                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 shrink-0" />
                <span className="hidden sm:inline">Completed</span>
                <span className="sm:hidden">Done</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-2xl sm:text-3xl font-bold">{completedAssignments.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="upcoming" className="text-xs sm:text-sm">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Upcoming</span>
              <span className="sm:hidden">Due</span>
              {upcomingAssignments.length > 0 && (
                <Badge variant="secondary" className="ml-1 sm:ml-2 h-5 px-1 sm:px-2">{upcomingAssignments.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="pastdue" className="text-xs sm:text-sm">
              <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Past Due</span>
              <span className="sm:hidden">Late</span>
              {pastDueAssignments.length > 0 && (
                <Badge variant="destructive" className="ml-1 sm:ml-2 h-5 px-1 sm:px-2">{pastDueAssignments.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed" className="text-xs sm:text-sm">
              <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Completed</span>
              <span className="sm:hidden">Done</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-4 space-y-3">
            {upcomingAssignments.length === 0 ? (
              <EmptyState icon={Clock} message="No upcoming assignments. You're all caught up!" />
            ) : (
              upcomingAssignments.map((assignment) => (
                <AssignmentCard key={assignment.id} assignment={assignment} />
              ))
            )}
          </TabsContent>

          <TabsContent value="pastdue" className="mt-4 space-y-3">
            {pastDueAssignments.length === 0 ? (
              <EmptyState icon={CheckCircle} message="No past due assignments. Great job!" />
            ) : (
              pastDueAssignments.map((assignment) => (
                <AssignmentCard key={assignment.id} assignment={assignment} />
              ))
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-4 space-y-3">
            {completedAssignments.length === 0 ? (
              <EmptyState icon={ClipboardList} message="No completed assignments yet." />
            ) : (
              completedAssignments.map((assignment) => (
                <AssignmentCard key={assignment.id} assignment={assignment} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
