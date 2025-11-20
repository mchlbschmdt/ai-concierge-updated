import React, { useState } from 'react';
import { User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AvatarUpload } from '@/components/profile/AvatarUpload';

export const WelcomeStep = ({ formData, updateFormData, onNext, onSaveProgress }) => {
  const [fullName, setFullName] = useState(formData.fullName || '');
  const [avatarFile, setAvatarFile] = useState(formData.avatarFile || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleNext = async () => {
    setLoading(true);
    setError('');
    
    updateFormData({ fullName, avatarFile });
    const success = await onSaveProgress({ fullName, avatarFile });
    
    setLoading(false);
    
    if (success) {
      onNext();
    } else {
      setError('Failed to save your information. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <User className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Welcome to Host Assistant!</h2>
        <p className="text-muted-foreground">
          Let's set up your profile to get started. This will only take a minute.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Your Full Name
          </label>
          <Input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Enter your full name"
            className="w-full"
          />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Profile Picture (Optional)
        </label>
        <AvatarUpload
          currentAvatar={formData.avatarUrl}
          onAvatarChange={setAvatarFile}
          preview={avatarFile}
        />
      </div>
    </div>

    {error && (
      <div className="text-destructive text-sm text-center p-3 bg-destructive/10 rounded-md">
        {error}
      </div>
    )}

    <div className="flex justify-end">
      <Button
        onClick={handleNext}
        disabled={!fullName.trim() || loading}
        className="min-w-32"
      >
        {loading ? 'Saving...' : 'Continue'}
      </Button>
    </div>
    </div>
  );
};
