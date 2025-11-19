import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ConversationFilters({ filters, onFiltersChange }) {
  const [properties, setProperties] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    const { data, error } = await supabase
      .from("properties")
      .select("id, property_name, code")
      .order("property_name");

    if (!error && data) {
      setProperties(data);
    }
  };

  return (
    <div className="flex gap-2 items-center">
      <Button
        variant="outline"
        onClick={() => setShowFilters(!showFilters)}
        className="whitespace-nowrap"
      >
        <Filter className="mr-2 h-4 w-4" />
        {showFilters ? "Hide" : "Show"} Filters
      </Button>

      {showFilters && (
        <>
          <Select
            value={filters.dateRange}
            onValueChange={(value) =>
              onFiltersChange({ ...filters, dateRange: value })
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.propertyId || "all"}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                propertyId: value === "all" ? null : value,
              })
            }
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All properties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All properties</SelectItem>
              {properties.map((property) => (
                <SelectItem key={property.id} value={property.code}>
                  {property.property_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(filters.propertyId || filters.dateRange !== "7days") && (
            <Button
              variant="ghost"
              onClick={() =>
                onFiltersChange({
                  dateRange: "7days",
                  propertyId: null,
                  states: [],
                  intentTypes: [],
                })
              }
            >
              Clear
            </Button>
          )}
        </>
      )}
    </div>
  );
}
