
import React from 'react';

export default function PropertyDetails({ property }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium mb-2">Check-in / Check-out</h3>
        <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-2 rounded">
          <div>
            <span className="text-gray-500">Check-in:</span> {property.check_in_time}
          </div>
          <div>
            <span className="text-gray-500">Check-out:</span> {property.check_out_time}
          </div>
        </div>
      </div>
      
      {property.local_recommendations && (
        <div>
          <h3 className="font-medium mb-2">Local Recommendations</h3>
          <div className="text-sm bg-gray-50 p-2 rounded">
            {property.local_recommendations}
          </div>
        </div>
      )}
      
      <div>
        <h3 className="font-medium mb-2">Knowledge Base</h3>
        <div className="overflow-auto bg-gray-100 p-3 rounded border mt-1 max-h-64 text-sm whitespace-pre-line">
          {property.knowledge_base || "No knowledge base information available."}
        </div>
      </div>
    </div>
  );
}
