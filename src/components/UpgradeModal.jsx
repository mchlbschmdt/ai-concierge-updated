import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUpgradeModal } from '@/context/UpgradeModalContext';
import { useEntitlementContext } from '@/context/EntitlementContext';
import { X, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PRICING_FEATURES = {
  ai_concierge: [
    "AI-powered SMS guest concierge",
    "Automated check-in/out messages",
    "Email management & drafts",
    "Knowledge base editor",
    "Multi-property support",
  ],
  snappro: [
    "AI photo enhancement",
    "Batch processing",
    "Listing-ready exports",
    "Before/after comparisons",
  ],
  analytics: [
    "Property performance dashboard",
    "Smart insights & trends",
    "Response quality tracking",
    "Weekly email reports",
  ],
  academy: [
    "Expert video training library",
    "Step-by-step hosting guides",
    "Progress tracking",
  ],
  full_suite: [
    "All 4 products included",
    "Priority support",
    "Early access to new features",
  ],
};

const PRODUCT_ICONS = {
  ai_concierge: "🤖",
  snappro: "📸",
  analytics: "📊",
  academy: "🎓",
  full_suite: "🚀",
};

export default function UpgradeModal() {
  const { upgradeProductId, hideUpgradeModal } = useUpgradeModal();
  const { products } = useEntitlementContext();
  const navigate = useNavigate();
  const [billing, setBilling] = useState('monthly');

  if (!upgradeProductId) return null;

  const product = products.find(p => p.id === upgradeProductId);
  if (!product) return null;

  const price = billing === 'monthly'
    ? product.price_monthly
    : product.price_annual ? (product.price_annual / 12) : product.price_monthly;
  const features = PRICING_FEATURES[product.id] || [];
  const icon = PRODUCT_ICONS[product.id] || "📦";

  const handleUpgrade = () => {
    hideUpgradeModal();
    navigate('/billing');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-8">
        <button
          onClick={hideUpgradeModal}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-muted transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Icon + Name */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
            <span className="text-3xl">{icon}</span>
          </div>
          <h2 className="text-xl font-bold text-foreground">{product.name}</h2>
          <p className="text-sm text-muted-foreground mt-1">{product.description}</p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <span className={`text-xs font-medium ${billing === 'monthly' ? 'text-foreground' : 'text-muted-foreground'}`}>Monthly</span>
          <button
            onClick={() => setBilling(b => b === 'monthly' ? 'annual' : 'monthly')}
            className={`relative w-12 h-6 rounded-full transition-colors ${billing === 'annual' ? 'bg-primary' : 'bg-muted'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${billing === 'annual' ? 'translate-x-6' : ''}`} />
          </button>
          <span className={`text-xs font-medium ${billing === 'annual' ? 'text-foreground' : 'text-muted-foreground'}`}>Annual</span>
        </div>

        {/* Price */}
        <div className="text-center mb-6">
          <span className="text-4xl font-bold text-foreground">${price?.toFixed(2) || '—'}</span>
          <span className="text-muted-foreground text-sm">/mo</span>
          {billing === 'annual' && product.price_annual && (
            <p className="text-xs text-muted-foreground mt-1">${product.price_annual.toFixed(2)}/year billed annually</p>
          )}
        </div>

        {/* Features */}
        <ul className="space-y-2 mb-6">
          {features.map((f, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-foreground">
              <Check className="w-4 h-4 text-success shrink-0" />
              <span>{f}</span>
            </li>
          ))}
        </ul>

        {/* CTAs */}
        <Button onClick={handleUpgrade} className="w-full mb-2">
          <Sparkles className="w-4 h-4 mr-2" />
          Start Free Trial
        </Button>
        <button
          onClick={hideUpgradeModal}
          className="block w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
