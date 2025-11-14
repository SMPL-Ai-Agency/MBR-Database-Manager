
import React from 'react';

export const DetailItem = ({ label, value }: { label: string, value?: React.ReactNode }) => {
    if (!value || (typeof value === 'string' && value.trim() === '')) return null;
    return (
        <div className="py-2 grid grid-cols-1 sm:grid-cols-3 sm:gap-4 border-b border-gray-100 dark:border-gray-800 last:border-b-0">
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-gray-50 sm:mt-0 sm:col-span-2">{value}</dd>
        </div>
    );
};
