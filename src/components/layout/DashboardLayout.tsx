import { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  LogOut, 
  GraduationCap,
  ChevronRight,
  Award,
  FileQuestion,
  Trophy,
  Calendar,
  Wallet,
  User,
  Package,
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import brighterBeeLogo from "@/assets/brighter-bee-logo.jpg";

type AppRole = 'admin' | 'teacher' | 'student';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, role: contextRole, signOut } = useAuth();
  const [role, setRole] = useState<AppRole | null>(contextRole as AppRole | null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

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
        { label: 'Calendar', href: '/admin/calendar', icon: Calendar },
        { label: 'Transactions', href: '/admin/transactions', icon: Wallet },
        { label: 'Study Kits', href: '/admin/study-kits', icon: Package },
      ];
    }

    if (effectiveRole === 'teacher') {
      return [
        ...baseItems,
        { label: 'My Courses', href: '/teacher/courses', icon: BookOpen },
        { label: 'Assignments', href: '/teacher/assignments', icon: FileQuestion },
        { label: 'Quiz Results', href: '/teacher/results', icon: Award },
        { label: 'Calendar', href: '/teacher/calendar', icon: Calendar },
        { label: 'My Profile', href: '/teacher/profile', icon: User },
      ];
    }

    // Student
    return [
      ...baseItems,
      { label: 'My Courses', href: '/student/courses', icon: BookOpen },
      { label: 'Browse Courses', href: '/student/browse', icon: GraduationCap },
      { label: 'Assignments', href: '/student/assignments', icon: FileQuestion },
      { label: 'Study Kits', href: '/student/kits', icon: Package },
      { label: 'Calendar', href: '/student/calendar', icon: Calendar },
      { label: 'Leaderboard', href: '/student/leaderboard', icon: Trophy },
      { label: 'Badges', href: '/student/badges', icon: Award },
      { label: 'My Profile', href: '/student/profile', icon: User },
    ];
  };

  const navItems = getNavItems();

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-border px-4">
        <img src={brighterBeeLogo} alt="BrighterBee Logo" className="h-10 w-auto" />
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 p-4 flex-1 overflow-y-auto">
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
              <item.icon className="h-5 w-5 shrink-0" />
              {item.label}
              {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-border p-4 mt-auto">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary font-semibold shrink-0">
            {user?.email?.[0].toUpperCase() || 'U'}
          </div>
          <div className="flex-1 overflow-hidden min-w-0">
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
    </>
  );

  return (
    <div className="min-h-screen bg-background honeycomb-pattern">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 border-b border-border bg-card/95 backdrop-blur-sm flex items-center justify-between px-4">
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 flex flex-col">
            <SidebarContent />
          </SheetContent>
        </Sheet>
        <img src={brighterBeeLogo} alt="BrighterBee Logo" className="h-8 w-auto" />
        <div className="w-10" /> {/* Spacer for centering */}
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-card/95 backdrop-blur-sm flex-col">
        <SidebarContent />
      </aside>

      {/* Main content */}
      <main className="lg:pl-64 pt-14 lg:pt-0">
        <div className="min-h-screen p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
