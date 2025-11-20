import React from 'react';
import { Mail, Calendar, CheckCircle, Shield } from 'lucide-react';
import { EnterpriseCard, EnterpriseCardHeader, EnterpriseCardTitle, EnterpriseCardDescription, EnterpriseCardContent } from '@/components/ui/EnterpriseCard';

export const AccountDetailsSection = ({ profile }) => {
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <EnterpriseCard>
      <EnterpriseCardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <EnterpriseCardTitle>Account Details</EnterpriseCardTitle>
        </div>
        <EnterpriseCardDescription>
          View your account information and status
        </EnterpriseCardDescription>
      </EnterpriseCardHeader>
      <EnterpriseCardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email Address</p>
              <p className="text-base text-heading mt-1">{profile.email}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Member Since</p>
              <p className="text-base text-heading mt-1">{formatDate(profile.created_at)}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Onboarding Status</p>
              <p className="text-base text-heading mt-1">
                {profile.onboarding_completed ? (
                  <span className="inline-flex items-center gap-1.5 text-success">
                    <CheckCircle className="h-4 w-4" />
                    Completed
                  </span>
                ) : (
                  <span className="text-warning">Incomplete</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
              <p className="text-base text-heading mt-1">{formatDate(profile.updated_at)}</p>
            </div>
          </div>
        </div>
      </EnterpriseCardContent>
    </EnterpriseCard>
  );
};
