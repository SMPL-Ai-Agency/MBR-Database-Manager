import React, { useMemo } from 'react';
import { Person, GenealogyData, Marriage, ConnectionSettings } from '../../types';
import { Card } from '../ui/Card';
import { ICONS } from '../../constants';
import { StatCard } from './StatCard';
import { RelationList } from './RelationList';
import { DetailItem } from '../ui/DetailItem';
import { Chatbot } from '../chatbot/Chatbot';

interface DashboardProps {
  homePerson: Person;
  data: GenealogyData | null;
  onViewPerson: (personId: string) => void;
  marriages: Marriage[];
  people: Person[];
  onAddMarriage: () => void;
  onEditMarriage: (marriage: Marriage) => void;
  onEditPerson: (person: Person) => void;
  connectionSettings: ConnectionSettings;
  refreshData: () => Promise<void>;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
    homePerson, 
    data, 
    onViewPerson, 
    marriages, 
    people, 
    onAddMarriage, 
    onEditMarriage, 
    onEditPerson,
    connectionSettings,
    refreshData
}) => {
  if (!data) {
    return (
      <Card title="No Data" icon={ICONS.INFO}>
        <p>Genealogy data could not be loaded for the selected home person.</p>
      </Card>
    );
  }

  const {
    ancestry,
    descendants,
    lateral,
    paternalHaplogroup,
    maternalHaplogroup,
    paternalEnslaved,
    maternalEnslaved,
  } = data;

  const homePersonMarriages = useMemo(() => {
    if (!marriages || !people) return [];
    return marriages
        .filter(m => m.spouse1_id === homePerson.id || m.spouse2_id === homePerson.id)
        .map(m => {
            const spouseId = m.spouse1_id === homePerson.id ? m.spouse2_id : m.spouse1_id;
            const spouse = people.find(p => p.id === spouseId);
            const spouseName = spouse ? `${spouse.first_name} ${spouse.last_name}` : 'Unknown';
            return {
                ...m,
                spouseName,
                spouseId,
            };
        });
  }, [marriages, people, homePerson.id]);

  const formatEvent = (date?: string, approx?: string, place?: string) => {
    if (!date && !approx && !place) return null;
    const parts = [];
    if (date) parts.push(date);
    if (approx) parts.push(`(${approx})`);
    if (place) parts.push(`at ${place}`);
    return parts.join(' ');
  };

  const birthInfo = formatEvent(homePerson.birth_date, homePerson.birth_date_approx, homePerson.birth_place);
  const deathInfo = formatEvent(homePerson.death_date, homePerson.death_date_approx, homePerson.death_place);
  const fullName = `${homePerson.first_name} ${homePerson.middle_name || ''} ${homePerson.last_name} ${homePerson.suffix || ''}`.replace(/\s+/g, ' ').trim();

  return (
    <div className="space-y-8">
        <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-50 mb-2">Dataset Manager</h2>
            <p className="text-gray-500 dark:text-gray-400">Manage and visualize your genealogy dataset for AI model training.</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Added Math.max to prevent negative counts if data is empty */}
            <StatCard title="Ancestors" value={Math.max(0, ancestry.length - 1)} icon={ICONS.USERS} />
            <StatCard title="Descendants" value={descendants.length} icon={ICONS.USERS} />
            <StatCard title="Total People" value={people.length} icon={ICONS.USERS} />
            <StatCard title="DNA Matches" value={people.filter(p => p.dna_match).length} icon={ICONS.DNA} />
        </div>

        {/* Changed grid to have two equal columns (lg:grid-cols-2) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
                <Chatbot 
                    connectionSettings={connectionSettings}
                    people={people}
                    marriages={marriages}
                    refreshData={refreshData}
                />
            </div>
            <div className="space-y-6">
                <Card 
                    title="Home Person Details" 
                    icon={ICONS.USER}
                    actions={
                        <button 
                            onClick={() => onEditPerson(homePerson)} 
                            title="Edit Home Person"
                            className="p-1 text-gray-500 dark:text-gray-400 hover:text-accent"
                        >
                            {ICONS.EDIT}
                        </button>
                    }
                >
                    <dl className="-my-2">
                        <DetailItem label="Name" value={fullName} />
                        <DetailItem label="Also Known As" value={homePerson.other_names} />
                        <DetailItem label="Gender" value={homePerson.gender} />
                        <DetailItem label="Birth" value={birthInfo} />
                        <DetailItem label="Death" value={deathInfo} />
                        <DetailItem label="Paternal Haplogroup" value={homePerson.paternal_haplogroup} />
                        <DetailItem label="Maternal Haplogroup" value={homePerson.maternal_haplogroup} />
                        <DetailItem label="Status" value={
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                {homePerson.enslaved && <span className="text-sm text-amber-400 flex items-center gap-1"><span className="w-4 h-4 inline-block">{ICONS.INFO}</span> Enslaved</span>}
                                {homePerson.dna_match && <span className="text-sm text-green-400 flex items-center gap-1"><span className="w-4 h-4 inline-block">{ICONS.DNA}</span> DNA Match</span>}
                            </div>
                        } />
                        <DetailItem label="Notes" value={<p className="whitespace-pre-wrap">{homePerson.notes}</p>} />
                        <DetailItem label="Story" value={<p className="whitespace-pre-wrap">{homePerson.story}</p>} />
                    </dl>
                </Card>
                <Card 
                    title="Marriages" 
                    icon={ICONS.RINGS} 
                    collapsible 
                    defaultCollapsed
                    actions={
                        <button 
                            onClick={onAddMarriage} 
                            title="Add Marriage"
                            className="p-1 text-gray-500 dark:text-gray-400 hover:text-accent"
                        >
                            {ICONS.PLUS}
                        </button>
                    }
                >
                    {homePersonMarriages.length > 0 ? (
                        <ul className="space-y-2 max-h-96 overflow-y-auto pr-2">
                            {homePersonMarriages.map((m) => (
                                <li key={m.id}>
                                    <button 
                                        onClick={() => onEditMarriage(m)} 
                                        className="w-full flex justify-between items-center text-left p-2 bg-gray-50 dark:bg-gray-800 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <div>
                                           <p className="font-semibold text-gray-900 dark:text-gray-50">{m.spouseName}</p>
                                           <p className="text-gray-500 dark:text-gray-400 text-sm">
                                                Married: {m.marriage_date || 'N/A'}{m.marriage_place ? ` in ${m.marriage_place}` : ''}
                                           </p>
                                           {m.divorce_date && (
                                                <p className="text-gray-500 dark:text-gray-400 text-sm">
                                                    Divorced: {m.divorce_date}{m.divorce_place ? ` in ${m.divorce_place}` : ''}
                                                </p>
                                           )}
                                        </div>
                                        <span className="text-gray-400 dark:text-gray-500 hover:text-accent transition-colors">{ICONS.EDIT}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-500 dark:text-gray-400 text-sm">No marriages found for this person.</p>
                    )}
                </Card>
                <RelationList title="Ancestry" relations={ancestry.filter(p => p.relation !== 'Self').map(p => ({...p, id: p.person_id}))} onPersonClick={onViewPerson} collapsible defaultCollapsed />
                <Card title="Paternal Haplogroup Trace" icon={ICONS.DNA} collapsible defaultCollapsed>
                   <ul className="space-y-1">
                        {paternalHaplogroup.map((p, i) => <li key={i}><button onClick={() => onViewPerson(p.person_id)} className="text-sm p-1 rounded w-full text-left hover:bg-gray-100 dark:hover:bg-gray-800">{p.full_name} ({p.relation}) {p.paternal_haplogroup && <span className="font-bold text-accent ml-2">{p.paternal_haplogroup}</span>}</button></li>)}
                    </ul>
                </Card>
                <Card title="Maternal Haplogroup Trace" icon={ICONS.DNA} collapsible defaultCollapsed>
                   <ul className="space-y-1">
                        {maternalHaplogroup.map((p, i) => <li key={i}><button onClick={() => onViewPerson(p.person_id)} className="text-sm p-1 rounded w-full text-left hover:bg-gray-100 dark:hover:bg-gray-800">{p.full_name} ({p.relation}) {p.maternal_haplogroup && <span className="font-bold text-accent ml-2">{p.maternal_haplogroup}</span>}</button></li>)}
                    </ul>
                </Card>
                <Card title="Paternal Enslaved Trace" icon={ICONS.INFO} collapsible defaultCollapsed>
                    {paternalEnslaved.length > 0 ? (
                        <ul className="space-y-1">
                           {paternalEnslaved.map((p, i) => <li key={i}><button onClick={() => onViewPerson(p.person_id)} className="text-sm text-amber-400 p-1 rounded w-full text-left hover:bg-gray-100 dark:hover:bg-gray-800">{p.full_name} ({p.relation})</button></li>)}
                        </ul>
                    ) : <p className="text-sm text-gray-500 dark:text-gray-400">No paternal enslaved ancestors found.</p>}
                </Card>
                <Card title="Maternal Enslaved Trace" icon={ICONS.INFO} collapsible defaultCollapsed>
                    {maternalEnslaved.length > 0 ? (
                       <ul className="space-y-1">
                           {maternalEnslaved.map((p, i) => <li key={i}><button onClick={() => onViewPerson(p.person_id)} className="text-sm text-amber-400 p-1 rounded w-full text-left hover:bg-gray-100 dark:hover:bg-gray-800">{p.full_name} ({p.relation})</button></li>)}
                        </ul>
                    ) : <p className="text-sm text-gray-500 dark:text-gray-400">No maternal enslaved ancestors found.</p>}
                </Card>
                <RelationList title="Lateral Relations" relations={lateral} onPersonClick={onViewPerson} collapsible defaultCollapsed />
                <RelationList title="Descendants" relations={descendants} onPersonClick={onViewPerson} collapsible defaultCollapsed />
            </div>
        </div>
    </div>
  );
};