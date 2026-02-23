import React, { createContext, useContext, useState, useCallback } from 'react';

const UpgradeModalContext = createContext(null);

export function UpgradeModalProvider({ children }) {
  const [upgradeProductId, setUpgradeProductId] = useState(null);

  const showUpgradeModal = useCallback((productId) => {
    setUpgradeProductId(productId);
  }, []);

  const hideUpgradeModal = useCallback(() => {
    setUpgradeProductId(null);
  }, []);

  return (
    <UpgradeModalContext.Provider value={{ upgradeProductId, showUpgradeModal, hideUpgradeModal }}>
      {children}
    </UpgradeModalContext.Provider>
  );
}

export function useUpgradeModal() {
  const ctx = useContext(UpgradeModalContext);
  if (!ctx) {
    return {
      upgradeProductId: null,
      showUpgradeModal: () => {},
      hideUpgradeModal: () => {},
    };
  }
  return ctx;
}
