import React from "react";

export const Textarea = ({ value, onChange, placeholder }) => {
  return (
    <textarea
      className="w-full p-2 border border-gray-300 rounded-md"
      rows="4"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  );
};

