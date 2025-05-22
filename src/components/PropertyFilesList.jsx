
import React from 'react';
import { FileText } from 'lucide-react';

export default function PropertyFilesList({ files = [] }) {
  if (!files || files.length === 0) {
    return <p className="text-sm text-gray-500 italic">No files uploaded yet.</p>;
  }

  return (
    <div className="space-y-2">
      {files.map((file, index) => (
        <div key={index} className="border p-2 rounded flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-primary" />
            <span className="text-sm">{file.name}</span>
          </div>
          <div className="text-xs text-gray-500">
            {new Date(file.uploaded_at?.seconds * 1000 || Date.now()).toLocaleDateString()}
          </div>
        </div>
      ))}
    </div>
  );
}
