import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Edit, Trash2, Loader2, ClipboardList, Calendar, Users, FileIcon, X } from 'lucide-react';
import { format, isPast } from 'date-fns';
import { FileDropzone } from '@/components/FileDropzone';

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  lesson_id: string | null;
  created_at: string;
  submission_count?: number;
}

interface Lesson {
  id: string;
  title: string;
}

export default function CourseAssignments() {
  const { id: courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [courseTitle, setCourseTitle] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [saving, setSaving] = useState(false);

  // Bulk delete state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // File upload state
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [existingFileUrl, setExistingFileUrl] = useState<string | null>(null);
  const [existingFileName, setExistingFileName] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    due_date: '',
    due_time: '23:59',
    lesson_id: 'none',
  });

  useEffect(() => {
    if (courseId) fetchData();
  }, [courseId]);

  const fetchData = async () => {
    try {
      // Fetch course
      const { data: course } = await supabase
        .from('courses')
        .select('title')
        .eq('id', courseId!)
        .single();
      
      if (course) setCourseTitle(course.title);

      // Fetch lessons
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('id, title')
        .eq('course_id', courseId!)
        .order('lesson_order');
      
      setLessons(lessonsData || []);

      // Fetch assignments with submission counts
      const { data: assignmentsData, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('course_id', courseId!)
        .order('due_date', { ascending: true });

      if (error) throw error;

      // Get submission counts for each assignment
      const assignmentsWithCounts = await Promise.all(
        (assignmentsData || []).map(async (assignment) => {
          const { count } = await supabase
            .from('assignment_submissions')
            .select('*', { count: 'exact', head: true })
            .eq('assignment_id', assignment.id);

          return { ...assignment, submission_count: count || 0 };
        })
      );

      setAssignments(assignmentsWithCounts);
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: 'Error loading assignments', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (assignment?: Assignment) => {
    if (assignment) {
      setEditingAssignment(assignment);
      const dueDate = new Date(assignment.due_date);
      setForm({
        title: assignment.title,
        description: assignment.description || '',
        due_date: format(dueDate, 'yyyy-MM-dd'),
        due_time: format(dueDate, 'HH:mm'),
        lesson_id: assignment.lesson_id || 'none',
      });
      // We don't have file_url in the current schema visible, so reset file state
      setExistingFileUrl(null);
      setExistingFileName(null);
    } else {
      setEditingAssignment(null);
      setForm({ title: '', description: '', due_date: '', due_time: '23:59', lesson_id: 'none' });
      setExistingFileUrl(null);
      setExistingFileName(null);
    }
    setFile(null);
    setDialogOpen(true);
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${courseId}/${Date.now()}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from('assignments')
      .upload(fileName, file);

    if (error) {
      console.error('Upload error:', error);
      throw error;
    }

    const { data: urlData } = supabase.storage
      .from('assignments')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.due_date) {
      toast({ title: 'Please fill in required fields', variant: 'destructive' });
      return;
    }

    setSaving(true);
    setUploading(!!file);
    
    try {
      let fileUrl = existingFileUrl;
      
      // Upload file if selected
      if (file) {
        fileUrl = await uploadFile(file);
      }

      const dueDateTime = new Date(`${form.due_date}T${form.due_time}`).toISOString();
      const lessonId = form.lesson_id === 'none' ? null : form.lesson_id;

      if (editingAssignment) {
        const { error } = await supabase
          .from('assignments')
          .update({
            title: form.title.trim(),
            description: form.description.trim() || null,
            due_date: dueDateTime,
            lesson_id: lessonId,
          })
          .eq('id', editingAssignment.id);

        if (error) throw error;
        toast({ title: 'Assignment updated' });
      } else {
        const { error } = await supabase
          .from('assignments')
          .insert({
            course_id: courseId!,
            title: form.title.trim(),
            description: form.description.trim() || null,
            due_date: dueDateTime,
            lesson_id: lessonId,
            created_by: user!.id,
          });

        if (error) throw error;
        toast({ title: 'Assignment created' });
      }

      setDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error saving assignment:', error);
      toast({ title: 'Error saving assignment', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const handleDelete = async (assignmentId: string) => {
    try {
      const { error } = await supabase.from('assignments').delete().eq('id', assignmentId);
      if (error) throw error;
      toast({ title: 'Assignment deleted' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error deleting assignment', variant: 'destructive' });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    setBulkDeleting(true);
    try {
      const { error } = await supabase
        .from('assignments')
        .delete()
        .in('id', Array.from(selectedIds));

      if (error) throw error;
      
      toast({ title: `${selectedIds.size} assignment(s) deleted` });
      setBulkDeleteOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Bulk delete error:', error);
      toast({ title: 'Error deleting assignments', variant: 'destructive' });
    } finally {
      setBulkDeleting(false);
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === assignments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(assignments.map(a => a.id)));
    }
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/teacher/courses/${courseId}`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold truncate">Assignments</h1>
              <p className="text-muted-foreground truncate">{courseTitle}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 ml-14 sm:ml-0">
            {selectedIds.size > 0 && (
              <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete ({selectedIds.size})
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {selectedIds.size} Assignment(s)</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will delete the selected assignments and all their submissions. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleBulkDelete}
                      disabled={bulkDeleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {bulkDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Delete All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => openDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Assignment
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>{editingAssignment ? 'Edit Assignment' : 'Create Assignment'}</DialogTitle>
                  <DialogDescription>
                    {editingAssignment ? 'Update assignment details' : 'Add a new assignment to this course'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="Assignment title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Assignment instructions..."
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="due_date">Due Date *</Label>
                      <Input
                        id="due_date"
                        type="date"
                        value={form.due_date}
                        onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="due_time">Due Time</Label>
                      <Input
                        id="due_time"
                        type="time"
                        value={form.due_time}
                        onChange={(e) => setForm({ ...form, due_time: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lesson">Link to Lesson (optional)</Label>
                    <Select value={form.lesson_id} onValueChange={(v) => setForm({ ...form, lesson_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a lesson" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {lessons.map((lesson) => (
                          <SelectItem key={lesson.id} value={lesson.id}>
                            {lesson.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Attachment (optional)</Label>
                    <FileDropzone
                      onFileSelect={setFile}
                      accept={{
                        'application/pdf': ['.pdf'],
                        'application/msword': ['.doc'],
                        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
                        'image/*': ['.png', '.jpg', '.jpeg'],
                      }}
                      maxSize={10 * 1024 * 1024}
                      uploading={uploading}
                      currentFile={file ? { name: file.name } : existingFileUrl ? { name: existingFileName || 'Attached file', url: existingFileUrl } : undefined}
                      onRemove={() => {
                        setFile(null);
                        setExistingFileUrl(null);
                        setExistingFileName(null);
                      }}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {editingAssignment ? 'Update' : 'Create'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Assignments List */}
        {assignments.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No assignments yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first assignment for students
              </p>
              <Button onClick={() => openDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Add Assignment
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {/* Select all bar */}
            <div className="flex items-center gap-3 px-4 py-2 bg-muted/50 rounded-lg">
              <Checkbox
                checked={selectedIds.size === assignments.length && assignments.length > 0}
                onCheckedChange={toggleSelectAll}
                aria-label="Select all"
              />
              <span className="text-sm text-muted-foreground">
                {selectedIds.size > 0 
                  ? `${selectedIds.size} of ${assignments.length} selected`
                  : 'Select all'
                }
              </span>
            </div>

            {assignments.map((assignment) => {
              const isOverdue = isPast(new Date(assignment.due_date));
              const isSelected = selectedIds.has(assignment.id);
              return (
                <Card 
                  key={assignment.id} 
                  className={`hover:shadow-md transition-shadow ${isSelected ? 'ring-2 ring-primary' : ''}`}
                >
                  <CardContent className="flex items-center gap-4 p-4">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelect(assignment.id)}
                      aria-label={`Select ${assignment.title}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{assignment.title}</h4>
                        <Badge variant={isOverdue ? "destructive" : "secondary"}>
                          {isOverdue ? 'Past Due' : 'Open'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {assignment.description || 'No description'}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Due: {format(new Date(assignment.due_date), 'MMM d, yyyy h:mm a')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {assignment.submission_count} submissions
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/teacher/assignments/${assignment.id}/submissions`}>
                          View Submissions
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openDialog(assignment)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Assignment</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will delete the assignment and all student submissions. This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(assignment.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
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
