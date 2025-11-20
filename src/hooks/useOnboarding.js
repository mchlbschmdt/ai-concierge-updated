import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { profileService } from '@/services/profileService';
import { useToast } from '@/context/ToastContext';

export const useOnboarding = () => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [skippedSteps, setSkippedSteps] = useState([]);
  const [formData, setFormData] = useState({
    fullName: '',
    avatarFile: null,
    avatarUrl: null,
    securityQuestions: [],
    securityAnswers: [],
    propertyName: '',
    propertyAddress: '',
    propertyCode: '',
    checkInTime: '',
    checkOutTime: ''
  });

  const totalSteps = 4;

  const updateFormData = useCallback((updates) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, totalSteps]);

  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const skipStep = useCallback(async (stepName) => {
    // If no step name provided, just go to next step (backward compatibility)
    if (!stepName) {
      nextStep();
      return;
    }

    try {
      setLoading(true);
      await profileService.addSkippedStep(currentUser.id, stepName);
      setSkippedSteps(prev => [...prev, stepName]);
      showToast('Step skipped. You can complete it later from Profile Settings.', 'info');
      nextStep();
    } catch (error) {
      console.error('Error skipping step:', error);
      showToast('Failed to skip step', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentUser, nextStep, showToast]);

  // Load skipped steps on mount
  useEffect(() => {
    const loadSkippedSteps = async () => {
      if (currentUser?.id) {
        try {
          const steps = await profileService.getSkippedSteps(currentUser.id);
          setSkippedSteps(steps);
        } catch (error) {
          console.error('Error loading skipped steps:', error);
        }
      }
    };
    loadSkippedSteps();
  }, [currentUser]);

  const saveProgress = useCallback(async (stepData) => {
    if (!currentUser?.id) {
      console.error('No current user found - auth may not be ready yet');
      
      // Wait a bit and retry once
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (!currentUser?.id) {
        console.error('Still no current user after retry');
        showToast('Authentication error. Please try logging in again.', 'error');
        return false;
      }
    }
    
    try {
      setLoading(true);
      
      // Save profile updates
      if (stepData.fullName) {
        await profileService.updateProfile(currentUser.id, {
          full_name: stepData.fullName
        });
      }
      
      // Upload avatar if provided
      if (stepData.avatarFile) {
        await profileService.uploadAvatar(currentUser.id, stepData.avatarFile);
      }
      
      return true;
    } catch (error) {
      console.error('Error saving progress:', error);
      showToast('Failed to save progress', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentUser, showToast]);

  const completeOnboarding = useCallback(async () => {
    if (!currentUser?.id) return false;
    
    try {
      setLoading(true);
      await profileService.markOnboardingComplete(currentUser.id);
      showToast('Welcome! Your account is all set up.', 'success');
      return true;
    } catch (error) {
      console.error('Error completing onboarding:', error);
      showToast('Failed to complete setup', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentUser, showToast]);

  const progress = (currentStep / totalSteps) * 100;

  return {
    currentStep,
    totalSteps,
    formData,
    loading,
    progress,
    skippedSteps,
    updateFormData,
    nextStep,
    prevStep,
    skipStep,
    saveProgress,
    completeOnboarding
  };
};
