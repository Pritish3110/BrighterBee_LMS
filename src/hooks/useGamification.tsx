import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  xp_required: number;
}

interface UserBadge {
  badge_id: string;
  earned_at: string;
  badge: Badge;
}

interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
}

interface GamificationData {
  xp: number;
  level: number;
  badges: UserBadge[];
  allBadges: Badge[];
  streak: StreakData;
}

export function useGamification() {
  const { user } = useAuth();
  const [data, setData] = useState<GamificationData>({
    xp: 0,
    level: 1,
    badges: [],
    allBadges: [],
    streak: {
      current_streak: 0,
      longest_streak: 0,
      last_activity_date: null,
    },
  });
  const [loading, setLoading] = useState(true);

  const calculateLevel = (xp: number): number => {
    // Every 100 XP = 1 level
    return Math.floor(xp / 100) + 1;
  };

  const xpForNextLevel = (currentLevel: number): number => {
    return currentLevel * 100;
  };

  const fetchGamificationData = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch user gamification data
      const { data: gamificationData } = await supabase
        .from('user_gamification')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      // Fetch all badges
      const { data: allBadges } = await supabase
        .from('badges')
        .select('*')
        .order('xp_required', { ascending: true });

      // Fetch user's earned badges
      const { data: userBadges } = await supabase
        .from('user_badges')
        .select(`
          badge_id,
          earned_at,
          badges (*)
        `)
        .eq('user_id', user.id);

      // Fetch streak data
      const { data: streakData } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      const xp = gamificationData?.xp || 0;
      const level = gamificationData?.level || calculateLevel(xp);

      setData({
        xp,
        level,
        badges: (userBadges || []).map((ub: any) => ({
          badge_id: ub.badge_id,
          earned_at: ub.earned_at,
          badge: ub.badges,
        })),
        allBadges: allBadges || [],
        streak: {
          current_streak: streakData?.current_streak || 0,
          longest_streak: streakData?.longest_streak || 0,
          last_activity_date: streakData?.last_activity_date || null,
        },
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching gamification data:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchGamificationData();
  }, [fetchGamificationData]);

  const updateStreak = async (): Promise<number> => {
    if (!user) return 0;

    const today = new Date().toISOString().split('T')[0];
    const lastActivity = data.streak.last_activity_date;
    
    // If already active today, no bonus
    if (lastActivity === today) {
      return 0;
    }

    let newStreak = 1;
    let streakBonus = 0;

    if (lastActivity) {
      const lastDate = new Date(lastActivity);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // Consecutive day - increment streak
        newStreak = data.streak.current_streak + 1;
        // Bonus XP for maintaining streak (5 XP per streak day, max 25)
        streakBonus = Math.min(newStreak * 5, 25);
      } else if (diffDays > 1) {
        // Streak broken - reset to 1
        newStreak = 1;
      }
    }

    const newLongest = Math.max(newStreak, data.streak.longest_streak);

    try {
      await supabase
        .from('user_streaks')
        .upsert({
          user_id: user.id,
          current_streak: newStreak,
          longest_streak: newLongest,
          last_activity_date: today,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      // Update local state
      setData(prev => ({
        ...prev,
        streak: {
          current_streak: newStreak,
          longest_streak: newLongest,
          last_activity_date: today,
        },
      }));

      return streakBonus;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error updating streak:', error);
      }
      return 0;
    }
  };

  const addXP = async (amount: number, reason?: string): Promise<{ totalXP: number; streakBonus: number }> => {
    if (!user) return { totalXP: 0, streakBonus: 0 };

    // Update streak and get bonus
    const streakBonus = await updateStreak();
    const totalAmount = amount + streakBonus;

    const newXP = data.xp + totalAmount;
    const newLevel = calculateLevel(newXP);

    try {
      // Upsert gamification record
      const { error } = await supabase
        .from('user_gamification')
        .upsert({
          user_id: user.id,
          xp: newXP,
          level: newLevel,
        }, { onConflict: 'user_id' });

      if (error) throw error;

      // Check for new badge unlocks
      await checkBadgeUnlocks(newXP, newLevel);

      // Update local state immediately
      setData(prev => ({
        ...prev,
        xp: newXP,
        level: newLevel,
      }));

      return { totalXP: totalAmount, streakBonus };
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error adding XP:', error);
      }
      return { totalXP: 0, streakBonus: 0 };
    }
  };

  const checkBadgeUnlocks = async (currentXP: number, currentLevel: number) => {
    if (!user) return;

    const earnedBadgeIds = data.badges.map(b => b.badge_id);
    const badgesToUnlock = data.allBadges.filter(
      badge => badge.xp_required <= currentXP && !earnedBadgeIds.includes(badge.id)
    );

    for (const badge of badgesToUnlock) {
      try {
        await supabase
          .from('user_badges')
          .insert({
            user_id: user.id,
            badge_id: badge.id,
          });
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Error unlocking badge:', error);
        }
      }
    }
  };

  const awardBadgeByName = async (badgeName: string) => {
    if (!user) return;

    const badge = data.allBadges.find(b => b.name === badgeName);
    if (!badge) return;

    const alreadyEarned = data.badges.some(b => b.badge_id === badge.id);
    if (alreadyEarned) return;

    try {
      await supabase
        .from('user_badges')
        .insert({
          user_id: user.id,
          badge_id: badge.id,
        });

      await fetchGamificationData();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error awarding badge:', error);
      }
    }
  };

  return {
    ...data,
    loading,
    addXP,
    awardBadgeByName,
    calculateLevel,
    xpForNextLevel,
    refresh: fetchGamificationData,
    updateStreak,
  };
}
