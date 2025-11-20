import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Download, Check, X, AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { supabase } from '@/integrations/supabase/client';
import { validateServiceFees, sanitizeServiceFees } from '@/utils/inputValidation';

export default function ServiceFeeBulkImport({ onImportComplete }) {
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [validationResults, setValidationResults] = useState([]);
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState('upload');
  const { showToast } = useToast();

  const downloadTemplate = () => {
    const template = `property_code,service_name,price,unit,description,notes
PROP-1434,pool_heat,25,per_day,Pool heating service,Must be scheduled 24 hours in advance
PROP-1434,resort_amenities,65,per_booking,Includes waterpark pools gym,Management submits names to resort`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'service_fees_template.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Template downloaded successfully', 'success');
  };

  const parseCSV = async (file) => {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    
    const data = lines.slice(1).map((line, index) => {
      const values = line.split(',').map(v => v.trim());
      const row = {};
      headers.forEach((header, i) => {
        row[header] = values[i] || '';
      });
      row.rowNumber = index + 2;
      return row;
    });
    
    return data;
  };

  const validateImportData = async (data) => {
    const { data: properties, error } = await supabase
      .from('properties')
      .select('id, code, property_name');
      
    if (error) throw error;
    
    const propertyMap = {};
    properties.forEach(p => {
      propertyMap[p.code] = p;
    });
    
    const results = data.map(row => {
      const validation = {
        row: row.rowNumber,
        propertyCode: row.property_code,
        serviceName: row.service_name,
        status: 'valid',
        errors: [],
        warnings: [],
        property: null
      };
      
      if (!propertyMap[row.property_code]) {
        validation.status = 'error';
        validation.errors.push('Property code not found');
      } else {
        validation.property = propertyMap[row.property_code];
      }
      
      const serviceValidation = validateServiceFees({
        [row.service_name]: {
          price: parseFloat(row.price),
          unit: row.unit,
          description: row.description,
          notes: row.notes
        }
      });
      
      if (!serviceValidation.isValid) {
        validation.status = 'error';
        validation.errors.push(...Object.values(serviceValidation.errors[row.service_name] || {}));
      }
      
      if (serviceValidation.hasWarnings) {
        validation.warnings.push(...Object.values(serviceValidation.warnings));
      }
      
      return validation;
    });
    
    return results;
  };

  const handleFileUpload = async (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;

    if (!uploadedFile.name.endsWith('.csv')) {
      showToast('Please upload a CSV file', 'error');
      return;
    }

    setFile(uploadedFile);
    
    try {
      const data = await parseCSV(uploadedFile);
      setParsedData(data);
      
      const results = await validateImportData(data);
      setValidationResults(results);
      
      setStep('preview');
    } catch (error) {
      console.error('Parse error:', error);
      showToast('Failed to parse CSV file', 'error');
    }
  };

  const executeImport = async () => {
    setImporting(true);
    const successCount = { total: 0, success: 0, failed: 0 };
    
    const grouped = {};
    validationResults
      .filter(r => r.status === 'valid')
      .forEach(result => {
        const row = parsedData.find(d => d.rowNumber === result.row);
        if (!grouped[result.property.id]) {
          grouped[result.property.id] = {
            property: result.property,
            services: {}
          };
        }
        grouped[result.property.id].services[row.service_name] = {
          price: parseFloat(row.price),
          unit: row.unit,
          description: row.description,
          notes: row.notes
        };
      });
    
    for (const [propertyId, data] of Object.entries(grouped)) {
      successCount.total++;
      try {
        const { data: property } = await supabase
          .from('properties')
          .select('service_fees')
          .eq('id', propertyId)
          .single();
        
        const existingFees = property?.service_fees || {};
        const mergedFees = { ...existingFees, ...data.services };
        
        const { error } = await supabase
          .from('properties')
          .update({ service_fees: mergedFees })
          .eq('id', propertyId);
        
        if (error) throw error;
        successCount.success++;
      } catch (error) {
        console.error(`Failed to update property ${propertyId}:`, error);
        successCount.failed++;
      }
    }
    
    setImporting(false);
    setStep('complete');
    showToast(
      `Import complete: ${successCount.success} properties updated${successCount.failed > 0 ? `, ${successCount.failed} failed` : ''}`, 
      successCount.failed > 0 ? 'warning' : 'success'
    );
    
    if (onImportComplete) onImportComplete();
  };

  const reset = () => {
    setStep('upload');
    setFile(null);
    setParsedData([]);
    setValidationResults([]);
  };

  const validCount = validationResults.filter(r => r.status === 'valid').length;
  const errorCount = validationResults.filter(r => r.status === 'error').length;

  return (
    <div className="space-y-4 p-6 bg-card rounded-lg border">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Bulk Import Service Fees</h3>
          <p className="text-sm text-muted-foreground">Upload a CSV file to update service fees for multiple properties</p>
        </div>
        <Button onClick={downloadTemplate} variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Download Template
        </Button>
      </div>
      
      {step === 'upload' && (
        <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors">
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground mb-4">Upload your CSV file to begin</p>
          <input 
            type="file" 
            accept=".csv" 
            onChange={handleFileUpload}
            className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
          />
        </div>
      )}
      
      {step === 'preview' && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-900">Valid</p>
                  <p className="text-2xl font-bold text-green-600">{validCount}</p>
                </div>
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <X className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-sm font-medium text-red-900">Errors</p>
                  <p className="text-2xl font-bold text-red-600">{errorCount}</p>
                </div>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div>
                <p className="text-sm font-medium text-blue-900">Total Rows</p>
                <p className="text-2xl font-bold text-blue-600">{validationResults.length}</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full divide-y">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium">Row</th>
                  <th className="px-4 py-3 text-left text-xs font-medium">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium">Property</th>
                  <th className="px-4 py-3 text-left text-xs font-medium">Service</th>
                  <th className="px-4 py-3 text-left text-xs font-medium">Price</th>
                  <th className="px-4 py-3 text-left text-xs font-medium">Unit</th>
                  <th className="px-4 py-3 text-left text-xs font-medium">Issues</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {validationResults.map(result => {
                  const row = parsedData.find(d => d.rowNumber === result.row);
                  return (
                    <tr key={result.row} className={result.status === 'error' ? 'bg-red-50' : ''}>
                      <td className="px-4 py-3 text-sm">{result.row}</td>
                      <td className="px-4 py-3">
                        {result.status === 'valid' ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <X className="h-4 w-4 text-red-600" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {result.property ? (
                          <div>
                            <p className="font-medium">{result.property.property_name}</p>
                            <p className="text-xs text-muted-foreground">{result.propertyCode}</p>
                          </div>
                        ) : (
                          <span className="text-red-600">{result.propertyCode}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">{result.serviceName}</td>
                      <td className="px-4 py-3 text-sm">${row?.price}</td>
                      <td className="px-4 py-3 text-sm">{row?.unit}</td>
                      <td className="px-4 py-3">
                        {result.errors.map((err, i) => (
                          <p key={i} className="text-xs text-red-600 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {err}
                          </p>
                        ))}
                        {result.warnings.map((warn, i) => (
                          <p key={i} className="text-xs text-yellow-600 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {warn}
                          </p>
                        ))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={executeImport} 
              disabled={validCount === 0 || importing}
            >
              {importing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                `Import ${validCount} Valid Row${validCount !== 1 ? 's' : ''}`
              )}
            </Button>
            <Button variant="outline" onClick={reset}>
              Cancel
            </Button>
          </div>
        </>
      )}
      
      {step === 'complete' && (
        <div className="text-center py-8">
          <Check className="mx-auto h-16 w-16 text-green-600 mb-4" />
          <h4 className="text-lg font-semibold text-green-900 mb-2">Import Completed!</h4>
          <p className="text-sm text-muted-foreground mb-4">Service fees have been updated successfully</p>
          <Button onClick={reset}>
            Import Another File
          </Button>
        </div>
      )}
    </div>
  );
}
