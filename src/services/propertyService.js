
import { supabase } from '../integrations/supabase/client';

export async function fetchProperties() {
  try {
    console.log("Fetching properties from Supabase");
    
    const { data: properties, error } = await supabase
      .from('properties')
      .select('*');
    
    if (error) {
      console.error("Error fetching properties from Supabase:", error);
      throw new Error(error.message);
    }
    
    console.log("Properties fetched from Supabase:", properties);
    return properties || [];
  } catch (error) {
    console.error("Exception fetching properties:", error);
    
    // For development purposes, return mock data if there's an error
    // (e.g., if the 'properties' table doesn't exist yet in Supabase)
    console.log("Returning mock properties due to error");
    return [
      {
        id: 'prop1',
        property_name: 'Sunset Beach Villa',
        code: 'SBV001',
        address: '123 Oceanfront Drive, Malibu, CA',
        check_in_time: '3 PM',
        check_out_time: '11 AM',
        knowledge_base: 'Beach access code: 1234. Pool heating instructions in kitchen drawer.',
        local_recommendations: 'Try the seafood at Ocean Breeze Restaurant nearby!',
        files: []
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
        files: []
      }
    ];
  }
}

export async function updateProperty(propertyId, propertyData) {
  try {
    console.log(`Updating property ${propertyId} with data:`, propertyData);
    
    const { error } = await supabase
      .from('properties')
      .update(propertyData)
      .eq('id', propertyId);
    
    if (error) throw new Error(error.message);
    
    return { success: true, message: "Property updated successfully" };
  } catch (error) {
    console.error("Error updating property:", error);
    throw new Error("Failed to update property");
  }
}

export async function deleteProperty(propertyId) {
  try {
    console.log(`Deleting property ${propertyId}`);
    
    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', propertyId);
    
    if (error) throw new Error(error.message);
    
    return { success: true, message: "Property deleted successfully" };
  } catch (error) {
    console.error("Error deleting property:", error);
    throw new Error("Failed to delete property");
  }
}

export async function addProperty(propertyData) {
  try {
    console.log(`Adding new property with data:`, propertyData);
    
    // Add created_at timestamp
    const newProperty = {
      ...propertyData,
      created_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('properties')
      .insert(newProperty)
      .select();
    
    if (error) throw new Error(error.message);
    
    return { 
      success: true, 
      message: "Property added successfully",
      propertyId: data?.[0]?.id,
      property: data?.[0]
    };
  } catch (error) {
    console.error("Error adding property:", error);
    throw new Error("Failed to add property");
  }
}

export async function uploadFile(propertyId, file) {
  try {
    console.log(`Uploading file for property ${propertyId}:`, file.name);
    
    const filePath = `properties/${propertyId}/knowledge_base/${file.name.replace(/\s/g, '_')}`;
    
    const { data, error } = await supabase.storage
      .from('property-files')
      .upload(filePath, file);
    
    if (error) throw new Error(error.message);
    
    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('property-files')
      .getPublicUrl(filePath);
    
    // Create file metadata
    const fileData = {
      name: file.name,
      path: filePath,
      type: file.type.split('/')[1] || 'unknown',
      size: `${(file.size / 1024).toFixed(2)} KB`,
      uploaded_at: new Date().toISOString(),
      url: urlData?.publicUrl
    };
    
    return {
      success: true,
      message: "File uploaded successfully",
      file: fileData
    };
  } catch (error) {
    console.error("Error uploading file:", error);
    throw new Error("Failed to upload file");
  }
}

export async function deleteFile(propertyId, filePath) {
  try {
    console.log(`Deleting file from property ${propertyId}:`, filePath);
    
    const { error } = await supabase.storage
      .from('property-files')
      .remove([filePath]);
    
    if (error) throw new Error(error.message);
    
    return {
      success: true,
      message: "File deleted successfully"
    };
  } catch (error) {
    console.error("Error deleting file:", error);
    throw new Error("Failed to delete file");
  }
}
