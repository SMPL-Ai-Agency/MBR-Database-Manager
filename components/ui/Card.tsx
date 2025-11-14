import React, { useState } from 'react';
import { ICONS } from '../../constants';

interface CardProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  actions?: React.ReactNode;
  className?: string;
  count?: number;
}

export const Card: React.FC<CardProps> = ({ title, icon, children, collapsible = false, defaultCollapsed = false, actions, className, count }) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col ${className}`}>
      <div 
        className={`flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 ${collapsible ? 'cursor-pointer' : ''}`}
        onClick={() => collapsible && setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-3">
          {icon && <span className="text-accent">{icon}</span>}
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
            {count !== undefined && count > 0 && (
                <span className="text-sm font-bold text-accent">{count}</span>
            )}
            {actions}
            {collapsible && (
                <span className="text-gray-400 dark:text-gray-500">
                    {isCollapsed ? ICONS.CHEVRON_DOWN : ICONS.CHEVRON_UP}
                </span>
            )}
        </div>
      </div>
      {!isCollapsed && (
        <div className="p-4 flex-grow">
          {children}
        </div>
      )}
    </div>
  );
};