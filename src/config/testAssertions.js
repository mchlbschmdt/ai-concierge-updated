export const TEST_ASSERTIONS = {
  waterpark: {
    name: "Waterpark Access",
    message: "How do we access the waterpark?",
    icon: "🏊",
    expectedKeywords: [
      "water park", "waterpark", "lazy river", "slides", 
      "pools", "splash", "resort"
    ],
    requiredKeywords: ["water"],
    forbiddenKeywords: ["air conditioning", "ac unit", "cooling"],
    minimumMatchScore: 40,
    category: "resort_amenities"
  },
  
  disney_timing: {
    name: "Disney Best Time",
    message: "What time is best to beat the crowds at Disney?",
    icon: "🎢",
    expectedKeywords: [
      "rope drop", "early morning", "crowds", "busy", "wait times",
      "opening", "arrive early", "weekday", "weekend"
    ],
    requiredKeywords: ["early", "morning", "crowds"],
    forbiddenKeywords: ["waterpark", "pool", "gym"],
    minimumMatchScore: 50,
    category: "disney_timing"
  },
  
  magic_kingdom: {
    name: "Magic Kingdom Timing",
    message: "When should we go to Magic Kingdom?",
    icon: "🏰",
    expectedKeywords: [
      "Magic Kingdom", "rope drop", "early", "crowds", "weekday",
      "opening time", "arrive", "park hours"
    ],
    requiredKeywords: ["Magic Kingdom"],
    forbiddenKeywords: ["Epcot", "Hollywood Studios", "Animal Kingdom"],
    minimumMatchScore: 45,
    category: "disney_timing"
  },
  
  resort_gym: {
    name: "Resort Gym",
    message: "Does the resort have a gym?",
    icon: "💪",
    expectedKeywords: [
      "gym", "fitness", "exercise", "workout", "equipment",
      "Seven Eagles", "cardio", "weights"
    ],
    requiredKeywords: ["gym", "fitness"],
    forbiddenKeywords: ["waterpark", "pool hours", "air conditioning"],
    minimumMatchScore: 40,
    category: "resort_amenities"
  },
  
  ac_test: {
    name: "Air Conditioning",
    message: "Does the property have AC?",
    icon: "❄️",
    expectedKeywords: [
      "air conditioning", "ac", "cooling", "climate control",
      "temperature", "thermostat"
    ],
    requiredKeywords: ["air conditioning", "ac", "cooling"],
    forbiddenKeywords: ["waterpark", "access code", "access instructions"],
    minimumMatchScore: 50,
    category: "property_amenities"
  },
  
  parking_universal: {
    name: "Universal Parking",
    message: "Is there parking at Universal?",
    icon: "🚗",
    expectedKeywords: [
      "parking", "Universal", "garage", "lot", "cost", "fee",
      "preferred parking", "valet", "rideshare", "Uber"
    ],
    requiredKeywords: ["parking", "Universal"],
    forbiddenKeywords: ["waterpark", "Magic Kingdom", "Disney"],
    minimumMatchScore: 40,
    category: "transportation"
  }
};
