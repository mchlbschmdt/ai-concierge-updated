import React from 'react';
import Layout from '@/components/Layout';
import { LifeBuoy, Mail, MessageCircle } from 'lucide-react';

export default function Support() {
  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-1">Support</h1>
        <p className="text-sm text-muted-foreground mb-6">Need help? We're here for you.</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="bg-card border border-border rounded-xl p-6 text-center">
            <Mail className="h-8 w-8 text-primary mx-auto mb-3" />
            <h3 className="font-semibold text-foreground mb-1">Email Support</h3>
            <p className="text-sm text-muted-foreground mb-3">Get help via email within 24 hours.</p>
            <a href="mailto:support@hostlyai.co" className="text-sm font-medium text-primary hover:underline">
              support@hostlyai.co
            </a>
          </div>
          <div className="bg-card border border-border rounded-xl p-6 text-center">
            <MessageCircle className="h-8 w-8 text-primary mx-auto mb-3" />
            <h3 className="font-semibold text-foreground mb-1">FAQ</h3>
            <p className="text-sm text-muted-foreground mb-3">Browse common questions and answers.</p>
            <span className="text-sm text-muted-foreground">Coming soon</span>
          </div>
        </div>
      </div>
    </Layout>
  );
}
