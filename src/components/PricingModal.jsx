
import React from 'react';
import { X } from 'lucide-react';
import { PricingCards } from '@/pages/Pricing';

export default function PricingModal({ isOpen, onClose, highlightProduct }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-6xl bg-background rounded-2xl shadow-2xl my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-muted transition-colors"
          aria-label="Close pricing"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
        <div className="p-6 md:p-10">
          <PricingCards highlightProduct={highlightProduct} />
        </div>
      </div>
    </div>
  );
}
