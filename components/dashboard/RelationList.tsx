
import React from 'react';
import { Card } from '../ui/Card';
import { ICONS } from '../../constants';

type Relation = {
    id: string;
    full_name: string;
    relation: string;
    generation: number;
    enslaved?: boolean;
    dna_match?: boolean;
};

interface RelationListProps {
    title: string;
    relations: Relation[];
    onPersonClick: (personId: string) => void;
    collapsible?: boolean;
    defaultCollapsed?: boolean;
}

export const RelationList: React.FC<RelationListProps> = ({ title, relations, onPersonClick, collapsible = false, defaultCollapsed = false }) => {
    return (
        <Card title={title} icon={ICONS.USERS} collapsible={collapsible} defaultCollapsed={defaultCollapsed}>
            {relations.length > 0 ? (
                <ul className="space-y-2 max-h-96 overflow-y-auto pr-2">
                    {relations.map((p, i) => (
                        <li key={i}>
                            <button 
                                onClick={() => onPersonClick(p.id)} 
                                className="w-full flex justify-between items-center text-left p-2 bg-gray-50 dark:bg-gray-800 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                <div>
                                   <p className="font-semibold text-gray-900 dark:text-gray-50">{p.full_name}</p>
                                   <p className="text-gray-500 dark:text-gray-400 text-sm">{p.relation}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {p.enslaved && <span title="Enslaved" className="text-amber-400">{ICONS.INFO}</span>}
                                    {p.dna_match && <span title="DNA Match" className="text-green-400">{ICONS.DNA}</span>}
                                </div>
                            </button>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">No {title.toLowerCase()} found.</p>
            )}
        </Card>
    );
};
