import { supabase } from '@/integrations/supabase/client';

export const roleService = {
  // Get current user's roles
  async getUserRoles(userId) {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    
    if (error) throw error;
    return data.map(r => r.role);
  },

  // Check if user has specific role
  async hasRole(userId, role) {
    const { data, error } = await supabase
      .rpc('has_role', { _user_id: userId, _role: role });
    
    if (error) throw error;
    return data;
  },

  // Check if user is super admin
  async isSuperAdmin(userId) {
    const { data, error } = await supabase
      .rpc('is_super_admin', { _user_id: userId });
    
    if (error) throw error;
    return data;
  },

  // Get all users with their roles (super admin only)
  async getAllUsersWithRoles() {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name, created_at')
      .order('created_at', { ascending: false });
    
    if (profilesError) throw profilesError;

    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role');
    
    if (rolesError) throw rolesError;

    // Merge roles with profiles
    return profiles.map(profile => ({
      ...profile,
      roles: roles.filter(r => r.user_id === profile.id).map(r => r.role)
    }));
  },

  // Assign role to user (super admin only)
  async assignRole(userId, role, assignedBy) {
    const { data, error } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role: role,
        created_by: assignedBy
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Remove role from user (super admin only)
  async removeRole(userId, role) {
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role', role);
    
    if (error) throw error;
  },

  // Reassign property to different user
  async reassignProperty(propertyId, newUserId) {
    const { error } = await supabase
      .from('properties')
      .update({ user_id: newUserId })
      .eq('id', propertyId);
    
    if (error) throw error;
  }
};
