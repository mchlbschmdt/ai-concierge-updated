import React from 'react';
import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SecurityQuestionsSetup } from '@/components/SecurityQuestionsSetup';

export const SecurityQuestionsStep = ({ onNext, onSkip }) => {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Shield className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Secure Your Account</h2>
        <p className="text-muted-foreground">
          Set up security questions for account recovery. You can skip this for now and add them later.
        </p>
      </div>

      <SecurityQuestionsSetup
        onComplete={onNext}
        onSkip={onSkip}
      />
    </div>
  );
};
