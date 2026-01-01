import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { 
  Award, 
  BarChart3, 
  BookOpen, 
  GraduationCap, 
  Loader2, 
  Star, 
  Trophy, 
  Users, 
  Zap,
  ArrowRight 
} from 'lucide-react';

interface UserStats {
  id: string;
  full_name: string | null;
  role: string;
  xp: number;
  level: number;
  badgeCount: number;
  coursesEnrolled: number;
  coursesCompleted: number;
  quizzesTaken: number;
  avgScore: number;
}

interface PlatformStats {
  totalXP: number;
  totalBadges: number;
  avgLevel: number;
  topPerformer: UserStats | null;
  totalQuizAttempts: number;
  avgQuizScore: number;
}

export default function AdminAnalytics() {
  const [users, setUsers] = useState<UserStats[]>([]);
  const [platformStats, setPlatformStats] = useState<PlatformStats>({
    totalXP: 0,
    totalBadges: 0,
    avgLevel: 0,
    topPerformer: null,
    totalQuizAttempts: 0,
    avgQuizScore: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Get all profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name');

      if (!profiles) {
        setLoading(false);
        return;
      }

      // Get detailed stats for each user
      const userStats = await Promise.all(
        profiles.map(async (profile) => {
          // Get role
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.id)
            .maybeSingle();

          // Get gamification data
          const { data: gamification } = await supabase
            .from('user_gamification')
            .select('xp, level')
            .eq('user_id', profile.id)
            .maybeSingle();

          // Get badge count
          const { count: badgeCount } = await supabase
            .from('user_badges')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.id);

          // Get enrollment count
          const { count: coursesEnrolled } = await supabase
            .from('enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', profile.id);

          // Get quiz attempts
          const { data: quizAttempts } = await supabase
            .from('quiz_attempts')
            .select('score, max_score')
            .eq('student_id', profile.id);

          const quizzesTaken = quizAttempts?.length || 0;
          const avgScore = quizzesTaken > 0
            ? Math.round(
                quizAttempts!.reduce((sum, a) => sum + (a.score / a.max_score) * 100, 0) / quizzesTaken
              )
            : 0;

          return {
            id: profile.id,
            full_name: profile.full_name,
            role: roleData?.role || 'student',
            xp: gamification?.xp || 0,
            level: gamification?.level || 1,
            badgeCount: badgeCount || 0,
            coursesEnrolled: coursesEnrolled || 0,
            coursesCompleted: 0,
            quizzesTaken,
            avgScore,
          };
        })
      );

      // Sort by XP (top performers first)
      userStats.sort((a, b) => b.xp - a.xp);
      setUsers(userStats);

      // Calculate platform stats
      const totalXP = userStats.reduce((sum, u) => sum + u.xp, 0);
      const totalBadges = userStats.reduce((sum, u) => sum + u.badgeCount, 0);
      const avgLevel = userStats.length > 0
        ? Math.round(userStats.reduce((sum, u) => sum + u.level, 0) / userStats.length * 10) / 10
        : 0;
      const totalQuizAttempts = userStats.reduce((sum, u) => sum + u.quizzesTaken, 0);
      const avgQuizScore = userStats.filter(u => u.quizzesTaken > 0).length > 0
        ? Math.round(
            userStats.filter(u => u.quizzesTaken > 0).reduce((sum, u) => sum + u.avgScore, 0) /
            userStats.filter(u => u.quizzesTaken > 0).length
          )
        : 0;

      setPlatformStats({
        totalXP,
        totalBadges,
        avgLevel,
        topPerformer: userStats[0] || null,
        totalQuizAttempts,
        avgQuizScore,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Platform Analytics 📊
            </h1>
            <p className="text-muted-foreground mt-1">
              View user progress and gamification stats
            </p>
          </div>
          <Button asChild className="w-full sm:w-auto">
            <Link to="/admin/users">
              <Users className="mr-2 h-4 w-4" />
              Manage Users
            </Link>
          </Button>
        </div>

        {/* Platform Stats */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          <Card className="bg-honey-gradient-soft border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total XP</CardTitle>
              <Zap className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{platformStats.totalXP.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card className="bg-honey-gradient-soft border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Badges Earned</CardTitle>
              <Award className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{platformStats.totalBadges}</div>
            </CardContent>
          </Card>
          <Card className="bg-honey-gradient-soft border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avg Level</CardTitle>
              <Star className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{platformStats.avgLevel}</div>
            </CardContent>
          </Card>
          <Card className="bg-honey-gradient-soft border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Quiz Attempts</CardTitle>
              <BookOpen className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{platformStats.totalQuizAttempts}</div>
            </CardContent>
          </Card>
          <Card className="bg-honey-gradient-soft border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avg Quiz Score</CardTitle>
              <BarChart3 className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{platformStats.avgQuizScore}%</div>
            </CardContent>
          </Card>
          <Card className="bg-honey-gradient-soft border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Top Performer */}
        {platformStats.topPerformer && platformStats.topPerformer.xp > 0 && (
          <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Top Performer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground text-2xl font-bold">
                  {platformStats.topPerformer.full_name?.[0]?.toUpperCase() || '🏆'}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">
                    {platformStats.topPerformer.full_name || 'Anonymous'}
                  </h3>
                  <p className="text-muted-foreground">
                    Level {platformStats.topPerformer.level} • {platformStats.topPerformer.xp} XP • {platformStats.topPerformer.badgeCount} Badges
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Leaderboard */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">User Leaderboard</h2>
          </div>

          <Card>
            <CardContent className="p-0">
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left py-3 px-4 font-medium">Rank</th>
                      <th className="text-left py-3 px-4 font-medium">User</th>
                      <th className="text-left py-3 px-4 font-medium">Role</th>
                      <th className="text-left py-3 px-4 font-medium">Level</th>
                      <th className="text-left py-3 px-4 font-medium">XP</th>
                      <th className="text-left py-3 px-4 font-medium">Badges</th>
                      <th className="text-left py-3 px-4 font-medium">Quizzes</th>
                      <th className="text-left py-3 px-4 font-medium">Avg Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user, index) => (
                      <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                            index === 0 ? 'bg-yellow-100 text-yellow-800' :
                            index === 1 ? 'bg-gray-100 text-gray-800' :
                            index === 2 ? 'bg-orange-100 text-orange-800' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {index + 1}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary font-semibold">
                              {user.full_name?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <span className="font-medium">
                              {user.full_name || 'Unnamed User'}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`text-xs px-2 py-1 rounded-full capitalize ${getRoleBadgeColor(user.role)}`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4 text-primary" />
                            <span className="font-semibold">{user.level}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-secondary" />
                            <span>{user.xp}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <Award className="h-4 w-4 text-accent" />
                            <span>{user.badgeCount}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">{user.quizzesTaken}</td>
                        <td className="py-4 px-4">
                          {user.quizzesTaken > 0 ? (
                            <div className="flex items-center gap-2">
                              <Progress value={user.avgScore} className="w-16 h-2" />
                              <span className="text-sm">{user.avgScore}%</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-muted-foreground">
                          No users found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y">
                {users.map((user, index) => (
                  <div key={user.id} className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold shrink-0 ${
                        index === 0 ? 'bg-yellow-100 text-yellow-800' :
                        index === 1 ? 'bg-gray-100 text-gray-800' :
                        index === 2 ? 'bg-orange-100 text-orange-800' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{user.full_name || 'Unnamed User'}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${getRoleBadgeColor(user.role)}`}>
                          {user.role}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-sm">
                      <div className="text-center">
                        <p className="text-muted-foreground text-xs">Level</p>
                        <p className="font-semibold">{user.level}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-muted-foreground text-xs">XP</p>
                        <p className="font-semibold">{user.xp}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-muted-foreground text-xs">Badges</p>
                        <p className="font-semibold">{user.badgeCount}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-muted-foreground text-xs">Quizzes</p>
                        <p className="font-semibold">{user.quizzesTaken}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {users.length === 0 && (
                  <div className="py-12 text-center text-muted-foreground">
                    No users found
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