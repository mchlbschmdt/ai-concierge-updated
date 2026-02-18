import { supabase } from '../integrations/supabase/client';

const FILE_EXTENSIONS = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'text/plain': '.txt',
  'text/csv': '.csv',
  'application/json': '.json',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
};

export async function uploadFileToProperty(file, propertyId, onProgressUpdate) {
  // Check for required inputs
  if (!file || !propertyId) {
    console.error("Missing file or propertyId:", { file, propertyId });
    throw new Error("File or property ID missing.");
  }
  
  // Update progress
  if (onProgressUpdate) onProgressUpdate(10);
  console.log("Starting upload process for property:", propertyId);
  
  try {
    // Check if property exists
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id')
      .eq('id', propertyId)
      .single();
    
    if (propertyError || !property) {
      console.error("Property not found:", propertyId);
      throw new Error("Property not found.");
    }
    
    if (onProgressUpdate) onProgressUpdate(20);
    
    // Create file path for Supabase Storage
    const fileExtension = FILE_EXTENSIONS[file.type] || '';
    const timestamp = Date.now();
    const storagePath = `properties/${propertyId}/knowledge_base/${timestamp}_${file.name}`;
    
    console.log("Uploading file to path:", storagePath);
    
    if (onProgressUpdate) onProgressUpdate(40);
    
    // Re-wrap unsupported MIME types as text/plain for storage
    let uploadFile = file;
    const unsupportedTypes = [
      'application/json',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    if (unsupportedTypes.includes(file.type)) {
      uploadFile = new File([file], file.name, { type: 'text/plain' });
    }

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('property-files')
      .upload(storagePath, uploadFile);
    
    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw uploadError;
    }
    
    console.log("File uploaded successfully:", uploadData);
    
    if (onProgressUpdate) onProgressUpdate(70);
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('property-files')
      .getPublicUrl(storagePath);
    
    console.log("File public URL:", publicUrl);
    
    if (onProgressUpdate) onProgressUpdate(90);
    
    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    
    // Create file record in database
    const fileData = {
      user_id: user.id,
      original_name: file.name,
      file_type: file.type,
      file_size: file.size,
      storage_path: storagePath,
      metadata: {
        property_id: propertyId,
        url: publicUrl
      }
    };
    
    const { error: insertError } = await supabase
      .from('file_uploads')
      .insert(fileData);
    
    if (insertError) {
      console.error("Error saving file metadata:", insertError);
      throw insertError;
    }
    
    console.log("File metadata saved to database");
    if (onProgressUpdate) onProgressUpdate(100);
    
    return fileData;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
}

export async function deleteFileFromProperty(propertyId, filePath) {
  if (!propertyId || !filePath) {
    throw new Error("Property ID and file path are required");
  }
  
  console.log("Deleting file:", filePath, "from property:", propertyId);
  
  try {
    // Delete the file from storage
    const { error: deleteError } = await supabase.storage
      .from('property-files')
      .remove([filePath]);
    
    if (deleteError) {
      console.error("Error deleting from storage:", deleteError);
      throw deleteError;
    }
    
    console.log("File deleted from storage");
    
    // Remove the file record from database
    const { data: { user } } = await supabase.auth.getUser();
    const { error: dbDeleteError } = await supabase
      .from('file_uploads')
      .delete()
      .eq('storage_path', filePath)
      .eq('user_id', user.id);
    
    if (dbDeleteError) {
      console.error("Error deleting file record:", dbDeleteError);
      throw dbDeleteError;
    }
    
    console.log("File metadata removed from database");
    return { success: true };
  } catch (error) {
    console.error("Error deleting file:", error);
    throw error;
  }
}