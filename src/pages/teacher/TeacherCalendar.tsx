import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format, isSameDay, parseISO } from 'date-fns';
import { Plus, Calendar as CalendarIcon, Clock, Trash2, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  created_by: string;
  course_id: string | null;
}

const EVENT_TYPES = [
  { value: 'class', label: 'Class', color: 'hsl(var(--primary))' },
  { value: 'meeting', label: 'Meeting', color: 'hsl(210, 100%, 50%)' },
  { value: 'holiday', label: 'Holiday', color: 'hsl(0, 100%, 50%)' },
  { value: 'event', label: 'Event', color: 'hsl(280, 100%, 50%)' },
  { value: 'deadline', label: 'Deadline', color: 'hsl(30, 100%, 50%)' },
];

export default function TeacherCalendar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState('event');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [allDay, setAllDay] = useState(false);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['teacher-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('start_date', { ascending: true });
      
      if (error) throw error;
      return data as Event[];
    },
  });

  type EventInsert = {
    title: string;
    description?: string | null;
    event_type: string;
    start_date: string;
    end_date?: string | null;
    all_day?: boolean;
    color?: string;
    is_system_wide?: boolean;
    created_by: string;
    course_id?: string | null;
  };

  const createEventMutation = useMutation({
    mutationFn: async (eventData: EventInsert) => {
      const { error } = await supabase.from('events').insert([eventData]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-events'] });
      toast({ title: 'Event created successfully' });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create event', description: error.message, variant: 'destructive' });
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async ({ id, ...eventData }: Partial<Event> & { id: string }) => {
      const { error } = await supabase.from('events').update(eventData).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-events'] });
      toast({ title: 'Event updated successfully' });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update event', description: error.message, variant: 'destructive' });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-events'] });
      toast({ title: 'Event deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete event', description: error.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setEventType('event');
    setStartTime('09:00');
    setEndTime('10:00');
    setAllDay(false);
    setEditingEvent(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !user) return;

    const startDate = allDay 
      ? new Date(selectedDate.setHours(0, 0, 0, 0)).toISOString()
      : new Date(`${format(selectedDate, 'yyyy-MM-dd')}T${startTime}`).toISOString();
    
    const endDate = allDay
      ? new Date(selectedDate.setHours(23, 59, 59, 999)).toISOString()
      : new Date(`${format(selectedDate, 'yyyy-MM-dd')}T${endTime}`).toISOString();

    const eventData = {
      title,
      description: description || null,
      event_type: eventType,
      start_date: startDate,
      end_date: endDate,
      all_day: allDay,
      color: EVENT_TYPES.find(t => t.value === eventType)?.color || 'hsl(var(--primary))',
      created_by: user.id,
      is_system_wide: false,
    };

    if (editingEvent) {
      updateEventMutation.mutate({ id: editingEvent.id, ...eventData });
    } else {
      createEventMutation.mutate(eventData);
    }
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setTitle(event.title);
    setDescription(event.description || '');
    setEventType(event.event_type);
    setAllDay(event.all_day);
    setSelectedDate(parseISO(event.start_date));
    if (!event.all_day) {
      setStartTime(format(parseISO(event.start_date), 'HH:mm'));
      setEndTime(event.end_date ? format(parseISO(event.end_date), 'HH:mm') : '10:00');
    }
    setIsDialogOpen(true);
  };

  const eventsForSelectedDate = events.filter(event => 
    selectedDate && isSameDay(parseISO(event.start_date), selectedDate)
  );

  const getEventTypeColor = (type: string) => {
    return EVENT_TYPES.find(t => t.value === type)?.color || 'hsl(var(--primary))';
  };

  // Dates that have events for calendar highlighting
  const eventDates = events.map(e => parseISO(e.start_date));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Calendar</h1>
            <p className="text-muted-foreground">Manage your classes, meetings, and events</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2 w-full sm:w-auto">
                <Plus className="h-4 w-4" />
                Add Event
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingEvent ? 'Edit Event' : 'Create New Event'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Event title"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="type">Event Type</Label>
                  <Select value={eventType} onValueChange={setEventType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="h-3 w-3 rounded-full" 
                              style={{ backgroundColor: type.color }}
                            />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Date</Label>
                  <div className="border rounded-md p-3">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      className="pointer-events-auto"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="allDay"
                    checked={allDay}
                    onChange={(e) => setAllDay(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="allDay">All Day</Label>
                </div>

                {!allDay && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startTime">Start Time</Label>
                      <Input
                        id="startTime"
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endTime">End Time</Label>
                      <Input
                        id="endTime"
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Event description (optional)"
                    rows={3}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={createEventMutation.isPending || updateEventMutation.isPending}>
                  {editingEvent ? 'Update Event' : 'Create Event'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
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
              {isLoading ? (
                <p className="text-muted-foreground">Loading events...</p>
              ) : eventsForSelectedDate.length === 0 ? (
                <p className="text-muted-foreground text-sm">No events for this date</p>
              ) : (
                <div className="space-y-3">
                  {eventsForSelectedDate.map(event => (
                    <div
                      key={event.id}
                      className="p-3 rounded-lg border bg-card"
                      style={{ borderLeftColor: getEventTypeColor(event.event_type), borderLeftWidth: 4 }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h4 className="font-medium">{event.title}</h4>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {EVENT_TYPES.find(t => t.value === event.event_type)?.label}
                            </Badge>
                            {event.is_system_wide && (
                              <Badge variant="outline" className="text-xs">System</Badge>
                            )}
                          </div>
                          {!event.all_day && (
                            <p className="text-xs text-muted-foreground">
                              {format(parseISO(event.start_date), 'h:mm a')} - {event.end_date && format(parseISO(event.end_date), 'h:mm a')}
                            </p>
                          )}
                          {event.description && (
                            <p className="text-sm text-muted-foreground mt-2">{event.description}</p>
                          )}
                        </div>
                        {event.created_by === user?.id && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEditEvent(event)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => deleteEventMutation.mutate(event.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : events.filter(e => new Date(e.start_date) >= new Date()).length === 0 ? (
              <p className="text-muted-foreground">No upcoming events</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {events
                  .filter(e => new Date(e.start_date) >= new Date())
                  .slice(0, 6)
                  .map(event => (
                    <div
                      key={event.id}
                      className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow cursor-pointer"
                      style={{ borderLeftColor: getEventTypeColor(event.event_type), borderLeftWidth: 4 }}
                      onClick={() => {
                        setSelectedDate(parseISO(event.start_date));
                      }}
                    >
                      <h4 className="font-medium truncate">{event.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {format(parseISO(event.start_date), 'MMM d, yyyy')}
                      </p>
                      <Badge variant="secondary" className="mt-2 text-xs">
                        {EVENT_TYPES.find(t => t.value === event.event_type)?.label}
                      </Badge>
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
