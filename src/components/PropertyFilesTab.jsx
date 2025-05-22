
import React from 'react';
import PropertyFilesList from './PropertyFilesList';
import KnowledgeBaseUploader from './KnowledgeBaseUploader';

export default function PropertyFilesTab({ property, onFileAdded, onFileDeleted }) {
  return (
    <div className="space-y-4">
      <KnowledgeBaseUploader 
        propertyId={property.id}
        onFileAdded={(fileData) => onFileAdded(property.id, fileData)}
      />
      
      <div>
        <h3 className="font-medium mb-2">Uploaded Files</h3>
        <PropertyFilesList 
          files={property.files} 
          propertyId={property.id}
          onFileDeleted={(filePath) => onFileDeleted(property.id, filePath)}
        />
      </div>
    </div>
  );
}
