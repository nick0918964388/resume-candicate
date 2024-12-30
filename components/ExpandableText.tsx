'use client';

import React, { useState } from 'react';

interface ExpandableTextProps {
  text: string;
  maxLength?: number;
  className?: string;
}

export default function ExpandableText({ text, maxLength = 100, className = '' }: ExpandableTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!text || text.length <= maxLength) {
    return <span className={className}>{text}</span>;
  }

  return (
    <div className={className}>
      {isExpanded ? (
        <div className="relative">
          <span>{text}</span>
          <button
            onClick={() => setIsExpanded(false)}
            className="ml-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            收起
          </button>
        </div>
      ) : (
        <div className="relative">
          <span>{text.slice(0, maxLength)}...</span>
          <button
            onClick={() => setIsExpanded(true)}
            className="ml-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            展開
          </button>
        </div>
      )}
    </div>
  );
} 