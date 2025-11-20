import React, { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

export default function PwaUpdatePrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if (!offlineReady && !needRefresh) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="bg-card rounded-lg shadow-2xl border border-border p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            {offlineReady ? (
              <>
                <h3 className="font-semibold text-foreground mb-1">
                  App ready to work offline
                </h3>
                <p className="text-sm text-muted-foreground">
                  You can now use this app without an internet connection.
                </p>
              </>
            ) : (
              <>
                <h3 className="font-semibold text-foreground mb-1">
                  New version available
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Click reload to update to the latest version.
                </p>
                <button
                  onClick={() => updateServiceWorker(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition text-sm font-medium"
                >
                  <RefreshCw size={16} />
                  Reload
                </button>
              </>
            )}
          </div>
          <button
            onClick={close}
            className="text-muted-foreground hover:text-foreground transition"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
