import React from 'react';

/**
 * Standardized enterprise card component with variants
 */
export const EnterpriseCard = ({ 
  children, 
  variant = 'elevated',
  hoverable = false,
  className = '' 
}) => {
  const baseStyles = 'rounded-lg transition-all duration-200';
  
  const variantStyles = {
    elevated: 'bg-card shadow-card border border-gray-soft',
    flat: 'bg-card border border-gray-soft',
    outlined: 'bg-transparent border-2 border-primary/20'
  };

  const hoverStyles = hoverable 
    ? 'hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5 cursor-pointer' 
    : '';

  return (
    <div className={`${baseStyles} ${variantStyles[variant]} ${hoverStyles} ${className}`}>
      {children}
    </div>
  );
};

export const EnterpriseCardHeader = ({ children, className = '' }) => (
  <div className={`px-6 py-4 border-b border-gray-soft ${className}`}>
    {children}
  </div>
);

export const EnterpriseCardTitle = ({ children, className = '' }) => (
  <h3 className={`text-lg font-semibold text-heading ${className}`}>
    {children}
  </h3>
);

export const EnterpriseCardDescription = ({ children, className = '' }) => (
  <p className={`text-sm text-muted-foreground mt-1 ${className}`}>
    {children}
  </p>
);

export const EnterpriseCardContent = ({ children, className = '' }) => (
  <div className={`px-6 py-4 ${className}`}>
    {children}
  </div>
);

export const EnterpriseCardFooter = ({ children, className = '' }) => (
  <div className={`px-6 py-4 border-t border-gray-soft bg-muted/30 ${className}`}>
    {children}
  </div>
);
