// Input validation and sanitization utilities

/**
 * Sanitizes text input by trimming whitespace and escaping HTML
 */
export const sanitizeTextInput = (input) => {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Validates email format
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates password strength
 */
export const validatePassword = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const errors = [];

  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }
  if (!hasUpperCase) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!hasLowerCase) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!hasNumbers) {
    errors.push('Password must contain at least one number');
  }
  if (!hasSpecialChar) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates phone number format
 */
export const validatePhoneNumber = (phone) => {
  // Basic phone validation - adjust regex based on your requirements
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone);
};

/**
 * Sanitizes and validates property data
 */
export const validatePropertyData = (data) => {
  const errors = {};
  const sanitizedData = {};

  // Required fields
  const requiredFields = ['property_name', 'code', 'address'];
  
  requiredFields.forEach(field => {
    if (!data[field] || typeof data[field] !== 'string' || data[field].trim() === '') {
      errors[field] = `${field.replace('_', ' ')} is required`;
    } else {
      sanitizedData[field] = sanitizeTextInput(data[field]);
    }
  });

  // Optional text fields
  const optionalTextFields = [
    'check_in_time', 'check_out_time', 'knowledge_base', 'local_recommendations',
    'wifi_name', 'wifi_password', 'parking_instructions', 'access_instructions',
    'emergency_contact', 'house_rules', 'directions_to_property', 
    'cleaning_instructions', 'special_notes'
  ];

  optionalTextFields.forEach(field => {
    if (data[field] && typeof data[field] === 'string') {
      sanitizedData[field] = sanitizeTextInput(data[field]);
    }
  });

  // Validate amenities array
  if (data.amenities && Array.isArray(data.amenities)) {
    sanitizedData.amenities = data.amenities.map(amenity => 
      typeof amenity === 'string' ? sanitizeTextInput(amenity) : amenity
    );
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitizedData
  };
};

/**
 * Rate limiting utility
 */
export class RateLimiter {
  constructor(maxAttempts = 5, windowMs = 15 * 60 * 1000) { // 5 attempts per 15 minutes
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.attempts = new Map();
  }

  isAllowed(identifier) {
    const now = Date.now();
    const userAttempts = this.attempts.get(identifier) || [];
    
    // Remove old attempts outside the window
    const validAttempts = userAttempts.filter(timestamp => now - timestamp < this.windowMs);
    
    if (validAttempts.length >= this.maxAttempts) {
      return false;
    }

    // Add current attempt
    validAttempts.push(now);
    this.attempts.set(identifier, validAttempts);
    
    return true;
  }

  getRemainingTime(identifier) {
    const now = Date.now();
    const userAttempts = this.attempts.get(identifier) || [];
    
    if (userAttempts.length < this.maxAttempts) {
      return 0;
    }

    const oldestAttempt = Math.min(...userAttempts);
    const remainingTime = this.windowMs - (now - oldestAttempt);
    
    return Math.max(0, remainingTime);
  }
}

/**
 * Validates service fees structure
 */
export const validateServiceFees = (serviceFees) => {
  const errors = {};
  const warnings = {};
  
  Object.entries(serviceFees).forEach(([serviceKey, service]) => {
    const serviceErrors = {};
    
    // Required: Price must be present and valid
    if (!service.price || service.price === '') {
      serviceErrors.price = 'Price is required';
    } else if (isNaN(service.price) || service.price < 0) {
      serviceErrors.price = 'Price must be a positive number';
    } else if (service.price > 10000) {
      warnings[serviceKey] = 'Price seems unusually high. Please verify.';
    } else if (service.price < 1 && service.price > 0) {
      warnings[serviceKey] = 'Price seems unusually low. Please verify.';
    }
    
    // Required: Unit must be selected
    if (!service.unit) {
      serviceErrors.unit = 'Pricing unit is required';
    }
    
    // Optional but recommended: Description
    if (!service.description || service.description.trim() === '') {
      warnings[`${serviceKey}_description`] = 'Description recommended for clarity';
    }
    
    // Validation: Description length
    if (service.description && service.description.length > 200) {
      serviceErrors.description = 'Description must be under 200 characters';
    }
    
    // Validation: Notes length
    if (service.notes && service.notes.length > 500) {
      serviceErrors.notes = 'Notes must be under 500 characters';
    }
    
    if (Object.keys(serviceErrors).length > 0) {
      errors[serviceKey] = serviceErrors;
    }
  });
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings,
    hasWarnings: Object.keys(warnings).length > 0
  };
};

/**
 * Sanitizes service fees data
 */
export const sanitizeServiceFees = (serviceFees) => {
  const sanitized = {};
  
  Object.entries(serviceFees).forEach(([serviceKey, service]) => {
    sanitized[serviceKey] = {
      price: parseFloat(service.price) || 0,
      unit: service.unit || 'per_day',
      description: sanitizeTextInput(service.description || ''),
      notes: sanitizeTextInput(service.notes || '')
    };
  });
  
  return sanitized;
};

// Create global rate limiter instances
export const loginRateLimiter = new RateLimiter(5, 15 * 60 * 1000); // 5 attempts per 15 minutes
export const registerRateLimiter = new RateLimiter(3, 60 * 60 * 1000); // 3 attempts per hour