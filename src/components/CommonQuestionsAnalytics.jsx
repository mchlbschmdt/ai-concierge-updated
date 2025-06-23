
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, Plus, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export default function CommonQuestionsAnalytics() {
  const [questionsData, setQuestionsData] = useState([]);
  const [recommendationsData, setRecommendationsData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [properties, setProperties] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    loadAnalyticsData();
    loadProperties();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      // Load common questions analytics
      const { data: questions, error: questionsError } = await supabase
        .from('common_questions_analytics')
        .select('*');

      if (questionsError) throw questionsError;

      // Load common recommendations analytics
      const { data: recommendations, error: recommendationsError } = await supabase
        .from('common_recommendations_analytics')
        .select('*');

      if (recommendationsError) throw recommendationsError;

      setQuestionsData(questions || []);
      setRecommendationsData(recommendations || []);
    } catch (error) {
      console.error('Error loading analytics data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load analytics data"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('id, property_name, local_recommendations');

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error loading properties:', error);
    }
  };

  const addRecommendationToProperty = async (recommendation, propertyId) => {
    try {
      const property = properties.find(p => p.id === propertyId);
      if (!property) return;

      const currentRecommendations = property.local_recommendations || '';
      const newRecommendations = currentRecommendations 
        ? `${currentRecommendations}\n• ${recommendation.trim()}`
        : `• ${recommendation.trim()}`;

      const { error } = await supabase
        .from('properties')
        .update({ local_recommendations: newRecommendations })
        .eq('id', propertyId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Added recommendation to ${property.property_name}`
      });

      // Reload properties to reflect changes
      loadProperties();
    } catch (error) {
      console.error('Error adding recommendation:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add recommendation"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Common Questions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Common Guest Questions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {questionsData.slice(0, 8).map((question, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-sm">{question.question_category}</p>
                  <p className="text-xs text-gray-500">
                    Asked {question.frequency} times across {question.properties_asked?.length || 0} properties
                  </p>
                </div>
                <Badge variant="secondary">{question.frequency}</Badge>
              </div>
            ))}
            {questionsData.length === 0 && (
              <p className="text-gray-500 text-center py-8">No question data available yet</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Popular Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Popular Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recommendationsData.slice(0, 6).map((rec, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{rec.recommendation_name}</p>
                    <p className="text-xs text-gray-500">
                      Recommended {rec.frequency} times
                    </p>
                  </div>
                  <Badge variant="secondary">{rec.frequency}</Badge>
                </div>
                
                {properties.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {properties.slice(0, 3).map((property) => (
                      <Button
                        key={property.id}
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-xs"
                        onClick={() => addRecommendationToProperty(rec.recommendation_name, property.id)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add to {property.property_name.length > 10 
                          ? property.property_name.substring(0, 10) + '...' 
                          : property.property_name}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {recommendationsData.length === 0 && (
              <p className="text-gray-500 text-center py-8">No recommendation data available yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
