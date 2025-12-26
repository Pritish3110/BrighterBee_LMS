import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, AlertCircle, User } from 'lucide-react';
import { z } from 'zod';

// Demo branches list (same as student)
const BRANCHES = [
  "Mumbai - Andheri", "Mumbai - Bandra", "Mumbai - Borivali", "Mumbai - Powai", "Mumbai - Thane",
  "Delhi - Connaught Place", "Delhi - Dwarka", "Delhi - Rohini", "Delhi - Saket", "Delhi - Vasant Kunj",
  "Bangalore - Koramangala", "Bangalore - Whitefield", "Bangalore - Indiranagar", "Bangalore - HSR Layout", "Bangalore - Electronic City",
  "Chennai - Anna Nagar", "Chennai - T. Nagar", "Chennai - Velachery", "Chennai - Adyar", "Chennai - Tambaram",
  "Kolkata - Salt Lake", "Kolkata - Park Street", "Kolkata - Howrah", "Kolkata - Ballygunge", "Kolkata - New Town",
  "Pune - Kothrud", "Pune - Hinjewadi", "Pune - Viman Nagar", "Pune - Hadapsar", "Pune - Baner",
  "Hyderabad - Madhapur", "Hyderabad - Gachibowli", "Hyderabad - Kukatpally", "Hyderabad - Secunderabad", "Hyderabad - Jubilee Hills",
  "Ahmedabad - Satellite", "Ahmedabad - Navrangpura", "Ahmedabad - SG Highway", "Ahmedabad - Bopal", "Ahmedabad - Vastrapur",
  "Jaipur - Malviya Nagar", "Jaipur - Vaishali Nagar", "Jaipur - C-Scheme", "Jaipur - Mansarovar", "Jaipur - Raja Park",
  "Lucknow - Gomti Nagar", "Lucknow - Hazratganj", "Lucknow - Aliganj", "Lucknow - Indira Nagar", "Lucknow - Alambagh"
];

const profileSchema = z.object({
  phone_number: z.string().min(10, 'Phone number must be at least 10 digits').max(15, 'Phone number too long').optional().or(z.literal('')),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  pincode: z.string().min(5, 'Pincode must be at least 5 digits').max(10, 'Pincode too long'),
  branch: z.string().min(1, 'Please select a branch'),
  courses_taught: z.string().optional(),
});

export default function TeacherProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    phone_number: '',
    city: '',
    state: '',
    pincode: '',
    branch: '',
    courses_taught: '',
  });

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile(data);
        setForm({
          phone_number: data.phone_number || '',
          city: data.city || '',
          state: data.state || '',
          pincode: data.pincode || '',
          branch: data.branch || '',
          courses_taught: data.courses_taught || '',
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setErrors({});
    
    try {
      profileSchema.parse(form);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach((e) => {
          if (e.path[0]) newErrors[e.path[0] as string] = e.message;
        });
        setErrors(newErrors);
        return;
      }
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          phone_number: form.phone_number || null,
          city: form.city,
          state: form.state,
          pincode: form.pincode,
          branch: form.branch,
          courses_taught: form.courses_taught || null,
          profile_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user!.id);

      if (error) throw error;

      toast({ title: 'Profile saved successfully!' });
      fetchProfile();
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast({ title: 'Error saving profile', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const isProfileComplete = profile?.profile_completed;

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
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-primary">
            <User className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">My Profile</h1>
            <div className="flex items-center gap-2 mt-1">
              {isProfileComplete ? (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  Profile completed
                </span>
              ) : (
                <span className="flex items-center gap-1 text-sm text-amber-600">
                  <AlertCircle className="h-4 w-4" />
                  Profile incomplete — please complete your details
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Profile Form */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Update your profile details below</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Non-editable fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={profile?.full_name || ''} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email || ''} disabled className="bg-muted" />
              </div>
            </div>

            {/* Editable fields */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter your phone number"
                value={form.phone_number}
                onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
              />
              {errors.phone_number && <p className="text-sm text-destructive">{errors.phone_number}</p>}
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Address</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    placeholder="Enter your city"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                  />
                  {errors.city && <p className="text-sm text-destructive">{errors.city}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    placeholder="Enter your state"
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                  />
                  {errors.state && <p className="text-sm text-destructive">{errors.state}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pincode">Pincode *</Label>
                <Input
                  id="pincode"
                  placeholder="Enter your pincode"
                  value={form.pincode}
                  onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                  className="max-w-[200px]"
                />
                {errors.pincode && <p className="text-sm text-destructive">{errors.pincode}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="branch">BrighterBee Branch *</Label>
              <Select value={form.branch} onValueChange={(v) => setForm({ ...form, branch: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your branch" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {BRANCHES.map((branch) => (
                    <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.branch && <p className="text-sm text-destructive">{errors.branch}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="courses_taught">Courses Taught</Label>
              <Textarea
                id="courses_taught"
                placeholder="List the courses or subjects you teach..."
                value={form.courses_taught}
                onChange={(e) => setForm({ ...form, courses_taught: e.target.value })}
                rows={3}
              />
              {errors.courses_taught && <p className="text-sm text-destructive">{errors.courses_taught}</p>}
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Profile'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
