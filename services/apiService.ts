import { Person, Marriage, GenealogyData, AncestryRelation, AiFeedback } from '../types';
import { getClient } from './supabaseClient';

const handleSupabaseError = (error: any, context: string) => {
    console.error(`Supabase error in ${context}:`, error);
    const message = error.message || 'An unknown database error occurred.';
    const details = error.details ? `Details: ${error.details}` : '';
    const hint = error.hint ? `Hint: ${error.hint}` : '';
    throw new Error(`Failed to ${context}. ${message} ${details} ${hint}`);
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
    const supabase = getClient();
    
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

    const ancestry: AncestryRelation[] = ancestryRes.data || [];

    // The trace views in the schema are missing person_id. We augment the data here
    // by matching it against the full ancestry list, which does have the ID.
    const augmentTraceData = (traceData: any[], ancestryData: AncestryRelation[]) => {
        return traceData.map(traceItem => {
            const match = ancestryData.find(a => 
                a.full_name === traceItem.full_name && 
                a.relation === traceItem.relation &&
                a.generation === traceItem.generation
            );
            return {
                ...traceItem,
                person_id: match ? match.person_id : null
            };
        }).filter(item => item.person_id); // Only return items where we could find a matching person
    };
    
    return {
        ancestry: ancestry,
        descendants: descendantsRes.data || [],
        lateral: lateralRes.data || [],
        paternalHaplogroup: augmentTraceData(paternalHaploRes.data || [], ancestry),
        maternalHaplogroup: augmentTraceData(maternalHaploRes.data || [], ancestry),
        paternalEnslaved: augmentTraceData(paternalEnslavedRes.data || [], ancestry),
        maternalEnslaved: augmentTraceData(maternalEnslavedRes.data || [], ancestry),
    };
};

export const addPerson = async (personData: Omit<Person, 'id' | 'created_at' | 'updated_at'>): Promise<Person> => {
    const supabase = getClient();
    const { data, error } = await supabase.from('persons').insert([personData]).select();
    if (error) handleSupabaseError(error, 'add person');
    if (!data || data.length === 0) throw new Error('Failed to add person, no data returned.');
    return data[0];
};

export const updatePerson = async (personId: string, personData: Partial<Omit<Person, 'id' | 'created_at' | 'updated_at'>>): Promise<Person> => {
    const supabase = getClient();
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

export const addAiFeedback = async (feedbackData: Omit<AiFeedback, 'id' | 'created_at'>): Promise<AiFeedback> => {
    const supabase = getClient();
    const { data, error } = await supabase.from('ai_feedback').insert([feedbackData]).select();
    if (error) handleSupabaseError(error, 'add AI feedback');
    if (!data || data.length === 0) throw new Error('Failed to add AI feedback, no data returned.');
    return data[0];
};