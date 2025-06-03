
import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import FilePreview from '../FilePreview';

export default function FileUploadSection({ onFileChange, uploadProgress }) {
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    
    if (!selectedFile) {
      setFile(null);
      setFilePreview(null);
      onFileChange(null);
      return;
    }
    
    setFile(selectedFile);
    onFileChange(selectedFile);
    
    if (selectedFile.type === "application/json" || 
        selectedFile.type === "text/plain" || 
        selectedFile.type === "text/csv") {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target.result;
          setFilePreview({
            type: selectedFile.type,
            content: content.slice(0, 500) + (content.length > 500 ? '...' : '')
          });
        } catch (error) {
          console.error("Error reading file:", error);
          setFilePreview(null);
        }
      };
      reader.readAsText(selectedFile);
    } else {
      setFilePreview({
        type: selectedFile.type,
        name: selectedFile.name,
        size: (selectedFile.size / 1024).toFixed(2) + " KB"
      });
    }
  };

  const handleClearFile = () => {
    setFile(null);
    setFilePreview(null);
    onFileChange(null);
  };

  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <h2 className="text-lg font-semibold mb-4">Attach Files (optional)</h2>
      <Input
        id="file_upload"
        type="file"
        onChange={handleFileChange}
        className="mb-2"
        accept=".pdf,.docx,.txt,.csv,.xlsx,.json,.jpg,.jpeg,.png"
      />
      
      {file && (
        <div className="mt-2">
          <FilePreview 
            file={file}
            filePreview={filePreview}
            onClear={handleClearFile}
          />
          
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
              <div 
                className="bg-primary h-2.5 rounded-full transition-all duration-300" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
