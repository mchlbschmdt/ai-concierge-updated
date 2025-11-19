import React, { useState } from 'react';
import { Shield, Home, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import SecurityQuestionsSetup from '@/components/SecurityQuestionsSetup';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/context/ToastContext';
import { Input } from '@/components/ui/input';
import confetti from 'canvas-confetti';

const stepConfig = {
  security_questions: {
    title: 'Security Questions',
    description: 'Set up account recovery questions',
    icon: Shield,
    color: 'text-blue-500'
  },
  first_property: {
    title: 'Add Your First Property',
    description: 'Start managing your properties',
    icon: Home,
    color: 'text-green-500'
  }
};

export const ResumeOnboardingSection = ({ skippedSteps, onStepComplete, currentUserId }) => {
  const { showToast } = useToast();
  const [expandedStep, setExpandedStep] = useState(null);
  const [propertyData, setPropertyData] = useState({
    property_name: '',
    address: '',
    code: ''
  });
  const [saving, setSaving] = useState(false);

  if (!skippedSteps || skippedSteps.length === 0) {
    return null;
  }

  const handleSecurityQuestionsComplete = async () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
    showToast('Security questions saved!', 'success');
    setExpandedStep(null);
    if (onStepComplete) {
      await onStepComplete('security_questions');
    }
  };

  const handlePropertySubmit = async (e) => {
    e.preventDefault();
    
    if (!propertyData.property_name || !propertyData.address || !propertyData.code) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('properties')
        .insert([
          {
            property_name: propertyData.property_name,
            address: propertyData.address,
            code: propertyData.code,
            user_id: currentUserId
          }
        ]);

      if (error) throw error;

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      showToast('Property added successfully!', 'success');
      setPropertyData({ property_name: '', address: '', code: '' });
      setExpandedStep(null);
      
      if (onStepComplete) {
        await onStepComplete('first_property');
      }
    } catch (error) {
      console.error('Error adding property:', error);
      showToast('Failed to add property', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-6">
      <Card className="p-6 border-2 border-primary/20 bg-primary/5">
        <div className="flex items-start gap-3 mb-4">
          <Sparkles className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-xl font-semibold text-foreground">
              Complete Your Setup
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              You skipped these steps during onboarding. Complete them now to unlock all features!
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {skippedSteps.map((stepName) => {
            const config = stepConfig[stepName];
            if (!config) return null;

            const Icon = config.icon;
            const isExpanded = expandedStep === stepName;

            return (
              <Card key={stepName} className="p-4 border border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${config.color}`} />
                    <div>
                      <h4 className="font-semibold text-foreground">{config.title}</h4>
                      <p className="text-xs text-muted-foreground">{config.description}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setExpandedStep(isExpanded ? null : stepName)}
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="w-4 h-4 mr-1" />
                        Close
                      </>
                    ) : (
                      <>
                        Complete Now
                        <ChevronDown className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </Button>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-border">
                    {stepName === 'security_questions' && (
                      <SecurityQuestionsSetup
                        onComplete={handleSecurityQuestionsComplete}
                        onSkip={() => setExpandedStep(null)}
                      />
                    )}

                    {stepName === 'first_property' && (
                      <form onSubmit={handlePropertySubmit} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">
                            Property Name *
                          </label>
                          <Input
                            type="text"
                            value={propertyData.property_name}
                            onChange={(e) => setPropertyData({ ...propertyData, property_name: e.target.value })}
                            placeholder="e.g., Sunset Villa"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">
                            Address *
                          </label>
                          <Input
                            type="text"
                            value={propertyData.address}
                            onChange={(e) => setPropertyData({ ...propertyData, address: e.target.value })}
                            placeholder="e.g., 123 Main St, City, State"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">
                            Property Code *
                          </label>
                          <Input
                            type="text"
                            value={propertyData.code}
                            onChange={(e) => setPropertyData({ ...propertyData, code: e.target.value })}
                            placeholder="e.g., SV001"
                            required
                          />
                        </div>

                        <div className="flex gap-2">
                          <Button type="submit" disabled={saving} className="flex-1">
                            {saving ? 'Adding Property...' : 'Add Property'}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setExpandedStep(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
