
import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useEntitlementContext } from '@/context/EntitlementContext';
import { useProducts } from '@/hooks/useEntitlements';
import Layout from '@/components/Layout';
import { Check, ChevronDown, Gift, Sparkles, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PRICING_FEATURES = {
  ai_concierge: [
    "AI-powered SMS guest concierge",
    "Automated check-in/out messages",
    "Email management & drafts",
    "Knowledge base editor",
    "FAQ auto-responses",
    "Travel guide recommendations",
    "Multi-property support",
    "Conversation analytics"
  ],
  snappro: [
    "AI photo enhancement",
    "Auto white-balance & lighting",
    "Batch processing",
    "Listing-ready exports",
    "Before/after comparisons"
  ],
  analytics: [
    "Property performance dashboard",
    "Smart insights & trends",
    "Response quality tracking",
    "Guest satisfaction metrics",
    "Weekly email reports"
  ],
  academy: [
    "Expert video training library",
    "Step-by-step hosting guides",
    "New content added monthly",
    "Progress tracking"
  ],
  full_suite: [
    "AI Concierge (all features)",
    "SnapPro Photos (all features)",
    "Analytics Suite (all features)",
    "Host Academy (all features)",
    "Priority support",
    "Early access to new features",
    "Bundle savings vs individual"
  ]
};

const PRODUCT_ICONS = {
  ai_concierge: "🤖",
  snappro: "📸",
  analytics: "📊",
  academy: "🎓",
  full_suite: "🚀",
};

const ICON_COLORS = {
  ai_concierge: "bg-blue-100 text-blue-700",
  snappro: "bg-purple-100 text-purple-700",
  analytics: "bg-emerald-100 text-emerald-700",
  academy: "bg-amber-100 text-amber-700",
  full_suite: "bg-primary/10 text-primary",
};

const FAQ_ITEMS = [
  { q: "Can I cancel anytime?", a: "Yes! You can cancel anytime from your billing page. No questions asked, no hidden fees." },
  { q: "Does AI Concierge charge per property?", a: "Yes, AI Concierge is $29.99/property/month. Each property gets its own dedicated concierge." },
  { q: "What happens when my trial ends?", a: "You'll be prompted to upgrade. We never auto-charge — you stay in control." },
  { q: "Can I switch plans?", a: "Yes, you can upgrade or downgrade at any time. Changes are pro-rated automatically." },
  { q: "Do you offer refunds?", a: "Yes, we offer a 7-day money-back guarantee on all plans. No risk to try." },
  { q: "Is there a contract?", a: "No contracts. All plans are month-to-month or annual with no lock-in." },
];

function BillingToggle({ billing, setBilling, savingsPercent }) {
  return (
    <div className="flex items-center justify-center gap-3 mb-10">
      <span className={`text-sm font-medium ${billing === 'monthly' ? 'text-foreground' : 'text-muted-foreground'}`}>Monthly</span>
      <button
        onClick={() => setBilling(b => b === 'monthly' ? 'annual' : 'monthly')}
        className={`relative w-14 h-7 rounded-full transition-colors duration-200 ${billing === 'annual' ? 'bg-primary' : 'bg-muted'}`}
        aria-label="Toggle billing period"
      >
        <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform duration-200 ${billing === 'annual' ? 'translate-x-7' : ''}`} />
      </button>
      <span className={`text-sm font-medium ${billing === 'annual' ? 'text-foreground' : 'text-muted-foreground'}`}>Annual</span>
      {savingsPercent > 0 && (
        <span className="ml-2 px-2.5 py-0.5 rounded-full bg-success/10 text-success text-xs font-semibold">
          Save ~{savingsPercent}%
        </span>
      )}
    </div>
  );
}

function TrialBadge({ product }) {
  if (!product.trial_type) return null;
  const label = product.trial_type === 'usage'
    ? `🎁 ${product.trial_limit} free responses`
    : `🎁 ${product.trial_limit}-day free trial`;
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-warning/10 text-warning text-xs font-semibold">
      {label}
    </span>
  );
}

function ProductCard({ product, billing, isFullSuite, isActive, individualPrices, navigate, isAuthenticated }) {
  const price = billing === 'monthly'
    ? product.price_monthly
    : product.price_annual ? (product.price_annual / 12) : product.price_monthly;
  const totalAnnual = product.price_annual;
  const features = PRICING_FEATURES[product.id] || [];
  const icon = PRODUCT_ICONS[product.id] || "📦";
  const iconColor = ICON_COLORS[product.id] || "bg-muted";

  // Savings for full suite
  const savings = isFullSuite && individualPrices
    ? (individualPrices - (product.price_monthly || 0)).toFixed(2)
    : null;

  const handleCta = () => {
    if (isAuthenticated) {
      navigate('/billing');
    } else {
      navigate('/register');
    }
  };

  return (
    <div className={`relative flex flex-col rounded-xl border bg-card p-6 shadow-card transition-all duration-200 hover:shadow-lg ${isFullSuite ? 'ring-2 ring-primary lg:col-span-1' : ''} ${isActive ? 'opacity-70' : ''}`}>
      {isFullSuite && (
        <div className="absolute -top-3 -right-3 z-10">
          <span className="inline-block px-3 py-1 rounded-full bg-warning text-warning-foreground text-xs font-bold rotate-12 shadow">
            BEST VALUE
          </span>
        </div>
      )}

      {/* Icon + Name */}
      <div className="flex items-start gap-3 mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${iconColor}`}>
          {icon}
        </div>
        <div>
          <h3 className="font-bold text-foreground text-lg">{product.name}</h3>
          <p className="text-muted-foreground text-sm">{product.description}</p>
        </div>
      </div>

      {/* Price */}
      <div className="mb-4">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-foreground">${price?.toFixed(2) || '—'}</span>
          <span className="text-muted-foreground text-sm">/{billing === 'monthly' ? 'mo' : 'mo'}</span>
        </div>
        {billing === 'annual' && totalAnnual && (
          <p className="text-xs text-muted-foreground mt-0.5">
            ${totalAnnual.toFixed(2)}/year billed annually
          </p>
        )}
        {isFullSuite && savings && Number(savings) > 0 && (
          <p className="text-sm font-medium text-success mt-1">
            Save ${savings}/mo vs buying separately
          </p>
        )}
      </div>

      {/* Trial badge */}
      <div className="mb-4">
        <TrialBadge product={product} />
      </div>

      {/* Features */}
      <ul className="flex-1 space-y-2 mb-6">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-foreground">
            <Check className="w-4 h-4 text-success mt-0.5 shrink-0" />
            <span>{f}</span>
          </li>
        ))}
        {isFullSuite && individualPrices > 0 && (
          <li className="flex items-start gap-2 text-sm text-muted-foreground mt-2 pt-2 border-t border-border">
            <Sparkles className="w-4 h-4 text-warning mt-0.5 shrink-0" />
            <span>All 4 products for one low price</span>
          </li>
        )}
      </ul>

      {/* CTA */}
      {isActive ? (
        <div className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-success/10 text-success font-medium text-sm">
          <Check className="w-4 h-4" />
          Already Active
        </div>
      ) : (
        <div className="space-y-2">
          <Button onClick={handleCta} className="w-full">
            Start Free Trial
          </Button>
          <Link to={isAuthenticated ? '/products' : '/register'} className="block text-center text-sm text-muted-foreground hover:text-primary transition-colors">
            Learn more
          </Link>
        </div>
      )}
    </div>
  );
}

