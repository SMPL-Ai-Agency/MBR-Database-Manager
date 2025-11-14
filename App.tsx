import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Person, GenealogyData, Marriage, AiSettings } from './types';
import * as api from './services/apiService';
import { Header } from './components/layout/Header';
import { Dashboard } from './components/dashboard/Dashboard';
import { PeopleList } from './components/people/PeopleList';
import { PersonForm } from './components/people/PersonForm';
import { MarriageForm } from './components/marriages/MarriageForm';
import { Spinner } from './components/ui/Spinner';
import { PersonDetailModal } from './components/people/PersonDetailModal';
import { Settings } from './components/settings/Settings';

type View = 'dashboard' | 'people' | 'settings';

const App: React.FC = () => {
    const [view, setView] = useState<View>('dashboard');
    const [people, setPeople] = useState<Person[]>([]);
    const [marriages, setMarriages] = useState<Marriage[]>([]);
    const [genealogyData, setGenealogyData] = useState<GenealogyData | null>(null);
    const [homePerson, setHomePerson] = useState<Person | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    const [isPersonFormOpen, setIsPersonFormOpen] = useState(false);
    const [editingPerson, setEditingPerson] = useState<Person | null>(null);
    const [viewingPerson, setViewingPerson] = useState<Person | null>(null);

    const [isMarriageFormOpen, setIsMarriageFormOpen] = useState(false);
    const [editingMarriage, setEditingMarriage] = useState<Marriage | null>(null);

    const [aiSettings, setAiSettings] = useState<AiSettings>(() => {
        const savedSettings = localStorage.getItem('aiSettings');
        const defaultSettings: AiSettings = {
            provider: 'ollama',
            ollamaUrl: 'http://localhost:11434/api/chat',
            model: 'gemma:2b',
            systemPrompt: 'You are a helpful genealogy assistant. You can query the database for people and marriages. You can also add or update people.'
        };
        return savedSettings ? JSON.parse(savedSettings) : defaultSettings;
    });

    const handleAiSettingsChange = (newSettings: AiSettings) => {
        setAiSettings(newSettings);
        localStorage.setItem('aiSettings', JSON.stringify(newSettings));
    };
    
    const refreshData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [allPeople, allMarriages] = await Promise.all([
                api.getPeople(),
                api.getMarriages()
            ]);
            
            setPeople(allPeople);
            setMarriages(allMarriages);

            const currentHomePerson = allPeople.find(p => p.is_home_person) || allPeople[0] || null;
            setHomePerson(currentHomePerson);

            if (currentHomePerson) {
                const data = await api.getGenealogyData(currentHomePerson.id);
                setGenealogyData(data);
            } else {
                setGenealogyData(null);
            }
        } catch (error) {
            console.error("Failed to load data:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

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
            await api.updatePerson(editingPerson.id, personData);
        } else {
            await api.addPerson({ ...personData, is_home_person: people.length === 0 });
        }
        await refreshData();
        handleClosePersonForm();
    };
    
    const handleDeletePerson = async (personId: string) => {
        if (window.confirm("Are you sure you want to delete this person?")) {
            await api.deletePerson(personId);
            await refreshData();
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
            await api.updateMarriage(editingMarriage.id, marriageData);
        } else {
            await api.addMarriage(marriageData);
        }
        await refreshData();
        handleCloseMarriageForm();
    };

    const peopleOptions = useMemo(() => 
        people.map(p => ({ value: p.id, label: `${p.first_name} ${p.last_name}` })),
        [people]
    );

    const renderContent = () => {
        if (isLoading) {
            return <div className="flex justify-center items-center h-96"><Spinner /></div>;
        }
        
        switch (view) {
            case 'dashboard':
                if (!homePerson) {
                    return (
                        <div className="text-center py-10">
                            <h2 className="text-2xl font-bold mb-4">No People Found</h2>
                            <p className="text-gray-500 dark:text-gray-400 mb-6">Start by adding the first person to your family tree.</p>
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
                            aiSettings={aiSettings}
                            refreshData={refreshData}
                        />;
            case 'people':
                 if (!homePerson) return null; // Should not happen if dashboard is default
                return <PeopleList 
                            people={people} 
                            onEdit={handleOpenPersonForm}
                            onDelete={handleDeletePerson}
                            homePersonId={homePerson.id}
                            onViewPerson={handleViewPerson}
                        />;
            case 'settings':
                return <Settings aiSettings={aiSettings} onAiSettingsChange={handleAiSettingsChange} />;
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen">
            <Header
                currentView={view}
                onSetView={setView}
                onAddPerson={() => handleOpenPersonForm()}
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