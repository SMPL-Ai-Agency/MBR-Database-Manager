import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Person, GenealogyData, Marriage, ConnectionSettings } from './types';
import * as api from './services/apiService';
import * as mockApi from './services/mockApiService';
import { initializeClient } from './services/supabaseClient';
import { Header } from './components/layout/Header';
import { Dashboard } from './components/dashboard/Dashboard';
import { PeopleList } from './components/people/PeopleList';
import { PersonForm } from './components/people/PersonForm';
import { MarriageForm } from './components/marriages/MarriageForm';
import { Spinner } from './components/ui/Spinner';
import { PersonDetailModal } from './components/people/PersonDetailModal';
import { Settings } from './components/settings/Settings';
import { ICONS } from './constants';

type View = 'dashboard' | 'people' | 'settings';

const App: React.FC = () => {
    const [view, setView] = useState<View>('dashboard');
    const [people, setPeople] = useState<Person[]>([]);
    const [marriages, setMarriages] = useState<Marriage[]>([]);
    const [genealogyData, setGenealogyData] = useState<GenealogyData | null>(null);
    const [homePerson, setHomePerson] = useState<Person | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
    const [isDemoMode, setIsDemoMode] = useState(false);
    
    const [isPersonFormOpen, setIsPersonFormOpen] = useState(false);
    const [editingPerson, setEditingPerson] = useState<Person | null>(null);
    const [viewingPerson, setViewingPerson] = useState<Person | null>(null);

    const [isMarriageFormOpen, setIsMarriageFormOpen] = useState(false);
    const [editingMarriage, setEditingMarriage] = useState<Marriage | null>(null);

    const [connectionSettings, setConnectionSettings] = useState<ConnectionSettings>(() => {
        const savedSettings = localStorage.getItem('connectionSettings');
        const defaultSettings: ConnectionSettings = {
            supabaseUrl: '',
            supabaseAnonKey: '',
            provider: 'ollama',
            geminiApiKey: '',
            ollamaUrl: 'http://localhost:11434/api/chat',
            model: 'gemma:2b',
            systemPrompt: 'You are a helpful genealogy assistant. You can query the database for people and marriages. You can also add or update people.'
        };
        return savedSettings ? JSON.parse(savedSettings) : defaultSettings;
    });
    
    const apiService = useMemo(() => isDemoMode ? mockApi : api, [isDemoMode]);

    const handleSettingsChange = (newSettings: ConnectionSettings) => {
        setConnectionSettings(newSettings);
        localStorage.setItem('connectionSettings', JSON.stringify(newSettings));
        setIsDemoMode(false); // Saving new settings exits demo mode
        if (newSettings.supabaseUrl && newSettings.supabaseAnonKey) {
            try {
                initializeClient(newSettings.supabaseUrl, newSettings.supabaseAnonKey);
                setIsSupabaseConnected(true);
                refreshData(true, false); // force refresh with new settings
            } catch (error) {
                console.error("Failed to initialize Supabase client with new settings:", error);
                setIsSupabaseConnected(false);
            }
        } else {
             setIsSupabaseConnected(false);
        }
    };
    
    const refreshData = useCallback(async (force = false, useDemo = isDemoMode) => {
        if (!isSupabaseConnected && !force && !useDemo) return;
        setIsLoading(true);
        const currentApiService = useDemo ? mockApi : api;

        try {
            const [allPeople, allMarriages] = await Promise.all([
                currentApiService.getPeople(),
                currentApiService.getMarriages()
            ]);
            
            setPeople(allPeople);
            setMarriages(allMarriages);

            const currentHomePerson = allPeople.find(p => p.is_home_person) || allPeople[0] || null;
            setHomePerson(currentHomePerson);

            if (currentHomePerson) {
                const data = await currentApiService.getGenealogyData(currentHomePerson.id);
                setGenealogyData(data);
            } else {
                setGenealogyData(null);
            }
            if (!useDemo) setIsSupabaseConnected(true);
        } catch (error) {
            console.error("Failed to load data:", error);
            if (!useDemo) setIsSupabaseConnected(false); 
        } finally {
            setIsLoading(false);
        }
    }, [isSupabaseConnected, isDemoMode]);
    
    const handleUseDemoData = () => {
        setIsDemoMode(true);
        refreshData(true, true);
    };

    useEffect(() => {
        const { supabaseUrl, supabaseAnonKey } = connectionSettings;
        if (supabaseUrl && supabaseAnonKey) {
            try {
                initializeClient(supabaseUrl, supabaseAnonKey);
                setIsSupabaseConnected(true);
                refreshData(true, false);
            } catch (error) {
                console.error("Failed to initialize Supabase client on startup:", error);
                setIsSupabaseConnected(false);
                setIsLoading(false);
            }
        } else {
            setIsLoading(false);
        }
    }, []);

    const handleOpenPersonForm = (person?: Person) => {
        setEditingPerson(person || null);
        setIsPersonFormOpen(true);
    };

    const handleClosePersonForm = () => {
        setIsPersonFormOpen(false);
        setEditingPerson(null);
    };

    const handleSavePerson = async (personData: Omit<Person, 'id' | 'created_at' | 'updated_at' | 'is_home_person'>) => {
        if (editingPerson) {
            await apiService.updatePerson(editingPerson.id, personData);
        } else {
            await apiService.addPerson({ ...personData, is_home_person: people.length === 0 });
        }
        await refreshData(true);
        handleClosePersonForm();
    };
    
    const handleDeletePerson = async (personId: string) => {
        if (window.confirm("Are you sure you want to delete this person?")) {
            await apiService.deletePerson(personId);
            await refreshData(true);
        }
    };
    
    const handleViewPerson = (personId: string) => {
        const personToView = people.find(p => p.id === personId);
        if (personToView) {
            setViewingPerson(personToView);
        }
    };
    
    const handleCloseViewPerson = () => {
        setViewingPerson(null);
    };

    const handleEditFromDetails = (person: Person) => {
        handleCloseViewPerson();
        handleOpenPersonForm(person);
    };

    const handleOpenMarriageForm = (marriage?: Marriage) => {
        setEditingMarriage(marriage || null);
        setIsMarriageFormOpen(true);
    };

    const handleCloseMarriageForm = () => {
        setIsMarriageFormOpen(false);
        setEditingMarriage(null);
    };

    const handleSaveMarriage = async (marriageData: Omit<Marriage, 'id' | 'created_at' | 'updated_at'>) => {
        if (editingMarriage) {
            await apiService.updateMarriage(editingMarriage.id, marriageData);
        } else {
            await apiService.addMarriage(marriageData);
        }
        await refreshData(true);
        handleCloseMarriageForm();
    };

    const peopleOptions = useMemo(() => 
        people.map(p => ({ value: p.id, label: `${p.first_name} ${p.last_name}` })),
        [people]
    );

    const renderContent = () => {
        if (view === 'settings') {
            return <Settings settings={connectionSettings} onSettingsChange={handleSettingsChange} />;
        }
        
        if (isLoading) {
            return <div className="flex justify-center items-center h-96"><Spinner /></div>;
        }

        if (!isSupabaseConnected && !isDemoMode) {
             return (
                <div className="text-center py-10 max-w-2xl mx-auto bg-white dark:bg-gray-900 p-8 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                    <div className="text-accent mb-4 w-16 h-16 mx-auto">{ICONS.DATABASE}</div>
                    <h2 className="text-2xl font-bold mb-4">Database Not Connected</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">Configure your Supabase connection in settings or explore the app with sample data.</p>
                    <div className="flex justify-center gap-4">
                         <button
                            onClick={() => setView('settings')}
                            className="bg-accent hover:bg-accent-hover text-white font-bold py-2 px-4 rounded"
                        >
                            Go to Settings
                        </button>
                         <button
                            onClick={handleUseDemoData}
                            className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-50 font-bold py-2 px-4 rounded"
                        >
                            Use Demo Data
                        </button>
                    </div>
                </div>
            );
        }
        
        switch (view) {
            case 'dashboard':
                if (!homePerson) {
                    return (
                        <div className="text-center py-10">
                            <h2 className="text-2xl font-bold mb-4">No People Found</h2>
                            <p className="text-gray-500 dark:text-gray-400 mb-6">Your database is connected, but no people were found. Start by adding the first person.</p>
                             <button
                                onClick={() => handleOpenPersonForm()}
                                className="bg-accent hover:bg-accent-hover text-white font-bold py-2 px-4 rounded"
                            >
                                Add Person
                            </button>
                        </div>
                    );
                }
                return <Dashboard 
                            homePerson={homePerson} 
                            data={genealogyData} 
                            onViewPerson={handleViewPerson}
                            marriages={marriages}
                            people={people}
                            onAddMarriage={() => handleOpenMarriageForm()}
                            onEditMarriage={handleOpenMarriageForm}
                            onEditPerson={handleOpenPersonForm}
                            connectionSettings={connectionSettings}
                            refreshData={() => refreshData(true)}
                        />;
            case 'people':
                 if (!homePerson) return null;
                return <PeopleList 
                            people={people} 
                            onEdit={handleOpenPersonForm}
                            onDelete={handleDeletePerson}
                            homePersonId={homePerson.id}
                            onViewPerson={handleViewPerson}
                        />;
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen">
            <Header
                currentView={view}
                onSetView={setView}
                onAddPerson={() => (isSupabaseConnected || isDemoMode) && handleOpenPersonForm()}
                isAddPersonDisabled={!isSupabaseConnected && !isDemoMode}
                isDemoMode={isDemoMode}
            />
            <main className="p-4 md:p-8">
                {renderContent()}
            </main>
            {isPersonFormOpen && (
                <PersonForm
                    isOpen={isPersonFormOpen}
                    onClose={handleClosePersonForm}
                    onSave={handleSavePerson}
                    person={editingPerson}
                    peopleOptions={peopleOptions}
                />
            )}
            {viewingPerson && (
                 <PersonDetailModal
                    isOpen={!!viewingPerson}
                    onClose={handleCloseViewPerson}
                    person={viewingPerson}
                    onEdit={handleEditFromDetails}
                />
            )}
            {isMarriageFormOpen && (
                <MarriageForm
                    isOpen={isMarriageFormOpen}
                    onClose={handleCloseMarriageForm}
                    onSave={handleSaveMarriage}
                    marriage={editingMarriage}
                    peopleOptions={peopleOptions}
                    homePersonId={homePerson?.id}
                />
            )}
        </div>
    );
};

export default App;