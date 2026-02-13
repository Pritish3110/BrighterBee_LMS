import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Loader2, Award, Download } from 'lucide-react';

interface CertificateData {
  courseName: string;
  studentName: string;
  completedAt: string;
  teacherName: string;
}

export default function Certificate() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [eligible, setEligible] = useState(false);
  const [certificateData, setCertificateData] = useState<CertificateData | null>(null);

  useEffect(() => {
    if (courseId && user) {
      checkEligibility();
    }
  }, [courseId, user]);

  const checkEligibility = async () => {
    try {
      // Fetch course info
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('id, title, teacher_id')
        .eq('id', courseId!)
        .maybeSingle();

      if (courseError || !course) {
        navigate('/student/courses');
        return;
      }

      // Get teacher name
      const { data: teacherProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', course.teacher_id)
        .maybeSingle();

      // Get student name
      const { data: studentProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user!.id)
        .maybeSingle();

      // Check enrollment
      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('enrolled_at')
        .eq('course_id', courseId!)
        .eq('student_id', user!.id)
        .maybeSingle();

      if (!enrollment) {
        navigate(`/student/courses/${courseId}`);
        return;
      }

      // Get all lessons
      const { data: lessons } = await supabase
        .from('lessons')
        .select('id')
        .eq('course_id', courseId!);

      if (!lessons || lessons.length === 0) {
        setEligible(false);
        setLoading(false);
        return;
      }

      // Get completed lessons
      const lessonIds = lessons.map(l => l.id);
      const { data: progress } = await supabase
        .from('lesson_progress')
        .select('lesson_id, completed, completed_at')
        .eq('student_id', user!.id)
        .eq('completed', true)
        .in('lesson_id', lessonIds);

      const completedCount = progress?.length || 0;
      const isComplete = completedCount === lessons.length;

      if (isComplete) {
        setEligible(true);
        
        // Find the latest completion date
        const dates = (progress || [])
          .filter(p => p.completed_at)
          .map(p => new Date(p.completed_at!));
        
        const latestDate = dates.length > 0 
          ? new Date(Math.max(...dates.map(d => d.getTime())))
          : new Date();

        setCertificateData({
          courseName: course.title,
          studentName: studentProfile?.full_name || 'Student',
          completedAt: latestDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
          teacherName: teacherProfile?.full_name || 'Instructor',
        });
      } else {
        setEligible(false);
      }
    } catch (error) {
      console.error('Error checking eligibility:', error);
    } finally {
      setLoading(false);
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

  if (!eligible || !certificateData) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto text-center py-12">
          <Award className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Certificate Not Available</h1>
          <p className="text-muted-foreground mb-6">
            Complete all lessons in this course to earn your certificate.
          </p>
          <Button asChild>
            <Link to={`/student/courses/${courseId}`}>Continue Learning</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => navigate(`/student/courses/${courseId}`)} className="self-start">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Course
          </Button>
          <Button variant="outline" onClick={() => window.print()} className="w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" />
            Print Certificate
          </Button>
        </div>

        {/* Certificate */}
        <Card className="certificate-container overflow-hidden">
          <CardContent className="p-0">
            <div 
              className="bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 p-6 sm:p-12 text-center relative overflow-hidden print:p-16"
              style={{ minHeight: '500px' }}
            >
              {/* Decorative Border */}
              <div className="absolute inset-4 border-4 border-primary/20 rounded-lg" />
              <div className="absolute inset-6 border-2 border-primary/10 rounded-lg" />

              {/* Content */}
              <div className="relative z-10 flex flex-col items-center justify-center h-full space-y-6">
                {/* Logo */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-2xl">🐝</span>
                  </div>
                  <span className="text-2xl font-bold text-foreground">Brighter Bee</span>
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <p className="text-sm uppercase tracking-widest text-muted-foreground">
                    Certificate of Completion
                  </p>
                  <div className="w-24 h-1 bg-primary mx-auto rounded-full" />
                </div>

                {/* Recipient */}
                <div className="space-y-2 py-6">
                  <p className="text-muted-foreground">This certifies that</p>
                  <h1 className="text-2xl sm:text-4xl font-bold text-foreground font-serif">
                    {certificateData.studentName}
                  </h1>
                </div>

                {/* Course */}
                <div className="space-y-2">
                  <p className="text-muted-foreground">has successfully completed</p>
                  <h2 className="text-2xl font-semibold text-primary">
                    {certificateData.courseName}
                  </h2>
                </div>

                {/* Award Icon */}
                <Award className="h-16 w-16 text-primary/50 my-4" />

                {/* Date & Signature */}
                <div className="grid grid-cols-2 gap-8 sm:gap-16 pt-8 w-full max-w-md">
                  <div className="text-center">
                    <div className="border-t border-foreground/30 pt-2">
                      <p className="text-sm font-medium">{certificateData.completedAt}</p>
                      <p className="text-xs text-muted-foreground">Date</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="border-t border-foreground/30 pt-2">
                      <p className="text-sm font-medium">{certificateData.teacherName}</p>
                      <p className="text-xs text-muted-foreground">Instructor</p>
                    </div>
                  </div>
                </div>

                {/* Decorative Bees */}
                <div className="absolute top-8 left-8 text-4xl opacity-20">🐝</div>
                <div className="absolute top-8 right-8 text-4xl opacity-20">🐝</div>
                <div className="absolute bottom-8 left-8 text-4xl opacity-20">🐝</div>
                <div className="absolute bottom-8 right-8 text-4xl opacity-20">🐝</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
