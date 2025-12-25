import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Package, ShoppingCart, CheckCircle } from 'lucide-react';

interface StudyKit {
  id: string;
  name: string;
  description: string | null;
  price: number;
  thumbnail_url: string | null;
  recommended_grade: string | null;
  recommended_level: string | null;
}

interface Profile {
  full_name: string | null;
  phone_number: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  branch: string | null;
  grade: string | null;
  course_level: string | null;
  profile_completed: boolean | null;
}

export default function KitDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);
  const [kit, setKit] = useState<StudyKit | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showOrderForm, setShowOrderForm] = useState(false);

  useEffect(() => {
    if (user && id) {
      fetchData();
    }
  }, [user, id]);

  const fetchData = async () => {
    try {
      // Fetch kit
      const { data: kitData, error: kitError } = await supabase
        .from('study_kits')
        .select('*')
        .eq('id', id)
        .eq('is_enabled', true)
        .single();

      if (kitError) throw kitError;
      setKit(kitData);

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, phone_number, city, state, pincode, branch, grade, course_level, profile_completed')
        .eq('id', user!.id)
        .single();

      setProfile(profileData);

      if (!profileData?.profile_completed) {
        toast({
          title: 'Profile Incomplete',
          description: 'Please complete your profile before ordering.',
          variant: 'destructive',
        });
        navigate('/student/profile');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      navigate('/student/kits');
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!kit || !profile || !user) return;

    setOrdering(true);
    try {
      const { error } = await supabase
        .from('kit_orders')
        .insert({
          student_id: user.id,
          student_name: profile.full_name || 'Unknown',
          email: user.email || '',
          phone: profile.phone_number,
          address: `${profile.city}, ${profile.state}`,
          city: profile.city,
          state: profile.state,
          pincode: profile.pincode,
          branch: profile.branch,
          grade: profile.grade,
          bee_level: profile.course_level,
          kit_id: kit.id,
          kit_name: kit.name,
          price: kit.price,
          status: 'placed',
        });

      if (error) throw error;

      toast({
        title: 'Order Placed Successfully! 🎉',
        description: 'Your order has been placed. Payment will be collected later.',
      });

      navigate('/student/orders');
    } catch (error: any) {
      console.error('Error placing order:', error);
      toast({
        title: 'Error placing order',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setOrdering(false);
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

  if (!kit) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate('/student/kits')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Kits
        </Button>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Kit Image */}
          <div>
            {kit.thumbnail_url ? (
              <img
                src={kit.thumbnail_url}
                alt={kit.name}
                className="w-full h-64 object-cover rounded-lg shadow-lg"
              />
            ) : (
              <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center">
                <Package className="h-24 w-24 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Kit Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{kit.name}</CardTitle>
              <CardDescription>{kit.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                {kit.recommended_grade && (
                  <Badge variant="secondary">Grade: {kit.recommended_grade}</Badge>
                )}
                {kit.recommended_level && (
                  <Badge variant="secondary">Level: {kit.recommended_level}</Badge>
                )}
              </div>
              
              <div className="text-3xl font-bold text-primary">₹{kit.price}</div>
              
              <Button 
                className="w-full" 
                size="lg"
                onClick={() => setShowOrderForm(true)}
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                Order Now
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Order Form */}
        {showOrderForm && profile && (
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                Confirm Your Order
              </CardTitle>
              <CardDescription>
                Your order details will be filled from your profile
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Full Name</p>
                  <p className="font-medium">{profile.full_name || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{user?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{profile.phone_number || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Branch</p>
                  <p className="font-medium">{profile.branch || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium">
                    {profile.city}, {profile.state} - {profile.pincode}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Grade & Level</p>
                  <p className="font-medium">{profile.grade} | {profile.course_level}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between text-lg">
                  <span>Kit: {kit.name}</span>
                  <span className="font-bold text-primary">₹{kit.price}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowOrderForm(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handlePlaceOrder} disabled={ordering}>
                  {ordering ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Placing Order...
                    </>
                  ) : (
                    'Confirm Order'
                  )}
                </Button>
              </div>

              <p className="text-sm text-muted-foreground text-center">
                Payment will be collected later. You can track your order in "My Orders".
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
