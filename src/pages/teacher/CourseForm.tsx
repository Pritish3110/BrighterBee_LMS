import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

type GradeLevel = Database['public']['Enums']['grade_level'];

interface CourseFormData {
  title: string;
  description: string;
  grade_level: GradeLevel;
  is_published: boolean;
}

interface AvailableCourse {
  id: string;
  title: string;
}

export default function CourseForm() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<CourseFormData>({
    title: '',
    description: '',
    grade_level: 'nursery',
    is_published: false,
  });
  const [availableCourses, setAvailableCourses] = useState<AvailableCourse[]>([]);
  const [selectedPrerequisites, setSelectedPrerequisites] = useState<string[]>([]);

  useEffect(() => {
    fetchAvailableCourses();
    if (isEditing && id) {
      fetchCourse(id);
    }
  }, [id, isEditing]);

  const fetchAvailableCourses = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('courses')
      .select('id, title')
      .eq('is_published', true)
      .neq('id', id || '')
      .order('title');

    setAvailableCourses(data || []);
  };

  const fetchCourse = async (courseId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setFormData({
          title: data.title,
          description: data.description || '',
          grade_level: data.grade_level,
          is_published: data.is_published,
        });

        // Fetch existing prerequisites
        const { data: prereqs } = await supabase
          .from('course_prerequisites')
          .select('prerequisite_course_id')
          .eq('course_id', courseId);

        setSelectedPrerequisites((prereqs || []).map((p) => p.prerequisite_course_id));
      } else {
        toast({
          title: 'Course not found',
          description: 'The course you are looking for does not exist.',
          variant: 'destructive',
        });
        navigate('/teacher/courses');
      }
    } catch (error) {
      console.error('Error fetching course:', error);
      toast({
        title: 'Error',
        description: 'Failed to load course details.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrerequisiteToggle = (courseId: string) => {
    setSelectedPrerequisites((prev) =>
      prev.includes(courseId) ? prev.filter((cid) => cid !== courseId) : [...prev, courseId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a course title.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      let courseId = id;

      if (isEditing && id) {
        const { error } = await supabase
          .from('courses')
          .update({
            title: formData.title.trim(),
            description: formData.description.trim(),
            grade_level: formData.grade_level,
            is_published: formData.is_published,
          })
          .eq('id', id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('courses')
          .insert({
            title: formData.title.trim(),
            description: formData.description.trim(),
            grade_level: formData.grade_level,
            is_published: formData.is_published,
            teacher_id: user!.id,
          })
          .select()
          .single();

        if (error) throw error;
        courseId = data.id;
      }

      // Update prerequisites
      if (courseId) {
        // Delete existing prerequisites
        await supabase.from('course_prerequisites').delete().eq('course_id', courseId);

        // Insert new prerequisites
        if (selectedPrerequisites.length > 0) {
          const prereqInserts = selectedPrerequisites.map((prereqId) => ({
            course_id: courseId!,
            prerequisite_course_id: prereqId,
          }));

          const { error: prereqError } = await supabase
            .from('course_prerequisites')
            .insert(prereqInserts);

          if (prereqError) console.error('Error saving prerequisites:', prereqError);
        }
      }

      toast({
        title: isEditing ? 'Course updated' : 'Course created',
        description: `Your course has been ${isEditing ? 'updated' : 'created'} successfully.`,
      });
      navigate(`/teacher/courses/${courseId}`);
    } catch (error: any) {
      console.error('Error saving course:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save course.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
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
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              {isEditing ? 'Edit Course' : 'Create New Course'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isEditing ? 'Update your course details' : 'Set up your new course'}
            </p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Course Details</CardTitle>
            <CardDescription>
              Fill in the information below to {isEditing ? 'update' : 'create'} your course.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Course Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Introduction to Numbers"
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what students will learn..."
                  rows={4}
                  maxLength={500}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="grade_level">Grade Level *</Label>
                <Select
                  value={formData.grade_level}
                  onValueChange={(value: GradeLevel) => setFormData({ ...formData, grade_level: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select grade level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nursery">Nursery</SelectItem>
                    <SelectItem value="junior_kg">Junior KG</SelectItem>
                    <SelectItem value="senior_kg">Senior KG</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Prerequisites */}
              {availableCourses.length > 0 && (
                <div className="space-y-3">
                  <Label>Prerequisites (optional)</Label>
                  <p className="text-sm text-muted-foreground">
                    Students must complete these courses before enrolling
                  </p>
                  <div className="border rounded-lg p-4 space-y-2 max-h-48 overflow-y-auto">
                    {availableCourses.map((course) => (
                      <div key={course.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`prereq-${course.id}`}
                          checked={selectedPrerequisites.includes(course.id)}
                          onCheckedChange={() => handlePrerequisiteToggle(course.id)}
                        />
                        <label
                          htmlFor={`prereq-${course.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {course.title}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="published">Publish Course</Label>
                  <p className="text-sm text-muted-foreground">
                    Make this course visible to students
                  </p>
                </div>
                <Switch
                  id="published"
                  checked={formData.is_published}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate(-1)} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {isEditing ? 'Update Course' : 'Create Course'}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}