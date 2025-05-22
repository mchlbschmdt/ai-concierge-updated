
import React from 'react';

export default function UploadProgress({ progress }) {
  if (progress <= 0) return null;
  
  return (
    <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
      <div 
        className="bg-primary h-2 rounded-full transition-all duration-300"
        style={{ width: `${progress}%` }}
      ></div>
    </div>
  );
}
