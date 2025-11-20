import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { profileService } from '@/services/profileService';
import { profileCompletionService } from '@/services/profileCompletionService';
import { SwipeableTabs, TabsContent } from '@/components/ui/swipeable-tabs';
import SwipeIndicator from '@/components/ui/SwipeIndicator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AvatarUpload } from '@/components/profile/AvatarUpload';
import { PasswordChangeForm } from '@/components/profile/PasswordChangeForm';
import { ProfileCompletionCard } from '@/components/profile/ProfileCompletionCard';
import { ResumeOnboardingSection } from '@/components/profile/ResumeOnboardingSection';
import SecurityQuestionsSetup from '@/components/SecurityQuestionsSetup';
import Layout from '@/components/Layout';
import { User, Lock, Shield, Settings, Calendar, Trash2 } from 'lucide-react';

export default function ProfileSettings() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [fullName, setFullName] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [showSecurityQuestions, setShowSecurityQuestions] = useState(false);
  const [completion, setCompletion] = useState(null);
  const [skippedSteps, setSkippedSteps] = useState([]);
  const [showSwipeHint, setShowSwipeHint] = useState(true);
  
  const profileTabRef = useRef(null);
  const securityTabRef = useRef(null);

  useEffect(() => {
    if (currentUser?.id) {
      loadProfile();
      loadProfileCompletion();
    }
  }, [currentUser]);

  const loadProfile = async () => {
    try {
      const data = await profileService.getUserProfile(currentUser.id);
      setProfile(data);
      setFullName(data.full_name || '');
      setSkippedSteps(data.skipped_onboarding_steps || []);
    } catch (error) {
      console.error('Error loading profile:', error);
      showToast('Failed to load profile', 'error');
    }
  };

  const loadProfileCompletion = async () => {
    try {
      const data = await profileCompletionService.calculateCompletion(currentUser.id);
      setCompletion(data);
    } catch (error) {
      console.error('Error loading profile completion:', error);
    }
  };

  const handleStepComplete = async (stepName) => {
    try {
      await profileService.removeSkippedStep(currentUser.id, stepName);
      await loadProfile();
      await loadProfileCompletion();
      showToast('Great! Keep going to complete your profile.', 'success');
    } catch (error) {
      console.error('Error completing step:', error);
      showToast('Failed to update progress', 'error');
    }
  };

  const handleCompleteProfileClick = () => {
    if (!completion) return;
    
    // Find first incomplete item and navigate to it
    const incompleteItem = completion.incompleteItems[0];
    if (!incompleteItem) return;

    // Scroll to appropriate tab/section
    if (incompleteItem.name === 'security_questions') {
      // If skipped, it's in resume section, otherwise in security tab
      if (skippedSteps.includes('security_questions')) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        document.querySelector('[value="security"]')?.click();
      }
    } else {
      // Profile tab for name/avatar, or properties page for properties
      document.querySelector('[value="profile"]')?.click();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      // Update full name if changed
      if (fullName !== profile?.full_name) {
        await profileService.updateProfile(currentUser.id, {
          full_name: fullName
        });
      }

      // Upload avatar if new file selected
      if (avatarFile) {
        await profileService.uploadAvatar(currentUser.id, avatarFile);
        setAvatarFile(null);
      }

      await loadProfile();
      await loadProfileCompletion();
      showToast('Profile updated successfully', 'success');
    } catch (error) {
      console.error('Error updating profile:', error);
      showToast('Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!profile?.avatar_url) return;
    
    setLoading(true);
    try {
      await profileService.deleteAvatar(currentUser.id, profile.avatar_url);
      await loadProfile();
      showToast('Avatar removed', 'success');
    } catch (error) {
      console.error('Error deleting avatar:', error);
      showToast('Failed to remove avatar', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const hasSecurityQuestions = profile?.security_question_1 && profile?.security_question_2 && profile?.security_question_3;

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Profile Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Profile Completion Card */}
      {completion && (
        <ProfileCompletionCard
          completion={completion}
          onCompleteClick={handleCompleteProfileClick}
        />
      )}

      {skippedSteps.length > 0 && (
        <ResumeOnboardingSection
          skippedSteps={skippedSteps}
          onStepComplete={handleStepComplete}
          currentUserId={currentUser.id}
        />
      )}

      <SwipeableTabs 
        defaultValue="profile" 
        tabs={[
          { value: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
          { value: 'password', label: 'Password', icon: <Lock className="w-4 h-4" /> },
          { value: 'security', label: 'Security', icon: <Shield className="w-4 h-4" /> },
          { value: 'account', label: 'Account', icon: <Settings className="w-4 h-4" /> }
        ]}
        className="w-full"
      >

        <TabsContent value="profile" className="space-y-6 mt-6">
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Profile Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Profile Picture
                </label>
                <AvatarUpload
                  currentAvatar={profile.avatar_url}
                  onAvatarChange={setAvatarFile}
                  preview={avatarFile}
                  onDelete={handleDeleteAvatar}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Full Name
                </label>
                <Input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={profile.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Contact support to change your email address
                </p>
              </div>

              <Button onClick={handleSaveProfile} disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="password" className="space-y-6 mt-6">
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Change Password
            </h2>
            <PasswordChangeForm />
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-6 mt-6">
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Security Questions
            </h2>

            {hasSecurityQuestions && !showSecurityQuestions ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  You have security questions set up for account recovery.
                </p>
                <div className="space-y-2">
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium text-foreground">
                      Question 1: {profile.security_question_1}
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium text-foreground">
                      Question 2: {profile.security_question_2}
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium text-foreground">
                      Question 3: {profile.security_question_3}
                    </p>
                  </div>
                </div>
                <Button onClick={() => setShowSecurityQuestions(true)}>
                  Update Security Questions
                </Button>
              </div>
            ) : (
              <SecurityQuestionsSetup
                onComplete={() => {
                  setShowSecurityQuestions(false);
                  loadProfile();
                }}
                onSkip={() => setShowSecurityQuestions(false)}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="account" className="space-y-6 mt-6">
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Account Information
            </h2>

            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-md">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Account Created</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(profile.created_at)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted rounded-md">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Last Updated</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(profile.updated_at)}
                  </p>
                </div>
              </div>

              {profile.onboarding_completed_at && (
                <div className="flex items-center gap-3 p-3 bg-muted rounded-md">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Onboarding Completed
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(profile.onboarding_completed_at)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-card border border-destructive/50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-destructive mb-2">Danger Zone</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Once you delete your account, there is no going back. Please be certain.
            </p>
            <Button variant="destructive" disabled>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Account
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Contact support to delete your account
            </p>
          </div>
        </TabsContent>
      </SwipeableTabs>

      <SwipeIndicator show={showSwipeHint} onDismiss={() => setShowSwipeHint(false)} />
      </div>
    </Layout>
  );
}
