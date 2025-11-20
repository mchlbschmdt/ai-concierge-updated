import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function MobileDrawer({ isOpen, onClose, title, children, height = 'h-[80vh]' }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      <div
        className={`fixed bottom-0 left-0 right-0 bg-card rounded-t-2xl shadow-2xl z-50 transition-transform duration-300 ease-out ${height} ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-muted rounded-full" />
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition"
          >
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        <div className="overflow-y-auto p-4" style={{ height: 'calc(100% - 80px)' }}>
          {children}
        </div>
      </div>
    </>
  );
}
