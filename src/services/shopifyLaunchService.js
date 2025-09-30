import { supabase } from '@/integrations/supabase/client';

export const shopifyLaunchService = {
  async getOrders(startDate, endDate) {
    const { data, error } = await supabase.functions.invoke('shopify-launch-data', {
      body: { action: 'getOrders', startDate, endDate }
    });

    if (error) throw error;
    return data;
  },

  async getProducts() {
    const { data, error } = await supabase.functions.invoke('shopify-launch-data', {
      body: { action: 'getProducts' }
    });

    if (error) throw error;
    return data;
  },

  async getInventory() {
    const { data, error } = await supabase.functions.invoke('shopify-launch-data', {
      body: { action: 'getInventory' }
    });

    if (error) throw error;
    return data;
  },

  // Process and analyze launch data
  analyzeLaunchPerformance(orders, products, inventoryLevels) {
    const metrics = {
      revenue: 0,
      unitsSold: 0,
      aov: 0,
      sellThroughRate: 0,
      variantMix: {},
      hourlyData: [],
    };

    // Calculate revenue and units
    orders.forEach(order => {
      metrics.revenue += parseFloat(order.total_price || 0);
      order.line_items?.forEach(item => {
        metrics.unitsSold += item.quantity;
        
        // Track variant mix
        const variantKey = item.variant_title || 'Default';
        metrics.variantMix[variantKey] = (metrics.variantMix[variantKey] || 0) + item.quantity;
      });
    });

    // Calculate AOV
    metrics.aov = orders.length > 0 ? metrics.revenue / orders.length : 0;

    // Calculate sell-through rate
    const totalInventory = inventoryLevels?.reduce((sum, level) => sum + (level.available || 0), 0) || 1;
    metrics.sellThroughRate = totalInventory > 0 ? (metrics.unitsSold / (metrics.unitsSold + totalInventory)) * 100 : 0;

    // Group by hour for hourly tracking
    const hourlyMap = {};
    orders.forEach(order => {
      const hour = new Date(order.created_at).toISOString().slice(0, 13);
      if (!hourlyMap[hour]) {
        hourlyMap[hour] = { revenue: 0, units: 0, orders: 0 };
      }
      hourlyMap[hour].revenue += parseFloat(order.total_price || 0);
      hourlyMap[hour].orders += 1;
      order.line_items?.forEach(item => {
        hourlyMap[hour].units += item.quantity;
      });
    });

    metrics.hourlyData = Object.entries(hourlyMap).map(([hour, data]) => ({
      hour,
      ...data
    })).sort((a, b) => a.hour.localeCompare(b.hour));

    return metrics;
  },

  // Calculate time to sell-through milestones
  calculateMilestones(orders, totalInventory) {
    const sortedOrders = [...orders].sort((a, b) => 
      new Date(a.created_at) - new Date(b.created_at)
    );

    let cumulativeUnits = 0;
    const milestones = { '25%': null, '50%': null, '75%': null, '100%': null };
    
    sortedOrders.forEach(order => {
      order.line_items?.forEach(item => {
        cumulativeUnits += item.quantity;
        const percentage = (cumulativeUnits / totalInventory) * 100;

        if (percentage >= 25 && !milestones['25%']) {
          milestones['25%'] = order.created_at;
        }
        if (percentage >= 50 && !milestones['50%']) {
          milestones['50%'] = order.created_at;
        }
        if (percentage >= 75 && !milestones['75%']) {
          milestones['75%'] = order.created_at;
        }
        if (percentage >= 100 && !milestones['100%']) {
          milestones['100%'] = order.created_at;
        }
      });
    });

    return milestones;
  },

  // Compare two launches
  compareLaunches(launch1Data, launch2Data) {
    return {
      launch1: this.analyzeLaunchPerformance(
        launch1Data.orders,
        launch1Data.products,
        launch1Data.inventory
      ),
      launch2: this.analyzeLaunchPerformance(
        launch2Data.orders,
        launch2Data.products,
        launch2Data.inventory
      ),
    };
  }
};