import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Users, BookOpen, GraduationCap, UserCog, ArrowRight, Loader2 } from 'lucide-react';

interface Stats {
  totalUsers: number;
  totalCourses: number;
  totalStudents: number;
  totalTeachers: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalCourses: 0,
    totalStudents: 0,
    totalTeachers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Get total users count from profiles table (includes all users)
      const { count: totalUsersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get user role counts
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role');

      if (rolesError) throw rolesError;

      const students = roles?.filter((r) => r.role === 'student').length || 0;
      const teachers = roles?.filter((r) => r.role === 'teacher').length || 0;
      const admins = roles?.filter((r) => r.role === 'admin').length || 0;

      // Get course count
      const { count: coursesCount } = await supabase
        .from('courses')
        .select('*', { count: 'exact', head: true });

      // Get recent users with profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      // Get roles for recent users
      const recentWithRoles = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.id)
            .maybeSingle();

          return {
            ...profile,
            role: roleData?.role || 'student',
          };
        })
      );

      setRecentUsers(recentWithRoles);

      // Total users = all profiles (students + teachers + admins + users without roles)
      setStats({
        totalUsers: totalUsersCount || 0,
        totalCourses: coursesCount || 0,
        totalStudents: students,
        totalTeachers: teachers,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'teacher':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 sm:space-y-8">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Admin Dashboard 🔧
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Manage users, courses, and system settings
            </p>
          </div>
          <Button asChild className="w-full sm:w-auto">
            <Link to="/admin/users">
              <UserCog className="mr-2 h-4 w-4" />
              Manage Users
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
            <Card className="bg-honey-gradient-soft border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold">{stats.totalUsers}</div>
              </CardContent>
            </Card>
            <Card className="bg-honey-gradient-soft border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Students</CardTitle>
                <GraduationCap className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold">{stats.totalStudents}</div>
              </CardContent>
            </Card>
            <Card className="bg-honey-gradient-soft border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Teachers</CardTitle>
                <UserCog className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold">{stats.totalTeachers}</div>
              </CardContent>
            </Card>
            <Card className="bg-honey-gradient-soft border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Courses</CardTitle>
                <BookOpen className="h-4 w-4 text-secondary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold">{stats.totalCourses}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recent Users */}
        <div className="overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recent Users</h2>
            <Link 
              to="/admin/users" 
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {recentUsers.map((user) => (
                  <div key={user.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-2 sm:gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary font-semibold shrink-0">
                        {user.full_name?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{user.full_name || 'Unnamed User'}</p>
                        <p className="text-sm text-muted-foreground">
                          Joined {new Date(user.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full capitalize self-start sm:self-center shrink-0 ${getRoleBadgeColor(user.role)}`}>
                      {user.role}
                    </span>
                  </div>
                ))}
                {recentUsers.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    No users yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
