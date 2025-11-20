import React, { useState } from 'react';
import { Lock, Key, ChevronDown, ChevronUp } from 'lucide-react';
import { EnterpriseCard, EnterpriseCardHeader, EnterpriseCardTitle, EnterpriseCardDescription, EnterpriseCardContent } from '@/components/ui/EnterpriseCard';
import { Button } from '@/components/ui/button';
import PasswordChangeForm from './PasswordChangeForm';
import SecurityQuestionsSetup from '@/components/SecurityQuestionsSetup';

export const SecuritySection = ({ profile, onUpdate }) => {
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showSecurityQuestions, setShowSecurityQuestions] = useState(false);

  const hasSecurityQuestions = !!(
    profile.security_question_1 &&
    profile.security_question_2 &&
    profile.security_question_3
  );

  return (
    <EnterpriseCard>
      <EnterpriseCardHeader>
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary" />
          <EnterpriseCardTitle>Security Settings</EnterpriseCardTitle>
        </div>
        <EnterpriseCardDescription>
          Manage your password and security questions
        </EnterpriseCardDescription>
      </EnterpriseCardHeader>
      <EnterpriseCardContent className="space-y-4">
        {/* Password Section */}
        <div className="border border-gray-soft rounded-lg p-4">
          <button
            onClick={() => setShowPasswordForm(!showPasswordForm)}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-3">
              <Key className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-heading">Password</p>
                <p className="text-sm text-muted-foreground">Change your account password</p>
              </div>
            </div>
            {showPasswordForm ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
          
          {showPasswordForm && (
            <div className="mt-4 pt-4 border-t border-gray-soft">
              <PasswordChangeForm />
            </div>
          )}
        </div>

        {/* Security Questions Section */}
        <div className="border border-gray-soft rounded-lg p-4">
          <button
            onClick={() => setShowSecurityQuestions(!showSecurityQuestions)}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-heading">Security Questions</p>
                <p className="text-sm text-muted-foreground">
                  {hasSecurityQuestions ? 'Update your security questions' : 'Set up security questions'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasSecurityQuestions && (
                <span className="text-xs bg-success/10 text-success px-2 py-1 rounded-full">
                  Set up
                </span>
              )}
              {showSecurityQuestions ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </button>
          
          {showSecurityQuestions && (
            <div className="mt-4 pt-4 border-t border-gray-soft">
              <SecurityQuestionsSetup
                onComplete={(updatedProfile) => {
                  onUpdate(updatedProfile);
                  setShowSecurityQuestions(false);
                }}
              />
            </div>
          )}
        </div>
      </EnterpriseCardContent>
    </EnterpriseCard>
  );
};
