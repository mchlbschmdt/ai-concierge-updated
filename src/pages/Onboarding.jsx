import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '@/hooks/useOnboarding';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import confetti from 'canvas-confetti';
import {
  ArrowLeft, ArrowRight, Sparkles, Building2, Camera, BarChart3,
  GraduationCap, MessageSquare, Check, Home, Upload, Play, Rocket
} from 'lucide-react';

const PROPERTY_COUNTS = ['1', '2-5', '6-10', '11-25', '25+'];
const PLATFORMS = [
  { id: 'airbnb', label: 'Airbnb' },
  { id: 'vrbo', label: 'VRBO' },
  { id: 'booking', label: 'Booking.com' },
  { id: 'direct', label: 'Direct Booking' },
];

const PRODUCTS = [
  {
    id: 'ai_concierge',
    name: 'AI Concierge',
    icon: MessageSquare,
    emoji: '🤖',
    trial: '10 free AI responses',
    description: 'Automate guest communication with intelligent SMS replies.',
  },
  {
    id: 'snappro',
    name: 'SnapPro Photos',
    icon: Camera,
    emoji: '📸',
    trial: '10 free photo edits',
    description: 'Optimize listing photos with AI-powered enhancements.',
  },
  {
    id: 'analytics',
    name: 'Analytics Suite',
    icon: BarChart3,
    emoji: '📊',
    trial: '7-day free trial',
    description: 'Track performance, satisfaction scores, and insights.',
  },
  {
    id: 'academy',
    name: 'Host Academy',
    icon: GraduationCap,
    emoji: '🎓',
    trial: '3 free videos',
    description: 'Expert video training to level up your STR business.',
  },
];

const PRODUCT_ROUTES = {
  ai_concierge: '/properties',
  snappro: '/snappro',
  analytics: '/analytics',
  academy: '/academy',
};

// ── Step 1: Welcome ──
function WelcomeStep({ onNext }) {
  return (
    <div className="text-center space-y-6 py-4">
      <div className="relative mx-auto w-24 h-24">
        <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
        <div className="relative w-24 h-24 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center shadow-lg">
          <Rocket className="w-10 h-10 text-white" />
        </div>
      </div>
      <div>
        <h2 className="text-2xl font-bold text-foreground">Welcome to HostlyAI Platform!</h2>
        <p className="text-muted-foreground mt-2">Let's get you set up in 2 minutes</p>
      </div>
      <div className="flex justify-center gap-6 text-xs text-muted-foreground">
        {['Profile', 'Choose product', 'Quick setup'].map((s, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">{i + 1}</div>
            {s}
          </div>
        ))}
      </div>
      <Button onClick={onNext} size="lg" className="min-w-48">
        Get Started <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );
}

