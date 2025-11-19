import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Target } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { profileCompletionService } from '@/services/profileCompletionService';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export const ProfileCompletionBadge = () => {
  const { currentUser } = useAuth();
  const [completion, setCompletion] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser?.id) {
      loadCompletion();
    }
  }, [currentUser]);

  const loadCompletion = async () => {
    try {
      const data = await profileCompletionService.calculateCompletion(currentUser.id);
      setCompletion(data);
    } catch (error) {
      console.error('Error loading completion:', error);
    } finally {
      setLoading(false);
    }
  };

  // Don't show badge if profile is complete or still loading
  if (loading || !completion || completion.percentage === 100) {
    return null;
  }

  const colorClass = profileCompletionService.getCompletionColor(completion.percentage);
  const bgColorClass = profileCompletionService.getCompletionBgColor(completion.percentage);
  const shouldPulse = completion.percentage < 50;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to="/profile-settings"
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-full
              ${bgColorClass} ${colorClass}
              hover:opacity-80 transition-opacity
              ${shouldPulse ? 'animate-pulse' : ''}
              text-sm font-semibold
            `}
          >
            <Target className="w-4 h-4" />
            <span>{completion.percentage}%</span>
          </Link>
        </TooltipTrigger>
        <TooltipContent>
          <p>Your profile is {completion.percentage}% complete</p>
          <p className="text-xs text-muted-foreground mt-1">
            Click to finish setup
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
