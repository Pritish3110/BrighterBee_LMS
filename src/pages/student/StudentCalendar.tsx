import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, isSameDay, parseISO, isFuture } from 'date-fns';
import { Calendar as CalendarIcon, Clock, ClipboardList, BookOpen, ExternalLink } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  start_date: string;
  end_date: string | null;
  all_day: boolean;
  color: string;
  is_system_wide: boolean;
  is_assignment?: boolean;
  course_title?: string;
}

const EVENT_TYPES = [
  { value: 'class', label: 'Class', color: 'hsl(var(--primary))' },
  { value: 'meeting', label: 'Meeting', color: 'hsl(210, 100%, 50%)' },
  { value: 'holiday', label: 'Holiday', color: 'hsl(0, 100%, 50%)' },
  { value: 'event', label: 'Event', color: 'hsl(280, 100%, 50%)' },
  { value: 'deadline', label: 'Deadline', color: 'hsl(30, 100%, 50%)' },
  { value: 'assignment', label: 'Assignment', color: 'hsl(150, 100%, 40%)' },
];

export default function StudentCalendar() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Fetch system-wide events
  const { data: systemEvents = [] } = useQuery({
    queryKey: ['student-system-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('is_system_wide', true)
        .order('start_date', { ascending: true });

      if (error) throw error;
      return data as Event[];
    },
  });

  // Fetch enrolled courses
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
  const { data: assignments = [] } = useQuery({
    queryKey: ['student-assignments', enrolledCourseIds],
    queryFn: async () => {
      if (enrolledCourseIds.length === 0) return [];

      const { data, error } = await supabase
        .from('assignments')
        .select('*, course:courses(title)')
        .in('course_id', enrolledCourseIds)
        .order('due_date', { ascending: true });

      if (error) throw error;

      // Convert assignments to event format
      return (data || []).map((a: any) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        event_type: 'assignment',
        start_date: a.due_date,
        end_date: null,
        all_day: false,
        color: 'hsl(150, 100%, 40%)',
        is_system_wide: false,
        is_assignment: true,
        course_title: a.course?.title,
      }));
    },
    enabled: enrolledCourseIds.length > 0,
  });

  // Combine all events
  const allEvents: Event[] = [...systemEvents, ...assignments];

  const eventsForSelectedDate = allEvents.filter(
    (event) => selectedDate && isSameDay(parseISO(event.start_date), selectedDate)
  );

  const upcomingAssignments = assignments
    .filter((a) => isFuture(parseISO(a.start_date)))
    .slice(0, 5);

  const getEventTypeColor = (type: string) => {
    return EVENT_TYPES.find((t) => t.value === type)?.color || 'hsl(var(--primary))';
  };

  const eventDates = allEvents.map((e) => parseISO(e.start_date));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Calendar</h1>
          <p className="text-muted-foreground">View academic events and assignment due dates</p>
        </div>

        <div className="grid gap-4 lg:gap-6 grid-cols-1 lg:grid-cols-3">
          {/* Calendar */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                {selectedDate ? format(selectedDate, 'MMMM yyyy') : 'Calendar'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="pointer-events-auto w-full"
                modifiers={{
                  hasEvent: eventDates,
                }}
                modifiersStyles={{
                  hasEvent: {
                    fontWeight: 'bold',
                    textDecoration: 'underline',
                    textDecorationColor: 'hsl(var(--primary))',
                  },
                }}
              />
            </CardContent>
          </Card>

          {/* Events for selected date */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'Events'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {eventsForSelectedDate.length === 0 ? (
                <p className="text-muted-foreground text-sm">No events for this date</p>
              ) : (
                <div className="space-y-3">
                  {eventsForSelectedDate.map((event) => (
                    <div
                      key={event.id}
                      className="p-3 rounded-lg border bg-card"
                      style={{ borderLeftColor: getEventTypeColor(event.event_type), borderLeftWidth: 4 }}
                    >
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">{event.title}</h4>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="text-xs">
                            {EVENT_TYPES.find((t) => t.value === event.event_type)?.label}
                          </Badge>
                          {event.course_title && (
                            <Badge variant="outline" className="text-xs">
                              {event.course_title}
                            </Badge>
                          )}
                        </div>
                        {!event.all_day && (
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(event.start_date), 'h:mm a')}
                          </p>
                        )}
                        {event.description && (
                          <p className="text-sm text-muted-foreground">{event.description}</p>
                        )}
                        {event.is_assignment && (
                          <Button asChild size="sm" variant="outline" className="w-full mt-2">
                            <Link to={`/student/assignments/${event.id}`}>
                              View Assignment
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Assignments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Upcoming Assignments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingAssignments.length === 0 ? (
              <p className="text-muted-foreground">No upcoming assignments</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {upcomingAssignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
                    style={{ borderLeftColor: getEventTypeColor('assignment'), borderLeftWidth: 4 }}
                  >
                    <h4 className="font-medium truncate">{assignment.title}</h4>
                    <p className="text-sm text-muted-foreground truncate">{assignment.course_title}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Due: {format(parseISO(assignment.start_date), 'MMM d, yyyy h:mm a')}
                    </p>
                    <Button asChild size="sm" variant="outline" className="w-full mt-3">
                      <Link to={`/student/assignments/${assignment.id}`}>
                        View Assignment
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}