// ── Step 2: Profile Setup ──
function ProfileStep({ formData, updateFormData, onNext, onBack, loading, onSave }) {
  const [saving, setSaving] = useState(false);

  const handleNext = async () => {
    setSaving(true);
    const ok = await onSave({ fullName: formData.fullName });
    setSaving(false);
    if (ok) onNext();
  };

  const togglePlatform = (id) => {
    const current = formData.platforms || [];
    updateFormData({
      platforms: current.includes(id) ? current.filter(p => p !== id) : [...current, id]
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold text-foreground">Tell us about yourself</h2>
        <p className="text-sm text-muted-foreground">Help us personalize your experience</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Your name *</label>
          <Input
            value={formData.fullName}
            onChange={e => updateFormData({ fullName: e.target.value })}
            placeholder="Full name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Company name <span className="text-muted-foreground font-normal">(optional)</span></label>
          <Input
            value={formData.companyName}
            onChange={e => updateFormData({ companyName: e.target.value })}
            placeholder="Your property management company"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">How many properties do you manage?</label>
          <div className="flex flex-wrap gap-2">
            {PROPERTY_COUNTS.map(c => (
              <button
                key={c}
                onClick={() => updateFormData({ propertyCount: c })}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  formData.propertyCount === c
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/30'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">What platforms do you use?</label>
          <div className="grid grid-cols-2 gap-2">
            {PLATFORMS.map(p => (
              <button
                key={p.id}
                onClick={() => togglePlatform(p.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm border transition-colors ${
                  (formData.platforms || []).includes(p.id)
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border text-muted-foreground hover:border-primary/30'
                }`}
              >
                {(formData.platforms || []).includes(p.id) && <Check className="h-3.5 w-3.5 text-primary" />}
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        <Button onClick={handleNext} disabled={!formData.fullName?.trim() || saving}>
          {saving ? 'Saving...' : 'Continue'} {!saving && <ArrowRight className="h-4 w-4 ml-1" />}
        </Button>
      </div>
    </div>
  );
}

// ── Step 3: Choose Product ──
function ChooseProductStep({ formData, updateFormData, onNext, onBack }) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold text-foreground">Which would you like to try first?</h2>
        <p className="text-sm text-muted-foreground">Select a product to start your free trial</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {PRODUCTS.map(p => {
          const selected = formData.selectedProduct === p.id;
          const Icon = p.icon;
          return (
            <button
              key={p.id}
              onClick={() => updateFormData({ selectedProduct: p.id })}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                selected
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-border hover:border-primary/30 hover:shadow-sm'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{p.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{p.description}</p>
                  <Badge variant="secondary" className="mt-2 text-[10px]">{p.trial}</Badge>
                </div>
                {selected && (
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <Check className="h-3.5 w-3.5 text-primary-foreground" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        <Button onClick={onNext} disabled={!formData.selectedProduct}>
          <Sparkles className="h-4 w-4 mr-1" /> Start my free trial
        </Button>
      </div>
    </div>
  );
}

// ── Step 4: Product-Specific Setup ──
function ProductSetupStep({ formData, updateFormData, onNext, onBack, onSkip, onAddProperty, loading }) {
  const product = formData.selectedProduct;
  const [saving, setSaving] = useState(false);

  const handleAddProperty = async () => {
    if (!formData.propertyName?.trim() || !formData.propertyAddress?.trim()) return;
    setSaving(true);
    const ok = await onAddProperty({
      propertyName: formData.propertyName,
      propertyAddress: formData.propertyAddress,
      propertyCode: formData.propertyCode || `PROP-${Date.now()}`,
    });
    setSaving(false);
    if (ok) onNext();
  };

  if (product === 'ai_concierge') {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-1">
          <span className="text-4xl">🤖</span>
          <h2 className="text-xl font-bold text-foreground">Add your first property</h2>
          <p className="text-sm text-muted-foreground">The AI Concierge needs a property to work with</p>
        </div>
        <div className="space-y-3">
          <Input
            value={formData.propertyName || ''}
            onChange={e => updateFormData({ propertyName: e.target.value })}
            placeholder="Property name (e.g., Beach House Villa)"
          />
          <Input
            value={formData.propertyAddress || ''}
            onChange={e => updateFormData({ propertyAddress: e.target.value })}
            placeholder="Address"
          />
        </div>
        <div className="flex justify-between">
          <Button variant="ghost" onClick={() => onSkip('product_setup')}> Skip for now</Button>
          <Button onClick={handleAddProperty} disabled={saving || !formData.propertyName?.trim() || !formData.propertyAddress?.trim()}>
            {saving ? 'Adding...' : 'Add Property'} {!saving && <ArrowRight className="h-4 w-4 ml-1" />}
          </Button>
        </div>
      </div>
    );
  }

  if (product === 'snappro') {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-1">
          <span className="text-4xl">📸</span>
          <h2 className="text-xl font-bold text-foreground">Upload your first photo</h2>
          <p className="text-sm text-muted-foreground">Try SnapPro's AI enhancement on a listing photo</p>
        </div>
        <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/30 transition-colors cursor-pointer">
          <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Drag & drop or click to upload</p>
          <p className="text-xs text-muted-foreground mt-1">JPG, PNG up to 10MB</p>
        </div>
        <div className="flex justify-between">
          <Button variant="ghost" onClick={() => onSkip('product_setup')}>Skip for now</Button>
          <Button onClick={onNext}>
            Explore SnapPro <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  // analytics or academy — simple CTA
  const isAnalytics = product === 'analytics';
  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <span className="text-4xl">{isAnalytics ? '📊' : '🎓'}</span>
        <h2 className="text-xl font-bold text-foreground">
          {isAnalytics ? 'Explore your dashboard' : 'Start learning'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {isAnalytics
            ? 'Your analytics dashboard is ready. Data will populate as you use the platform.'
            : 'Browse our video library to start your hosting education.'}
        </p>
      </div>
      <div className="bg-muted/50 rounded-xl p-6 text-center">
        {isAnalytics ? (
          <BarChart3 className="h-16 w-16 text-primary/30 mx-auto" />
        ) : (
          <Play className="h-16 w-16 text-primary/30 mx-auto" />
        )}
      </div>
      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        <Button onClick={onNext}>
          Continue <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

// ── Step 5: Done ──
function DoneStep({ formData, onComplete, loading }) {
  const [fired, setFired] = useState(false);
  const product = PRODUCTS.find(p => p.id === formData.selectedProduct);

  React.useEffect(() => {
    if (!fired) {
      setFired(true);
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      setTimeout(() => confetti({ particleCount: 60, spread: 100, origin: { y: 0.5 } }), 300);
    }
  }, [fired]);

  return (
    <div className="text-center space-y-6 py-4">
      <div className="text-5xl">🎉</div>
      <div>
        <h2 className="text-2xl font-bold text-foreground">You're all set!</h2>
        <p className="text-muted-foreground mt-1">Your HostlyAI account is ready to go</p>
      </div>

      {product && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 inline-block">
          <p className="text-xs font-medium text-primary uppercase mb-1">You unlocked</p>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{product.emoji}</span>
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground">{product.name}</p>
              <p className="text-xs text-muted-foreground">{product.trial}</p>
            </div>
          </div>
        </div>
      )}

      <Button onClick={onComplete} disabled={loading} size="lg" className="min-w-48">
        {loading ? 'Setting up...' : 'Go to Dashboard'} {!loading && <ArrowRight className="h-4 w-4 ml-2" />}
      </Button>
    </div>
  );
}

// ── Main Onboarding Page ──
export default function Onboarding() {
  const navigate = useNavigate();
  const {
    currentStep, totalSteps, formData, loading, progress,
    updateFormData, nextStep, prevStep, skipStep,
    saveProfile, startTrial, addProperty, completeOnboarding
  } = useOnboarding();

  const handleComplete = async () => {
    const success = await completeOnboarding();
    if (success) {
      const route = PRODUCT_ROUTES[formData.selectedProduct] || '/';
      navigate(route);
    }
  };

  const handleStartTrial = async () => {
    if (formData.selectedProduct) {
      await startTrial(formData.selectedProduct);
    }
    nextStep();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Step {currentStep} of {totalSteps}</span>
            <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-lg p-6 md:p-8">
          {currentStep === 1 && <WelcomeStep onNext={nextStep} />}
          {currentStep === 2 && (
            <ProfileStep
              formData={formData}
              updateFormData={updateFormData}
              onNext={nextStep}
              onBack={prevStep}
              loading={loading}
              onSave={saveProfile}
            />
          )}
          {currentStep === 3 && (
            <ChooseProductStep
              formData={formData}
              updateFormData={updateFormData}
              onNext={handleStartTrial}
              onBack={prevStep}
            />
          )}
          {currentStep === 4 && (
            <ProductSetupStep
              formData={formData}
              updateFormData={updateFormData}
              onNext={nextStep}
              onBack={prevStep}
              onSkip={skipStep}
              onAddProperty={addProperty}
              loading={loading}
            />
          )}
          {currentStep === 5 && (
            <DoneStep
              formData={formData}
              onComplete={handleComplete}
              loading={loading}
            />
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
