import React, { useState, useEffect } from 'react';
import { Marriage } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface MarriageFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (marriageData: Omit<Marriage, 'id' | 'created_at' | 'updated_at'>) => void;
  marriage?: Marriage | null;
  peopleOptions: { value: string; label: string }[];
  homePersonId?: string;
}

const initialFormData: Omit<Marriage, 'id' | 'created_at' | 'updated_at'> = {
  spouse1_id: '',
  spouse2_id: '',
  marriage_date: '',
  marriage_place: '',
  divorce_date: '',
  divorce_place: '',
  notes: '',
};

export const MarriageForm: React.FC<MarriageFormProps> = ({ isOpen, onClose, onSave, marriage, peopleOptions, homePersonId }) => {
  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    if (marriage) {
      setFormData({
        spouse1_id: marriage.spouse1_id,
        spouse2_id: marriage.spouse2_id,
        marriage_date: marriage.marriage_date ? marriage.marriage_date.split('T')[0] : '',
        marriage_place: marriage.marriage_place || '',
        divorce_date: marriage.divorce_date ? marriage.divorce_date.split('T')[0] : '',
        divorce_place: marriage.divorce_place || '',
        notes: marriage.notes || '',
      });
    } else {
      setFormData({
          ...initialFormData,
          spouse1_id: homePersonId || '',
      });
    }
  }, [marriage, isOpen, homePersonId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value === '' ? undefined : value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.spouse1_id || !formData.spouse2_id) {
      alert("Both spouses are required.");
      return;
    }
     if (formData.spouse1_id === formData.spouse2_id) {
      alert("A person cannot be married to themselves.");
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

  const spouse2Options = peopleOptions.filter(p => p.value !== formData.spouse1_id);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={marriage ? `Edit Marriage` : 'Add New Marriage'}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Save</Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Spouse 1 *">
                <select name="spouse1_id" value={formData.spouse1_id || ''} onChange={handleChange} className={baseInputClasses}>
                    <option value="">Select Person</option>
                    {peopleOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
            </FormField>
            <FormField label="Spouse 2 *">
                <select name="spouse2_id" value={formData.spouse2_id || ''} onChange={handleChange} className={baseInputClasses}>
                    <option value="">Select Person</option>
                    {spouse2Options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
            </FormField>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Marriage Date">
                <input type="date" name="marriage_date" value={formData.marriage_date || ''} onChange={handleChange} className={baseInputClasses} />
            </FormField>
             <FormField label="Marriage Place">
                <input type="text" name="marriage_place" value={formData.marriage_place || ''} onChange={handleChange} className={baseInputClasses} />
            </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Divorce Date">
                <input type="date" name="divorce_date" value={formData.divorce_date || ''} onChange={handleChange} className={baseInputClasses} />
            </FormField>
             <FormField label="Divorce Place">
                <input type="text" name="divorce_place" value={formData.divorce_place || ''} onChange={handleChange} className={baseInputClasses} />
            </FormField>
        </div>

        <FormField label="Notes">
            <textarea name="notes" value={formData.notes || ''} onChange={handleChange} rows={4} className={baseInputClasses} />
        </FormField>
      </form>
    </Modal>
  );
};