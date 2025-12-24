import { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  LogOut, 
  GraduationCap,
  ChevronRight,
  Award,
  FileQuestion,
  Trophy
} from 'lucide-react';
import { cn } from '@/lib/utils';

type AppRole = 'admin' | 'teacher' | 'student';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, role: contextRole, signOut } = useAuth();
  const [role, setRole] = useState<AppRole | null>(contextRole as AppRole | null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    async function fetchRole() {
      if (!user) return;
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!cancelled) setRole((data?.role as AppRole) ?? 'student');
    }

    fetchRole();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const effectiveRole = role ?? (contextRole as AppRole | null);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const getNavItems = () => {
    const baseItems = [
      { 
        label: 'Dashboard', 
        href: `/${effectiveRole ?? 'student'}`, 
        icon: LayoutDashboard 
      },
    ];

    if (effectiveRole === 'admin') {
      return [
        ...baseItems,
        { label: 'Users', href: '/admin/users', icon: Users },
        { label: 'Analytics', href: '/admin/analytics', icon: Award },
        { label: 'All Courses', href: '/admin/courses', icon: BookOpen },
      ];
    }

    if (effectiveRole === 'teacher') {
      return [
        ...baseItems,
        { label: 'My Courses', href: '/teacher/courses', icon: BookOpen },
        { label: 'Quiz Results', href: '/teacher/results', icon: FileQuestion },
      ];
    }

    // Student
    return [
      ...baseItems,
      { label: 'My Courses', href: '/student/courses', icon: BookOpen },
      { label: 'Browse Courses', href: '/student/browse', icon: GraduationCap },
      { label: 'Leaderboard', href: '/student/leaderboard', icon: Trophy },
      { label: 'Badges', href: '/student/badges', icon: Award },
    ];
  };

  const navItems = getNavItems();

  return (
    <div className="min-h-screen bg-background honeycomb-pattern">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-card/95 backdrop-blur-sm">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b border-border px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary">
            <span className="text-lg">🐝</span>
          </div>
          <span className="text-xl font-bold text-foreground">Brighter Bee</span>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1 p-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
                {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-border p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary font-semibold">
              {user?.email?.[0].toUpperCase() || 'U'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium">{user?.email}</p>
              <p className="text-xs text-muted-foreground capitalize">{effectiveRole}</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="w-full justify-start gap-2" 
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="pl-64">
        <div className="min-h-screen p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
