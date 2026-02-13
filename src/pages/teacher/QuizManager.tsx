import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Edit, FileQuestion, Loader2, Plus, Trash2, ClipboardList } from 'lucide-react';

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  passing_score: number;
  created_at: string;
  questionCount?: number;
  attemptCount?: number;
}

interface Course {
  id: string;
  title: string;
  teacher_id: string;
}

export default function QuizManager() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<Course | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    passing_score: 60,
  });

  useEffect(() => {
    if (courseId) {
      fetchData();
    }
  }, [courseId]);

  const fetchData = async () => {
    try {
      // Fetch course
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('id, title, teacher_id')
        .eq('id', courseId!)
        .maybeSingle();

      if (courseError) throw courseError;
      if (!courseData) {
        navigate('/teacher/courses');
        return;
      }

      setCourse(courseData);

      // Fetch quizzes
      const { data: quizzesData, error: quizzesError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('course_id', courseId!)
        .order('created_at', { ascending: false });

      if (quizzesError) throw quizzesError;

      // Get question and attempt counts
      const quizzesWithCounts = await Promise.all(
        (quizzesData || []).map(async (quiz) => {
          const { count: questionCount } = await supabase
            .from('quiz_questions')
            .select('*', { count: 'exact', head: true })
            .eq('quiz_id', quiz.id);

          const { count: attemptCount } = await supabase
            .from('quiz_attempts')
            .select('*', { count: 'exact', head: true })
            .eq('quiz_id', quiz.id);

          return {
            ...quiz,
            questionCount: questionCount || 0,
            attemptCount: attemptCount || 0,
          };
        })
      );

      setQuizzes(quizzesWithCounts);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load quiz data.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (quiz?: Quiz) => {
    if (quiz) {
      setEditingQuiz(quiz);
      setFormData({
        title: quiz.title,
        description: quiz.description || '',
        passing_score: quiz.passing_score,
      });
    } else {
      setEditingQuiz(null);
      setFormData({ title: '', description: '', passing_score: 60 });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a quiz title.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      if (editingQuiz) {
        const { error } = await supabase
          .from('quizzes')
          .update({
            title: formData.title.trim(),
            description: formData.description.trim() || null,
            passing_score: formData.passing_score,
          })
          .eq('id', editingQuiz.id);

        if (error) throw error;
        toast({ title: 'Quiz updated successfully' });
      } else {
        const { error } = await supabase
          .from('quizzes')
          .insert({
            title: formData.title.trim(),
            description: formData.description.trim() || null,
            passing_score: formData.passing_score,
            course_id: courseId!,
          });

        if (error) throw error;
        toast({ title: 'Quiz created successfully' });
      }

      setDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error saving quiz:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save quiz.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (quizId: string) => {
    try {
      const { error } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', quizId);

      if (error) throw error;
      toast({ title: 'Quiz deleted successfully' });
      fetchData();
    } catch (error: any) {
      console.error('Error deleting quiz:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete quiz.',
        variant: 'destructive',
      });
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
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/teacher/courses/${courseId}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Quiz Manager</h1>
            <p className="text-muted-foreground mt-1 truncate">{course?.title}</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => openDialog()} className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Create Quiz
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingQuiz ? 'Edit Quiz' : 'Create New Quiz'}</DialogTitle>
                <DialogDescription>
                  {editingQuiz ? 'Update the quiz details.' : 'Create a new quiz for your course.'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Quiz Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Unit 1 Assessment"
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe what this quiz covers..."
                    rows={3}
                    maxLength={500}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passing_score">Passing Score (%)</Label>
                  <Input
                    id="passing_score"
                    type="number"
                    min={0}
                    max={100}
                    value={formData.passing_score}
                    onChange={(e) => setFormData({ ...formData, passing_score: parseInt(e.target.value) || 60 })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    editingQuiz ? 'Update Quiz' : 'Create Quiz'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Quizzes List */}
        {quizzes.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileQuestion className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No quizzes yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first quiz to assess student learning.
              </p>
              <Button onClick={() => openDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Create Quiz
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {quizzes.map((quiz) => (
              <Card key={quiz.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg line-clamp-1">{quiz.title}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {quiz.description || 'No description'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <FileQuestion className="h-4 w-4" />
                      {quiz.questionCount} questions
                    </div>
                    <div className="flex items-center gap-1">
                      <ClipboardList className="h-4 w-4" />
                      {quiz.attemptCount} attempts
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground mb-4">
                    Passing score: {quiz.passing_score}%
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline" className="flex-1">
                      <Link to={`/teacher/courses/${courseId}/quizzes/${quiz.id}`}>
                        Manage Questions
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openDialog(quiz)} className="shrink-0">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="shrink-0">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Quiz</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this quiz? All questions and student attempts will be lost.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(quiz.id)}
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
    </DashboardLayout>
  );
}
