import React, { useState, useEffect } from 'react';
import { Person } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface PersonFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (personData: Omit<Person, 'id' | 'created_at' | 'updated_at' | 'is_home_person'>) => void;
  person?: Person | null;
  peopleOptions: { value: string; label: string }[];
}

const initialFormData: Omit<Person, 'id' | 'created_at' | 'updated_at' | 'is_home_person'> = {
  first_name: '',
  last_name: '',
  middle_name: '',
  suffix: '',
  other_names: '',
  gender: 'Unknown',
  birth_date: '',
  birth_date_approx: '',
  birth_place: '',
  death_date: '',
  death_date_approx: '',
  death_place: '',
  mother_id: undefined,
  father_id: undefined,
  enslaved: false,
  dna_match: false,
  paternal_haplogroup: '',
  maternal_haplogroup: '',
  notes: '',
  story: '',
};

export const PersonForm: React.FC<PersonFormProps> = ({ isOpen, onClose, onSave, person, peopleOptions }) => {
  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    if (person) {
      setFormData({
        first_name: person.first_name,
        middle_name: person.middle_name || '',
        last_name: person.last_name,
        birth_date: person.birth_date ? person.birth_date.split('T')[0] : '',
        birth_date_approx: person.birth_date_approx || '',
        birth_place: person.birth_place || '',
        death_date: person.death_date ? person.death_date.split('T')[0] : '',
        death_date_approx: person.death_date_approx || '',
        death_place: person.death_place || '',
        gender: person.gender || 'Unknown',
        mother_id: person.mother_id || undefined,
        father_id: person.father_id || undefined,
        notes: person.notes || '',
        paternal_haplogroup: person.paternal_haplogroup || '',
        maternal_haplogroup: person.maternal_haplogroup || '',
        story: person.story || '',
        suffix: person.suffix || '',
        enslaved: person.enslaved,
        other_names: person.other_names || '',
        dna_match: person.dna_match,
      });
    } else {
      setFormData(initialFormData);
    }
  }, [person, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value === '' ? undefined : value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.first_name || !formData.last_name) {
      alert("First name and last name are required.");
      return;
    }
    onSave(formData);
  };
  
  const FormField: React.FC<{label: string, children: React.ReactNode}> = ({label, children}) => (
    <div>
        <label className="block mb-2 text-sm font-medium text-gray-600 dark:text-gray-300">{label}</label>
        {children}
    </div>
  );
  
  const baseInputClasses = "bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-50 text-sm rounded-lg focus:ring-accent focus:border-accent block w-full p-2.5";

  const TextInput: React.FC<{name: string, value: string | undefined}> = ({name, value}) => (
     <input type="text" name={name} value={value || ''} onChange={handleChange} className={baseInputClasses} />
  );
  
  const DateInput: React.FC<{name: string, value: string | undefined}> = ({name, value}) => (
     <input type="date" name={name} value={value || ''} onChange={handleChange} className={baseInputClasses} />
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={person ? `Edit ${person.first_name} ${person.last_name}` : 'Add New Person'}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Save</Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
         <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
          <h3 className="font-semibold text-lg mb-4">Name & Identity</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="First Name *"><TextInput name="first_name" value={formData.first_name} /></FormField>
            <FormField label="Middle Name"><TextInput name="middle_name" value={formData.middle_name} /></FormField>
            <FormField label="Last Name *"><TextInput name="last_name" value={formData.last_name} /></FormField>
            <FormField label="Suffix (e.g., Jr., Sr.)"><TextInput name="suffix" value={formData.suffix} /></FormField>
          </div>
          <div className="mt-4">
            <FormField label="Other Names / Nicknames"><TextInput name="other_names" value={formData.other_names} /></FormField>
          </div>
          <div className="mt-4">
            <FormField label="Gender">
                <select name="gender" value={formData.gender} onChange={handleChange} className={baseInputClasses}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Unknown">Unknown</option>
                </select>
            </FormField>
          </div>
        </div>
        
        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
          <h3 className="font-semibold text-lg mb-4">Birth & Death</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <FormField label="Birth Date"><DateInput name="birth_date" value={formData.birth_date} /></FormField>
             <FormField label="Birth Date Approx. (e.g., abt. 1920)"><TextInput name="birth_date_approx" value={formData.birth_date_approx} /></FormField>
             <FormField label="Birth Place"><TextInput name="birth_place" value={formData.birth_place} /></FormField>
             <div></div>
             <FormField label="Death Date"><DateInput name="death_date" value={formData.death_date} /></FormField>
             <FormField label="Death Date Approx."><TextInput name="death_date_approx" value={formData.death_date_approx} /></FormField>
             <FormField label="Death Place"><TextInput name="death_place" value={formData.death_place} /></FormField>
          </div>
        </div>

        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <h3 className="font-semibold text-lg mb-4">Family</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Mother">
                    <select name="mother_id" value={formData.mother_id || ''} onChange={handleChange} className={baseInputClasses}>
                        <option value="">Unknown</option>
                        {peopleOptions.filter(p => p.value !== person?.id).map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                </FormField>
                <FormField label="Father">
                    <select name="father_id" value={formData.father_id || ''} onChange={handleChange} className={baseInputClasses}>
                        <option value="">Unknown</option>
                        {peopleOptions.filter(p => p.value !== person?.id).map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                </FormField>
            </div>
        </div>

        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <h3 className="font-semibold text-lg mb-4">Genetic Info & Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Paternal Haplogroup"><TextInput name="paternal_haplogroup" value={formData.paternal_haplogroup} /></FormField>
                <FormField label="Maternal Haplogroup"><TextInput name="maternal_haplogroup" value={formData.maternal_haplogroup} /></FormField>
            </div>
            <div className="flex items-center space-x-6 pt-4">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300">
                    <input type="checkbox" name="enslaved" checked={formData.enslaved} onChange={handleChange} className="w-4 h-4 text-accent bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-accent" />
                    Enslaved
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300">
                    <input type="checkbox" name="dna_match" checked={formData.dna_match} onChange={handleChange} className="w-4 h-4 text-accent bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-accent" />
                    DNA Match
                </label>
            </div>
        </div>

        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <h3 className="font-semibold text-lg mb-4">Notes & Story</h3>
            <div className="space-y-4">
                 <FormField label="Notes (private research notes)">
                    <textarea name="notes" value={formData.notes || ''} onChange={handleChange} rows={4} className={baseInputClasses} />
                </FormField>
                 <FormField label="Story (public-facing biography)">
                    <textarea name="story" value={formData.story || ''} onChange={handleChange} rows={6} className={baseInputClasses} />
                </FormField>
            </div>
        </div>
      </form>
    </Modal>
  );
};
