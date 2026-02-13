import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Edit, FileText, GripVertical, Loader2, Plus, Trash2, Users, FileQuestion, BarChart3, ClipboardList, FileIcon } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';
import { FileDropzone } from '@/components/FileDropzone';

type Course = Database['public']['Tables']['courses']['Row'];
type Lesson = Database['public']['Tables']['lessons']['Row'];

interface LessonFormData {
  title: string;
  description: string;
  resource_url: string;
}

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [enrollmentCount, setEnrollmentCount] = useState(0);
  
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonForm, setLessonForm] = useState<LessonFormData>({
    title: '',
    description: '',
    resource_url: '',
  });
  const [savingLesson, setSavingLesson] = useState(false);
  const [deletingCourse, setDeletingCourse] = useState(false);

  // File upload state
  const [lessonFile, setLessonFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [existingResourceUrl, setExistingResourceUrl] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchCourseData();
    }
  }, [id]);

  const fetchCourseData = async () => {
    try {
      // Fetch course
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id!)
        .maybeSingle();

      if (courseError) throw courseError;
      
      if (!courseData) {
        toast({
          title: 'Course not found',
          description: 'The course you are looking for does not exist.',
          variant: 'destructive',
        });
        navigate('/teacher/courses');
        return;
      }

      setCourse(courseData);

      // Fetch lessons
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', id!)
        .order('lesson_order', { ascending: true });

      if (lessonsError) throw lessonsError;
      setLessons(lessonsData || []);

      // Fetch enrollment count
      const { count, error: enrollError } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', id!);

      if (!enrollError) {
        setEnrollmentCount(count || 0);
      }
    } catch (error) {
      console.error('Error fetching course data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load course data.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatGradeLevel = (grade: string) => {
    return grade.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const openLessonDialog = (lesson?: Lesson) => {
    if (lesson) {
      setEditingLesson(lesson);
      setLessonForm({
        title: lesson.title,
        description: lesson.description || '',
        resource_url: lesson.resource_url || '',
      });
      setExistingResourceUrl(lesson.resource_url || null);
    } else {
      setEditingLesson(null);
      setLessonForm({ title: '', description: '', resource_url: '' });
      setExistingResourceUrl(null);
    }
    setLessonFile(null);
    setLessonDialogOpen(true);
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `lessons/${id}/${Date.now()}.${fileExt}`;
    
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

  const handleSaveLesson = async () => {
    if (!lessonForm.title.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a lesson title.',
        variant: 'destructive',
      });
      return;
    }

    setSavingLesson(true);
    setUploadingFile(!!lessonFile);

    try {
      let resourceUrl = lessonForm.resource_url.trim() || null;
      
      // Upload file if selected (overrides manual URL)
      if (lessonFile) {
        resourceUrl = await uploadFile(lessonFile);
      }

      if (editingLesson) {
        const { error } = await supabase
          .from('lessons')
          .update({
            title: lessonForm.title.trim(),
            description: lessonForm.description.trim(),
            resource_url: resourceUrl,
          })
          .eq('id', editingLesson.id);

        if (error) throw error;
        
        toast({ title: 'Lesson updated successfully' });
      } else {
        const newOrder = lessons.length;
        const { error } = await supabase
          .from('lessons')
          .insert({
            title: lessonForm.title.trim(),
            description: lessonForm.description.trim(),
            resource_url: resourceUrl,
            course_id: id!,
            lesson_order: newOrder,
          });

        if (error) throw error;
        
        toast({ title: 'Lesson created successfully' });
      }

      setLessonDialogOpen(false);
      fetchCourseData();
    } catch (error: any) {
      console.error('Error saving lesson:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save lesson.',
        variant: 'destructive',
      });
    } finally {
      setSavingLesson(false);
      setUploadingFile(false);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    try {
      const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', lessonId);

      if (error) throw error;
      
      toast({ title: 'Lesson deleted successfully' });
      fetchCourseData();
    } catch (error: any) {
      console.error('Error deleting lesson:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete lesson.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteCourse = async () => {
    setDeletingCourse(true);
    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', id!);

      if (error) throw error;
      
      toast({ title: 'Course deleted successfully' });
      navigate('/teacher/courses');
    } catch (error: any) {
      console.error('Error deleting course:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete course.',
        variant: 'destructive',
      });
    } finally {
      setDeletingCourse(false);
    }
  };

  const getFileName = (url: string) => {
    try {
      const parts = url.split('/');
      return parts[parts.length - 1] || 'Attached file';
    } catch {
      return 'Attached file';
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

  if (!course) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/teacher/courses')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2 mb-1">
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
              <h1 className="text-3xl font-bold text-foreground">{course.title}</h1>
              <p className="text-muted-foreground mt-1">{course.description || 'No description'}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 ml-14 sm:ml-0">
            <Button asChild variant="outline" className="flex-1 sm:flex-initial">
              <Link to={`/teacher/courses/${id}/edit`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="flex-1 sm:flex-initial">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Course</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this course? This action cannot be undone and will remove all lessons and student enrollments.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteCourse}
                    disabled={deletingCourse}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deletingCourse ? 'Deleting...' : 'Delete Course'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 ml-14 sm:ml-0">
          <Card className="bg-honey-gradient-soft border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Lessons</CardTitle>
              <FileText className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{lessons.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-honey-gradient-soft border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Enrolled Students</CardTitle>
              <Users className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{enrollmentCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Quiz Management */}
        <div className="ml-14 sm:ml-0">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileQuestion className="h-5 w-5 text-primary" />
                Quizzes
              </CardTitle>
              <CardDescription>Create and manage quizzes for this course</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button asChild className="w-full sm:w-auto">
                <Link to={`/teacher/courses/${id}/quizzes`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Manage Quizzes
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link to={`/teacher/courses/${id}/results`}>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  View Results
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Assignments Management */}
        <div className="ml-14 sm:ml-0">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                Assignments
              </CardTitle>
              <CardDescription>Create and manage assignments for this course</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full sm:w-auto">
                <Link to={`/teacher/courses/${id}/assignments`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Manage Assignments
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Lessons */}
        <div className="ml-14 sm:ml-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Lessons</h2>
            <Dialog open={lessonDialogOpen} onOpenChange={setLessonDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => openLessonDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Lesson
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>
                    {editingLesson ? 'Edit Lesson' : 'Add New Lesson'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingLesson ? 'Update the lesson details below.' : 'Fill in the details for your new lesson.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="lessonTitle">Lesson Title *</Label>
                    <Input
                      id="lessonTitle"
                      value={lessonForm.title}
                      onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                      placeholder="e.g., Counting to 10"
                      maxLength={100}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lessonDescription">Description</Label>
                    <Textarea
                      id="lessonDescription"
                      value={lessonForm.description}
                      onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
                      placeholder="Describe what this lesson covers..."
                      rows={3}
                      maxLength={500}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Resource Attachment</Label>
                    <FileDropzone
                      onFileSelect={(file) => {
                        setLessonFile(file);
                        if (file) {
                          setLessonForm({ ...lessonForm, resource_url: '' });
                        }
                      }}
                      accept={{
                        'application/pdf': ['.pdf'],
                        'application/msword': ['.doc'],
                        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
                        'application/vnd.ms-powerpoint': ['.ppt'],
                        'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
                        'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
                        'video/*': ['.mp4', '.webm', '.mov'],
                        'audio/*': ['.mp3', '.wav', '.m4a'],
                      }}
                      maxSize={50 * 1024 * 1024}
                      uploading={uploadingFile}
                      currentFile={
                        lessonFile 
                          ? { name: lessonFile.name } 
                          : existingResourceUrl 
                            ? { name: getFileName(existingResourceUrl), url: existingResourceUrl } 
                            : undefined
                      }
                      onRemove={() => {
                        setLessonFile(null);
                        setExistingResourceUrl(null);
                        setLessonForm({ ...lessonForm, resource_url: '' });
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Or enter a URL manually below
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="resourceUrl">Resource URL (optional)</Label>
                    <Input
                      id="resourceUrl"
                      type="url"
                      value={lessonForm.resource_url}
                      onChange={(e) => {
                        setLessonForm({ ...lessonForm, resource_url: e.target.value });
                        if (e.target.value) {
                          setLessonFile(null);
                        }
                      }}
                      placeholder="https://example.com/video"
                      disabled={!!lessonFile}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setLessonDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveLesson} disabled={savingLesson}>
                    {savingLesson ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {uploadingFile ? 'Uploading...' : 'Saving...'}
                      </>
                    ) : (
                      editingLesson ? 'Update Lesson' : 'Add Lesson'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {lessons.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No lessons yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Add your first lesson to start building your course.
                </p>
                <Button onClick={() => openLessonDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Lesson
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {lessons.map((lesson, index) => (
                <Card key={lesson.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <GripVertical className="h-5 w-5" />
                      <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{lesson.title}</h4>
                      <p className="text-sm text-muted-foreground truncate">
                        {lesson.description || 'No description'}
                      </p>
                      {lesson.resource_url && (
                        <a 
                          href={lesson.resource_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                        >
                          <FileIcon className="h-3 w-3" />
                          {getFileName(lesson.resource_url)}
                        </a>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openLessonDialog(lesson)}
                      >
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
                            <AlertDialogTitle>Delete Lesson</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this lesson? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteLesson(lesson.id)}
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
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
