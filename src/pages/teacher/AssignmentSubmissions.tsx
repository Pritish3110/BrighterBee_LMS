import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Download, Loader2, FileText, CheckCircle, Clock, AlertCircle, User } from 'lucide-react';
import { format } from 'date-fns';

interface Submission {
  id: string;
  student_id: string;
  file_url: string | null;
  file_name: string | null;
  submitted_at: string;
  is_late: boolean;
  grade: string | null;
  feedback: string | null;
  graded_at: string | null;
  student: {
    full_name: string | null;
  } | null;
}

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  course: {
    title: string;
  };
}

export default function AssignmentSubmissions() {
  const { id: assignmentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [gradeDialogOpen, setGradeDialogOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [gradeForm, setGradeForm] = useState({ grade: '', feedback: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (assignmentId) fetchData();
  }, [assignmentId]);

  const fetchData = async () => {
    try {
      // Fetch assignment details
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignments')
        .select('id, title, description, due_date, course:courses(title)')
        .eq('id', assignmentId!)
        .single();

      if (assignmentError) throw assignmentError;
      setAssignment(assignmentData as unknown as Assignment);

      // Fetch submissions with student profiles
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('assignment_submissions')
        .select('*')
        .eq('assignment_id', assignmentId!)
        .order('submitted_at', { ascending: false });

      if (submissionsError) throw submissionsError;

      // Get student names
      const submissionsWithStudents = await Promise.all(
        (submissionsData || []).map(async (sub) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', sub.student_id)
            .single();

          return { ...sub, student: profile };
        })
      );

      setSubmissions(submissionsWithStudents);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: 'Error loading submissions', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const openGradeDialog = (submission: Submission) => {
    setSelectedSubmission(submission);
    setGradeForm({
      grade: submission.grade || '',
      feedback: submission.feedback || '',
    });
    setGradeDialogOpen(true);
  };

  const handleGrade = async () => {
    if (!selectedSubmission) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('assignment_submissions')
        .update({
          grade: gradeForm.grade || null,
          feedback: gradeForm.feedback || null,
          graded_at: new Date().toISOString(),
          graded_by: user!.id,
        })
        .eq('id', selectedSubmission.id);

      if (error) throw error;

      toast({ title: 'Submission graded' });
      setGradeDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error saving grade', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (submission: Submission) => {
    if (submission.grade) {
      return <Badge className="bg-green-100 text-green-800">Graded: {submission.grade}</Badge>;
    }
    if (submission.is_late) {
      return <Badge variant="destructive">Late Submission</Badge>;
    }
    return <Badge variant="secondary">Submitted</Badge>;
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

  if (!assignment) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{assignment.title}</h1>
            <p className="text-muted-foreground">{assignment.course.title}</p>
          </div>
        </div>

        {/* Assignment Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Due: {format(new Date(assignment.due_date), 'MMM d, yyyy h:mm a')}
            </CardTitle>
            {assignment.description && (
              <CardDescription>{assignment.description}</CardDescription>
            )}
          </CardHeader>
        </Card>

        {/* Submissions List */}
        <div>
          <h2 className="text-xl font-semibold mb-4">
            Submissions ({submissions.length})
          </h2>

          {submissions.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No submissions yet</h3>
                <p className="text-muted-foreground text-center">
                  Students haven't submitted their work yet
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {submissions.map((submission) => (
                <Card key={submission.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 shrink-0">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h4 className="font-medium truncate">
                              {submission.student?.full_name || 'Unknown Student'}
                            </h4>
                            {getStatusBadge(submission)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Submitted: {format(new Date(submission.submitted_at), 'MMM d, yyyy h:mm a')}
                          </p>
                          {submission.file_name && (
                            <p className="text-sm text-muted-foreground truncate">
                              File: {submission.file_name}
                            </p>
                          )}
                          {submission.feedback && (
                            <p className="text-sm mt-2 p-2 bg-muted rounded">
                              Feedback: {submission.feedback}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 sm:flex-col sm:items-end shrink-0">
                        {submission.file_url && (
                          <Button variant="outline" size="sm" asChild className="flex-1 sm:flex-initial">
                            <a href={submission.file_url} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4 sm:mr-1" />
                              <span className="hidden sm:inline">Download</span>
                            </a>
                          </Button>
                        )}
                        <Button size="sm" onClick={() => openGradeDialog(submission)} className="flex-1 sm:flex-initial">
                          {submission.grade ? 'Edit Grade' : 'Grade'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Grade Dialog */}
        <Dialog open={gradeDialogOpen} onOpenChange={setGradeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Grade Submission</DialogTitle>
              <DialogDescription>
                {selectedSubmission?.student?.full_name || 'Student'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="grade">Grade</Label>
                <Select value={gradeForm.grade} onValueChange={(v) => setGradeForm({ ...gradeForm, grade: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A">A</SelectItem>
                    <SelectItem value="A-">A-</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B">B</SelectItem>
                    <SelectItem value="B-">B-</SelectItem>
                    <SelectItem value="C+">C+</SelectItem>
                    <SelectItem value="C">C</SelectItem>
                    <SelectItem value="C-">C-</SelectItem>
                    <SelectItem value="D">D</SelectItem>
                    <SelectItem value="F">F</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="feedback">Feedback (optional)</Label>
                <Textarea
                  id="feedback"
                  value={gradeForm.feedback}
                  onChange={(e) => setGradeForm({ ...gradeForm, feedback: e.target.value })}
                  placeholder="Provide feedback to the student..."
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setGradeDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleGrade} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Grade
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}