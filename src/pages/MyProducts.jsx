import React from 'react';
import Layout from '@/components/Layout';
import { useEntitlementContext } from '@/context/EntitlementContext';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, Clock, Lock } from 'lucide-react';

const PRODUCTS = [
  { id: 'ai_concierge', name: 'AI Concierge', icon: '🤖', description: 'Smart guest messaging, email management, knowledge base, and AI-powered responses.', price: '$29.99/mo', link: '/messages' },
  { id: 'snappro', name: 'SnapPro Photos', icon: '📸', description: 'AI-powered photo optimization for professional listing images.', price: '$9.99/mo', link: '/snappro' },
  { id: 'analytics', name: 'Analytics Suite', icon: '📊', description: 'Property analytics, smart insights, and quality tracking.', price: '$14.99/mo', link: '/analytics' },
  { id: 'academy', name: 'Host Academy', icon: '🎓', description: 'Video training library for short-term rental hosts.', price: '$19.99/mo', link: '/academy' },
  { id: 'full_suite', name: 'Full Suite', icon: '⭐', description: 'Access all products at a discounted bundle price.', price: '$59.99/mo', link: '/' },
];

export default function MyProducts() {
  const { hasAccess } = useEntitlementContext();

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-1">My Products</h1>
        <p className="text-sm text-muted-foreground mb-6">Manage your HostlyAI subscriptions and trials.</p>

        <div className="grid gap-4 sm:grid-cols-2">
          {PRODUCTS.map(p => {
            const access = hasAccess(p.id);
            const statusIcon = access.hasAccess
              ? access.status === 'trial' ? <Clock className="h-4 w-4 text-warning" /> : <CheckCircle className="h-4 w-4 text-success" />
              : <Lock className="h-4 w-4 text-muted-foreground" />;
            const statusLabel = access.hasAccess
              ? access.status === 'trial' ? 'Trial' : 'Active'
              : 'Locked';

            return (
              <div key={p.id} className="bg-card border border-border rounded-xl p-5 flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{p.icon}</span>
                    <h3 className="font-semibold text-foreground">{p.name}</h3>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    {statusIcon}
                    <span className={access.hasAccess ? (access.status === 'trial' ? 'text-warning' : 'text-success') : 'text-muted-foreground'}>
                      {statusLabel}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4 flex-1">{p.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-foreground">{p.price}</span>
                  <Link to={p.link} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                    {access.hasAccess ? 'Open' : 'Learn More'} <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
