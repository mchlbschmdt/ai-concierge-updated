
import { doc, updateDoc, collection, getDocs, getDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { ref, deleteObject, listAll, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';

export async function fetchProperties() {
  try {
    console.log("Fetching properties from Firestore");
    
    // Create a promise that resolves with mock data after a short delay
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockProperties = [
          {
            id: 'prop1',
            property_name: 'Sunset Beach Villa',
            code: 'SBV001',
            address: '123 Oceanfront Drive, Malibu, CA',
            check_in_time: '3 PM',
            check_out_time: '11 AM',
            knowledge_base: 'Beach access code: 1234. Pool heating instructions in kitchen drawer.',
            local_recommendations: 'Try the seafood at Ocean Breeze Restaurant nearby!',
            files: [
              { 
                name: 'House Rules.pdf', 
                path: 'properties/prop1/knowledge_base/house_rules.pdf', 
                type: 'pdf', 
                size: '1.2 MB', 
                uploaded_at: new Date(),
                url: 'https://example.com/files/house_rules.pdf'
              }
            ]
          },
          {
            id: 'prop2',
            property_name: 'Mountain Retreat Cabin',
            code: 'MRC002',
            address: '456 Alpine Way, Aspen, CO',
            check_in_time: '4 PM',
            check_out_time: '10 AM',
            knowledge_base: 'Fireplace instructions on the mantel. Hiking maps in side table.',
            local_recommendations: 'Visit the Alpine Brewery for local craft beers!',
            files: []
          },
          {
            id: 'prop3',
            property_name: 'Downtown Loft',
            code: 'DTL003',
            address: '789 Urban Street, New York, NY',
            check_in_time: '2 PM',
            check_out_time: '12 PM',
            knowledge_base: 'WiFi password: DowntownLoft2023. Noise restrictions after 10 PM.',
            local_recommendations: 'Check out Jazz Club on 5th Ave!',
            files: [
              { 
                name: 'Welcome Guide.pdf', 
                path: 'properties/prop3/knowledge_base/welcome_guide.pdf', 
                type: 'pdf', 
                size: '2.4 MB', 
                uploaded_at: new Date(),
                url: 'https://example.com/files/welcome_guide.pdf'
              },
              { 
                name: 'Local Attractions.docx', 
                path: 'properties/prop3/knowledge_base/attractions.docx', 
                type: 'docx', 
                size: '1.8 MB', 
                uploaded_at: new Date(),
                url: 'https://example.com/files/attractions.docx'
              }
            ]
          }
        ];
        console.log("Returning mock properties:", mockProperties);
        resolve(mockProperties);
      }, 500);
    });
  } catch (error) {
    console.error("Error fetching properties:", error);
    throw new Error("Failed to fetch properties");
  }
}

export async function updateProperty(propertyId, propertyData) {
  try {
    console.log(`Updating property ${propertyId} with data:`, propertyData);
    
    // Mock successful update
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, message: "Property updated successfully" });
      }, 500);
    });
  } catch (error) {
    console.error("Error updating property:", error);
    throw new Error("Failed to update property");
  }
}

export async function deleteProperty(propertyId) {
  try {
    console.log(`Deleting property ${propertyId}`);
    
    // Mock successful deletion
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, message: "Property deleted successfully" });
      }, 500);
    });
  } catch (error) {
    console.error("Error deleting property:", error);
    throw new Error("Failed to delete property");
  }
}

export async function addProperty(propertyData) {
  try {
    console.log(`Adding new property with data:`, propertyData);
    
    // Generate a unique ID for the new property
    const propertyId = 'prop' + Date.now();
    
    // Add created_at timestamp
    const newProperty = {
      ...propertyData,
      id: propertyId,
      created_at: new Date(),
      files: propertyData.files || []
    };
    
    // Mock successful addition
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ 
          success: true, 
          message: "Property added successfully",
          propertyId: propertyId,
          property: newProperty
        });
      }, 500);
    });
  } catch (error) {
    console.error("Error adding property:", error);
    throw new Error("Failed to add property");
  }
}

export async function uploadFile(propertyId, file) {
  try {
    console.log(`Uploading file for property ${propertyId}:`, file.name);
    
    // Simulate file upload with delay
    return new Promise((resolve) => {
      setTimeout(() => {
        // Create mock file data
        const fileData = {
          name: file.name,
          path: `properties/${propertyId}/knowledge_base/${file.name.replace(/\s/g, '_')}`,
          type: file.type.split('/')[1] || 'unknown',
          size: `${(file.size / 1024).toFixed(2)} KB`,
          uploaded_at: new Date(),
          url: URL.createObjectURL(file) // Note: This URL will be revoked when page refreshes
        };
        
        resolve({
          success: true,
          message: "File uploaded successfully",
          file: fileData
        });
      }, 1000);
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    throw new Error("Failed to upload file");
  }
}

export async function deleteFile(propertyId, filePath) {
  try {
    console.log(`Deleting file from property ${propertyId}:`, filePath);
    
    // Mock successful deletion
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          message: "File deleted successfully"
        });
      }, 500);
    });
  } catch (error) {
    console.error("Error deleting file:", error);
    throw new Error("Failed to delete file");
  }
}
