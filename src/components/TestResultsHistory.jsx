import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { History, Download, TrendingUp, CheckCircle, XCircle, Search } from "lucide-react";
import { format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function TestResultsHistory() {
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    searchQuery: "",
    propertyId: null,
    testName: null,
    passedOnly: null,
    dateRange: "7days"
  });
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [trendData, setTrendData] = useState([]);
  const itemsPerPage = 20;

  useEffect(() => {
    loadTestResults();
    loadTrendData();
  }, [filters, page]);

  const loadTestResults = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("sms_test_results")
        .select(`
          *,
          properties:property_id(property_name, code)
        `, { count: "exact" })
        .order("created_at", { ascending: false })
        .range((page - 1) * itemsPerPage, page * itemsPerPage - 1);

      if (filters.propertyId) {
        query = query.eq("property_id", filters.propertyId);
      }
      if (filters.testName) {
        query = query.eq("test_name", filters.testName);
      }
      if (filters.passedOnly !== null) {
        query = query.eq("passed", filters.passedOnly);
      }
      if (filters.searchQuery) {
        query = query.or(`test_message.ilike.%${filters.searchQuery}%,response_text.ilike.%${filters.searchQuery}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      setTestResults(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error("Error loading test results:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadTrendData = async () => {
    try {
      const { data } = await supabase
        .from("sms_test_results")
        .select("created_at, passed")
        .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: true });

      // Group by day and calculate pass rate
      const grouped = {};
      data?.forEach(result => {
        const day = format(new Date(result.created_at), 'yyyy-MM-dd');
        if (!grouped[day]) {
          grouped[day] = { date: day, passed: 0, total: 0 };
        }
        grouped[day].total++;
        if (result.passed) grouped[day].passed++;
      });

      const trend = Object.values(grouped).map(day => ({
        date: day.date,
        passRate: Math.round((day.passed / day.total) * 100)
      }));

      setTrendData(trend);
    } catch (error) {
      console.error("Error loading trend data:", error);
    }
  };

  const exportToCSV = () => {
    const csvContent = [
      ["Date", "Test Name", "Property", "Message", "Intent", "Passed", "Score", "Response Preview"],
      ...testResults.map((result) => [
        format(new Date(result.created_at), 'yyyy-MM-dd HH:mm:ss'),
        result.test_name,
        result.properties?.property_name || "N/A",
        result.test_message,
        result.intent_detected || "N/A",
        result.passed ? "PASS" : "FAIL",
        `${result.pass_score}%`,
        result.response_text?.substring(0, 100) + "..."
      ])
    ]
      .map((row) => row.map(cell => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `test-results-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <CardTitle>Test Results History</CardTitle>
          </div>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Trend Chart */}
        {trendData.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Pass Rate Trend (Last 30 Days)
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="passRate" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tests..."
              value={filters.searchQuery}
              onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
              className="pl-9"
            />
          </div>
          <select
            className="px-3 py-2 border border-border rounded-md bg-background"
            value={filters.passedOnly === null ? "" : filters.passedOnly}
            onChange={(e) => setFilters({ ...filters, passedOnly: e.target.value === "" ? null : e.target.value === "true" })}
          >
            <option value="">All Results</option>
            <option value="true">Passed Only</option>
            <option value="false">Failed Only</option>
          </select>
          <select
            className="px-3 py-2 border border-border rounded-md bg-background"
            value={filters.dateRange}
            onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
          >
            <option value="24hours">Last 24 Hours</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>
          <Button variant="outline" onClick={() => setFilters({ searchQuery: "", propertyId: null, testName: null, passedOnly: null, dateRange: "7days" })}>
            Clear Filters
          </Button>
        </div>

        {/* Results Table */}
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Test Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Property</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Score</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Intent</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {testResults.map((result) => (
                <tr key={result.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3">
                    {result.passed ? (
                      <CheckCircle className="h-5 w-5 text-success" />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">{result.test_name}</td>
                  <td className="px-4 py-3 text-sm">
                    {result.properties?.property_name || "N/A"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={result.passed ? "default" : "destructive"}>
                      {result.pass_score}%
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm">{result.intent_detected || "N/A"}</td>
                  <td className="px-4 py-3 text-sm">
                    {format(new Date(result.created_at), 'MMM dd, HH:mm')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((page - 1) * itemsPerPage) + 1} - {Math.min(page * itemsPerPage, totalCount)} of {totalCount} results
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={page * itemsPerPage >= totalCount}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
