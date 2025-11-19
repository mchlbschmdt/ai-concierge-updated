import React from 'react';
import { CheckCircle2, Circle, User, Camera, Shield, Home, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { profileCompletionService } from '@/services/profileCompletionService';

const iconMap = {
  User,
  Camera,
  Shield,
  Home
};

export const ProfileCompletionCard = ({ completion, onCompleteClick }) => {
  if (!completion) return null;

  const { percentage, allItems } = completion;
  const colorClass = profileCompletionService.getCompletionColor(percentage);
  const bgColorClass = profileCompletionService.getCompletionBgColor(percentage);
  const borderColorClass = profileCompletionService.getCompletionBorderColor(percentage);

  const isComplete = percentage === 100;

  return (
    <Card className={`p-6 mb-6 border-2 ${borderColorClass} ${bgColorClass}`}>
      <div className="flex flex-col md:flex-row items-center gap-6">
        {/* Completion Circle */}
        <div className="flex-shrink-0">
          <div className="relative w-32 h-32">
            <svg className="w-32 h-32 transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-muted"
                opacity="0.2"
              />
              {/* Progress circle */}
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 56}`}
                strokeDashoffset={`${2 * Math.PI * 56 * (1 - percentage / 100)}`}
                className={colorClass}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
              />
            </svg>
            {/* Percentage text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-3xl font-bold ${colorClass}`}>
                {percentage}%
              </span>
            </div>
          </div>
        </div>

        {/* Completion Details */}
        <div className="flex-1 w-full">
          <h3 className="text-xl font-semibold text-foreground mb-1">
            {isComplete ? '🎉 Profile Complete!' : 'Profile Completion'}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {isComplete
              ? 'Your profile is fully set up and ready to go!'
              : `Complete your profile to unlock all features and get the most out of your account.`}
          </p>

          {/* Checklist */}
          <div className="space-y-2">
            {allItems.map((item) => {
              const Icon = iconMap[item.icon];
              return (
                <div
                  key={item.name}
                  className="flex items-center gap-3 text-sm"
                >
                  {item.complete ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  )}
                  <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className={item.complete ? 'text-foreground' : 'text-muted-foreground'}>
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Complete Profile Button */}
          {!isComplete && (
            <Button
              onClick={onCompleteClick}
              className="mt-4 w-full md:w-auto"
              variant="default"
            >
              Complete Profile
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};
