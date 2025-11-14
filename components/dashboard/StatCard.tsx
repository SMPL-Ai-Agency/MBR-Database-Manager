
import React from 'react';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon }) => {
    return (
        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg flex items-center gap-4 border border-gray-200 dark:border-gray-700">
            <div className="p-3 rounded-full bg-accent/20 text-accent">
                {icon}
            </div>
            <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{title}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{value}</p>
            </div>
        </div>
    );
};
