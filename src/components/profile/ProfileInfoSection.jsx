import React, { useState } from 'react';
import { User } from 'lucide-react';
import { EnterpriseCard, EnterpriseCardHeader, EnterpriseCardTitle, EnterpriseCardContent } from '@/components/ui/EnterpriseCard';
import { InlineEditField } from './InlineEditField';
import AvatarUpload from './AvatarUpload';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/context/ToastContext';

export const ProfileInfoSection = ({ profile, onUpdate }) => {
  const { showToast } = useToast();
  const [showSuccess, setShowSuccess] = useState(false);

  const handleNameSave = async (newName) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: newName })
        .eq('id', profile.id);

      if (error) throw error;

      onUpdate({ ...profile, full_name: newName });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      showToast('Name updated successfully', 'success');
    } catch (error) {
      console.error('Error updating name:', error);
      throw new Error('Failed to update name');
    }
  };

  const handleAvatarChange = async (file) => {
    if (!file) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
      const filePath = `${profile.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      onUpdate({ ...profile, avatar_url: publicUrl });
      showToast('Avatar updated successfully', 'success');
    } catch (error) {
      console.error('Error updating avatar:', error);
      showToast('Failed to update avatar', 'error');
    }
  };

  const handleAvatarDelete = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', profile.id);

      if (error) throw error;

      onUpdate({ ...profile, avatar_url: null });
      showToast('Avatar removed successfully', 'success');
    } catch (error) {
      console.error('Error removing avatar:', error);
      showToast('Failed to remove avatar', 'error');
    }
  };

  return (
    <EnterpriseCard>
      <EnterpriseCardHeader>
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          <EnterpriseCardTitle>Profile Information</EnterpriseCardTitle>
        </div>
      </EnterpriseCardHeader>
      <EnterpriseCardContent className="space-y-6">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-3">Profile Picture</p>
          <AvatarUpload
            currentAvatar={profile.avatar_url}
            onAvatarChange={handleAvatarChange}
            onDelete={handleAvatarDelete}
          />
        </div>
        
        <InlineEditField
          label="Full Name"
          value={profile.full_name || ''}
          onSave={handleNameSave}
          placeholder="Enter your full name"
          showSuccess={showSuccess}
        />
      </EnterpriseCardContent>
    </EnterpriseCard>
  );
};
