
import React from 'react';
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import PropertyCard from '../components/PropertyCard';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyProperties from '../components/EmptyProperties';
import { useProperties } from '../hooks/useProperties';

export default function PropertyManager() {
  const {
    properties,
    loading,
    error,
    handlePropertyUpdate,
    handlePropertyDelete,
    handleFileAdded,
    handleFileDeleted,
    handleMessagesAdded
  } = useProperties();

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-primary">Manage Properties</h1>
        </div>
        <LoadingSpinner />
        <div className="mt-4 text-center text-sm text-gray-500">
          If this takes too long, try refreshing the page
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-primary">Manage Properties</h1>
          <Link 
            to="/dashboard/add-property" 
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition"
          >
            <Plus size={18} /> Add New Property
          </Link>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium mb-2">Error Loading Properties</h3>
          <p className="text-red-600">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 text-red-800 underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-primary">Manage Properties ({properties.length})</h1>
        <Link 
          to="/dashboard/add-property" 
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition"
        >
          <Plus size={18} /> Add New Property
        </Link>
      </div>

      {properties.length === 0 ? (
        <EmptyProperties />
      ) : (
        <div className="space-y-4">
          {properties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              onUpdate={handlePropertyUpdate}
              onDelete={handlePropertyDelete}
              onFileAdded={handleFileAdded}
              onFileDeleted={handleFileDeleted}
              onMessagesAdded={handleMessagesAdded}
            />
          ))}
        </div>
      )}
    </div>
  );
}
