import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { entitlementService } from '@/services/entitlementService';
import { useCallback } from 'react';

export function useEntitlements() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  const { data: entitlements = [], isLoading } = useQuery({
    queryKey: ['entitlements', currentUser?.id],
    queryFn: () => entitlementService.getUserEntitlements(currentUser.id),
    enabled: !!currentUser?.id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const hasAccess = useCallback(
    (productId) => entitlementService.checkAccess(entitlements, productId),
    [entitlements]
  );

  const refreshEntitlements = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['entitlements'] });
  }, [queryClient]);

  return { entitlements, hasAccess, isLoading, refreshEntitlements };
}

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: () => entitlementService.getAllProducts(),
    staleTime: 30 * 60 * 1000,
  });
}
