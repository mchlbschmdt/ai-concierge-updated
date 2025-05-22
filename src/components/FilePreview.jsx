
import React from 'react';
import { File, X } from "lucide-react";

export default function FilePreview({ file, filePreview, onClear }) {
  if (!filePreview) return null;
  
  return (
    <div className="mb-4 p-3 bg-white border rounded-md relative">
      <button 
        onClick={onClear}
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
  );
}
