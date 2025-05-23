
import React from "react";
import { Search as SearchIcon } from "lucide-react";

export default function PropertySearch({ search, setSearch, suggestions, handleSuggestionSelect }) {
  return (
    <div className="relative">
      <input
        type="text"
        placeholder="Search properties..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="pl-8 pr-3 py-2 border rounded focus:outline-primary bg-white"
      />
      <SearchIcon className="absolute left-2 top-2.5 text-gray-400" size={18} />
      
      {suggestions.length > 0 && (
        <div className="absolute left-0 right-0 mt-1 bg-white border rounded shadow-lg z-10">
          {suggestions.map((suggestion, index) => (
            <div 
              key={index} 
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => handleSuggestionSelect(suggestion)}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
