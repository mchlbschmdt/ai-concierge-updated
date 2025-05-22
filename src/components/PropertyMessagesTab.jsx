
import React from 'react';
import PropertyMessagesList from './PropertyMessagesList';
import AirbnbMessageParser from './AirbnbMessageParser';

export default function PropertyMessagesTab({ property, onMessagesAdded }) {
  return (
    <div className="space-y-4">
      <AirbnbMessageParser 
        propertyId={property.id}
        onMessagesAdded={(messages) => onMessagesAdded(property.id, messages)}
      />
      
      <div>
        <h3 className="font-medium mb-2">Message History</h3>
        <PropertyMessagesList messages={property.messages} />
      </div>
    </div>
  );
}
