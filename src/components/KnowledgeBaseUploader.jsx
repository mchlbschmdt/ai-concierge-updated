
import React, { useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { db, storage } from '../firebase';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Upload, File, X } from "lucide-react";

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "text/plain",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/json"
];

const FILE_EXTENSIONS = {
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "text/plain": ".txt",
  "text/csv": ".csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/json": ".json"
};

export default function KnowledgeBaseUploader({ propertyId, onFileAdded }) {
  const { toast } = useToast();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    
    if (!selectedFile) {
      setFile(null);
      setFilePreview(null);
      return;
    }
    
    // Check if file type is allowed
    if (!ALLOWED_FILE_TYPES.includes(selectedFile.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a .pdf, .docx, .txt, .csv, .xlsx, or .json file.",
        variant: "destructive"
      });
      e.target.value = null;
      return;
    }
    
    setFile(selectedFile);
    
    // Create preview for text-based files
    if (selectedFile.type === "application/json" || 
        selectedFile.type === "text/plain" || 
        selectedFile.type === "text/csv") {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target.result;
          setFilePreview({
            type: selectedFile.type,
            content: content.slice(0, 500) + (content.length > 500 ? '...' : '') // Preview first 500 chars
          });
        } catch (error) {
          console.error("Error reading file:", error);
          setFilePreview(null);
        }
      };
      reader.readAsText(selectedFile);
    } else {
      // For other file types, just show the name and size
      setFilePreview({
        type: selectedFile.type,
        name: selectedFile.name,
        size: (selectedFile.size / 1024).toFixed(2) + " KB"
      });
    }
  };

  const handleUpload = async () => {
    if (!file || !propertyId) return;
    
    try {
      setLoading(true);
      setUploadProgress(10);
      
      // Reference to property
      const propertyDocRef = doc(db, "properties", propertyId);
      const propertyDoc = await getDoc(propertyDocRef);
      
      if (!propertyDoc.exists()) {
        toast({
          title: "Error",
          description: "Property not found.",
          variant: "destructive"
        });
        return;
      }
      
      setUploadProgress(20);
      
      // Create a reference to the file location in Firebase Storage
      const fileExtension = FILE_EXTENSIONS[file.type] || '';
      const timestamp = Date.now();
      const storageRef = ref(storage, `properties/${propertyId}/knowledge_base/${timestamp}_${file.name}`);
      
      setUploadProgress(40);
      
      // Upload file
      await uploadBytes(storageRef, file);
      
      setUploadProgress(70);
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      setUploadProgress(90);
      
      // Add file metadata to property document
      const fileData = {
        name: file.name,
        type: file.type,
        size: file.size,
        uploaded_at: new Date(),
        url: downloadURL,
        path: `properties/${propertyId}/knowledge_base/${timestamp}_${file.name}`
      };
      
      await updateDoc(propertyDocRef, {
        files: arrayUnion(fileData)
      });
      
      setUploadProgress(100);
      
      toast({
        title: "File Uploaded",
        description: `${file.name} has been added to the knowledge base.`
      });
      
      // Clear form and notify parent component
      setFile(null);
      setFilePreview(null);
      
      if (onFileAdded) {
        onFileAdded(fileData);
      }
      
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };
  
  const handleClearFile = () => {
    setFile(null);
    setFilePreview(null);
  };

  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <h3 className="text-lg font-medium mb-4">Upload Knowledge Base Files</h3>
      
      <div className="mb-4">
        <p className="text-sm text-gray-500 mb-2">
          Supported file types: .pdf, .docx, .txt, .csv, .xlsx, .json
        </p>
        
        <Input
          type="file"
          onChange={handleFileChange}
          accept=".pdf,.docx,.txt,.csv,.xlsx,.json"
          className="mb-2"
          disabled={loading}
        />
      </div>
      
      {filePreview && (
        <div className="mb-4 p-3 bg-white border rounded-md relative">
          <button 
            onClick={handleClearFile}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
            type="button"
          >
            <X size={16} />
          </button>
          
          <div className="flex items-start gap-3">
            <File className="text-primary" />
            
            <div className="flex-1 overflow-hidden">
              <p className="font-medium">{file?.name}</p>
              
              {filePreview.type === "application/json" && (
                <pre className="text-xs bg-gray-100 p-2 mt-2 rounded overflow-x-auto max-h-32">
                  {filePreview.content}
                </pre>
              )}
              
              {(filePreview.type === "text/plain" || filePreview.type === "text/csv") && (
                <div className="text-xs bg-gray-100 p-2 mt-2 rounded overflow-x-auto max-h-32 whitespace-pre-line">
                  {filePreview.content}
                </div>
              )}
              
              {!filePreview.content && (
                <p className="text-sm text-gray-500">
                  {filePreview.size} • {filePreview.type.split('/')[1].toUpperCase()}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      
      {uploadProgress > 0 && (
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          ></div>
        </div>
      )}
      
      <Button 
        onClick={handleUpload} 
        disabled={!file || loading}
        className="w-full"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            Upload File
          </>
        )}
      </Button>
    </div>
  );
}
