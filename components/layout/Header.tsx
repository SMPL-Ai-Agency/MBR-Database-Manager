import React from 'react';
import { Person } from '../../types';
import { ICONS } from '../../constants';

type View = 'dashboard' | 'people' | 'settings';

interface HeaderProps {
  currentView: string;
  onSetView: (view: View) => void;
  onAddPerson: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onSetView,
  onAddPerson,
}) => {
  const NavButton = ({ view, label, icon, responsive = false, iconOnly = false }: { view: View, label: string, icon: React.ReactNode, responsive?: boolean, iconOnly?: boolean }) => (
    <button
      onClick={() => onSetView(view)}
      title={label}
      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        currentView === view
          ? 'bg-accent text-white'
          : 'text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-50'
      }`}
    >
      {icon}
      {!iconOnly && (responsive ? <span className="hidden sm:inline">{label}</span> : <span>{label}</span>)}
    </button>
  );

  return (
    <header className="bg-white dark:bg-gray-900 sticky top-0 z-10 shadow-md border-b border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50 flex items-center gap-2">
              <span className="text-accent">{ICONS.TREE}</span>
              My Black :[ROOTS]
            </h1>
            <nav className="hidden md:flex items-center gap-2">
              <NavButton view="dashboard" label="Dashboard" icon={ICONS.HOME} />
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onAddPerson}
              className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white font-bold py-2 px-4 rounded-md transition-colors"
            >
              <span className="hidden sm:inline">Add Person</span>
              <span className="sm:hidden">{ICONS.PLUS}</span>
            </button>
             <NavButton view="people" label="All People" icon={ICONS.USERS} iconOnly />
             <NavButton view="settings" label="Settings" icon={ICONS.SETTINGS} iconOnly />
          </div>
        </div>
      </div>
    </header>
  );
};