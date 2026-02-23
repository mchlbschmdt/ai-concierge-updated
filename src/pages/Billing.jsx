import React from 'react';
import Layout from '@/components/Layout';
import { CreditCard } from 'lucide-react';

export default function Billing() {
  return (
    <Layout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <CreditCard className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Billing & Subscriptions</h1>
          <p className="text-sm text-muted-foreground mb-6">Billing management is coming soon. Contact your admin for access changes.</p>
          <a href="mailto:support@hostlyai.co" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            Contact Support
          </a>
        </div>
      </div>
    </Layout>
  );
}
