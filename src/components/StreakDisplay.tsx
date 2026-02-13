import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StreakDisplayProps {
  currentStreak: number;
  longestStreak: number;
  className?: string;
  compact?: boolean;
}

export function StreakDisplay({ currentStreak, longestStreak, className, compact = false }: StreakDisplayProps) {
  const getStreakColor = () => {
    if (currentStreak >= 30) return 'text-purple-500';
    if (currentStreak >= 14) return 'text-red-500';
    if (currentStreak >= 7) return 'text-orange-500';
    if (currentStreak >= 3) return 'text-yellow-500';
    return 'text-muted-foreground';
  };

  const getStreakBg = () => {
    if (currentStreak >= 30) return 'bg-purple-100 dark:bg-purple-900/30';
    if (currentStreak >= 14) return 'bg-red-100 dark:bg-red-900/30';
    if (currentStreak >= 7) return 'bg-orange-100 dark:bg-orange-900/30';
    if (currentStreak >= 3) return 'bg-yellow-100 dark:bg-yellow-900/30';
    return 'bg-muted';
  };

  if (compact) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <Flame className={cn("h-4 w-4", getStreakColor())} />
        <span className={cn("text-sm font-bold", getStreakColor())}>{currentStreak}</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className={cn("p-2 rounded-full", getStreakBg())}>
        <Flame className={cn("h-6 w-6", getStreakColor(), currentStreak > 0 && "animate-pulse-soft")} />
      </div>
      <div>
        <div className="flex items-baseline gap-1">
          <span className={cn("text-2xl font-bold", getStreakColor())}>{currentStreak}</span>
          <span className="text-sm text-muted-foreground">day streak</span>
        </div>
        {longestStreak > 0 && (
          <div className="text-xs text-muted-foreground">
            Best: {longestStreak} days
          </div>
        )}
      </div>
    </div>
  );
}
