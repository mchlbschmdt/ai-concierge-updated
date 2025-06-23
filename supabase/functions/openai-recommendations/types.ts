
export interface RecommendationRequest {
  prompt: string;
  propertyAddress?: string;
  guestContext?: {
    guestName?: string;
    currentLocation?: string;
    previousAskedAbout?: string[];
    transportMode?: string;
    timeOfDay?: string;
    dayOfWeek?: string;
    previousInterests?: string[];
    lastActivity?: string;
    isCheckoutSoon?: boolean;
  };
  requestType?: string;
  previousRecommendations?: string;
}

export interface RecommendationResponse {
  recommendation: string;
}

export interface ErrorResponse {
  error: string;
}
