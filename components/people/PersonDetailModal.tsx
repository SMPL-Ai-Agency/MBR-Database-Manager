import React from 'react';
import { Person } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { DetailItem } from '../ui/DetailItem';
import { ICONS } from '../../constants';

interface PersonDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  person: Person | null;
  onEdit: (person: Person) => void;
  onSetHomePerson: (personId: string) => void;
}

export const PersonDetailModal: React.FC<PersonDetailModalProps> = ({ isOpen, onClose, person, onEdit, onSetHomePerson }) => {
  if (!person) return null;

  const fullName = `${person.first_name} ${person.middle_name || ''} ${person.last_name} ${person.suffix || ''}`.replace(/\s+/g, ' ').trim();

  const formatEvent = (date?: string, approx?: string, place?: string) => {
    if (!date && !approx && !place) return null;
    const parts = [];
    if (date) parts.push(date);
    if (approx) parts.push(`(${approx})`);
    if (place) parts.push(`at ${place}`);
    return parts.join(' ');
  };

  const birthInfo = formatEvent(person.birth_date, person.birth_date_approx, person.birth_place);
  const deathInfo = formatEvent(person.death_date, person.death_date_approx, person.death_place);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={fullName}
      footer={
        <div className="flex justify-between items-center w-full">
            <div>
                {!person.is_home_person && (
                    <Button variant="secondary" onClick={() => onSetHomePerson(person.id)}>Set as Home</Button>
                )}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onClose}>Close</Button>
              <Button onClick={() => onEdit(person)}>Edit Person</Button>
            </div>
        </div>
      }
    >
      <dl className="-my-2">
        <DetailItem label="Full Name" value={fullName} />
        <DetailItem label="Other Names" value={person.other_names} />
        <DetailItem label="Gender" value={person.gender} />
        <DetailItem label="Birth" value={birthInfo} />
        <DetailItem label="Death" value={deathInfo} />
        <DetailItem label="Paternal Haplogroup" value={person.paternal_haplogroup} />
        <DetailItem label="Maternal Haplogroup" value={person.maternal_haplogroup} />
        <DetailItem label="Status" value={
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {person.enslaved && <span className="text-sm text-amber-400 flex items-center gap-1"><span className="w-4 h-4 inline-block">{ICONS.INFO}</span> Enslaved</span>}
                {person.dna_match && <span className="text-sm text-green-400 flex items-center gap-1"><span className="w-4 h-4 inline-block">{ICONS.DNA}</span> DNA Match</span>}
                {person.is_home_person && <span className="text-sm text-accent flex items-center gap-1"><span className="w-4 h-4 inline-block">{ICONS.HOME}</span> Home Person</span>}
            </div>
        } />
         <DetailItem label="Notes" value={<p className="whitespace-pre-wrap">{person.notes}</p>} />
         <DetailItem label="Story" value={<p className="whitespace-pre-wrap">{person.story}</p>} />
      </dl>
    </Modal>
  );
};