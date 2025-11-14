import { Person, Marriage, GenealogyData } from '../types';

// --- MOCK DATA ---
const people: Person[] = [
  { id: '1', first_name: 'John', last_name: 'Doe', is_home_person: true, birth_date: '1980-01-15', mother_id: '3', father_id: '2', enslaved: false, dna_match: true, gender: 'Male', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '2', first_name: 'Richard', last_name: 'Doe', birth_date: '1950-05-20', mother_id: '5', father_id: '4', enslaved: false, dna_match: true, gender: 'Male', is_home_person: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '3', first_name: 'Jane', last_name: 'Smith', birth_date: '1955-07-10', mother_id: '7', father_id: '6', enslaved: false, dna_match: true, gender: 'Female', is_home_person: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '4', first_name: 'George', last_name: 'Doe', birth_date: '1920-02-25', enslaved: false, dna_match: false, gender: 'Male', is_home_person: false, paternal_haplogroup: 'R1b', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '5', first_name: 'Mary', last_name: 'Brown', birth_date: '1922-11-30', enslaved: true, dna_match: false, gender: 'Female', is_home_person: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '6', first_name: 'Robert', last_name: 'Smith', birth_date: '1925-09-05', enslaved: false, dna_match: false, gender: 'Male', is_home_person: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '7', first_name: 'Patricia', last_name: 'Jones', birth_date: '1930-03-12', enslaved: false, dna_match: false, gender: 'Female', is_home_person: false, maternal_haplogroup: 'H1', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '8', first_name: 'Michael', last_name: 'Doe', birth_date: '1978-06-15', mother_id: '3', father_id: '2', enslaved: false, dna_match: true, gender: 'Male', is_home_person: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '9', first_name: 'Susan', last_name: 'Doe', birth_date: '2010-10-20', father_id: '1', enslaved: false, dna_match: true, gender: 'Female', is_home_person: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '10', first_name: 'David', last_name: 'Smith', birth_date: '1958-01-01', mother_id: '7', father_id: '6', enslaved: false, dna_match: false, gender: 'Male', is_home_person: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

const marriages: Marriage[] = [
    { id: 'm1', spouse1_id: '2', spouse2_id: '3', marriage_date: '1977-08-20', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'm2', spouse1_id: '4', spouse2_id: '5', marriage_date: '1948-06-10', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'm3', spouse1_id: '6', spouse2_id: '7', marriage_date: '1952-12-01', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'm4', spouse1_id: '1', spouse2_id: '3', marriage_date: '2005-06-01', divorce_date: '2009-01-01', notes: "Met in college", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

const mockGenealogyData: GenealogyData = {
    ancestry: [
        { person_id: '1', full_name: 'John Doe', relation: 'Self', generation: 0, side: 'N/A', enslaved: false, dna_match: true, great_degree: 0 },
        { person_id: '2', full_name: 'Richard Doe', relation: 'Father', generation: 1, side: 'Paternal', enslaved: false, dna_match: true, great_degree: 0 },
        { person_id: '3', full_name: 'Jane Smith', relation: 'Mother', generation: 1, side: 'Maternal', enslaved: false, dna_match: true, great_degree: 0 },
        { person_id: '4', full_name: 'George Doe', relation: 'Paternal Grandfather', generation: 2, side: 'Paternal', enslaved: false, dna_match: false, paternal_haplogroup: 'R1b', great_degree: 0 },
        { person_id: '5', full_name: 'Mary Brown', relation: 'Paternal Grandmother', generation: 2, side: 'Paternal', enslaved: true, dna_match: false, great_degree: 0 },
        { person_id: '6', full_name: 'Robert Smith', relation: 'Maternal Grandfather', generation: 2, side: 'Maternal', enslaved: false, dna_match: false, great_degree: 0 },
        { person_id: '7', full_name: 'Patricia Jones', relation: 'Maternal Grandmother', generation: 2, side: 'Maternal', enslaved: false, dna_match: false, maternal_haplogroup: 'H1', great_degree: 0 },
    ],
    descendants: [
        { id: '9', full_name: 'Susan Doe', relation: 'Daughter', generation: 1, side: 'N/A', enslaved: false, dna_match: true },
    ],
    lateral: [
        { id: '8', full_name: 'Michael Doe', relation: 'Brother', generation: 0, side: 'N/A', enslaved: false, dna_match: true },
        { id: '10', full_name: 'David Smith', relation: 'Maternal Uncle', generation: -1, side: 'Maternal', enslaved: false, dna_match: false },
    ],
    paternalHaplogroup: [
        { person_id: '1', full_name: 'John Doe', relation: 'Self', generation: 0, great_degree: 0 },
        { person_id: '2', full_name: 'Richard Doe', relation: 'Father', generation: 1, great_degree: 0 },
        { person_id: '4', full_name: 'George Doe', relation: 'Paternal Grandfather', generation: 2, great_degree: 0, paternal_haplogroup: 'R1b' },
    ],
    maternalHaplogroup: [
        { person_id: '1', full_name: 'John Doe', relation: 'Self', generation: 0, great_degree: 0 },
        { person_id: '3', full_name: 'Jane Smith', relation: 'Mother', generation: 1, great_degree: 0 },
        { person_id: '7', full_name: 'Patricia Jones', relation: 'Maternal Grandmother', generation: 2, great_degree: 0, maternal_haplogroup: 'H1' },
    ],
    paternalEnslaved: [
        { person_id: '5', full_name: 'Mary Brown', relation: 'Paternal Grandmother', generation: 2, great_degree: 0, enslaved: true }
    ],
    maternalEnslaved: [],
};


const simulateDelay = <T,>(data: T): Promise<T> => 
    new Promise(resolve => setTimeout(() => resolve(data), 500));


export const getPeople = (): Promise<Person[]> => simulateDelay(people);
export const getMarriages = (): Promise<Marriage[]> => simulateDelay(marriages);
export const getGenealogyData = (homePersonId: string): Promise<GenealogyData> => {
    // In a real app, this would re-query the views based on the homePersonId
    console.log(`Fetching genealogy data for home person: ${homePersonId}`);
    return simulateDelay(mockGenealogyData);
}

export const addPerson = (personData: Omit<Person, 'id' | 'created_at' | 'updated_at'>): Promise<Person> => {
    const newPerson: Person = {
        id: (Math.random() * 1000).toString(),
        ...personData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
    people.push(newPerson);
    return simulateDelay(newPerson);
};

export const updatePerson = (personId: string, personData: Partial<Person>): Promise<Person> => {
    const personIndex = people.findIndex(p => p.id === personId);
    if (personIndex === -1) {
        return Promise.reject(new Error("Person not found"));
    }
    
    // If setting a new home person, unset the old one.
    if(personData.is_home_person) {
        people.forEach(p => p.is_home_person = false);
    }

    people[personIndex] = { ...people[personIndex], ...personData, updated_at: new Date().toISOString() };
    return simulateDelay(people[personIndex]);
};

export const deletePerson = (personId: string): Promise<void> => {
    const personIndex = people.findIndex(p => p.id === personId);
    if (personIndex > -1) {
        people.splice(personIndex, 1);
    }
    return simulateDelay(undefined);
};

export const addMarriage = (marriageData: Omit<Marriage, 'id' | 'created_at' | 'updated_at'>): Promise<Marriage> => {
    const newMarriage: Marriage = {
        id: `m${Math.random() * 1000}`,
        ...marriageData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
    marriages.push(newMarriage);
    return simulateDelay(newMarriage);
};

export const updateMarriage = (marriageId: string, marriageData: Partial<Marriage>): Promise<Marriage> => {
    const marriageIndex = marriages.findIndex(m => m.id === marriageId);
    if (marriageIndex === -1) {
        return Promise.reject(new Error("Marriage not found"));
    }
    marriages[marriageIndex] = { ...marriages[marriageIndex], ...marriageData, updated_at: new Date().toISOString() };
    return simulateDelay(marriages[marriageIndex]);
};