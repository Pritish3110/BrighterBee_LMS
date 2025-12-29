import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileDropzone } from '@/components/FileDropzone';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, Calendar, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { format, isPast } from 'date-fns';

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  course: { title: string };
  lesson: { title: string } | null;
}

interface Submission {
  id: string;
  file_url: string | null;
  file_name: string | null;
  submitted_at: string;
  is_late: boolean;
  grade: string | null;
  feedback: string | null;
}

export default function StudentAssignmentDetail() {
  const { id: assignmentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (assignmentId && user) fetchData();
  }, [assignmentId, user]);

  const fetchData = async () => {
    try {
      // Fetch assignment
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignments')
        .select('*, course:courses(title), lesson:lessons(title)')
        .eq('id', assignmentId!)
        .single();

      if (assignmentError) throw assignmentError;
      setAssignment(assignmentData as unknown as Assignment);

      // Fetch existing submission
      const { data: submissionData } = await supabase
        .from('assignment_submissions')
        .select('*')
        .eq('assignment_id', assignmentId!)
        .eq('student_id', user!.id)
        .maybeSingle();

      setSubmission(submissionData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: 'Error loading assignment', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (file: File) => {
    setPendingFile(file);
  };

  const handleSubmitAssignment = async () => {
    if (!assignment || !user || !pendingFile) return;

    setSubmitting(true);
    try {
      const isLate = isPast(new Date(assignment.due_date));
      const filePath = `${user.id}/${assignmentId}/${Date.now()}_${pendingFile.name}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('assignments')
        .upload(filePath, pendingFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('assignments')
        .getPublicUrl(filePath);

      // Create or update submission
      const submissionData = {
        assignment_id: assignmentId!,
        student_id: user.id,
        file_url: urlData.publicUrl,
        file_name: pendingFile.name,
        submitted_at: new Date().toISOString(),
        is_late: isLate,
      };

      if (submission) {
        const { error } = await supabase
          .from('assignment_submissions')
          .update(submissionData)
          .eq('id', submission.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('assignment_submissions')
          .insert(submissionData);

        if (error) throw error;
      }

      toast({
        title: isLate ? 'Assignment submitted (late)' : 'Assignment submitted!',
        description: isLate ? 'Your submission was recorded as late.' : 'Your work has been submitted successfully.',
      });

      setPendingFile(null);
      fetchData();
    } catch (error: any) {
      console.error('Error uploading:', error);
      toast({ title: 'Error submitting assignment', description: error.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveSubmission = async () => {
    if (!submission) return;

    try {
      // Delete from storage if file exists
      if (submission.file_url) {
        const pathMatch = submission.file_url.match(/assignments\/(.+)$/);
        if (pathMatch) {
          await supabase.storage.from('assignments').remove([pathMatch[1]]);
        }
      }

      // Delete submission record
      const { error } = await supabase
        .from('assignment_submissions')
        .delete()
        .eq('id', submission.id);

      if (error) throw error;

      setSubmission(null);
      toast({ title: 'Submission removed' });
    } catch (error) {
      toast({ title: 'Error removing submission', variant: 'destructive' });
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

  if (!assignment) return null;

  const isOverdue = isPast(new Date(assignment.due_date));

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-start gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold break-words">{assignment.title}</h1>
            <p className="text-sm sm:text-base text-muted-foreground">{assignment.course.title}</p>
          </div>
        </div>

        {/* Assignment Details */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                <span className="break-words">Due: {format(new Date(assignment.due_date), 'MMM d, yyyy h:mm a')}</span>
              </CardTitle>
              <Badge variant={isOverdue ? 'destructive' : 'secondary'} className="w-fit">
                {isOverdue ? 'Past Due' : 'Open'}
              </Badge>
            </div>
            {assignment.lesson && (
              <CardDescription className="mt-2">Related lesson: {assignment.lesson.title}</CardDescription>
            )}
          </CardHeader>
          {assignment.description && (
            <CardContent className="p-4 sm:p-6 pt-0">
              <p className="text-sm sm:text-base text-muted-foreground">{assignment.description}</p>
            </CardContent>
          )}
        </Card>

        {/* Submission Status */}
        {submission && submission.grade && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <CheckCircle className="h-5 w-5" />
                Graded: {submission.grade}
              </CardTitle>
            </CardHeader>
            {submission.feedback && (
              <CardContent>
                <p className="text-green-700">
                  <strong>Feedback:</strong> {submission.feedback}
                </p>
              </CardContent>
            )}
          </Card>
        )}

        {/* Submission Area */}
        <Card>
          <CardHeader>
            <CardTitle>Your Submission</CardTitle>
            <CardDescription>
              {submission
                ? `Submitted on ${format(new Date(submission.submitted_at), 'MMM d, yyyy h:mm a')}`
                : 'Upload your work below'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileDropzone
              onFileSelect={handleFileSelect}
              uploading={submitting}
              currentFile={
                pendingFile 
                  ? { name: pendingFile.name }
                  : submission?.file_name
                  ? { name: submission.file_name, url: submission.file_url || undefined }
                  : null
              }
              onRemove={
                pendingFile 
                  ? () => setPendingFile(null)
                  : submission && !submission.grade 
                  ? handleRemoveSubmission 
                  : undefined
              }
              disabled={!!submission?.grade}
            />
            
            {/* Submit Button */}
            {pendingFile && !submission?.grade && (
              <Button 
                onClick={handleSubmitAssignment} 
                disabled={submitting}
                className="w-full mt-4"
                size="lg"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Submit Assignment
                  </>
                )}
              </Button>
            )}
            
            {submission?.is_late && (
              <div className="flex items-center gap-2 mt-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                This submission was marked as late
              </div>
            )}
            {submission?.grade && (
              <p className="mt-3 text-sm text-muted-foreground">
                Your submission has been graded and cannot be changed.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}