import { supabase } from "@/integrations/supabase/client";

export const profileService = {
  async getUserProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateProfile(userId, profileData) {
    const { data, error } = await supabase
      .from('profiles')
      .update(profileData)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async uploadAvatar(userId, file) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });
    
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);
    
    await this.updateProfile(userId, { avatar_url: publicUrl });
    
    return publicUrl;
  },

  async deleteAvatar(userId, avatarUrl) {
    if (!avatarUrl) return;
    
    const path = avatarUrl.split('/avatars/')[1];
    if (!path) return;
    
    const { error } = await supabase.storage
      .from('avatars')
      .remove([path]);
    
    if (error) throw error;
    
    await this.updateProfile(userId, { avatar_url: null });
  },

  async checkOnboardingStatus(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('onboarding_completed, skip_onboarding')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data;
  },

  async markOnboardingComplete(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updatePassword(currentPassword, newPassword) {
    // First verify current password by attempting to sign in
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user?.email) {
      throw new Error('User not authenticated');
    }

    // Supabase updateUser for password change
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });
    
    if (error) throw error;
    return data;
  },

  async updateSecurityQuestions(userId, questions, answers) {
    // Hash the answers
    const hashedAnswers = await Promise.all(
      answers.map(async (answer) => {
        const { data, error } = await supabase.rpc('hash_security_answer', {
          answer: answer
        });
        if (error) throw error;
        return data;
      })
    );

    const { data, error } = await supabase
      .from('profiles')
      .update({
        security_question_1: questions[0],
        security_answer_1: hashedAnswers[0],
        security_question_2: questions[1],
        security_answer_2: hashedAnswers[1],
        security_question_3: questions[2],
        security_answer_3: hashedAnswers[2]
      })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};
