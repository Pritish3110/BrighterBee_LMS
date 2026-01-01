import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Edit, Loader2, Plus, Trash2, CheckCircle, XCircle } from 'lucide-react';

interface Question {
  id: string;
  question_text: string;
  question_type: 'mcq' | 'true_false';
  options: string[];
  correct_answer: string;
  points: number;
  question_order: number;
}

interface Quiz {
  id: string;
  title: string;
  course_id: string;
}

export default function QuizQuestions() {
  const { courseId, quizId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    question_text: '',
    question_type: 'mcq' as 'mcq' | 'true_false',
    options: ['', '', '', ''],
    correct_answer: '',
    points: 10,
  });

  useEffect(() => {
    if (quizId) {
      fetchData();
    }
  }, [quizId]);

  const fetchData = async () => {
    try {
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('id, title, course_id')
        .eq('id', quizId!)
        .maybeSingle();

      if (quizError) throw quizError;
      if (!quizData) {
        navigate(`/teacher/courses/${courseId}/quizzes`);
        return;
      }

      setQuiz(quizData);

      const { data: questionsData, error: questionsError } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quizId!)
        .order('question_order', { ascending: true });

      if (questionsError) throw questionsError;

      setQuestions(
        (questionsData || []).map((q) => ({
          ...q,
          options: Array.isArray(q.options) ? (q.options as string[]) : [],
        }))
      );
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load questions.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (question?: Question) => {
    if (question) {
      setEditingQuestion(question);
      setFormData({
        question_text: question.question_text,
        question_type: question.question_type,
        options: question.question_type === 'true_false' ? ['True', 'False'] : [...question.options, '', '', '', ''].slice(0, 4),
        correct_answer: question.correct_answer,
        points: question.points,
      });
    } else {
      setEditingQuestion(null);
      setFormData({
        question_text: '',
        question_type: 'mcq',
        options: ['', '', '', ''],
        correct_answer: '',
        points: 10,
      });
    }
    setDialogOpen(true);
  };

  const handleTypeChange = (type: 'mcq' | 'true_false') => {
    setFormData({
      ...formData,
      question_type: type,
      options: type === 'true_false' ? ['True', 'False'] : ['', '', '', ''],
      correct_answer: '',
    });
  };

  const handleSave = async () => {
    if (!formData.question_text.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a question.',
        variant: 'destructive',
      });
      return;
    }

    const validOptions = formData.question_type === 'true_false' 
      ? ['True', 'False']
      : formData.options.filter(o => o.trim());

    if (formData.question_type === 'mcq' && validOptions.length < 2) {
      toast({
        title: 'Validation Error',
        description: 'Please provide at least 2 options.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.correct_answer) {
      toast({
        title: 'Validation Error',
        description: 'Please select the correct answer.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      if (editingQuestion) {
        const { error } = await supabase
          .from('quiz_questions')
          .update({
            question_text: formData.question_text.trim(),
            question_type: formData.question_type,
            options: validOptions,
            correct_answer: formData.correct_answer,
            points: formData.points,
          })
          .eq('id', editingQuestion.id);

        if (error) throw error;
        toast({ title: 'Question updated successfully' });
      } else {
        const { error } = await supabase
          .from('quiz_questions')
          .insert({
            question_text: formData.question_text.trim(),
            question_type: formData.question_type,
            options: validOptions,
            correct_answer: formData.correct_answer,
            points: formData.points,
            quiz_id: quizId!,
            question_order: questions.length,
          });

        if (error) throw error;
        toast({ title: 'Question added successfully' });
      }

      setDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error saving question:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save question.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (questionId: string) => {
    try {
      const { error } = await supabase
        .from('quiz_questions')
        .delete()
        .eq('id', questionId);

      if (error) throw error;
      toast({ title: 'Question deleted successfully' });
      fetchData();
    } catch (error: any) {
      console.error('Error deleting question:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete question.',
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
          <Button variant="ghost" size="icon" onClick={() => navigate(`/teacher/courses/${courseId}/quizzes`)} className="shrink-0 self-start">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Quiz Questions</h1>
            <p className="text-muted-foreground mt-1 truncate">{quiz?.title}</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => openDialog()} className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Add Question
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingQuestion ? 'Edit Question' : 'Add New Question'}</DialogTitle>
                <DialogDescription>
                  Create a multiple choice or true/false question.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="question_type">Question Type</Label>
                  <Select 
                    value={formData.question_type} 
                    onValueChange={(v) => handleTypeChange(v as 'mcq' | 'true_false')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mcq">Multiple Choice</SelectItem>
                      <SelectItem value="true_false">True/False</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="question_text">Question *</Label>
                  <Textarea
                    id="question_text"
                    value={formData.question_text}
                    onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                    placeholder="Enter your question..."
                    rows={3}
                    maxLength={500}
                  />
                </div>

                {formData.question_type === 'mcq' && (
                  <div className="space-y-2">
                    <Label>Answer Options</Label>
                    {formData.options.map((option, index) => (
                      <Input
                        key={index}
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...formData.options];
                          newOptions[index] = e.target.value;
                          setFormData({ ...formData, options: newOptions });
                        }}
                        placeholder={`Option ${index + 1}`}
                        maxLength={200}
                      />
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Correct Answer *</Label>
                  <RadioGroup 
                    value={formData.correct_answer} 
                    onValueChange={(v) => setFormData({ ...formData, correct_answer: v })}
                  >
                    {(formData.question_type === 'true_false' 
                      ? ['True', 'False'] 
                      : formData.options.filter(o => o.trim())
                    ).map((option, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <RadioGroupItem value={option} id={`option-${index}`} />
                        <Label htmlFor={`option-${index}`} className="font-normal cursor-pointer">
                          {option}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="points">Points</Label>
                  <Input
                    id="points"
                    type="number"
                    min={1}
                    max={100}
                    value={formData.points}
                    onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 10 })}
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
                    editingQuestion ? 'Update Question' : 'Add Question'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Questions List */}
        {questions.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Plus className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No questions yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Add questions to your quiz.
              </p>
              <Button onClick={() => openDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Add Question
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {questions.map((question, index) => (
              <Card key={question.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full capitalize">
                          {question.question_type === 'true_false' ? 'True/False' : 'MCQ'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {question.points} points
                        </span>
                      </div>
                      <p className="font-medium mb-3">{question.question_text}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {question.options.map((option, optIndex) => (
                          <div 
                            key={optIndex}
                            className={`flex items-center gap-2 p-2 rounded text-sm ${
                              option === question.correct_answer 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-muted'
                            }`}
                          >
                            {option === question.correct_answer ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <XCircle className="h-4 w-4 text-muted-foreground" />
                            )}
                            {option}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => openDialog(question)}>
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
                            <AlertDialogTitle>Delete Question</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this question?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(question.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
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
