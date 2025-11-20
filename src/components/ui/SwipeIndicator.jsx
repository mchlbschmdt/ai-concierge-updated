import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function SwipeIndicator({ show = true, onDismiss }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hasSeenHint = localStorage.getItem('swipe-hint-seen');
    if (!hasSeenHint && show) {
      setVisible(true);
      setTimeout(() => {
        setVisible(false);
        localStorage.setItem('swipe-hint-seen', 'true');
        onDismiss?.();
      }, 5000);
    }
  }, [show, onDismiss]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-30 lg:hidden">
      <div className="bg-foreground text-background px-4 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-bounce">
        <ChevronLeft size={16} />
        <span className="text-sm font-medium">Swipe to navigate</span>
        <ChevronRight size={16} />
      </div>
    </div>
  );
}
