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

interface GamificationData {
  xp: number;
  level: number;
  badges: UserBadge[];
  allBadges: Badge[];
}

export function useGamification() {
  const { user } = useAuth();
  const [data, setData] = useState<GamificationData>({
    xp: 0,
    level: 1,
    badges: [],
    allBadges: [],
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
      });
    } catch (error) {
      console.error('Error fetching gamification data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchGamificationData();
  }, [fetchGamificationData]);

  const addXP = async (amount: number, reason?: string) => {
    if (!user) return;

    const newXP = data.xp + amount;
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

      // Refresh data
      await fetchGamificationData();
    } catch (error) {
      console.error('Error adding XP:', error);
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
        console.error('Error unlocking badge:', error);
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
      console.error('Error awarding badge:', error);
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
  };
}
