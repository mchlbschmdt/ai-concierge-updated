
import React, { useState } from 'react';
import { FileText, Trash2 } from 'lucide-react';
import { deleteFileFromProperty } from '../services/fileUploadService';
import { useToast } from "@/components/ui/use-toast";

export default function PropertyFilesList({ files = [], propertyId, onFileDeleted }) {
  const { toast } = useToast();
  const [deletingFile, setDeletingFile] = useState(null);
  
  if (!files || files.length === 0) {
    return <p className="text-sm text-gray-500 italic">No files uploaded yet.</p>;
  }

  const handleDeleteFile = async (file) => {
    if (!window.confirm(`Are you sure you want to delete ${file.name}?`)) {
      return;
    }
    
    try {
      setDeletingFile(file.path);
      await deleteFileFromProperty(propertyId, file.path);
      
      toast({
        title: "Success",
        description: "File deleted successfully"
      });
      
      if (onFileDeleted) {
        onFileDeleted(file.path);
      }
    } catch (error) {
      console.error("Error deleting file:", error);
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive"
      });
    } finally {
      setDeletingFile(null);
    }
  };

  return (
    <div className="space-y-2">
      {files.map((file, index) => (
        <div key={index} className="border p-2 rounded flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-primary" />
            <span className="text-sm">{file.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-gray-500">
              {new Date(file.uploaded_at?.seconds * 1000 || Date.now()).toLocaleDateString()}
            </div>
            <button
              onClick={() => handleDeleteFile(file)}
              disabled={deletingFile === file.path}
              className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-gray-100"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
