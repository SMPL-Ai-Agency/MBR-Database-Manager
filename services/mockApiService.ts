import { Person, Marriage, GenealogyData, AncestryRelation, DescendantRelation, HaplogroupTrace, EnslavedTrace } from '../types';
import { v4 as uuidv4 } from 'uuid'; // Simple uuid for demo

// --- Mock Data Store ---
let mockPeople: Person[] = [];
let mockMarriages: Marriage[] = [];

const createPerson = (data: Partial<Person>): Person => {
    const now = new Date().toISOString();
    return {
        id: uuidv4(),
        first_name: '',
        last_name: '',
        is_home_person: false,
        enslaved: false,
        dna_match: false,
        created_at: now,
        updated_at: now,
        ...data,
    } as Person;
};

const createMarriage = (data: Partial<Marriage>): Marriage => {
    const now = new Date().toISOString();
    return {
        id: uuidv4(),
        spouse1_id: '',
        spouse2_id: '',
        created_at: now,
        updated_at: now,
        ...data,
    } as Marriage;
}

const initializeMockData = () => {
    // Reset data
    mockPeople = [];
    mockMarriages = [];
    
    // Create people
    const home = createPerson({ first_name: 'Amara', last_name: 'Johnson', gender: 'Female', birth_date: '1985-05-15', is_home_person: true, dna_match: true, maternal_haplogroup: 'L3e' });
    const spouse = createPerson({ first_name: 'Daniel', last_name: 'Williams', gender: 'Male', birth_date: '1983-11-20', paternal_haplogroup: 'E-M2' });
    const child1 = createPerson({ first_name: 'Chloe', last_name: 'Williams', gender: 'Female', birth_date: '2010-07-22', mother_id: home.id, father_id: spouse.id });
    
    const mother = createPerson({ first_name: 'Eleanor', last_name: 'Johnson', gender: 'Female', birth_date: '1960-03-10', death_date: '2018-01-05', maternal_haplogroup: 'L3e' });
    const father = createPerson({ first_name: 'Marcus', last_name: 'Johnson', gender: 'Male', birth_date: '1958-09-01', paternal_haplogroup: 'R-M173' });
    
    const gm_m = createPerson({ first_name: 'Beatrice', last_name: 'Smith', gender: 'Female', birth_date: '1935-02-12', mother_id: undefined, father_id: undefined, enslaved: true, maternal_haplogroup: 'L3e' });
    const gf_m = createPerson({ first_name: 'Samuel', last_name: 'Johnson', gender: 'Male', birth_date: '1932-06-30', paternal_haplogroup: 'R-M173' });

    home.mother_id = mother.id;
    home.father_id = father.id;
    mother.mother_id = gm_m.id;
    father.father_id = gf_m.id;

    mockPeople.push(home, spouse, child1, mother, father, gm_m, gf_m);
    
    // Create marriages
    const m1 = createMarriage({ spouse1_id: home.id, spouse2_id: spouse.id, marriage_date: '2008-06-12' });
    const m2 = createMarriage({ spouse1_id: mother.id, spouse2_id: father.id, marriage_date: '1980-08-20' });
    
    mockMarriages.push(m1, m2);
};

// --- Mock API Functions ---

export const getPeople = async (): Promise<Person[]> => {
    if (mockPeople.length === 0) initializeMockData();
    return Promise.resolve(JSON.parse(JSON.stringify(mockPeople)));
};

export const getMarriages = async (): Promise<Marriage[]> => {
    if (mockPeople.length === 0) initializeMockData();
    return Promise.resolve(JSON.parse(JSON.stringify(mockMarriages)));
};

