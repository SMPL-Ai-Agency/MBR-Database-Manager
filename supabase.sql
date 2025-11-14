-- Ensure uuid extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================
-- Helper: create_policy_if_missing
-- Creates a policy only when not present
-- ============================
DO $$
BEGIN
  -- no-op placeholder to ensure DO block capability
  NULL;
END
$$;

-- =====================================================
-- Functions: update_timestamp, enforce_single_home_person
-- (with hardened search_path)
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
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

-- =====================================================
-- Table: persons
-- =====================================================
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
  gender TEXT CHECK (gender IN ('Male', 'Female', 'Other', 'Unknown')),
  mother_id UUID REFERENCES public.persons(id) ON DELETE SET NULL,
  father_id UUID REFERENCES public.persons(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_home_person BOOLEAN DEFAULT FALSE,
  paternal_haplogroup TEXT,
  maternal_haplogroup TEXT,
  story TEXT,
  suffix TEXT,
  enslaved BOOLEAN DEFAULT FALSE,
  other_names TEXT,
  dna_match BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_persons_name ON public.persons (first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_persons_birth_date ON public.persons (birth_date);
CREATE INDEX IF NOT EXISTS idx_persons_parents ON public.persons (mother_id, father_id);

-- =====================================================
-- Triggers for persons (created only if missing)
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_persons_timestamp'
  ) THEN
    CREATE TRIGGER update_persons_timestamp
    BEFORE UPDATE ON public.persons
    FOR EACH ROW
    EXECUTE FUNCTION public.update_timestamp();
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_single_home_person'
  ) THEN
    CREATE TRIGGER trigger_single_home_person
    BEFORE INSERT OR UPDATE ON public.persons
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_single_home_person();
  END IF;
END
$$;

-- =====================================================
-- Table: marriages
-- =====================================================
CREATE TABLE IF NOT EXISTS public.marriages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spouse1_id UUID NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  spouse2_id UUID NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  marriage_date DATE,
  marriage_place TEXT,
  divorce_date DATE,
  divorce_place TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (spouse1_id, spouse2_id)
);

CREATE INDEX IF NOT EXISTS idx_marriages_spouses ON public.marriages (spouse1_id, spouse2_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_marriages_timestamp'
  ) THEN
    CREATE TRIGGER update_marriages_timestamp
    BEFORE UPDATE ON public.marriages
    FOR EACH ROW
    EXECUTE FUNCTION public.update_timestamp();
  END IF;
END
$$;

-- =====================================================
-- Drop old views to avoid column rename conflicts
-- =====================================================
DROP VIEW IF EXISTS public.maternal_enslaved_trace CASCADE;
DROP VIEW IF EXISTS public.paternal_enslaved_trace CASCADE;
DROP VIEW IF EXISTS public.maternal_haplogroup_trace CASCADE;
DROP VIEW IF EXISTS public.paternal_haplogroup_trace CASCADE;
DROP VIEW IF EXISTS public.ancestry_relations CASCADE;
DROP VIEW IF EXISTS public.lateral_relations CASCADE;
DROP VIEW IF EXISTS public.descendants_relations CASCADE;

