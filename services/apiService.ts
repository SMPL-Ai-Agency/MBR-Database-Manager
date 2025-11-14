import { Person, Marriage, GenealogyData } from '../types';
import { getClient } from './supabaseClient';

const handleSupabaseError = (error: any, context: string) => {
    console.error(`Supabase error in ${context}:`, error);
    throw new Error(`Failed to ${context}. Please check your connection and permissions.`);
};

export const getPeople = async (): Promise<Person[]> => {
    const supabase = getClient();
    const { data, error } = await supabase.from('persons').select('*').order('last_name').order('first_name');
    if (error) handleSupabaseError(error, 'fetch people');
    return data || [];
};

export const getMarriages = async (): Promise<Marriage[]> => {
    const supabase = getClient();
    const { data, error } = await supabase.from('marriages').select('*');
    if (error) handleSupabaseError(error, 'fetch marriages');
    return data || [];
};

export const getGenealogyData = async (homePersonId: string): Promise<GenealogyData> => {
    // This function assumes the home_person is set correctly in the database,
    // which triggers the view calculations.
    const supabase = getClient();
    
    // We don't need to pass the homePersonId to the views if they are defined
    // to work off the `is_home_person = true` flag. We just need to ensure
    // that flag is set before we call this.
    
    const [
        ancestryRes,
        descendantsRes,
        lateralRes,
        paternalHaploRes,
        maternalHaploRes,
        paternalEnslavedRes,
        maternalEnslavedRes
    ] = await Promise.all([
        supabase.from('ancestry_relations').select('*'),
        supabase.from('descendants_relations').select('*'),
        supabase.from('lateral_relations').select('*'),
        supabase.from('paternal_haplogroup_trace').select('*'),
        supabase.from('maternal_haplogroup_trace').select('*'),
        supabase.from('paternal_enslaved_trace').select('*'),
        supabase.from('maternal_enslaved_trace').select('*')
    ]);

    if (ancestryRes.error) handleSupabaseError(ancestryRes.error, 'fetch ancestry');
    if (descendantsRes.error) handleSupabaseError(descendantsRes.error, 'fetch descendants');
    if (lateralRes.error) handleSupabaseError(lateralRes.error, 'fetch lateral relations');
    if (paternalHaploRes.error) handleSupabaseError(paternalHaploRes.error, 'fetch paternal haplogroup');
    if (maternalHaploRes.error) handleSupabaseError(maternalHaploRes.error, 'fetch maternal haplogroup');
    if (paternalEnslavedRes.error) handleSupabaseError(paternalEnslavedRes.error, 'fetch paternal enslaved');
    if (maternalEnslavedRes.error) handleSupabaseError(maternalEnslavedRes.error, 'fetch maternal enslaved');

    return {
        ancestry: (ancestryRes.data || []).map(p => ({...p, id: p.person_id })),
        descendants: (descendantsRes.data || []).map(p => ({...p, id: p.person_id })),
        lateral: (lateralRes.data || []).map(p => ({...p, id: p.person_id })),
        paternalHaplogroup: paternalHaploRes.data || [],
        maternalHaplogroup: maternalHaploRes.data || [],
        paternalEnslaved: paternalEnslavedRes.data || [],
        maternalEnslaved: maternalEnslavedRes.data || [],
    };
};

export const addPerson = async (personData: Omit<Person, 'id' | 'created_at' | 'updated_at'>): Promise<Person> => {
    const supabase = getClient();
    // Supabase will handle id, created_at, updated_at
    const { data, error } = await supabase.from('persons').insert([personData]).select();
    if (error) handleSupabaseError(error, 'add person');
    if (!data || data.length === 0) throw new Error('Failed to add person, no data returned.');
    return data[0];
};

export const updatePerson = async (personId: string, personData: Partial<Omit<Person, 'id' | 'created_at' | 'updated_at'>>): Promise<Person> => {
    const supabase = getClient();
    
    // If setting a new home person, the database trigger `enforce_single_home_person` handles unsetting the old one.
    
    const { data, error } = await supabase.from('persons').update(personData).eq('id', personId).select();
    if (error) handleSupabaseError(error, 'update person');
    if (!data || data.length === 0) throw new Error('Failed to update person, no data returned.');
    return data[0];
};

export const deletePerson = async (personId: string): Promise<void> => {
    const supabase = getClient();
    const { error } = await supabase.from('persons').delete().eq('id', personId);
    if (error) handleSupabaseError(error, 'delete person');
};

export const addMarriage = async (marriageData: Omit<Marriage, 'id' | 'created_at' | 'updated_at'>): Promise<Marriage> => {
    const supabase = getClient();
    const { data, error } = await supabase.from('marriages').insert([marriageData]).select();
    if (error) handleSupabaseError(error, 'add marriage');
    if (!data || data.length === 0) throw new Error('Failed to add marriage, no data returned.');
    return data[0];
};

export const updateMarriage = async (marriageId: string, marriageData: Partial<Omit<Marriage, 'id' | 'created_at' | 'updated_at'>>): Promise<Marriage> => {
    const supabase = getClient();
    const { data, error } = await supabase.from('marriages').update(marriageData).eq('id', marriageId).select();
    if (error) handleSupabaseError(error, 'update marriage');
    if (!data || data.length === 0) throw new Error('Failed to update marriage, no data returned.');
    return data[0];
};