export const getGenealogyData = async (homePersonId: string): Promise<GenealogyData> => {
    if (mockPeople.length === 0) initializeMockData();
    const homePerson = mockPeople.find(p => p.is_home_person);
    if (!homePerson) throw new Error("No home person found in mock data");

    const getPersonById = (id: string) => mockPeople.find(p => p.id === id);
    const getFullName = (p: Person) => `${p.first_name} ${p.last_name}`;

    // Simple recursive function to get ancestors for mock data
    const findAncestors = (personId: string, generation: number, side: 'Paternal' | 'Maternal' | 'N/A'): AncestryRelation[] => {
        const person = getPersonById(personId);
        if (!person) return [];
        let results: AncestryRelation[] = [];
        if (generation > 0) { // Add self only once
            let relation = 'Self';
            if (generation === 1) relation = side === 'Maternal' ? 'Mother' : 'Father';
            if (generation > 1) {
                const great = 'Great-'.repeat(generation - 1);
                relation = `${great}Grand${side === 'Maternal' ? 'mother' : 'father'}`;
            }
            results.push({
                person_id: person.id,
                full_name: getFullName(person),
                relation,
                generation,
                side,
                great_degree: generation > 1 ? generation - 1 : 0,
                paternal_haplogroup: person.paternal_haplogroup,
                maternal_haplogroup: person.maternal_haplogroup,
                enslaved: person.enslaved,
                dna_match: person.dna_match
            });
        }

        if (person.mother_id) results = results.concat(findAncestors(person.mother_id, generation + 1, 'Maternal'));
        if (person.father_id) results = results.concat(findAncestors(person.father_id, generation + 1, 'Paternal'));
        return results;
    };

    let ancestry: AncestryRelation[] = findAncestors(homePerson.id, 0, 'N/A');
    ancestry.unshift({
        person_id: homePerson.id,
        full_name: getFullName(homePerson),
        relation: 'Self',
        generation: 0,
        side: 'N/A',
        great_degree: 0,
        paternal_haplogroup: homePerson.paternal_haplogroup,
        maternal_haplogroup: homePerson.maternal_haplogroup,
        enslaved: homePerson.enslaved,
        dna_match: homePerson.dna_match
    });

    const descendants: DescendantRelation[] = mockPeople.filter(p => p.mother_id === homePerson.id || p.father_id === homePerson.id).map((p): DescendantRelation => ({
        id: p.id,
        full_name: getFullName(p),
        relation: p.gender === 'Male' ? 'Son' : 'Daughter',
        generation: 1,
        side: 'N/A',
        paternal_haplogroup: p.paternal_haplogroup,
        maternal_haplogroup: p.maternal_haplogroup,
        enslaved: p.enslaved,
        dna_match: p.dna_match,
    }));

    return Promise.resolve({
        ancestry: ancestry,
        descendants: descendants,
        lateral: [],
        paternalHaplogroup: ancestry
            .filter(p => p.paternal_haplogroup)
            .map((p): HaplogroupTrace => ({
                person_id: p.person_id,
                full_name: p.full_name,
                relation: p.relation,
                generation: p.generation,
                great_degree: p.great_degree,
                paternal_haplogroup: p.paternal_haplogroup,
            })),
        maternalHaplogroup: ancestry
            .filter(p => p.maternal_haplogroup)
            .map((p): HaplogroupTrace => ({
                person_id: p.person_id,
                full_name: p.full_name,
                relation: p.relation,
                generation: p.generation,
                great_degree: p.great_degree,
                maternal_haplogroup: p.maternal_haplogroup,
            })),
        paternalEnslaved: ancestry
            .filter(p => p.enslaved && (p.side === 'Paternal' || p.side === 'N/A'))
            .map((p): EnslavedTrace => ({
                person_id: p.person_id,
                full_name: p.full_name,
                relation: p.relation,
                generation: p.generation,
                great_degree: p.great_degree,
                enslaved: p.enslaved,
            })),
        maternalEnslaved: ancestry
            .filter(p => p.enslaved && (p.side === 'Maternal' || p.side === 'N/A'))
            .map((p): EnslavedTrace => ({
                person_id: p.person_id,
                full_name: p.full_name,
                relation: p.relation,
                generation: p.generation,
                great_degree: p.great_degree,
                enslaved: p.enslaved,
            })),
    });
};

export const addPerson = async (personData: Omit<Person, 'id' | 'created_at' | 'updated_at'>): Promise<Person> => {
    const newPerson = createPerson(personData);
    if(newPerson.is_home_person) {
        mockPeople.forEach(p => p.is_home_person = false);
    }
    mockPeople.push(newPerson);
    return Promise.resolve(newPerson);
};

export const updatePerson = async (personId: string, personData: Partial<Omit<Person, 'id' | 'created_at' | 'updated_at'>>): Promise<Person> => {
    let person = mockPeople.find(p => p.id === personId);
    if (!person) throw new Error("Person not found");
    
    if(personData.is_home_person) {
        mockPeople.forEach(p => p.is_home_person = false);
    }

    Object.assign(person, personData, { updated_at: new Date().toISOString() });
    return Promise.resolve(person);
};

export const deletePerson = async (personId: string): Promise<void> => {
    mockPeople = mockPeople.filter(p => p.id !== personId);
    // Also remove from parent fields
    mockPeople.forEach(p => {
        if (p.mother_id === personId) p.mother_id = undefined;
        if (p.father_id === personId) p.father_id = undefined;
    });
    return Promise.resolve();
};

export const addMarriage = async (marriageData: Omit<Marriage, 'id' | 'created_at' | 'updated_at'>): Promise<Marriage> => {
    const newMarriage = createMarriage(marriageData);
    mockMarriages.push(newMarriage);
    return Promise.resolve(newMarriage);
};

export const updateMarriage = async (marriageId: string, marriageData: Partial<Omit<Marriage, 'id' | 'created_at' | 'updated_at'>>): Promise<Marriage> => {
    let marriage = mockMarriages.find(m => m.id === marriageId);
    if (!marriage) throw new Error("Marriage not found");
    Object.assign(marriage, marriageData, { updated_at: new Date().toISOString() });
    return Promise.resolve(marriage);
};