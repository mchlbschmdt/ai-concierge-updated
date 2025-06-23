
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import Layout from "../components/Layout";
import PropertyGrid from "../components/properties/PropertyGrid";
import PropertyLoadingState from "../components/properties/PropertyLoadingState";
import PropertyEmptyState from "../components/properties/PropertyEmptyState";
import PropertyErrorState from "../components/properties/PropertyErrorState";
import PropertySearch from "../components/properties/PropertySearch";
import { useProperties } from '../hooks/useProperties';

export default function Properties() {
  const { properties, loading, error } = useProperties();
  const [search, setSearch] = useState("");

  // Filter properties based on search
  const filteredProperties = properties.filter(property =>
    property.property_name?.toLowerCase().includes(search.toLowerCase()) ||
    property.address?.toLowerCase().includes(search.toLowerCase()) ||
    property.code?.toLowerCase().includes(search.toLowerCase())
  );

  // Generate search suggestions
  const suggestions = search
    ? properties
        .filter(p => 
          p.property_name?.toLowerCase().includes(search.toLowerCase()) ||
          p.address?.toLowerCase().includes(search.toLowerCase())
        )
        .slice(0, 5)
        .map(p => p.property_name)
    : [];

  const handleSuggestionSelect = (suggestion) => {
    setSearch(suggestion);
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto p-4">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-primary">Properties</h1>
            <Link 
              to="/dashboard/add-property" 
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition"
            >
              <Plus size={18} /> Add Property
            </Link>
          </div>
          <PropertyLoadingState />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="container mx-auto p-4">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-primary">Properties</h1>
            <Link 
              to="/dashboard/add-property" 
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition"
            >
              <Plus size={18} /> Add Property
            </Link>
          </div>
          <PropertyErrorState error={error} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-primary">Properties ({properties.length})</h1>
          <Link 
            to="/dashboard/add-property" 
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition"
          >
            <Plus size={18} /> Add Property
          </Link>
        </div>

        {properties.length > 0 && (
          <div className="mb-6">
            <PropertySearch 
              search={search}
              setSearch={setSearch}
              suggestions={suggestions}
              handleSuggestionSelect={handleSuggestionSelect}
            />
          </div>
        )}

        {properties.length === 0 ? (
          <PropertyEmptyState isSearchResults={false} />
        ) : filteredProperties.length === 0 ? (
          <PropertyEmptyState isSearchResults={true} />
        ) : (
          <PropertyGrid properties={filteredProperties} />
        )}
      </div>
    </Layout>
  );
}
