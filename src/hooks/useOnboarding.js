import { useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { profileService } from '@/services/profileService';
import { useToast } from '@/context/ToastContext';

export const useOnboarding = () => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
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

  const skipStep = useCallback(() => {
    nextStep();
  }, [nextStep]);

  const saveProgress = useCallback(async (stepData) => {
    if (!currentUser?.id) return;
    
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
      
    } catch (error) {
      console.error('Error saving progress:', error);
      showToast('Failed to save progress', 'error');
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
    updateFormData,
    nextStep,
    prevStep,
    skipStep,
    saveProgress,
    completeOnboarding
  };
};
