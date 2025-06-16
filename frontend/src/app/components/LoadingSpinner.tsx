import React from 'react';

const LoadingSpinner: React.FC = () => { // Gunakan React.FC
  return (
    <div className="flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-primary"></div>
    </div>
  );
};

export default LoadingSpinner;