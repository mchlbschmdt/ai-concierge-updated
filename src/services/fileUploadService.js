
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { db, storage } from '../firebase';
import { FILE_EXTENSIONS } from '../utils/fileConstants';

export async function uploadFileToProperty(file, propertyId, onProgressUpdate) {
  // Check for required inputs
  if (!file || !propertyId) {
    console.error("Missing file or propertyId:", { file, propertyId });
    throw new Error("File or property ID missing.");
  }
  
  // Update progress
  onProgressUpdate(10);
  console.log("Starting upload process for property:", propertyId);
  
  // Reference to property
  const propertyDocRef = doc(db, "properties", propertyId);
  const propertyDoc = await getDoc(propertyDocRef);
  
  if (!propertyDoc.exists()) {
    console.error("Property not found:", propertyId);
    throw new Error("Property not found.");
  }
  
  onProgressUpdate(20);
  
  // Create a reference to the file location in Firebase Storage
  const fileExtension = FILE_EXTENSIONS[file.type] || '';
  const timestamp = Date.now();
  const storagePath = `properties/${propertyId}/knowledge_base/${timestamp}_${file.name}`;
  const storageRef = ref(storage, storagePath);
  
  console.log("Uploading file to path:", storagePath);
  
  onProgressUpdate(40);
  
  // Upload file
  const uploadResult = await uploadBytes(storageRef, file);
  console.log("File uploaded successfully:", uploadResult);
  
  onProgressUpdate(70);
  
  // Get download URL
  const downloadURL = await getDownloadURL(storageRef);
  console.log("File download URL:", downloadURL);
  
  onProgressUpdate(90);
  
  // Add file metadata to property document
  const fileData = {
    name: file.name,
    type: file.type,
    size: file.size,
    uploaded_at: new Date(),
    url: downloadURL,
    path: storagePath
  };
  
  await updateDoc(propertyDocRef, {
    files: arrayUnion(fileData)
  });
  
  console.log("File metadata added to property document");
  onProgressUpdate(100);
  
  return fileData;
}

export async function deleteFileFromProperty(propertyId, filePath) {
  if (!propertyId || !filePath) {
    throw new Error("Property ID and file path are required");
  }
  
  console.log("Deleting file:", filePath, "from property:", propertyId);
  
  // Create a reference to the file in storage
  const storageRef = ref(storage, filePath);
  
  try {
    // Delete the file from storage
    await deleteObject(storageRef);
    console.log("File deleted from storage");
    
    // Get the property document to find the file data
    const propertyDocRef = doc(db, "properties", propertyId);
    const propertyDoc = await getDoc(propertyDocRef);
    
    if (!propertyDoc.exists()) {
      throw new Error("Property not found");
    }
    
    // Find the file data in the property document
    const propertyData = propertyDoc.data();
    const fileData = (propertyData.files || []).find(f => f.path === filePath);
    
    if (!fileData) {
      console.warn("File data not found in property document");
      return;
    }
    
    // Remove the file data from the property document
    await updateDoc(propertyDocRef, {
      files: arrayRemove(fileData)
    });
    
    console.log("File metadata removed from property document");
  } catch (error) {
    console.error("Error deleting file:", error);
    throw error;
  }
}