-- =====================================================
-- View: ancestry_relations
-- =====================================================
CREATE OR REPLACE VIEW public.ancestry_relations AS
WITH RECURSIVE ancestry_tree AS (
  SELECT
    p.id,
    TRIM(CONCAT(
      p.first_name, ' ', COALESCE(p.middle_name, ''), ' ', p.last_name, ' ',
      COALESCE(p.suffix, ''), COALESCE(' (' || p.other_names || ')', '')
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
      parent.first_name, ' ', COALESCE(parent.middle_name, ''), ' ', parent.last_name, ' ',
      COALESCE(parent.suffix, ''), COALESCE(' (' || parent.other_names || ')', '')
    )) AS full_name,
    CASE
      WHEN ancestry_tree.generation = 0 THEN
        CASE
          WHEN ancestry_tree.mother_id = parent.id THEN 'Mother'
          WHEN ancestry_tree.father_id = parent.id THEN 'Father'
        END
      ELSE
        CONCAT(
          ancestry_tree.root_side,
          ' ',
          REPEAT('Great-', ancestry_tree.generation - 1),
          'Grand',
          CASE
            WHEN ancestry_tree.mother_id = parent.id THEN 'mother'
            WHEN ancestry_tree.father_id = parent.id THEN 'father'
          END
        )
    END AS relation,
    ancestry_tree.generation + 1 AS generation,
    CASE
      WHEN ancestry_tree.generation = 0 THEN
        CASE
          WHEN ancestry_tree.mother_id = parent.id THEN 'Maternal'
          WHEN ancestry_tree.father_id = parent.id THEN 'Paternal'
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
  WHERE parent.id IS NOT NULL
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

-- =====================================================
-- Haplogroup and Enslaved Traces
-- =====================================================
CREATE OR REPLACE VIEW public.paternal_haplogroup_trace AS
SELECT full_name, relation, generation, great_degree, paternal_haplogroup
FROM public.ancestry_relations
WHERE side IN ('Paternal', 'N/A')
ORDER BY generation ASC;

CREATE OR REPLACE VIEW public.maternal_haplogroup_trace AS
SELECT full_name, relation, generation, great_degree, maternal_haplogroup
FROM public.ancestry_relations
WHERE side IN ('Maternal', 'N/A')
ORDER BY generation ASC;

CREATE OR REPLACE VIEW public.paternal_enslaved_trace AS
SELECT full_name, relation, generation, great_degree, enslaved
FROM public.ancestry_relations
WHERE side IN ('Paternal', 'N/A') AND enslaved = TRUE
ORDER BY generation ASC;

CREATE OR REPLACE VIEW public.maternal_enslaved_trace AS
SELECT full_name, relation, generation, great_degree, enslaved
FROM public.ancestry_relations
WHERE side IN ('Maternal', 'N/A') AND enslaved = TRUE
ORDER BY generation ASC;

-- =====================================================
-- View: lateral_relations
-- =====================================================
CREATE OR REPLACE VIEW public.lateral_relations AS
WITH home AS (
  SELECT id AS home_id, mother_id, father_id
  FROM public.persons
  WHERE is_home_person = TRUE
),
siblings AS (
  SELECT p.id,
    TRIM(CONCAT(p.first_name, ' ', COALESCE(p.middle_name, ''), ' ', p.last_name, ' ', COALESCE(p.suffix, ''), COALESCE(' (' || p.other_names || ')', ''))) AS full_name,
    CASE p.gender WHEN 'Male' THEN 'Brother' WHEN 'Female' THEN 'Sister' ELSE 'Sibling' END AS relation,
    0 AS generation,
    'N/A' AS side,
    p.paternal_haplogroup,
    p.maternal_haplogroup,
    p.enslaved,
    p.dna_match
  FROM public.persons p
  INNER JOIN home h ON (p.mother_id = h.mother_id OR p.father_id = h.father_id) AND p.id <> h.home_id
),
children AS (
  SELECT p.id,
    TRIM(CONCAT(p.first_name, ' ', COALESCE(p.middle_name, ''), ' ', p.last_name, ' ', COALESCE(p.suffix, ''), COALESCE(' (' || p.other_names || ')', ''))) AS full_name,
    CASE p.gender WHEN 'Male' THEN 'Son' WHEN 'Female' THEN 'Daughter' ELSE 'Child' END AS relation,
    1 AS generation,
    'N/A' AS side,
    p.paternal_haplogroup,
    p.maternal_haplogroup,
    p.enslaved,
    p.dna_match
  FROM public.persons p
  INNER JOIN home h ON p.mother_id = h.home_id OR p.father_id = h.home_id
),
uncles_aunts AS (
  SELECT p.id,
    TRIM(CONCAT(p.first_name, ' ', COALESCE(p.middle_name, ''), ' ', p.last_name, ' ', COALESCE(p.suffix, ''), COALESCE(' (' || p.other_names || ')', ''))) AS full_name,
    CASE
      WHEN p.gender = 'Male' AND gp.mother_id = p.mother_id THEN 'Maternal Uncle'
      WHEN p.gender = 'Female' AND gp.mother_id = p.mother_id THEN 'Maternal Aunt'
      WHEN p.gender = 'Male' AND gp.father_id = p.father_id THEN 'Paternal Uncle'
      WHEN p.gender = 'Female' AND gp.father_id = p.father_id THEN 'Paternal Aunt'
      ELSE 'Uncle/Aunt'
    END AS relation,
    -1 AS generation,
    CASE
      WHEN gp.mother_id = p.mother_id THEN 'Maternal'
      WHEN gp.father_id = p.father_id THEN 'Paternal'
      ELSE 'N/A'
    END AS side,
    p.paternal_haplogroup,
    p.maternal_haplogroup,
    p.enslaved,
    p.dna_match
  FROM public.persons p
  INNER JOIN public.persons gp ON (p.mother_id = gp.mother_id OR p.father_id = gp.father_id) AND p.id <> gp.id
  INNER JOIN home h ON gp.id = h.mother_id OR gp.id = h.father_id
)
SELECT * FROM siblings
UNION ALL
SELECT * FROM children
UNION ALL
SELECT * FROM uncles_aunts;

-- =====================================================
-- Indexes for parents
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_persons_mother_id ON public.persons (mother_id);
CREATE INDEX IF NOT EXISTS idx_persons_father_id ON public.persons (father_id);

-- =====================================================
-- View: descendants_relations
-- =====================================================
CREATE OR REPLACE VIEW public.descendants_relations AS
WITH RECURSIVE descendants_tree AS (
  SELECT
    p.id,
    TRIM(CONCAT(
      p.first_name, ' ', COALESCE(p.middle_name, ''), ' ', p.last_name, ' ',
      COALESCE(p.suffix, ''), COALESCE(' (' || p.other_names || ')', '')
    )) AS full_name,
    CASE p.gender WHEN 'Male' THEN 'Son' WHEN 'Female' THEN 'Daughter' ELSE 'Child' END AS relation,
    1 AS generation,
    'N/A' AS side,
    p.paternal_haplogroup,
    p.maternal_haplogroup,
    p.enslaved,
    p.dna_match
  FROM public.persons p
  INNER JOIN public.persons home ON (p.mother_id = home.id OR p.father_id = home.id) AND home.is_home_person = TRUE

  UNION ALL

  SELECT
    child.id,
    TRIM(CONCAT(
      child.first_name, ' ', COALESCE(child.middle_name, ''), ' ', child.last_name, ' ',
      COALESCE(child.suffix, ''), COALESCE(' (' || child.other_names || ')', '')
    )) AS full_name,
    CONCAT(
      REPEAT('Great-', descendants_tree.generation - 1),
      CASE child.gender WHEN 'Male' THEN 'Grandson' WHEN 'Female' THEN 'Granddaughter' ELSE 'Grandchild' END
    ) AS relation,
    descendants_tree.generation + 1 AS generation,
    'N/A' AS side,
    child.paternal_haplogroup,
    child.maternal_haplogroup,
    child.enslaved,
    child.dna_match
  FROM public.persons child
  INNER JOIN descendants_tree ON child.mother_id = descendants_tree.id OR child.father_id = descendants_tree.id
  WHERE child.id IS NOT NULL
)
SELECT * FROM descendants_tree
ORDER BY generation ASC;

-- =====================================================
-- Row-Level Security for public.marriages: "Public read / authenticated write"
-- Create policies only if they do not exist (safe, idempotent)
-- =====================================================

-- 1) Revoke broad privileges from anon/authenticated (precaution)
REVOKE ALL ON public.marriages FROM anon, authenticated;

