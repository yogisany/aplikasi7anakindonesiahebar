
import React from 'react';

const SyncIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    className="h-6 w-6" 
    fill="none" 
    viewBox="0 0 24 24" 
    stroke="currentColor" 
    strokeWidth={2}
    {...props}
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      d="M4 4v5h5M20 20v-5h-5m-5 5l-1.5-1.5A9 9 0 003.5 13.5M4 4l1.5 1.5A9 9 0 0120.5 10.5" 
    />
  </svg>
);

export default SyncIcon;
