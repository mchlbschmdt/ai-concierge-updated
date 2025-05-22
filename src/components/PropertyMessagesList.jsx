
import React from 'react';
import PropertyMessagesItem from './PropertyMessagesItem';

export default function PropertyMessagesList({ messages = [] }) {
  if (!messages || messages.length === 0) {
    return <p className="text-sm text-gray-500 italic">No messages imported yet.</p>;
  }

  return (
    <div className="space-y-2 max-h-80 overflow-y-auto">
      {messages.map((message, index) => (
        <PropertyMessagesItem key={index} message={message} />
      ))}
    </div>
  );
}
