import React from 'react';

export const ProgressBar = ({ currentStep, totalSteps, progress }) => {
  return (
    <div className="w-full mb-8">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-foreground">
          Step {currentStep} of {totalSteps}
        </span>
        <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
      </div>
      <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex justify-between mt-2">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={`text-xs ${
              i + 1 <= currentStep
                ? 'text-primary font-medium'
                : 'text-muted-foreground'
            }`}
          >
            {i + 1 === 1 && 'Profile'}
            {i + 1 === 2 && 'Security'}
            {i + 1 === 3 && 'Property'}
            {i + 1 === 4 && 'Done'}
          </div>
        ))}
      </div>
    </div>
  );
};
