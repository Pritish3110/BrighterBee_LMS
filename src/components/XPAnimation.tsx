import { useState, useEffect } from 'react';
import { Sparkles, Flame, Star } from 'lucide-react';

interface XPAnimationProps {
  amount: number;
  isVisible: boolean;
  onComplete?: () => void;
  type?: 'lesson' | 'course' | 'quiz' | 'streak';
}

export function XPAnimation({ amount, isVisible, onComplete, type = 'lesson' }: XPAnimationProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        onComplete?.();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  if (!show) return null;

  const getIcon = () => {
    switch (type) {
      case 'course':
        return <Star className="h-6 w-6 text-primary fill-primary" />;
      case 'streak':
        return <Flame className="h-6 w-6 text-orange-500" />;
      default:
        return <Sparkles className="h-6 w-6 text-primary" />;
    }
  };

  const getColor = () => {
    switch (type) {
      case 'course':
        return 'from-primary to-secondary';
      case 'streak':
        return 'from-orange-400 to-red-500';
      default:
        return 'from-primary to-accent';
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
      <div className="animate-xp-float flex flex-col items-center gap-2">
        <div className={`bg-gradient-to-r ${getColor()} p-4 rounded-full shadow-lg animate-bounce-in`}>
          {getIcon()}
        </div>
        <div className={`text-2xl font-bold bg-gradient-to-r ${getColor()} bg-clip-text text-transparent`}>
          +{amount} XP
        </div>
        {type === 'course' && (
          <div className="text-sm font-medium text-muted-foreground">
            Course Completed!
          </div>
        )}
        {type === 'streak' && (
          <div className="text-sm font-medium text-orange-500">
            Streak Bonus!
          </div>
        )}
      </div>
    </div>
  );
}
