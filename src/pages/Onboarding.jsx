import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '@/hooks/useOnboarding';
import { ProgressBar } from '@/components/onboarding/ProgressBar';
import { WelcomeStep } from '@/components/onboarding/WelcomeStep';
import { SecurityQuestionsStep } from '@/components/onboarding/SecurityQuestionsStep';
import { FirstPropertyStep } from '@/components/onboarding/FirstPropertyStep';
import { CompletionStep } from '@/components/onboarding/CompletionStep';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Onboarding() {
  const navigate = useNavigate();
  const {
    currentStep,
    totalSteps,
    formData,
    loading,
    progress,
    updateFormData,
    nextStep,
    prevStep,
    skipStep,
    saveProgress,
    completeOnboarding
  } = useOnboarding();

  const handleComplete = async () => {
    const success = await completeOnboarding();
    if (success) {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-card border border-border rounded-lg shadow-lg p-6 md:p-8">
          {currentStep > 1 && currentStep < 4 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={prevStep}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}

          <ProgressBar
            currentStep={currentStep}
            totalSteps={totalSteps}
            progress={progress}
          />

          {currentStep === 1 && (
            <WelcomeStep
              formData={formData}
              updateFormData={updateFormData}
              onNext={nextStep}
              onSaveProgress={saveProgress}
            />
          )}

          {currentStep === 2 && (
            <SecurityQuestionsStep
              onNext={nextStep}
              onSkip={skipStep}
            />
          )}

          {currentStep === 3 && (
            <FirstPropertyStep
              formData={formData}
              updateFormData={updateFormData}
              onNext={nextStep}
              onSkip={skipStep}
            />
          )}

          {currentStep === 4 && (
            <CompletionStep
              onComplete={handleComplete}
              loading={loading}
            />
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
