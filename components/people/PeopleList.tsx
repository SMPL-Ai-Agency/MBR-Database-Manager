import React, { useState } from 'react';
import { Person } from '../../types';
import { ICONS } from '../../constants';

interface PeopleListProps {
  people: Person[];
  onEdit: (person: Person) => void;
  onDelete: (personId: string) => void;
  homePersonId: string;
  onViewPerson: (personId: string) => void;
  onSetHomePerson: (personId: string) => void;
}

export const PeopleList: React.FC<PeopleListProps> = ({ people, onEdit, onDelete, homePersonId, onViewPerson, onSetHomePerson }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPeople = people.filter(p =>
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold mb-2">All People</h2>
          <input
            type="text"
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-50 rounded-md p-2"
          />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700">
            <tr>
              <th scope="col" className="px-6 py-3">Name</th>
              <th scope="col" className="px-6 py-3 hidden md:table-cell">Birth Date</th>
              <th scope="col" className="px-6 py-3 hidden lg:table-cell">Gender</th>
              <th scope="col" className="px-6 py-3">Status</th>
              <th scope="col" className="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPeople.map((person) => (
              <tr key={person.id} className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                   <button onClick={() => onViewPerson(person.id)} className="font-medium text-accent hover:underline text-left">
                     {person.first_name} {person.last_name}
                   </button>
                </td>
                <td className="px-6 py-4 hidden md:table-cell">{person.birth_date || 'N/A'}</td>
                <td className="px-6 py-4 hidden lg:table-cell">{person.gender || 'Unknown'}</td>
                <td className="px-6 py-4">
                  {person.id === homePersonId && (
                    <span className="bg-accent/20 text-accent text-xs font-medium mr-2 px-2.5 py-0.5 rounded-full">
                      Home
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 flex items-center gap-2">
                    {person.id !== homePersonId && (
                        <button onClick={() => onSetHomePerson(person.id)} title="Set as Home Person" className="p-1 text-gray-500 dark:text-gray-400 hover:text-accent">{ICONS.HOME}</button>
                    )}
                    <button onClick={() => onEdit(person)} title="Edit" className="p-1 text-gray-500 dark:text-gray-400 hover:text-blue-400">{ICONS.EDIT}</button>
                    <button onClick={() => onDelete(person.id)} title="Delete" className="p-1 text-gray-500 dark:text-gray-400 hover:text-red-500">{ICONS.DELETE}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};