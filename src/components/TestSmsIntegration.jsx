
import React from 'react';
import ComprehensiveSmsDebugger from './ComprehensiveSmsDebugger';
import DeploymentVerifier from './DeploymentVerifier';
import OpenPhoneKeyTester from './OpenPhoneKeyTester';
import ApiKeyResolutionGuide from './ApiKeyResolutionGuide';
import { AlertCircle } from 'lucide-react';

export default function TestSmsIntegration() {
  return (
    <div className="space-y-6">
      {/* Current Status Header */}
      <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-400">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-red-800 mb-2">🔍 Current Issue Analysis</h3>
            <div className="text-sm text-red-700 space-y-1">
              <div>✅ <strong>Webhook Processing:</strong> Working - messages are received and processed</div>
              <div>✅ <strong>Database Storage:</strong> Working - conversations and responses are stored</div>
              <div>✅ <strong>Response Generation:</strong> Working - automated responses are generated</div>
              <div>✅ <strong>Edge Functions:</strong> Deployed and accessible</div>
              <div>❌ <strong>SMS Sending:</strong> Failing due to invalid OpenPhone API key (401 errors)</div>
              <div className="mt-2 p-2 bg-red-100 rounded">
                <strong>🎯 Root Cause:</strong> The OpenPhone API key in Supabase is invalid or expired (confirmed via function test).
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* API Key Resolution Guide */}
      <ApiKeyResolutionGuide />

      {/* Deployment Verifier */}
      <DeploymentVerifier />

      {/* OpenPhone API Key Tester */}
      <OpenPhoneKeyTester />

      {/* Comprehensive Debugger */}
      <ComprehensiveSmsDebugger />

      {/* Success Criteria */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-800 mb-2">✅ Success Criteria</h4>
        <div className="text-sm text-blue-700 space-y-1">
          <div>1. OpenPhone API key validation returns 200 status (not 401)</div>
          <div>2. API key can fetch phone numbers from OpenPhone API</div>
          <div>3. SMS test messages send successfully without authentication errors</div>
          <div>4. Complete SMS workflow test passes from start to finish</div>
        </div>
      </div>
    </div>
  );
}
