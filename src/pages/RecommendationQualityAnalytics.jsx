import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from '@/components/ui/select';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertCircle, TrendingUp, CheckCircle, XCircle, Filter } from 'lucide-react';
import { format } from 'date-fns';

const RecommendationQualityAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [rejectionsByCategory, setRejectionsByCategory] = useState([]);
  const [recentRejections, setRecentRejections] = useState([]);
  const [keywordAnalysis, setKeywordAnalysis] = useState([]);
  const [retryStats, setRetryStats] = useState({ success: 0, failed: 0 });
  const [dateRange, setDateRange] = useState(30); // days
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState('all');
  const [propertyRejectionRates, setPropertyRejectionRates] = useState([]);

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange, selectedProperty]);

  const fetchProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('id, property_name, code, address')
        .order('property_name');
      
      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  };

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - dateRange);

      // Fetch rejections by category
      let categoryQuery = supabase
        .from('recommendation_rejections')
        .select('requested_category, retry_attempted, retry_successful, property_id')
        .gte('created_at', cutoffDate.toISOString());

      if (selectedProperty !== 'all') {
        categoryQuery = categoryQuery.eq('property_id', selectedProperty);
      }

      const { data: categoryData, error: categoryError } = await categoryQuery;

      if (categoryError) throw categoryError;

      // Aggregate by category
      const categoryMap = {};
      let totalRetries = 0;
      let successfulRetries = 0;

      categoryData?.forEach(rejection => {
        const category = rejection.requested_category || 'unknown';
        if (!categoryMap[category]) {
          categoryMap[category] = {
            category,
            total: 0,
            retried: 0,
            successful: 0
          };
        }
        categoryMap[category].total++;
        
        if (rejection.retry_attempted) {
          categoryMap[category].retried++;
          totalRetries++;
          if (rejection.retry_successful) {
            categoryMap[category].successful++;
            successfulRetries++;
          }
        }
      });

      const categoryStats = Object.values(categoryMap).map(cat => ({
        ...cat,
        successRate: cat.retried > 0 ? Math.round((cat.successful / cat.retried) * 100) : 0
      }));

      setRejectionsByCategory(categoryStats);
      setRetryStats({
        success: successfulRetries,
        failed: totalRetries - successfulRetries
      });

      // Fetch property-level rejection rates for comparison
      if (selectedProperty === 'all') {
        const { data: propertyStats, error: propertyError } = await supabase
          .from('recommendation_rejections')
          .select('property_id')
          .gte('created_at', cutoffDate.toISOString());

        if (!propertyError && propertyStats) {
          const propertyMap = {};
          
          propertyStats.forEach(rejection => {
            const propId = rejection.property_id || 'unknown';
            propertyMap[propId] = (propertyMap[propId] || 0) + 1;
          });
          
          const propertyRates = Object.entries(propertyMap)
            .map(([propId, count]) => {
              const property = properties.find(p => p.code === propId);
              return {
                property_id: propId,
                property_name: property?.property_name || 'Unknown Property',
                rejection_count: count
              };
            })
            .sort((a, b) => b.rejection_count - a.rejection_count)
            .slice(0, 10);
          
          setPropertyRejectionRates(propertyRates);
        }
      }

      // Fetch recent rejections with details
      let recentQuery = supabase
        .from('recommendation_rejections')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (selectedProperty !== 'all') {
        recentQuery = recentQuery.eq('property_id', selectedProperty);
      }

      const { data: recentData, error: recentError } = await recentQuery;

      if (recentError) throw recentError;
      setRecentRejections(recentData || []);

      // Keyword analysis
      const keywordMap = {};
      recentData?.forEach(rejection => {
        rejection.validation_keywords_missing?.forEach(keyword => {
          keywordMap[keyword] = (keywordMap[keyword] || 0) + 1;
        });
      });

      const keywordStats = Object.entries(keywordMap)
        .map(([keyword, count]) => ({ keyword, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setKeywordAnalysis(keywordStats);

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const getCategoryDisplayName = (category) => {
    const displayNames = {
      'breakfast_restaurant': 'Breakfast',
      'coffee_shop': 'Coffee',
      'lunch_dining': 'Lunch',
      'dinner_dining': 'Dinner',
      'activities': 'Activities'
    };
    return displayNames[category] || category;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading analytics...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const totalRejections = rejectionsByCategory.reduce((sum, cat) => sum + cat.total, 0);
  const totalRetries = retryStats.success + retryStats.failed;
  const overallRetrySuccessRate = totalRetries > 0 
    ? Math.round((retryStats.success / totalRetries) * 100) 
    : 0;

  return (
    <Layout>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Recommendation Quality Analytics</h1>
            <p className="text-muted-foreground mt-2">Track category mismatch patterns and retry outcomes</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Property Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-muted-foreground" />
              <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="All Properties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Properties</SelectItem>
                  <SelectSeparator />
                  {properties.map(property => (
                    <SelectItem key={property.id} value={property.code}>
                      {property.property_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Date Range Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setDateRange(7)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  dateRange === 7 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                7 Days
              </button>
              <button
                onClick={() => setDateRange(30)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  dateRange === 30 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                30 Days
              </button>
              <button
                onClick={() => setDateRange(90)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  dateRange === 90 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                90 Days
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Rejections
                  {selectedProperty !== 'all' && (
                    <span className="block text-xs text-blue-600 mt-1">
                      (Filtered by property)
                    </span>
                  )}
                </p>
                <p className="text-3xl font-bold text-foreground mt-2">{totalRejections}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Retry Success Rate</p>
                <p className="text-3xl font-bold text-foreground mt-2">{overallRetrySuccessRate}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Successful Retries</p>
                <p className="text-3xl font-bold text-foreground mt-2">{retryStats.success}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Failed Retries</p>
                <p className="text-3xl font-bold text-foreground mt-2">{retryStats.failed}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Rejections by Category */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Rejections by Category</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={rejectionsByCategory}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="category" 
                  tickFormatter={getCategoryDisplayName}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  labelFormatter={getCategoryDisplayName}
                />
                <Legend />
                <Bar dataKey="total" fill="#3b82f6" name="Total Rejections" />
                <Bar dataKey="successful" fill="#10b981" name="Successful Retries" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Retry Success Distribution */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Retry Outcomes</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Successful', value: retryStats.success },
                    { name: 'Failed', value: retryStats.failed }
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Property Rejection Rate Comparison - Only show when "All Properties" is selected */}
        {selectedProperty === 'all' && propertyRejectionRates.length > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Property Rejection Rates
              <p className="text-sm text-muted-foreground font-normal mt-1">
                Properties with higher rates may need better knowledge base data
              </p>
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={propertyRejectionRates}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="property_name" 
                  stroke="hsl(var(--muted-foreground))"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar 
                  dataKey="rejection_count" 
                  fill="#ef4444" 
                  name="Total Rejections" 
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Property-Specific Insights */}
        {selectedProperty !== 'all' && (
          <Card className="p-6 bg-blue-50 border-blue-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-6 w-6 text-blue-600 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Property Analysis: {properties.find(p => p.code === selectedProperty)?.property_name}
                </h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    <strong>Total Rejections:</strong> {totalRejections} in the last {dateRange} days
                  </p>
                  {totalRejections > 0 && (
                    <>
                      <p>
                        <strong>Most Problematic Categories:</strong>{' '}
                        {rejectionsByCategory
                          .sort((a, b) => b.total - a.total)
                          .slice(0, 3)
                          .map(cat => getCategoryDisplayName(cat.category))
                          .join(', ')}
                      </p>
                      <div className="mt-3 p-3 bg-white rounded-md border border-blue-300">
                        <p className="font-semibold text-foreground mb-2">💡 Recommendations:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {totalRejections > 10 && (
                            <li>This property has high rejection rates - review and enhance knowledge base</li>
                          )}
                          {rejectionsByCategory.some(cat => cat.successRate < 50) && (
                            <li>Low retry success rate suggests fundamental data gaps</li>
                          )}
                          <li>Add more detailed information for top rejection categories</li>
                          <li>Verify property amenities and local recommendations are complete</li>
                        </ul>
                      </div>
                    </>
                  )}
                  {totalRejections === 0 && (
                    <p className="text-green-600 font-semibold">
                      ✅ No rejections found - this property's recommendations are performing well!
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Keyword Analysis */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Most Frequently Missing Keywords</h2>
          <div className="space-y-3">
            {keywordAnalysis.length > 0 ? (
              keywordAnalysis.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono">{item.keyword}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Missing</span>
                    <Badge className="bg-orange-500">{item.count}x</Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">No keyword data available</p>
            )}
          </div>
        </Card>

        {/* Recent Rejections Table */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Recent Rejections</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Time</th>
                {selectedProperty === 'all' && (
                  <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Property</th>
                )}
                <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Category</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Reason</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Guest Request</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Retry</th>
              </tr>
            </thead>
            <tbody>
              {recentRejections.map((rejection) => {
                const property = properties.find(p => p.code === rejection.property_id);
                return (
                  <tr key={rejection.id} className="border-b border-border hover:bg-muted/50">
                    <td className="py-3 px-4 text-sm text-foreground">
                      {format(new Date(rejection.created_at), 'MMM d, h:mm a')}
                    </td>
                    {selectedProperty === 'all' && (
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="bg-blue-50">
                          {property?.property_name || 'Unknown'}
                        </Badge>
                      </td>
                    )}
                    <td className="py-3 px-4">
                      <Badge variant="outline">
                        {getCategoryDisplayName(rejection.requested_category)}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground max-w-xs truncate">
                      {rejection.rejection_reason}
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground max-w-xs truncate">
                      {rejection.original_message}
                    </td>
                    <td className="py-3 px-4">
                      {rejection.retry_attempted ? (
                        rejection.retry_successful ? (
                          <Badge className="bg-green-500">Success</Badge>
                        ) : (
                          <Badge className="bg-red-500">Failed</Badge>
                        )
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">Not Attempted</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {recentRejections.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No rejections found in the selected time period</p>
            )}
          </div>
        </Card>

        {/* Category Performance Breakdown */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Category Performance Breakdown</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rejectionsByCategory.map((cat, index) => (
              <Card key={cat.category} className="p-4 border-2" style={{ borderColor: COLORS[index % COLORS.length] }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-foreground">{getCategoryDisplayName(cat.category)}</h3>
                  <Filter className="h-5 w-5" style={{ color: COLORS[index % COLORS.length] }} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Rejections:</span>
                    <span className="font-semibold text-foreground">{cat.total}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Retries:</span>
                    <span className="font-semibold text-foreground">{cat.retried}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Success Rate:</span>
                    <span className={`font-semibold ${cat.successRate >= 70 ? 'text-green-600' : cat.successRate >= 40 ? 'text-orange-600' : 'text-red-600'}`}>
                      {cat.successRate}%
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default RecommendationQualityAnalytics;
