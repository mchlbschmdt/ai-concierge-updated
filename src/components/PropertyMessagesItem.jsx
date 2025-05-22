
import React from 'react';

export default function PropertyMessagesItem({ message }) {
  return (
    <div className="border p-3 rounded bg-white">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium">
            {message.sender} → {message.receiver}
          </p>
          <p className="text-xs text-gray-500">
            {new Date(message.timestamp?.seconds * 1000 || Date.parse(message.timestamp) || Date.now()).toLocaleString()}
          </p>
        </div>
        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
          {message.source || "airbnb"}
        </span>
      </div>
      <p className="mt-1 text-sm whitespace-pre-line">
        {message.content}
      </p>
    </div>
  );
}
