import React from 'react';
import Layout from '@/components/Layout';
import { Camera, Image } from 'lucide-react';

export default function SnapPro({ tab }) {
  return (
    <Layout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">{tab === 'library' ? '🖼️' : '📸'}</span>
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">
            {tab === 'library' ? 'My Photo Library' : 'SnapPro Photos'}
          </h1>
          <p className="text-sm text-muted-foreground mb-4">
            {tab === 'library'
              ? 'Your optimized photos will appear here.'
              : 'AI-powered photo optimization for professional listing images.'}
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-muted text-muted-foreground mb-6">
            Coming Soon
          </div>
          <div className="text-2xl font-bold text-foreground">$9.99<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
        </div>
      </div>
    </Layout>
  );
}
