import React, { useState } from 'react';
import { Search, SlidersHorizontal, MapPin, Home, DollarSign, Star } from 'lucide-react';
import MobileDrawer from '../MobileDrawer';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

export default function PropertySearchDrawer({ onSearch, onFilterChange }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    location: '',
    propertyType: '',
    minPrice: '',
    maxPrice: '',
    amenities: [],
    sortBy: 'name'
  });

  const propertyTypes = ['House', 'Apartment', 'Condo', 'Villa', 'Townhouse'];
  const amenitiesList = ['WiFi', 'Pool', 'Parking', 'Pet Friendly', 'Kitchen', 'Washer/Dryer', 'AC', 'Gym'];
  const sortOptions = [
    { value: 'name', label: 'Name (A-Z)' },
    { value: 'newest', label: 'Newest First' },
    { value: 'price-low', label: 'Price: Low to High' },
    { value: 'price-high', label: 'Price: High to Low' }
  ];

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange?.(newFilters);
  };

  const toggleAmenity = (amenity) => {
    const newAmenities = filters.amenities.includes(amenity)
      ? filters.amenities.filter(a => a !== amenity)
      : [...filters.amenities, amenity];
    handleFilterChange('amenities', newAmenities);
  };

  const resetFilters = () => {
    const defaultFilters = {
      location: '',
      propertyType: '',
      minPrice: '',
      maxPrice: '',
      amenities: [],
      sortBy: 'name'
    };
    setFilters(defaultFilters);
    onFilterChange?.(defaultFilters);
  };

  const activeFilterCount = 
    (filters.location ? 1 : 0) +
    (filters.propertyType ? 1 : 0) +
    (filters.minPrice || filters.maxPrice ? 1 : 0) +
    filters.amenities.length;

  return (
    <>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type="text"
            placeholder="Search properties..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              onSearch?.(e.target.value);
            }}
            className="pl-10"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        </div>
        
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="relative flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg hover:bg-muted transition"
        >
          <SlidersHorizontal size={18} className="text-muted-foreground" />
          <span className="hidden sm:inline text-sm font-medium text-foreground">Filters</span>
          {activeFilterCount > 0 && (
            <span className="absolute -top-2 -right-2 flex items-center justify-center w-5 h-5 text-xs font-bold text-primary-foreground bg-primary rounded-full">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      <MobileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Filter Properties"
      >
        <div className="space-y-6">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
              <MapPin size={16} />
              Location
            </label>
            <Input
              type="text"
              placeholder="City, state, or address"
              value={filters.location}
              onChange={(e) => handleFilterChange('location', e.target.value)}
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
              <Home size={16} />
              Property Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {propertyTypes.map(type => (
                <button
                  key={type}
                  onClick={() => handleFilterChange('propertyType', type === filters.propertyType ? '' : type)}
                  className={`px-4 py-2 rounded-lg border transition ${
                    filters.propertyType === type
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-foreground border-border hover:border-primary'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
              <DollarSign size={16} />
              Price Range
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder="Min"
                value={filters.minPrice}
                onChange={(e) => handleFilterChange('minPrice', e.target.value)}
              />
              <Input
                type="number"
                placeholder="Max"
                value={filters.maxPrice}
                onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
              <Star size={16} />
              Amenities
            </label>
            <div className="flex flex-wrap gap-2">
              {amenitiesList.map(amenity => (
                <button
                  key={amenity}
                  onClick={() => toggleAmenity(amenity)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition ${
                    filters.amenities.includes(amenity)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card text-foreground border-border hover:border-primary'
                  }`}
                >
                  {amenity}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Sort By
            </label>
            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={resetFilters}
              className="flex-1"
            >
              Reset
            </Button>
            <Button
              onClick={() => setIsDrawerOpen(false)}
              className="flex-1"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </MobileDrawer>
    </>
  );
}
