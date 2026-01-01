import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useGamification } from '@/hooks/useGamification';
import { Award, Lock, Star, Zap } from 'lucide-react';

export default function Badges() {
  const { xp, level, badges, allBadges, loading, xpForNextLevel } = useGamification();

  const earnedBadgeIds = badges.map(b => b.badge_id);

  const getBadgeIcon = (icon: string) => {
    switch (icon) {
      case 'star':
        return '⭐';
      case 'bee':
        return '🐝';
      case 'trophy':
        return '🏆';
      case 'medal':
        return '🎖️';
      case 'crown':
        return '👑';
      case 'rocket':
        return '🚀';
      default:
        return '🏆';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 sm:space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Badges & Achievements</h1>
          <p className="text-muted-foreground mt-1">
            Track your progress and unlock badges as you learn!
          </p>
        </div>

        {/* Level Progress */}
        <Card className="bg-honey-gradient-soft border-primary/20">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-primary text-primary-foreground text-2xl sm:text-3xl font-bold shrink-0">
                {level}
              </div>
              <div className="flex-1 w-full text-center sm:text-left">
                <h3 className="text-lg font-semibold">Level {level}</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  {xp} / {xpForNextLevel(level)} XP to next level
                </p>
                <Progress value={(xp % 100)} className="h-3" />
              </div>
              <div className="text-center sm:text-right">
                <div className="flex items-center justify-center sm:justify-end gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  <span className="text-2xl font-bold">{xp}</span>
                </div>
                <p className="text-sm text-muted-foreground">Total XP</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Badges Earned</CardTitle>
              <Award className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{badges.length}</div>
              <p className="text-xs text-muted-foreground">
                out of {allBadges.length} total
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Current Level</CardTitle>
              <Star className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{level}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">XP to Next</CardTitle>
              <Zap className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{xpForNextLevel(level) - xp}</div>
            </CardContent>
          </Card>
        </div>

        {/* All Badges */}
        <div>
          <h2 className="text-xl font-semibold mb-4">All Badges</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {allBadges.map((badge) => {
              const isEarned = earnedBadgeIds.includes(badge.id);
              return (
                <Card 
                  key={badge.id} 
                  className={`transition-all ${
                    isEarned 
                      ? 'bg-honey-gradient-soft border-primary/30' 
                      : 'opacity-60 grayscale'
                  }`}
                >
                  <CardContent className="flex items-center gap-4 p-6">
                    <div className={`flex h-16 w-16 items-center justify-center rounded-full text-3xl ${
                      isEarned ? 'bg-primary/20' : 'bg-muted'
                    }`}>
                      {isEarned ? getBadgeIcon(badge.icon) : <Lock className="h-6 w-6 text-muted-foreground" />}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{badge.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {badge.description || 'Keep learning to unlock!'}
                      </p>
                      <p className="text-xs text-primary mt-1">
                        {isEarned ? '✓ Earned!' : `Requires ${badge.xp_required} XP`}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}