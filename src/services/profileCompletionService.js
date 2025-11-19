import { supabase } from '@/integrations/supabase/client';

/**
 * Service for calculating and managing profile completion status
 * 
 * Completion calculation:
 * - Full name: 25%
 * - Avatar: 25%
 * - Security questions: 25%
 * - At least one property: 25%
 */

export const profileCompletionService = {
  /**
   * Calculate profile completion percentage and details
   */
  async calculateCompletion(userId) {
    try {
      // Fetch profile data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, security_question_1, security_question_2, security_question_3')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      // Fetch properties count
      const { count: propertiesCount, error: propertiesError } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (propertiesError) throw propertiesError;

      // Calculate completion items
      const items = [
        {
          name: 'full_name',
          label: 'Full Name',
          complete: !!profile.full_name,
          points: 25,
          icon: 'User'
        },
        {
          name: 'avatar',
          label: 'Profile Picture',
          complete: !!profile.avatar_url,
          points: 25,
          icon: 'Camera'
        },
        {
          name: 'security_questions',
          label: 'Security Questions',
          complete: !!(profile.security_question_1 && profile.security_question_2 && profile.security_question_3),
          points: 25,
          icon: 'Shield'
        },
        {
          name: 'property',
          label: 'Property Added',
          complete: propertiesCount > 0,
          points: 25,
          icon: 'Home'
        }
      ];

      const completeItems = items.filter(item => item.complete);
      const incompleteItems = items.filter(item => !item.complete);
      const percentage = completeItems.reduce((sum, item) => sum + item.points, 0);

      return {
        percentage,
        completeItems,
        incompleteItems,
        allItems: items
      };
    } catch (error) {
      console.error('Error calculating profile completion:', error);
      throw error;
    }
  },

  /**
   * Get color class based on completion percentage
   */
  getCompletionColor(percentage) {
    if (percentage <= 40) return 'text-red-500';
    if (percentage <= 70) return 'text-yellow-500';
    return 'text-green-500';
  },

  /**
   * Get background color class based on completion percentage
   */
  getCompletionBgColor(percentage) {
    if (percentage <= 40) return 'bg-red-50';
    if (percentage <= 70) return 'bg-yellow-50';
    return 'bg-green-50';
  },

  /**
   * Get border color class based on completion percentage
   */
  getCompletionBorderColor(percentage) {
    if (percentage <= 40) return 'border-red-200';
    if (percentage <= 70) return 'border-yellow-200';
    return 'border-green-200';
  }
};
