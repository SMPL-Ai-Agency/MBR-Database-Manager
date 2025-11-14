export type Person = {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  birth_date?: string;
  birth_date_approx?: string;
  birth_place?: string;
  death_date?: string;
  death_date_approx?: string;
  death_place?: string;
  gender?: 'Male' | 'Female' | 'Other' | 'Unknown';
  mother_id?: string;
  father_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  is_home_person: boolean;
  paternal_haplogroup?: string;
  maternal_haplogroup?: string;
  story?: string;
  suffix?: string;
  enslaved: boolean;
  other_names?: string;
  dna_match: boolean;
};

export type Marriage = {
  id: string;
  spouse1_id: string;
  spouse2_id: string;
  marriage_date?: string;
  marriage_place?: string;
  divorce_date?: string;
  divorce_place?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
};

export type AncestryRelation = {
  person_id: string;
  full_name: string;
  relation: string;
  generation: number;
  side: 'Paternal' | 'Maternal' | 'N/A';
  paternal_haplogroup?: string;
  maternal_haplogroup?: string;
  enslaved: boolean;
  dna_match: boolean;
  great_degree: number;
};

export type LateralRelation = {
  id: string;
  full_name: string;
  relation: string;
  generation: number;
  side: 'Paternal' | 'Maternal' | 'N/A';
  paternal_haplogroup?: string;
  maternal_haplogroup?: string;
  enslaved: boolean;
  dna_match: boolean;
};

export type DescendantRelation = {
  id: string;
  full_name: string;
  relation: string;
  generation: number;
  side: 'N/A';
  paternal_haplogroup?: string;
  maternal_haplogroup?: string;
  enslaved: boolean;
  dna_match: boolean;
};

export type HaplogroupTrace = {
  person_id: string;
  full_name: string;
  relation: string;
  generation: number;
  great_degree: number;
  paternal_haplogroup?: string;
  maternal_haplogroup?: string;
};

export type EnslavedTrace = {
  person_id: string;
  full_name: string;
  relation: string;
  generation: number;
  great_degree: number;
  enslaved: boolean;
};

export type GenealogyData = {
  ancestry: AncestryRelation[];
  descendants: DescendantRelation[];
  lateral: LateralRelation[];
  paternalHaplogroup: HaplogroupTrace[];
  maternalHaplogroup: HaplogroupTrace[];
  paternalEnslaved: EnslavedTrace[];
  maternalEnslaved: EnslavedTrace[];
};

// Fix: Add missing AI-related types
export type ToolCall = {
  id: string;
  name: string;
  args: any;
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'model' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
  toolName?: string;
};

export type AiSettings = {
  provider: 'gemini' | 'ollama';
  ollamaUrl: string;
  model: string;
  systemPrompt: string;
};
