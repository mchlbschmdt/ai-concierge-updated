import React, { createContext, useContext } from 'react';
import { useEntitlements, useProducts } from '@/hooks/useEntitlements';

const EntitlementContext = createContext(null);

export function EntitlementProvider({ children }) {
  const { entitlements, hasAccess, isLoading, refreshEntitlements } = useEntitlements();
  const { data: products = [], isLoading: productsLoading } = useProducts();

  return (
    <EntitlementContext.Provider value={{ entitlements, hasAccess, products, isLoading: isLoading || productsLoading, refreshEntitlements }}>
      {children}
    </EntitlementContext.Provider>
  );
}

export function useEntitlementContext() {
  const ctx = useContext(EntitlementContext);
  if (!ctx) {
    // Return a safe default when outside provider (login/register pages)
    return {
      entitlements: [],
      hasAccess: () => ({ hasAccess: false, status: 'locked' }),
      products: [],
      isLoading: false,
      refreshEntitlements: () => {},
    };
  }
  return ctx;
}
