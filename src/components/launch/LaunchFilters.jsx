import React from 'react';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';

export const LaunchFilters = ({ 
  launchType, 
  setLaunchType, 
  timeframe, 
  setTimeframe,
  products,
  selectedProduct,
  setSelectedProduct 
}) => {
  return (
    <Card className="p-4 bg-card shadow-card">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-heading mb-2">
            Launch Type
          </label>
          <select
            value={launchType}
            onChange={(e) => setLaunchType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">All Launches</option>
            <option value="core">Core</option>
            <option value="limited">Limited Edition</option>
            <option value="variant">Variant</option>
            <option value="merchandise">Merchandise</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-heading mb-2">
            Product
          </label>
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="">All Products</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-heading mb-2">
            Timeframe
          </label>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="day1">Day 1</option>
            <option value="week1">Week 1</option>
            <option value="month1">Month 1</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>
    </Card>
  );
};