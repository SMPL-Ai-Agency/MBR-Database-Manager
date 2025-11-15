CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_single_home_person()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.is_home_person = TRUE THEN
    UPDATE public.persons
      SET is_home_person = FALSE
      WHERE id <> NEW.id AND is_home_person = TRUE;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.persons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  birth_date DATE,
  birth_date_approx TEXT,
  birth_place TEXT,
  death_date DATE,
  death_date_approx TEXT,
  death_place TEXT,
  gender TEXT CHECK (gender IN ('Male','Female','Other','Unknown')),
  mother_id UUID REFERENCES public.persons(id) ON DELETE SET NULL,
  father_id UUID REFERENCES public.persons(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_home_person BOOLEAN DEFAULT FALSE,
  paternal_haplogroup TEXT,
  maternal_haplogroup TEXT,
  story TEXT,
  suffix TEXT,
  enslaved BOOLEAN DEFAULT FALSE,
  other_names TEXT,
  dna_match BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_persons_name ON public.persons(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_persons_birth_date ON public.persons(birth_date);
CREATE INDEX IF NOT EXISTS idx_persons_parents ON public.persons(mother_id, father_id);
CREATE INDEX IF NOT EXISTS idx_persons_mother_id ON public.persons(mother_id);
CREATE INDEX IF NOT EXISTS idx_persons_father_id ON public.persons(father_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_persons_timestamp') THEN
    CREATE TRIGGER update_persons_timestamp
      BEFORE UPDATE ON public.persons
      FOR EACH ROW
      EXECUTE FUNCTION public.update_timestamp();
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_single_home_person') THEN
    CREATE TRIGGER trigger_single_home_person
      BEFORE INSERT OR UPDATE ON public.persons
      FOR EACH ROW
      EXECUTE FUNCTION public.enforce_single_home_person();
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.marriages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spouse1_id UUID NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  spouse2_id UUID NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  marriage_date DATE,
  marriage_place TEXT,
  divorce_date DATE,
  divorce_place TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (spouse1_id, spouse2_id)
);

CREATE INDEX IF NOT EXISTS idx_marriages_spouses ON public.marriages(spouse1_id, spouse2_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_marriages_timestamp') THEN
    CREATE TRIGGER update_marriages_timestamp
      BEFORE UPDATE ON public.marriages
      FOR EACH ROW
      EXECUTE FUNCTION public.update_timestamp();
  END IF;
END;
$$;

DROP VIEW IF EXISTS public.maternal_enslaved_trace CASCADE;
DROP VIEW IF EXISTS public.paternal_enslaved_trace CASCADE;
DROP VIEW IF EXISTS public.maternal_haplogroup_trace CASCADE;
DROP VIEW IF EXISTS public.paternal_haplogroup_trace CASCADE;
DROP VIEW IF EXISTS public.ancestry_relations CASCADE;
DROP VIEW IF EXISTS public.lateral_relations CASCADE;
DROP VIEW IF EXISTS public.descendants_relations CASCADE;

CREATE OR REPLACE VIEW public.ancestry_relations AS
WITH RECURSIVE ancestry_tree AS (
  SELECT
    p.id,
    TRIM(CONCAT(
      p.first_name, ' ', COALESCE(p.middle_name,''), ' ', p.last_name, ' ',
      COALESCE(p.suffix,''), COALESCE(' ('||p.other_names||')','')
    )) AS full_name,
    'Self' AS relation,
    0 AS generation,
    'N/A' AS root_side,
    p.mother_id,
    p.father_id,
    p.paternal_haplogroup,
    p.maternal_haplogroup,
    p.enslaved,
    p.dna_match
  FROM public.persons p
  WHERE p.is_home_person = TRUE

  UNION ALL

  SELECT
    parent.id,
    TRIM(CONCAT(
      parent.first_name, ' ', COALESCE(parent.middle_name,''), ' ', parent.last_name, ' ',
      COALESCE(parent.suffix,''), COALESCE(' ('||parent.other_names||')','')
    )) AS full_name,
    CASE
      WHEN ancestry_tree.generation = 0 THEN
        CASE WHEN ancestry_tree.mother_id = parent.id THEN 'Mother'
             WHEN ancestry_tree.father_id = parent.id THEN 'Father'
        END
      ELSE
        CONCAT(
          ancestry_tree.root_side, ' ',
          REPEAT('Great-', GREATEST(ancestry_tree.generation - 1,0)),
          'Grand',
          CASE
            WHEN ancestry_tree.mother_id = parent.id THEN 'mother'
            WHEN ancestry_tree.father_id = parent.id THEN 'father'
            ELSE ''
          END
        )
    END AS relation,
    ancestry_tree.generation + 1 AS generation,
    CASE
      WHEN ancestry_tree.generation = 0 THEN
        CASE WHEN ancestry_tree.mother_id = parent.id THEN 'Maternal'
             WHEN ancestry_tree.father_id = parent.id THEN 'Paternal'
             ELSE ancestry_tree.root_side
        END
      ELSE ancestry_tree.root_side
    END AS root_side,
    parent.mother_id,
    parent.father_id,
    parent.paternal_haplogroup,
    parent.maternal_haplogroup,
    parent.enslaved,
    parent.dna_match
  FROM public.persons parent
  INNER JOIN ancestry_tree
    ON parent.id = ancestry_tree.mother_id OR parent.id = ancestry_tree.father_id
)
SELECT
  id AS person_id,
  full_name,
  relation,
  generation,
  root_side AS side,
  paternal_haplogroup,
  maternal_haplogroup,
  enslaved,
  dna_match,
  CASE WHEN generation >= 2 THEN generation - 2 ELSE 0 END AS great_degree
FROM ancestry_tree;
