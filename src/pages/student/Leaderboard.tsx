import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useGamification } from '@/hooks/useGamification';
import { StreakDisplay } from '@/components/StreakDisplay';
import { Loader2, Trophy, Medal, Award, Crown, Star, Flame } from 'lucide-react';

interface LeaderboardEntry {
  user_id: string;
  xp: number;
  level: number;
  full_name: string | null;
  rank: number;
}

export default function Leaderboard() {
  const { user } = useAuth();
  const { xp, level, streak } = useGamification();
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [user]);

  const fetchLeaderboard = async () => {
    try {
      // Fetch all gamification data
      const { data: gamificationData, error: gamificationError } = await supabase
        .from('user_gamification')
        .select('user_id, xp, level')
        .order('xp', { ascending: false })
        .limit(50);

      if (gamificationError) throw gamificationError;

      if (!gamificationData || gamificationData.length === 0) {
        setLeaderboard([]);
        setLoading(false);
        return;
      }

      // Fetch profiles for all users
      const userIds = gamificationData.map(g => g.user_id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const profilesMap = new Map(
        (profilesData || []).map(p => [p.id, p.full_name])
      );

      // Combine data with ranks
      const leaderboardData: LeaderboardEntry[] = gamificationData.map((entry, index) => ({
        user_id: entry.user_id,
        xp: entry.xp,
        level: entry.level,
        full_name: profilesMap.get(entry.user_id) || 'Anonymous Bee',
        rank: index + 1,
      }));

      setLeaderboard(leaderboardData);

      // Find current user's rank
      if (user) {
        const userEntry = leaderboardData.find(e => e.user_id === user.id);
        if (userEntry) {
          setUserRank(userEntry.rank);
        }
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-500 fill-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Medal className="h-6 w-6 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const getRankBg = (rank: number, isCurrentUser: boolean) => {
    if (isCurrentUser) return 'bg-primary/10 border-primary';
    switch (rank) {
      case 1:
        return 'bg-yellow-50 border-yellow-300 dark:bg-yellow-900/20';
      case 2:
        return 'bg-gray-50 border-gray-300 dark:bg-gray-800/20';
      case 3:
        return 'bg-amber-50 border-amber-300 dark:bg-amber-900/20';
      default:
        return 'bg-card border-border';
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return '🐝';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
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
      <div className="space-y-6 sm:space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
            <Trophy className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            Leaderboard
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            See how you rank against other learners
          </p>
        </div>

        {/* Your Stats Card */}
        <Card className="bg-honey-gradient-soft border-primary/20">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Your Stats</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="text-center">
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-primary">{xp}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">Total XP</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-secondary">{level}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">Level</div>
              </div>
              <div className="text-center">
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
                  {userRank ? `#${userRank}` : '-'}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">Your Rank</div>
              </div>
              <div className="flex justify-center col-span-2 sm:col-span-1">
                <StreakDisplay 
                  currentStreak={streak.current_streak} 
                  longestStreak={streak.longest_streak}
                  compact={false}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Top Learners
            </CardTitle>
            <CardDescription>
              Students with the most XP this season
            </CardDescription>
          </CardHeader>
          <CardContent>
            {leaderboard.length === 0 ? (
              <div className="text-center py-12">
                <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No learners yet</h3>
                <p className="text-muted-foreground">
                  Be the first to earn XP and appear on the leaderboard!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {leaderboard.map((entry) => {
                  const isCurrentUser = user?.id === entry.user_id;
                  return (
                    <div
                      key={entry.user_id}
                      className={`flex items-center gap-2 sm:gap-4 p-3 sm:p-4 rounded-lg border-2 transition-all ${getRankBg(entry.rank, isCurrentUser)}`}
                    >
                      {/* Rank */}
                      <div className="w-8 sm:w-12 flex justify-center shrink-0">
                        {getRankIcon(entry.rank)}
                      </div>

                      {/* Avatar */}
                      <Avatar className="h-8 w-8 sm:h-12 sm:w-12 border-2 border-primary/20 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs sm:text-base">
                          {getInitials(entry.full_name)}
                        </AvatarFallback>
                      </Avatar>

                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate flex items-center gap-1 sm:gap-2 text-sm sm:text-base">
                          <span className="truncate">{entry.full_name || 'Anonymous Bee'}</span>
                          {isCurrentUser && (
                            <Badge variant="outline" className="text-xs shrink-0">You</Badge>
                          )}
                        </div>
                        <div className="text-xs sm:text-sm text-muted-foreground">
                          Level {entry.level}
                        </div>
                      </div>

                      {/* XP */}
                      <div className="text-right shrink-0">
                        <div className="text-base sm:text-xl font-bold text-primary">
                          {entry.xp.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">XP</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
