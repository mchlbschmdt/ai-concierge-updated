import React, { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { profileService } from '@/services/profileService';
import { useToast } from '@/context/ToastContext';

export const PasswordChangeForm = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  const validatePassword = (password) => {
    const minLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return minLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;
  };

  const getPasswordStrength = (password) => {
    if (password.length === 0) return { strength: 0, label: '' };
    if (password.length < 8) return { strength: 25, label: 'Weak', color: 'bg-red-500' };
    
    let strength = 25;
    if (/[A-Z]/.test(password)) strength += 15;
    if (/[a-z]/.test(password)) strength += 15;
    if (/[0-9]/.test(password)) strength += 15;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 15;
    if (password.length >= 12) strength += 15;

    if (strength <= 40) return { strength, label: 'Weak', color: 'bg-red-500' };
    if (strength <= 70) return { strength, label: 'Medium', color: 'bg-yellow-500' };
    return { strength, label: 'Strong', color: 'bg-green-500' };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!passwords.current) {
      showToast('Please enter your current password', 'error');
      return;
    }

    if (!validatePassword(passwords.new)) {
      showToast(
        'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
        'error'
      );
      return;
    }

    if (passwords.new !== passwords.confirm) {
      showToast('New passwords do not match', 'error');
      return;
    }

    setLoading(true);
    try {
      await profileService.updatePassword(passwords.current, passwords.new);
      showToast('Password updated successfully', 'success');
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (error) {
      console.error('Error updating password:', error);
      showToast(error.message || 'Failed to update password', 'error');
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength(passwords.new);

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div className="flex items-center gap-2 text-muted-foreground mb-4">
        <Lock className="w-5 h-5" />
        <span className="text-sm">Update your password to keep your account secure</span>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Current Password
        </label>
        <div className="relative">
          <Input
            type={showPasswords.current ? 'text' : 'password'}
            value={passwords.current}
            onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
            placeholder="Enter current password"
          />
          <button
            type="button"
            onClick={() =>
              setShowPasswords({ ...showPasswords, current: !showPasswords.current })
            }
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          New Password
        </label>
        <div className="relative">
          <Input
            type={showPasswords.new ? 'text' : 'password'}
            value={passwords.new}
            onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
            placeholder="Enter new password"
          />
          <button
            type="button"
            onClick={() =>
              setShowPasswords({ ...showPasswords, new: !showPasswords.new })
            }
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        
        {passwords.new && (
          <div className="mt-2">
            <div className="flex items-center gap-2 mb-1">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                  style={{ width: `${passwordStrength.strength}%` }}
                />
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                {passwordStrength.label}
              </span>
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Confirm New Password
        </label>
        <div className="relative">
          <Input
            type={showPasswords.confirm ? 'text' : 'password'}
            value={passwords.confirm}
            onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
            placeholder="Confirm new password"
          />
          <button
            type="button"
            onClick={() =>
              setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })
            }
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Updating...' : 'Update Password'}
      </Button>
    </form>
  );
};
