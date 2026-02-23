import React from 'react';
import { Lock, Zap, CheckCircle, Clock } from 'lucide-react';

const BADGE_CONFIG = {
  active: { bg: 'bg-success/15', text: 'text-success', icon: CheckCircle, label: 'Active' },
  admin_granted: { bg: 'bg-success/15', text: 'text-success', icon: CheckCircle, label: 'Active' },
  trial: { bg: 'bg-warning/15', text: 'text-warning', icon: Zap, label: 'Trial' },
  expired: { bg: 'bg-error/15', text: 'text-error', icon: Clock, label: 'Expired' },
  cancelled: { bg: 'bg-error/15', text: 'text-error', icon: Clock, label: 'Expired' },
  locked: { bg: 'bg-muted', text: 'text-muted-foreground', icon: Lock, label: 'Locked' },
  coming_soon: { bg: 'bg-muted', text: 'text-muted-foreground', icon: null, label: 'Soon' },
};

export default function StatusBadge({ status, trialInfo, compact = false }) {
  const config = BADGE_CONFIG[status] || BADGE_CONFIG.locked;
  const Icon = config.icon;

  let label = config.label;
  if (status === 'trial' && trialInfo) {
    if (trialInfo.usageLimit) {
      label = `${trialInfo.usageLimit - trialInfo.usageCount} left`;
    } else if (trialInfo.daysRemaining != null) {
      label = `${trialInfo.daysRemaining}d left`;
    }
  }

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${config.bg} ${config.text}`}>
        {Icon && <Icon className="h-2.5 w-2.5" />}
        {label}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {Icon && <Icon className="h-3 w-3" />}
      {label}
    </span>
  );
}
