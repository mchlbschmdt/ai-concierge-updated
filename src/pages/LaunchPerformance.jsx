import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import { LaunchMetricsCard } from '@/components/launch/LaunchMetricsCard';
import { LaunchFilters } from '@/components/launch/LaunchFilters';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, Package, TrendingUp, Clock, ArrowRight } from 'lucide-react';
import { shopifyLaunchService } from '@/services/shopifyLaunchService';
import { toast } from '@/hooks/use-toast';

const LaunchPerformance = () => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [launchType, setLaunchType] = useState('all');
  const [timeframe, setTimeframe] = useState('week1');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [products, setProducts] = useState([]);

  useEffect(() => {
    loadData();
  }, [timeframe, selectedProduct]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ordersData, productsData, inventoryData] = await Promise.all([
        shopifyLaunchService.getOrders(),
        shopifyLaunchService.getProducts(),
        shopifyLaunchService.getInventory()
      ]);

      setProducts(productsData.products || []);
      const analyzedMetrics = shopifyLaunchService.analyzeLaunchPerformance(
        ordersData.orders || [],
        productsData.products || [],
        inventoryData.inventory_levels || []
      );
      setMetrics(analyzedMetrics);
    } catch (error) {
      console.error('Error loading launch data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load launch performance data',
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
          <div className="text-lg text-gray-600">Loading launch data...</div>
        </div>
      </Layout>
    );
  }

  const first7DaysData = metrics?.hourlyData?.slice(0, 168) || []; // 7 days * 24 hours

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-heading font-display">
              Product Launch Performance
            </h1>
            <p className="text-gray-600 mt-1">
              Real-time insights for LVHM stakeholders
            </p>
          </div>
          <div className="flex gap-3">
            <Link to="/launch/drilldown">
              <button className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors">
                Product Drilldown
              </button>
            </Link>
            <Link to="/launch/comparison">
              <button className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors">
                Compare Launches
              </button>
            </Link>
            <Link to="/launch/realtime">
              <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2">
                Live Monitor
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <LaunchFilters
          launchType={launchType}
          setLaunchType={setLaunchType}
          timeframe={timeframe}
          setTimeframe={setTimeframe}
          products={products}
          selectedProduct={selectedProduct}
          setSelectedProduct={setSelectedProduct}
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <LaunchMetricsCard
            title="Total Revenue"
            value={`$${(metrics?.revenue || 0).toLocaleString()}`}
            subtitle={`${metrics?.unitsSold || 0} units sold`}
            change={12.5}
            icon={DollarSign}
          />
          <LaunchMetricsCard
            title="Average Order Value"
            value={`$${(metrics?.aov || 0).toFixed(2)}`}
            subtitle="Per transaction"
            change={8.3}
            icon={TrendingUp}
          />
          <LaunchMetricsCard
            title="Sell-Through Rate"
            value={`${(metrics?.sellThroughRate || 0).toFixed(1)}%`}
            subtitle="Units sold vs available"
            change={-3.2}
            icon={Package}
          />
          <LaunchMetricsCard
            title="Units Sold"
            value={(metrics?.unitsSold || 0).toLocaleString()}
            subtitle="Total across variants"
            change={15.7}
            icon={Clock}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart: Revenue by Day */}
          <Card className="p-6 bg-card shadow-card">
            <h3 className="text-lg font-semibold text-heading mb-4">
              First 7 Days Performance
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={first7DaysData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e5f3" />
                <XAxis 
                  dataKey="hour" 
                  stroke="#263361"
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis stroke="#263361" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#ffffff', 
                    border: '1px solid #e2e5f3',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar dataKey="revenue" fill="#1b3898" name="Revenue" />
                <Bar dataKey="units" fill="#8797c7" name="Units" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Line Chart: Cumulative Performance */}
          <Card className="p-6 bg-card shadow-card">
            <h3 className="text-lg font-semibold text-heading mb-4">
              Cumulative Revenue Trend
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={first7DaysData.map((item, idx, arr) => ({
                ...item,
                cumulative: arr.slice(0, idx + 1).reduce((sum, d) => sum + d.revenue, 0)
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e5f3" />
                <XAxis 
                  dataKey="hour" 
                  stroke="#263361"
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis stroke="#263361" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#ffffff', 
                    border: '1px solid #e2e5f3',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="cumulative" 
                  stroke="#1b3898" 
                  strokeWidth={3}
                  name="Cumulative Revenue"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Benchmark Comparison */}
        <Card className="p-6 bg-card shadow-card">
          <h3 className="text-lg font-semibold text-heading mb-4">
            Performance vs Last 3 Launches
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-heading">Launch</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-heading">Day 1 Revenue</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-heading">Week 1 Revenue</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-heading">Sell-Through</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-heading">AOV</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100 bg-primary/5">
                  <td className="py-3 px-4 font-medium text-primary">Current Launch</td>
                  <td className="py-3 px-4">${(metrics?.revenue || 0).toLocaleString()}</td>
                  <td className="py-3 px-4">${(metrics?.revenue || 0).toLocaleString()}</td>
                  <td className="py-3 px-4">{(metrics?.sellThroughRate || 0).toFixed(1)}%</td>
                  <td className="py-3 px-4">${(metrics?.aov || 0).toFixed(2)}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 text-gray-600">Previous Launch #1</td>
                  <td className="py-3 px-4 text-gray-600">$45,200</td>
                  <td className="py-3 px-4 text-gray-600">$128,400</td>
                  <td className="py-3 px-4 text-gray-600">72.3%</td>
                  <td className="py-3 px-4 text-gray-600">$215.50</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 text-gray-600">Previous Launch #2</td>
                  <td className="py-3 px-4 text-gray-600">$38,900</td>
                  <td className="py-3 px-4 text-gray-600">$112,300</td>
                  <td className="py-3 px-4 text-gray-600">68.1%</td>
                  <td className="py-3 px-4 text-gray-600">$198.75</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-gray-600">Previous Launch #3</td>
                  <td className="py-3 px-4 text-gray-600">$52,100</td>
                  <td className="py-3 px-4 text-gray-600">$145,800</td>
                  <td className="py-3 px-4 text-gray-600">81.5%</td>
                  <td className="py-3 px-4 text-gray-600">$228.90</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default LaunchPerformance;