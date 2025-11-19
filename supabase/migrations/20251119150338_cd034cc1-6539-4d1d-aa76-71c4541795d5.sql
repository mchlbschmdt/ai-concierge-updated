-- Create test results history table
CREATE TABLE sms_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_name TEXT NOT NULL,
  test_message TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  property_id UUID REFERENCES properties(id),
  
  -- Response data
  response_text TEXT,
  intent_detected TEXT,
  response_time_ms INTEGER,
  
  -- Assertion validation
  expected_keywords TEXT[], -- Array of keywords that should be present
  expected_not_keywords TEXT[], -- Array of keywords that should NOT be present
  keywords_found TEXT[], -- Which expected keywords were actually found
  keywords_missing TEXT[], -- Which expected keywords were missing
  unexpected_keywords_found TEXT[], -- Which forbidden keywords were found
  
  -- Test status
  passed BOOLEAN NOT NULL,
  pass_score DECIMAL(5,2), -- Percentage of assertions passed (0-100)
  failure_reason TEXT,
  
  -- Metadata
  test_run_id UUID, -- Group multiple tests into a single run
  conversation_id UUID REFERENCES sms_conversations(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  
  -- Environment info
  edge_function_version TEXT,
  test_environment TEXT DEFAULT 'production'
);

-- Indexes for performance
CREATE INDEX idx_test_results_property ON sms_test_results(property_id);
CREATE INDEX idx_test_results_test_name ON sms_test_results(test_name);
CREATE INDEX idx_test_results_created_at ON sms_test_results(created_at DESC);
CREATE INDEX idx_test_results_test_run ON sms_test_results(test_run_id);
CREATE INDEX idx_test_results_passed ON sms_test_results(passed);

-- RLS Policies
ALTER TABLE sms_test_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Property owners can view their test results"
  ON sms_test_results FOR SELECT
  USING (
    property_id IN (
      SELECT id FROM properties WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Property owners can create test results"
  ON sms_test_results FOR INSERT
  WITH CHECK (
    property_id IN (
      SELECT id FROM properties WHERE user_id = auth.uid()
    )
  );