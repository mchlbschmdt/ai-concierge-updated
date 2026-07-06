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


const STATE_OPTIONS = [
  { value: "confirmed", label: "Confirmed" },
  { value: "awaiting_property_id", label: "Awaiting Property ID" },
  { value: "awaiting_confirmation", label: "Awaiting Confirmation" },
];

const REVIEW_OPTIONS = [
  { value: "all", label: "All conversations" },
  { value: "needs_review", label: "Needs review only" },
  { value: "stale", label: "Stale (awaiting > 10m)" },
];

export default function ConversationFilters({ filters, onFiltersChange }) {
  const [properties, setProperties] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, property_name, code")
        .order("property_name");
      if (!error && data) setProperties(data);
    })();
  }, []);

  const toggleState = (value) => {
    const next = filters.states.includes(value)
      ? filters.states.filter((s) => s !== value)
      : [...filters.states, value];
    onFiltersChange({ ...filters, states: next });
  };

  const isDirty =
    filters.propertyId ||
    filters.dateRange !== "7days" ||
    filters.states.length > 0 ||
    (filters.reviewFilter && filters.reviewFilter !== "all");

  return (
    <div className="flex flex-wrap gap-2 items-center">
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
            onValueChange={(value) => onFiltersChange({ ...filters, dateRange: value })}
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
              onFiltersChange({ ...filters, propertyId: value === "all" ? null : value })
            }
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All properties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All properties</SelectItem>
              {properties.map((p) => (
                <SelectItem key={p.id} value={p.code}>
                  {p.property_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.reviewFilter || "all"}
            onValueChange={(value) => onFiltersChange({ ...filters, reviewFilter: value })}
          >
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Review status" />
            </SelectTrigger>
            <SelectContent>
              {REVIEW_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-3 border border-border rounded-md px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground">State:</span>
            {STATE_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.states.includes(opt.value)}
                  onChange={() => toggleState(opt.value)}
                  className="h-3.5 w-3.5 rounded border-border accent-primary"
                />
                {opt.label}
              </label>
            ))}
          </div>

          {isDirty && (
            <Button
              variant="ghost"
              onClick={() =>
                onFiltersChange({
                  dateRange: "7days",
                  propertyId: null,
                  states: [],
                  intentTypes: [],
                  reviewFilter: "all",
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
