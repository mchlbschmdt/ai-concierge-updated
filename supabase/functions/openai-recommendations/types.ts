
export interface RecommendationRequest {
  prompt: string;
  propertyAddress?: string;
  guestContext?: {
    currentLocation?: string;
    previousAskedAbout?: string[];
    timeOfDay?: string;
    transportMode?: string;
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
