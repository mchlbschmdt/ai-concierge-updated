
import { doc, updateDoc, collection, getDocs, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export async function fetchProperties() {
  // For demo purposes, use mock data
  const mockProperties = [
    {
      id: "prop1",
      property_name: "Beachside Villa",
      address: "123 Oceanview Dr, Malibu, CA",
      code: "BSVILLA1",
      check_in_time: "3:00 PM",
      check_out_time: "11:00 AM",
      local_recommendations: "Visit the nearby Santa Monica Pier and enjoy local seafood restaurants along the boardwalk.",
      knowledge_base: "This beautiful beachside villa features 4 bedrooms and 3.5 bathrooms. The property has direct beach access and includes a private pool and hot tub. Parking available for up to 3 cars.\n\nWiFi password: BeachLife2023\nPool heating instructions: Control panel located in the garage.",
      files: [
        {
          name: "house_manual.pdf",
          type: "application/pdf",
          size: 1250000,
          uploaded_at: { seconds: Date.now() / 1000 },
          url: "#",
          path: "properties/prop1/knowledge_base/house_manual.pdf"
        }
      ],
      messages: []
    },
    {
      id: "prop2",
      property_name: "Downtown Loft",
      address: "456 Main St, San Francisco, CA",
      code: "DTLOFT2",
      check_in_time: "4:00 PM",
      check_out_time: "10:00 AM",
      local_recommendations: "Check out the Ferry Building Marketplace for local food and the SFMOMA which is just a 10-minute walk away.",
      knowledge_base: "Modern downtown loft with 2 bedrooms and 2 bathrooms. Building amenities include gym access and rooftop lounge.\n\nWiFi password: UrbanLoft88\nGarage entry code: 3344#\n\nNoise policy: Quiet hours from 10PM to 8AM",
      files: [],
      messages: []
    }
  ];
  
  return mockProperties;
}

export async function updateProperty(propertyId, propertyData) {
  try {
    // In a real app, this would update Firestore
    // For demo purposes, we'll simulate an API call
    console.log(`Updating property ${propertyId} with data:`, propertyData);
    
    // Simulated success response after 500ms
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return { success: true, message: "Property updated successfully" };
  } catch (error) {
    console.error("Error updating property:", error);
    throw new Error("Failed to update property");
  }
}
