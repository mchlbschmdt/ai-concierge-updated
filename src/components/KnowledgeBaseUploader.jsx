
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Upload } from "lucide-react";
import FilePreview from './FilePreview';
import UploadProgress from './UploadProgress';
import { uploadFileToProperty } from '../services/fileUploadService';

const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/csv',
  'application/json',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

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
    if (!propertyId) {
      toast({
        title: "Error",
        description: "Property ID is required for file upload",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setLoading(true);
      
      const fileData = await uploadFileToProperty(file, propertyId, setUploadProgress);
      
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
      
      <FilePreview 
        file={file}
        filePreview={filePreview}
        onClear={handleClearFile}
      />
      
      <UploadProgress progress={uploadProgress} />
      
      <Button 
        onClick={handleUpload} 
        disabled={!file || loading || !propertyId}
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
