import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, Package, Star, ShoppingCart } from 'lucide-react';

interface StudyKit {
  id: string;
  name: string;
  description: string | null;
  price: number;
  thumbnail_url: string | null;
  recommended_grade: string | null;
  recommended_level: string | null;
  is_enabled: boolean;
}

interface Profile {
  grade: string | null;
  course_level: string | null;
  profile_completed: boolean | null;
}

const GRADES = ['Nursery', 'Junior KG', 'Senior KG'];

export default function StudentKits() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [kits, setKits] = useState<StudyKit[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [filterLevel, setFilterLevel] = useState<string>('all');

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch profile to check completion
      const { data: profileData } = await supabase
        .from('profiles')
        .select('grade, course_level, profile_completed')
        .eq('id', user!.id)
        .single();

      setProfile(profileData);

      // If profile not complete, redirect
      if (!profileData?.profile_completed) {
        toast({
          title: 'Profile Incomplete',
          description: 'Please complete your profile before ordering study kits.',
          variant: 'destructive',
        });
        navigate('/student/profile');
        return;
      }

      // Fetch kits
      const { data: kitsData, error } = await supabase
        .from('study_kits')
        .select('*')
        .eq('is_enabled', true)
        .order('name');

      if (error) throw error;
      setKits(kitsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredKits = kits.filter(kit => {
    const matchesSearch = kit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      kit.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGrade = filterGrade === 'all' || kit.recommended_grade === filterGrade;
    const matchesLevel = filterLevel === 'all' || kit.recommended_level === filterLevel;
    return matchesSearch && matchesGrade && matchesLevel;
  });

  // Recommended kits based on profile
  const recommendedKits = kits.filter(kit => {
    return kit.recommended_grade === profile?.grade || 
           kit.recommended_level === profile?.course_level;
  });

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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Study Kits 📦</h1>
            <p className="text-muted-foreground">Browse and order learning materials</p>
          </div>
          <Button onClick={() => navigate('/student/orders')} variant="outline">
            <ShoppingCart className="mr-2 h-4 w-4" />
            My Orders
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search kits..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterGrade} onValueChange={setFilterGrade}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by Grade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              {GRADES.map(grade => (
                <SelectItem key={grade} value={grade}>{grade}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterLevel} onValueChange={setFilterLevel}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="Small Bee">Small Bee</SelectItem>
              <SelectItem value="Big Bee">Big Bee</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Recommended Section */}
        {recommendedKits.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              Recommended for You
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recommendedKits.slice(0, 3).map(kit => (
                <Card key={kit.id} className="border-primary/30 bg-honey-gradient-soft">
                  <CardHeader className="pb-3">
                    {kit.thumbnail_url && (
                      <img
                        src={kit.thumbnail_url}
                        alt={kit.name}
                        className="w-full h-32 object-cover rounded-md mb-3"
                      />
                    )}
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{kit.name}</CardTitle>
                      <Badge variant="secondary">Recommended</Badge>
                    </div>
                    <CardDescription className="line-clamp-2">{kit.description}</CardDescription>
                  </CardHeader>
                  <CardFooter className="flex items-center justify-between">
                    <span className="text-xl font-bold text-primary">₹{kit.price}</span>
                    <Button onClick={() => navigate(`/student/kits/${kit.id}`)}>
                      View Details
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* All Kits */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Package className="h-5 w-5" />
            All Study Kits
          </h2>
          {filteredKits.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No kits found matching your criteria</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredKits.map(kit => (
                <Card key={kit.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    {kit.thumbnail_url ? (
                      <img
                        src={kit.thumbnail_url}
                        alt={kit.name}
                        className="w-full h-32 object-cover rounded-md mb-3"
                      />
                    ) : (
                      <div className="w-full h-32 bg-muted rounded-md mb-3 flex items-center justify-center">
                        <Package className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    <CardTitle className="text-lg line-clamp-1">{kit.name}</CardTitle>
                    <CardDescription className="line-clamp-2">{kit.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <div className="flex gap-2 flex-wrap">
                      {kit.recommended_grade && (
                        <Badge variant="outline">{kit.recommended_grade}</Badge>
                      )}
                      {kit.recommended_level && (
                        <Badge variant="outline">{kit.recommended_level}</Badge>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex items-center justify-between">
                    <span className="text-xl font-bold text-primary">₹{kit.price}</span>
                    <Button size="sm" onClick={() => navigate(`/student/kits/${kit.id}`)}>
                      View
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
