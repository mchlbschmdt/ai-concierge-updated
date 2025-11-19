import { supabase } from "@/integrations/supabase/client";
import { TEST_ASSERTIONS } from "@/config/testAssertions";

export class TestAssertionService {
  /**
   * Validate a response against test assertions
   */
  static validateResponse(testId, response) {
    const assertion = TEST_ASSERTIONS[testId];
    if (!assertion) {
      return { passed: true, score: 100, reason: "No assertions defined" };
    }
    
    const lowerResponse = response.toLowerCase();
    
    // Check required keywords (must have at least one)
    const requiredFound = assertion.requiredKeywords.some(kw => 
      lowerResponse.includes(kw.toLowerCase())
    );
    
    if (!requiredFound) {
      return {
        passed: false,
        score: 0,
        reason: `Missing required keyword: ${assertion.requiredKeywords.join(' OR ')}`,
        keywordsMissing: assertion.requiredKeywords,
        keywordsFound: []
      };
    }
    
    // Check forbidden keywords (must have NONE)
    const forbiddenFound = assertion.forbiddenKeywords.filter(kw => 
      lowerResponse.includes(kw.toLowerCase())
    );
    
    if (forbiddenFound.length > 0) {
      return {
        passed: false,
        score: 0,
        reason: `Contains forbidden keyword: ${forbiddenFound.join(', ')}`,
        unexpectedKeywordsFound: forbiddenFound,
        keywordsFound: []
      };
    }
    
    // Check expected keywords (score based on how many found)
    const keywordsFound = assertion.expectedKeywords.filter(kw => 
      lowerResponse.includes(kw.toLowerCase())
    );
    
    const keywordsMissing = assertion.expectedKeywords.filter(kw => 
      !lowerResponse.includes(kw.toLowerCase())
    );
    
    const score = (keywordsFound.length / assertion.expectedKeywords.length) * 100;
    const passed = score >= assertion.minimumMatchScore;
    
    return {
      passed,
      score: Math.round(score * 100) / 100,
      reason: passed 
        ? `Passed with ${keywordsFound.length}/${assertion.expectedKeywords.length} keywords found`
        : `Failed: Only ${keywordsFound.length}/${assertion.expectedKeywords.length} keywords found (need ${assertion.minimumMatchScore}%)`,
      keywordsFound,
      keywordsMissing,
      unexpectedKeywordsFound: []
    };
  }
  
  /**
   * Save test result to database
   */
  static async saveTestResult(testResult) {
    const { data, error } = await supabase
      .from('sms_test_results')
      .insert({
        test_name: testResult.testName,
        test_message: testResult.message,
        phone_number: testResult.phoneNumber,
        property_id: testResult.propertyId,
        response_text: testResult.response,
        intent_detected: testResult.intent,
        response_time_ms: testResult.responseTime,
        expected_keywords: testResult.expectedKeywords,
        expected_not_keywords: testResult.forbiddenKeywords,
        keywords_found: testResult.keywordsFound,
        keywords_missing: testResult.keywordsMissing,
        unexpected_keywords_found: testResult.unexpectedKeywordsFound,
        passed: testResult.passed,
        pass_score: testResult.score,
        failure_reason: testResult.reason,
        test_run_id: testResult.testRunId,
        conversation_id: testResult.conversationId
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
}
