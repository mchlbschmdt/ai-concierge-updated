import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ArrowLeft } from 'lucide-react';

const LaunchComparison = () => {
  const navigate = useNavigate();
  const [launch1, setLaunch1] = useState('current');
  const [launch2, setLaunch2] = useState('previous-1');

  // Mock comparison data
  const comparisonData = [
    { metric: 'Day 1 Revenue', launch1: 52000, launch2: 45200 },
    { metric: 'Week 1 Revenue', launch1: 145000, launch2: 128400 },
    { metric: 'Month 1 Revenue', launch1: 380000, launch2: 342000 },
    { metric: 'Units Sold', launch1: 1250, launch2: 1100 },
    { metric: 'AOV', launch1: 228, launch2: 215 },
  ];

  const launches = [
    { id: 'current', name: 'Current Launch' },
    { id: 'previous-1', name: 'Previous Launch #1' },
    { id: 'previous-2', name: 'Previous Launch #2' },
    { id: 'previous-3', name: 'Previous Launch #3' },
  ];

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
              Launch Comparison
            </h1>
            <p className="text-gray-600 mt-1">
              Compare sales velocity and performance across launches
            </p>
          </div>
        </div>

        {/* Launch Selectors */}
        <Card className="p-6 bg-card shadow-card">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-heading mb-2">
                Launch A
              </label>
              <select
                value={launch1}
                onChange={(e) => setLaunch1(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {launches.map((launch) => (
                  <option key={launch.id} value={launch.id}>
                    {launch.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-heading mb-2">
                Launch B
              </label>
              <select
                value={launch2}
                onChange={(e) => setLaunch2(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {launches.map((launch) => (
                  <option key={launch.id} value={launch.id}>
                    {launch.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Side-by-side Comparison Chart */}
        <Card className="p-6 bg-card shadow-card">
          <h3 className="text-lg font-semibold text-heading mb-4">
            Performance Comparison
          </h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e5f3" />
              <XAxis dataKey="metric" stroke="#263361" />
              <YAxis stroke="#263361" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e5f3',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar dataKey="launch1" fill="#1b3898" name="Launch A" />
              <Bar dataKey="launch2" fill="#8797c7" name="Launch B" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Detailed Comparison Table */}
        <Card className="p-6 bg-card shadow-card">
          <h3 className="text-lg font-semibold text-heading mb-4">
            Detailed Metrics Comparison
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-heading">Metric</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-heading">Launch A</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-heading">Launch B</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-heading">Difference</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-heading">Winner</th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((row) => {
                  const diff = ((row.launch1 - row.launch2) / row.launch2 * 100).toFixed(1);
                  const winner = row.launch1 > row.launch2 ? 'A' : 'B';
                  const winnerColor = row.launch1 > row.launch2 ? 'text-primary' : 'text-secondary';

                  return (
                    <tr key={row.metric} className="border-b border-gray-100 hover:bg-muted transition-colors">
                      <td className="py-3 px-4 font-medium text-heading">{row.metric}</td>
                      <td className="py-3 px-4">${row.launch1.toLocaleString()}</td>
                      <td className="py-3 px-4">${row.launch2.toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <span className={diff > 0 ? 'text-success' : 'text-error'}>
                          {diff > 0 ? '+' : ''}{diff}%
                        </span>
                      </td>
                      <td className={`py-3 px-4 font-semibold ${winnerColor}`}>
                        Launch {winner}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Sales Velocity Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 bg-card shadow-card">
            <h3 className="text-lg font-semibold text-heading mb-4">
              Time to Sell-Through Milestones
            </h3>
            <div className="space-y-4">
              {['25%', '50%', '75%', '100%'].map((milestone) => (
                <div key={milestone}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-heading">{milestone} Sold</span>
                    <div className="flex gap-4 text-sm">
                      <span className="text-primary font-medium">A: 2.5h</span>
                      <span className="text-secondary font-medium">B: 3.1h</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-primary/20 rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: '80%' }} />
                    </div>
                    <div className="flex-1 bg-secondary/20 rounded-full h-2">
                      <div className="bg-secondary h-2 rounded-full" style={{ width: '65%' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 bg-card shadow-card">
            <h3 className="text-lg font-semibold text-heading mb-4">
              Key Insights
            </h3>
            <div className="space-y-3">
              <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
                <p className="text-sm text-success font-medium">
                  Launch A outperformed by 15% in Day 1 revenue
                </p>
              </div>
              <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                <p className="text-sm text-primary font-medium">
                  Launch A had 12% higher AOV
                </p>
              </div>
              <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                <p className="text-sm text-warning font-medium">
                  Launch B had better variant diversity
                </p>
              </div>
              <div className="p-3 bg-secondary/10 border border-secondary/20 rounded-lg">
                <p className="text-sm text-secondary font-medium">
                  Launch A reached 50% sell-through 20% faster
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default LaunchComparison;