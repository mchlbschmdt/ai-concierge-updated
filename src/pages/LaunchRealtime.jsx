import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ArrowLeft, TrendingUp, DollarSign, Package, Clock } from 'lucide-react';
import { LaunchMetricsCard } from '@/components/launch/LaunchMetricsCard';

const LaunchRealtime = () => {
  const navigate = useNavigate();
  const [currentHour, setCurrentHour] = useState(new Date().getHours());
  const [liveData, setLiveData] = useState([]);

  // Simulate real-time data updates
  useEffect(() => {
    const generateMockData = () => {
      const data = [];
      for (let i = 0; i <= 24; i++) {
        data.push({
          hour: i,
          actual: Math.floor(Math.random() * 5000) + 2000 + (i * 500),
          forecast: 3000 + (i * 600),
          cumulative: (i * 4000) + Math.floor(Math.random() * 1000)
        });
      }
      return data;
    };

    setLiveData(generateMockData());

    // Update every 5 seconds to simulate real-time
    const interval = setInterval(() => {
      setLiveData(generateMockData());
      setCurrentHour(new Date().getHours());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const currentData = liveData[currentHour] || {};
  const totalRevenue = liveData.reduce((sum, d) => sum + (d.actual || 0), 0);
  const forecastTotal = liveData.reduce((sum, d) => sum + (d.forecast || 0), 0);
  const vsTarget = ((totalRevenue - forecastTotal) / forecastTotal * 100).toFixed(1);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header with Live Indicator */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/launch')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-heading font-display">
                Real-Time Launch Monitor
              </h1>
              <div className="flex items-center gap-2 px-3 py-1 bg-error/10 border border-error rounded-full">
                <div className="w-2 h-2 bg-error rounded-full animate-pulse" />
                <span className="text-sm font-medium text-error">LIVE</span>
              </div>
            </div>
            <p className="text-gray-600 mt-1">
              Hourly revenue and units tracking • Updated every 5 seconds
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Current Hour</div>
            <div className="text-2xl font-bold text-primary">{currentHour}:00</div>
          </div>
        </div>

        {/* Real-time KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <LaunchMetricsCard
            title="Hourly Revenue"
            value={`$${(currentData.actual || 0).toLocaleString()}`}
            subtitle="Current hour"
            icon={DollarSign}
          />
          <LaunchMetricsCard
            title="Cumulative Revenue"
            value={`$${totalRevenue.toLocaleString()}`}
            subtitle="Since launch"
            icon={TrendingUp}
          />
          <LaunchMetricsCard
            title="vs Forecast"
            value={`${vsTarget > 0 ? '+' : ''}${vsTarget}%`}
            subtitle={vsTarget > 0 ? 'Above target' : 'Below target'}
            icon={Package}
          />
          <LaunchMetricsCard
            title="Hours Live"
            value={currentHour}
            subtitle="Current tracking period"
            icon={Clock}
          />
        </div>

        {/* Real-time Performance Chart */}
        <Card className="p-6 bg-card shadow-card">
          <h3 className="text-lg font-semibold text-heading mb-4">
            Hourly Revenue vs Forecast Target
          </h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={liveData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e5f3" />
              <XAxis 
                dataKey="hour" 
                stroke="#263361"
                label={{ value: 'Hour', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                stroke="#263361"
                label={{ value: 'Revenue ($)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e5f3',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <ReferenceLine 
                x={currentHour} 
                stroke="#D5485D" 
                strokeDasharray="3 3"
                label={{ value: 'NOW', fill: '#D5485D', fontSize: 12, fontWeight: 'bold' }}
              />
              <Line
                type="monotone"
                dataKey="actual"
                stroke="#1b3898"
                strokeWidth={3}
                name="Actual Revenue"
                dot={{ fill: '#1b3898', r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="forecast"
                stroke="#8797c7"
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Forecast Target"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Cumulative Performance */}
        <Card className="p-6 bg-card shadow-card">
          <h3 className="text-lg font-semibold text-heading mb-4">
            Cumulative Performance
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={liveData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e5f3" />
              <XAxis dataKey="hour" stroke="#263361" />
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
                stroke="#41936a"
                strokeWidth={3}
                name="Cumulative Revenue"
                fill="#41936a"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Hourly Breakdown Table */}
        <Card className="p-6 bg-card shadow-card">
          <h3 className="text-lg font-semibold text-heading mb-4">
            Hourly Performance Breakdown
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-heading">Hour</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-heading">Actual Revenue</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-heading">Forecast</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-heading">Variance</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-heading">Status</th>
                </tr>
              </thead>
              <tbody>
                {liveData.slice(0, currentHour + 1).reverse().map((row) => {
                  const variance = ((row.actual - row.forecast) / row.forecast * 100).toFixed(1);
                  const isOnTrack = variance >= -10;
                  
                  return (
                    <tr 
                      key={row.hour} 
                      className={`border-b border-gray-100 hover:bg-muted transition-colors ${
                        row.hour === currentHour ? 'bg-primary/5' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-medium text-heading">
                        Hour {row.hour}
                        {row.hour === currentHour && (
                          <span className="ml-2 text-xs bg-error text-white px-2 py-0.5 rounded">NOW</span>
                        )}
                      </td>
                      <td className="py-3 px-4">${row.actual.toLocaleString()}</td>
                      <td className="py-3 px-4 text-gray-600">${row.forecast.toLocaleString()}</td>
                      <td className={`py-3 px-4 font-medium ${variance >= 0 ? 'text-success' : 'text-error'}`}>
                        {variance >= 0 ? '+' : ''}{variance}%
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          isOnTrack ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                        }`}>
                          {isOnTrack ? 'On Track' : 'Below Target'}
                        </span>
                      </td>
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

export default LaunchRealtime;