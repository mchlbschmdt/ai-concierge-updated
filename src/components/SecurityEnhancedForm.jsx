import { useState } from 'react';
import { validatePropertyData, sanitizeTextInput } from '../utils/inputValidation';
import { useToast } from "@/components/ui/use-toast";

/**
 * Security-enhanced form wrapper that provides input validation and sanitization
 */
export function SecurityEnhancedForm({ children, onSubmit, initialData = {}, validationType = 'property' }) {
  const { toast } = useToast();
  const [formData, setFormData] = useState(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (name, value) => {
    // Sanitize input in real-time
    const sanitizedValue = typeof value === 'string' ? sanitizeTextInput(value) : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: sanitizedValue
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      // Validate based on type
      let validationResult;
      if (validationType === 'property') {
        validationResult = validatePropertyData(formData);
      } else {
        // Default validation - just sanitize
        validationResult = {
          isValid: true,
          sanitizedData: Object.keys(formData).reduce((acc, key) => {
            acc[key] = typeof formData[key] === 'string' 
              ? sanitizeTextInput(formData[key]) 
              : formData[key];
            return acc;
          }, {}),
          errors: {}
        };
      }

      if (!validationResult.isValid) {
        // Show validation errors
        const errorMessages = Object.values(validationResult.errors).join(', ');
        toast({
          title: "Validation Error",
          description: errorMessages,
          variant: "destructive"
        });
        return;
      }

      // Call parent submit handler with sanitized data
      await onSubmit(validationResult.sanitizedData);

    } catch (error) {
      console.error('Form submission error:', error);
      toast({
        title: "Error",
        description: error.message || "Form submission failed",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Enhanced children with form context
  const enhancedChildren = typeof children === 'function' 
    ? children({ 
        formData, 
        handleInputChange, 
        handleSubmit, 
        isSubmitting 
      })
    : children;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {enhancedChildren}
    </form>
  );
}

/**
 * Security-enhanced input component
 */
export function SecureInput({ 
  name, 
  value, 
  onChange, 
  type = 'text', 
  placeholder, 
  required = false,
  maxLength,
  className = ""
}) {
  const handleChange = (e) => {
    let sanitizedValue = sanitizeTextInput(e.target.value);
    
    // Apply maxLength if specified
    if (maxLength && sanitizedValue.length > maxLength) {
      sanitizedValue = sanitizedValue.substring(0, maxLength);
    }
    
    onChange(name, sanitizedValue);
  };

  return (
    <input
      type={type}
      name={name}
      value={value || ''}
      onChange={handleChange}
      placeholder={placeholder}
      required={required}
      maxLength={maxLength}
      className={`w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring ${className}`}
      autoComplete="off"
    />
  );
}

/**
 * Security-enhanced textarea component
 */
export function SecureTextarea({ 
  name, 
  value, 
  onChange, 
  placeholder, 
  rows = 3,
  maxLength,
  className = ""
}) {
  const handleChange = (e) => {
    let sanitizedValue = sanitizeTextInput(e.target.value);
    
    if (maxLength && sanitizedValue.length > maxLength) {
      sanitizedValue = sanitizedValue.substring(0, maxLength);
    }
    
    onChange(name, sanitizedValue);
  };

  return (
    <textarea
      name={name}
      value={value || ''}
      onChange={handleChange}
      placeholder={placeholder}
      rows={rows}
      maxLength={maxLength}
      className={`w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-vertical ${className}`}
    />
  );
}