-- 2) Enable Row Level Security
ALTER TABLE public.marriages ENABLE ROW LEVEL SECURITY;

-- 3) Create SELECT policy if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'marriages' AND policyname = 'public_read_select'
  ) THEN
    EXECUTE $sql$
      CREATE POLICY public_read_select ON public.marriages
        FOR SELECT
        TO anon, authenticated, public
        USING (true);
    $sql$;
  END IF;
END
$$;

-- 4) Create INSERT policy if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'marriages' AND policyname = 'authenticated_insert'
  ) THEN
    EXECUTE $sql$
      CREATE POLICY authenticated_insert ON public.marriages
        FOR INSERT
        TO authenticated
        WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
    $sql$;
  END IF;
END
$$;

-- 5) Create UPDATE policy if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'marriages' AND policyname = 'authenticated_update'
  ) THEN
    EXECUTE $sql$
      CREATE POLICY authenticated_update ON public.marriages
        FOR UPDATE
        TO authenticated
        USING ((SELECT auth.uid()) IS NOT NULL)
        WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
    $sql$;
  END IF;
END
$$;

-- 6) Create DELETE policy if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'marriages' AND policyname = 'authenticated_delete'
  ) THEN
    EXECUTE $sql$
      CREATE POLICY authenticated_delete ON public.marriages
        FOR DELETE
        TO authenticated
        USING ((SELECT auth.uid()) IS NOT NULL);
    $sql$;
  END IF;
END
$$;

-- 7) Ensure index exists (already created above, keep for idempotency)
CREATE INDEX IF NOT EXISTS idx_marriages_spouses ON public.marriages (spouse1_id, spouse2_id);
