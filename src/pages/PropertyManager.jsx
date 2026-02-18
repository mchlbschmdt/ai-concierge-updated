
import React, { useState } from 'react';
import { Link, useParams } from "react-router-dom";
import { Plus, Upload, ArrowLeft } from "lucide-react";
import Layout from '../components/Layout';
import PropertyCard from '../components/PropertyCard';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyProperties from '../components/EmptyProperties';
import ServiceFeeBulkImport from '../components/ServiceFeeBulkImport';
import { useProperties } from '../hooks/useProperties';
import { Button } from '../components/ui/button';

export default function PropertyManager() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('properties');
  const {
    properties,
    loading,
    error,
    handlePropertyUpdate,
    handlePropertyDelete,
    handleFileAdded,
    handleFileDeleted,
    handleMessagesAdded,
    refreshProperties
  } = useProperties();

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-primary">Manage Properties</h1>
          </div>
          <LoadingSpinner />
          <div className="mt-4 text-center text-sm text-gray-500">
            If this takes too long, try refreshing the page
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="container mx-auto p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-primary">Manage Properties</h1>
            <Link 
              to="/dashboard/add-property" 
              className="flex items-center justify-center gap-2 bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition w-full sm:w-auto"
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
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-4 sm:p-6">
        {id && (
          <Link to="/properties" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft size={16} /> Back to Properties
          </Link>
        )}

        {(() => {
          const displayProperties = id ? properties.filter(p => p.id === id) : properties;
          const singleProperty = id && displayProperties.length === 1 ? displayProperties[0] : null;

          return (
            <>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                <h1 className="text-xl sm:text-2xl font-bold text-primary">
                  {singleProperty ? singleProperty.property_name : `Manage Properties (${properties.length})`}
                </h1>
                {!id && (
                  <Link 
                    to="/dashboard/add-property" 
                    className="flex items-center justify-center gap-2 bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition w-full sm:w-auto"
                  >
                    <Plus size={18} /> Add New Property
                  </Link>
                )}
              </div>

              {!id && (
                <div className="mb-6 border-b overflow-x-auto">
                  <div className="flex gap-4 min-w-max">
                    <button
                      onClick={() => setActiveTab('properties')}
                      className={`px-4 py-2 font-medium transition-colors ${
                        activeTab === 'properties'
                          ? 'text-primary border-b-2 border-primary'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Properties
                    </button>
                    <button
                      onClick={() => setActiveTab('bulk-import')}
                      className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
                        activeTab === 'bulk-import'
                          ? 'text-primary border-b-2 border-primary'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Upload size={16} />
                      Bulk Import Service Fees
                    </button>
                  </div>
                </div>
              )}

              {(id || activeTab === 'properties') && (
                <>
                  {displayProperties.length === 0 ? (
                    id ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Property not found. <Link to="/properties" className="text-primary hover:underline">Return to properties</Link>
                      </div>
                    ) : (
                      <EmptyProperties />
                    )
                  ) : (
                    <div className="space-y-4">
                      {displayProperties.map((property) => (
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
                </>
              )}

              {!id && activeTab === 'bulk-import' && (
                <ServiceFeeBulkImport onImportComplete={() => refreshProperties()} />
              )}
            </>
          );
        })()}
      </div>
    </Layout>
  );
}
