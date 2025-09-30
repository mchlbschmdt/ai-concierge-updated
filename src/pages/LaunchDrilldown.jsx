import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { ArrowLeft } from 'lucide-react';
import { shopifyLaunchService } from '@/services/shopifyLaunchService';
import { useToast } from '@/components/ui/use-toast';

const COLORS = ['#1b3898', '#8797c7', '#22305b', '#41936a', '#c99420'];

const LaunchDrilldown = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [variantData, setVariantData] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ordersData, productsData, inventoryData] = await Promise.all([
        shopifyLaunchService.getOrders(),
        shopifyLaunchService.getProducts(),
        shopifyLaunchService.getInventory()
      ]);

      const analyzedMetrics = shopifyLaunchService.analyzeLaunchPerformance(
        ordersData.orders || [],
        productsData.products || [],
        inventoryData.inventory_levels || []
      );
      
      setMetrics(analyzedMetrics);
      
      // Convert variant mix to chart data
      const variantChartData = Object.entries(analyzedMetrics.variantMix || {}).map(([name, value]) => ({
        name,
        value
      }));
      setVariantData(variantChartData);
    } catch (error) {
      console.error('Error loading drilldown data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load product drilldown data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-lg text-gray-600">Loading product details...</div>
        </div>
      </Layout>
    );
  }

  const totalVariants = variantData.reduce((sum, item) => sum + item.value, 0);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/launch')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-heading font-display">
              Product Drilldown
            </h1>
            <p className="text-gray-600 mt-1">
              Detailed variant and performance breakdown
            </p>
          </div>
        </div>

        {/* Variant Mix Visualization */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 bg-card shadow-card">
            <h3 className="text-lg font-semibold text-heading mb-4">
              Variant Distribution
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={variantData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {variantData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          {/* Variant Performance Table */}
          <Card className="p-6 bg-card shadow-card">
            <h3 className="text-lg font-semibold text-heading mb-4">
              Variant Performance
            </h3>
            <div className="space-y-3">
              {variantData.map((variant, index) => {
                const percentage = ((variant.value / totalVariants) * 100).toFixed(1);
                return (
                  <div key={variant.name} className="border-b border-gray-100 pb-3 last:border-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="font-medium text-heading">{variant.name}</span>
                      </div>
                      <span className="text-sm text-gray-600">{variant.value} units</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: COLORS[index % COLORS.length]
                        }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{percentage}% of total</div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Detailed Variant Table */}
        <Card className="p-6 bg-card shadow-card">
          <h3 className="text-lg font-semibold text-heading mb-4">
            Detailed Variant Metrics
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-heading">Variant</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-heading">Units Sold</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-heading">% of Total</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-heading">Revenue</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-heading">Sell-Through</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-heading">Status</th>
                </tr>
              </thead>
              <tbody>
                {variantData.map((variant, index) => {
                  const percentage = ((variant.value / totalVariants) * 100).toFixed(1);
                  const sellThrough = 65 + Math.random() * 30; // Simulated data
                  const status = sellThrough > 80 ? 'High Demand' : sellThrough > 50 ? 'On Track' : 'Low Demand';
                  const statusColor = sellThrough > 80 ? 'text-success' : sellThrough > 50 ? 'text-warning' : 'text-error';

                  return (
                    <tr key={variant.name} className="border-b border-gray-100 hover:bg-muted transition-colors">
                      <td className="py-3 px-4 font-medium text-heading">{variant.name}</td>
                      <td className="py-3 px-4">{variant.value}</td>
                      <td className="py-3 px-4">{percentage}%</td>
                      <td className="py-3 px-4">${(variant.value * (200 + Math.random() * 100)).toFixed(2)}</td>
                      <td className="py-3 px-4">{sellThrough.toFixed(1)}%</td>
                      <td className={`py-3 px-4 font-medium ${statusColor}`}>{status}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default LaunchDrilldown;