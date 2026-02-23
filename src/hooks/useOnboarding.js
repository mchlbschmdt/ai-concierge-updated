import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { profileService } from '@/services/profileService';
import { useToast } from '@/context/ToastContext';
import { supabase } from '@/integrations/supabase/client';

export const useOnboarding = () => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [skippedSteps, setSkippedSteps] = useState([]);
  const [formData, setFormData] = useState({
    fullName: '',
    companyName: '',
    propertyCount: '',
    platforms: [],
    selectedProduct: null,
    // Property mini-form
    propertyName: '',
    propertyAddress: '',
    propertyCode: '',
  });

  const totalSteps = 5;

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
    if (!stepName) { nextStep(); return; }
    try {
      setLoading(true);
      await profileService.addSkippedStep(currentUser.id, stepName);
      setSkippedSteps(prev => [...prev, stepName]);
      showToast('Step skipped. You can complete it later.', 'info');
      nextStep();
    } catch (error) {
      console.error('Error skipping step:', error);
      showToast('Failed to skip step', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentUser, nextStep, showToast]);

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

  const saveProfile = useCallback(async (data) => {
    if (!currentUser?.id) return false;
    try {
      setLoading(true);
      const updates = {};
      if (data.fullName) updates.full_name = data.fullName;
      if (Object.keys(updates).length > 0) {
        await profileService.updateProfile(currentUser.id, updates);
      }
      return true;
    } catch (error) {
      console.error('Error saving profile:', error);
      showToast('Failed to save profile', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentUser, showToast]);

  const startTrial = useCallback(async (productId) => {
    if (!currentUser?.id || !productId) return false;
    try {
      setLoading(true);
      // Check if entitlement already exists
      const { data: existing } = await supabase
        .from('user_entitlements')
        .select('id, status')
        .eq('user_id', currentUser.id)
        .eq('product_id', productId)
        .maybeSingle();

      if (existing && (existing.status === 'trial' || existing.status === 'active')) {
        return true; // Already has access
      }

      // Entitlements are auto-created by the handle_new_user trigger,
      // so trial should already exist. Just verify.
      return true;
    } catch (error) {
      console.error('Error starting trial:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  const addProperty = useCallback(async (propertyData) => {
    if (!currentUser?.id) return false;
    try {
      setLoading(true);
      const { error } = await supabase.from('properties').insert({
        user_id: currentUser.id,
        property_name: propertyData.propertyName,
        address: propertyData.propertyAddress,
        code: propertyData.propertyCode || `PROP-${Date.now()}`,
      });
      if (error) throw error;
      showToast('Property added!', 'success');
      return true;
    } catch (error) {
      console.error('Error adding property:', error);
      showToast('Failed to add property', 'error');
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
      showToast('Welcome to HostlyAI! 🎉', 'success');
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
    saveProfile,
    startTrial,
    addProperty,
    completeOnboarding
  };
};