function FaqSection() {
  const [expandedIndex, setExpandedIndex] = useState(null);

  return (
    <section className="max-w-2xl mx-auto mt-20 mb-12">
      <h2 className="text-2xl font-bold text-foreground text-center mb-8">Frequently Asked Questions</h2>
      <div className="space-y-2">
        {FAQ_ITEMS.map((item, i) => (
          <div key={i} className="border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
              className="flex items-center justify-between w-full px-5 py-4 text-left text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
            >
              <span>{item.q}</span>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${expandedIndex === i ? 'rotate-180' : ''}`} />
            </button>
            {expandedIndex === i && (
              <div className="px-5 pb-4 text-sm text-muted-foreground">
                {item.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function PricingContent({ billing, setBilling }) {
  const { data: products = [], isLoading } = useProducts();
  const { hasAccess } = useEntitlementContext();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const isAuthenticated = !!currentUser;

  // Calculate average savings percent for annual toggle
  const firstProduct = products.find(p => p.price_monthly && p.price_annual);
  const savingsPercent = firstProduct
    ? Math.round(((firstProduct.price_monthly * 12 - firstProduct.price_annual) / (firstProduct.price_monthly * 12)) * 100)
    : 17;

  // Sum individual product prices (excluding full_suite)
  const individualPrices = products
    .filter(p => p.id !== 'full_suite' && p.is_active)
    .reduce((sum, p) => sum + (p.price_monthly || 0), 0);

  // Sort products: full_suite last
  const sorted = [...products]
    .filter(p => p.is_active)
    .sort((a, b) => {
      if (a.id === 'full_suite') return 1;
      if (b.id === 'full_suite') return -1;
      return (a.sort_order || 0) - (b.sort_order || 0);
    });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-3">Simple, transparent pricing</h1>
        <p className="text-lg text-muted-foreground">Choose the plan that works for you. Start free, upgrade anytime.</p>
      </div>

      <BillingToggle billing={billing} setBilling={setBilling} savingsPercent={savingsPercent} />

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {sorted.map(product => {
          const access = hasAccess(product.id);
          const isActive = access?.hasAccess && access?.status !== 'expired';
          return (
            <ProductCard
              key={product.id}
              product={product}
              billing={billing}
              isFullSuite={product.id === 'full_suite'}
              isActive={isActive}
              individualPrices={individualPrices}
              navigate={navigate}
              isAuthenticated={isAuthenticated}
            />
          );
        })}
      </div>

      <FaqSection />
    </>
  );
}

// Exported for PricingModal reuse
export function PricingCards({ highlightProduct }) {
  const [billing, setBilling] = useState('monthly');
  return <PricingContent billing={billing} setBilling={setBilling} />;
}

export default function Pricing() {
  const { currentUser } = useAuth();
  const [billing, setBilling] = useState('monthly');

  const content = (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <PricingContent billing={billing} setBilling={setBilling} />
    </div>
  );

  if (currentUser) {
    return <Layout>{content}</Layout>;
  }

  // Public layout — minimal header
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-foreground">Hostly</Link>
          <Link to="/login" className="text-sm font-medium text-primary hover:underline">Sign In</Link>
        </div>
      </header>
      {content}
    </div>
  );
}
