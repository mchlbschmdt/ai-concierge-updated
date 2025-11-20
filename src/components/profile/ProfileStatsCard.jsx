import React from 'react';
import { Home, TrendingUp, CheckCircle } from 'lucide-react';
import { EnterpriseCard, EnterpriseCardContent } from '@/components/ui/EnterpriseCard';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export const ProfileStatsCard = ({ profile, propertyCount = 0, completionPercentage = 0 }) => {
  const navigate = useNavigate();

  const stats = [
    {
      label: 'Properties',
      value: propertyCount,
      icon: Home,
      color: 'text-primary'
    },
    {
      label: 'Profile Complete',
      value: `${completionPercentage}%`,
      icon: TrendingUp,
      color: completionPercentage === 100 ? 'text-success' : 'text-warning'
    }
  ];

  return (
    <EnterpriseCard variant="flat" className="bg-gradient-to-br from-primary/5 to-secondary/5">
      <EnterpriseCardContent className="py-6">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-heading">Quick Stats</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          {stats.map((stat, index) => (
            <div key={index} className="text-center p-3 bg-card rounded-lg border border-gray-soft">
              <stat.icon className={`h-6 w-6 mx-auto mb-2 ${stat.color}`} />
              <p className="text-2xl font-bold text-heading">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {completionPercentage < 100 && (
          <div className="space-y-2">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Complete your profile to unlock all features
            </p>
          </div>
        )}

        {propertyCount === 0 && (
          <Button
            onClick={() => navigate('/add-property')}
            variant="outline"
            size="sm"
            className="w-full mt-3"
          >
            Add Your First Property
          </Button>
        )}
      </EnterpriseCardContent>
    </EnterpriseCard>
  );
};
