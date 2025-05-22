
import { doc, updateDoc, collection, getDocs, getDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { ref, deleteObject, listAll } from 'firebase/storage';
import { db, storage } from '../firebase';

export async function fetchProperties() {
  try {
    console.log("Fetching properties from Firestore");
    const querySnapshot = await getDocs(collection(db, "properties"));
    
    const properties = [];
    querySnapshot.forEach((doc) => {
      properties.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log("Fetched properties:", properties);
    return properties;
  } catch (error) {
    console.error("Error fetching properties:", error);
    throw new Error("Failed to fetch properties");
  }
}

export async function updateProperty(propertyId, propertyData) {
  try {
    console.log(`Updating property ${propertyId} with data:`, propertyData);
    
    const propertyRef = doc(db, "properties", propertyId);
    await updateDoc(propertyRef, propertyData);
    
    return { success: true, message: "Property updated successfully" };
  } catch (error) {
    console.error("Error updating property:", error);
    throw new Error("Failed to update property");
  }
}

export async function deleteProperty(propertyId) {
  try {
    console.log(`Deleting property ${propertyId}`);
    
    // Delete all files associated with the property from storage
    const filesRef = ref(storage, `properties/${propertyId}`);
    
    try {
      const filesList = await listAll(filesRef);
      
      // Delete each file
      const deletePromises = filesList.items.map(fileRef => 
        deleteObject(fileRef).catch(err => console.warn(`Error deleting file ${fileRef.name}:`, err))
      );
      
      // Wait for all file deletions to complete
      await Promise.all(deletePromises);
      console.log(`All files for property ${propertyId} deleted`);
    } catch (error) {
      console.warn(`No files found for property ${propertyId} or error:`, error);
      // Continue with property deletion even if files deletion fails
    }
    
    // Delete the property document
    const propertyRef = doc(db, "properties", propertyId);
    await deleteDoc(propertyRef);
    
    return { success: true, message: "Property deleted successfully" };
  } catch (error) {
    console.error("Error deleting property:", error);
    throw new Error("Failed to delete property");
  }
}
