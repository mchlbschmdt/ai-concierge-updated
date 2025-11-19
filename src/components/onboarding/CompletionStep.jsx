import React, { useEffect, useState } from 'react';
import { CheckCircle, Home, MessageSquare, BarChart, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import confetti from 'canvas-confetti';

export const CompletionStep = ({ onComplete, loading }) => {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (!showConfetti) {
      setShowConfetti(true);
      // Trigger confetti animation
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [showConfetti]);

  const features = [
    {
      icon: Home,
      title: 'Manage Properties',
      description: 'Add and manage all your rental properties in one place'
    },
    {
      icon: MessageSquare,
      title: 'SMS Concierge',
      description: 'Automated guest communication with AI-powered responses'
    },
    {
      icon: BarChart,
      title: 'Analytics',
      description: 'Track conversations and monitor recommendation quality'
    },
    {
      icon: Settings,
      title: 'Customize Settings',
      description: 'Update your profile and security settings anytime'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">You're All Set!</h2>
        <p className="text-muted-foreground">
          Your account is ready to go. Here's what you can do next:
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {features.map((feature, index) => (
          <div
            key={index}
            className="p-4 border border-border rounded-lg bg-card hover:shadow-md transition-shadow"
          >
            <feature.icon className="w-6 h-6 text-primary mb-2" />
            <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
            <p className="text-sm text-muted-foreground">{feature.description}</p>
          </div>
        ))}
      </div>

      <div className="bg-muted/50 rounded-lg p-4 border border-border">
        <h3 className="font-semibold text-foreground mb-2">Quick Tips:</h3>
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>• Add property details to improve AI responses</li>
          <li>• Upload knowledge base documents for better recommendations</li>
          <li>• Test the SMS system before sharing with guests</li>
          <li>• Check analytics to monitor conversation quality</li>
        </ul>
      </div>

      <div className="flex justify-center">
        <Button
          onClick={onComplete}
          disabled={loading}
          size="lg"
          className="min-w-48"
        >
          {loading ? 'Setting up...' : 'Go to Dashboard'}
        </Button>
      </div>
    </div>
  );
};
