CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

CREATE OR REPLACE VIEW public.paternal_haplogroup_trace AS
SELECT full_name, relation, generation, great_degree, paternal_haplogroup
FROM public.ancestry_relations
WHERE side IN ('Paternal','N/A')
ORDER BY generation ASC;

CREATE OR REPLACE VIEW public.maternal_haplogroup_trace AS
SELECT full_name, relation, generation, great_degree, maternal_haplogroup
FROM public.ancestry_relations
WHERE side IN ('Maternal','N/A')
ORDER BY generation ASC;

CREATE OR REPLACE VIEW public.paternal_enslaved_trace AS
SELECT full_name, relation, generation, great_degree, enslaved
FROM public.ancestry_relations
WHERE side IN ('Paternal','N/A') AND enslaved = TRUE
ORDER BY generation ASC;

CREATE OR REPLACE VIEW public.maternal_enslaved_trace AS
SELECT full_name, relation, generation, great_degree, enslaved
FROM public.ancestry_relations
WHERE side IN ('Maternal','N/A') AND enslaved = TRUE
ORDER BY generation ASC;

CREATE OR REPLACE VIEW public.lateral_relations AS
WITH home AS (
    SELECT id AS home_id, mother_id, father_id
    FROM public.persons
    WHERE is_home_person = TRUE
),

siblings AS (
    SELECT 
        p.id,
        TRIM(CONCAT(
            p.first_name, ' ', COALESCE(p.middle_name,''), ' ', p.last_name, ' ',
            COALESCE(p.suffix,''), COALESCE(' ('||p.other_names||')','')
        )) AS full_name,
        CASE p.gender 
            WHEN 'Male' THEN 'Brother'
            WHEN 'Female' THEN 'Sister'
            ELSE 'Sibling'
        END AS relation,
        0 AS generation,
        'N/A' AS side,
        p.paternal_haplogroup,
        p.maternal_haplogroup,
        p.enslaved,
        p.dna_match
    FROM public.persons p
    INNER JOIN home h 
        ON (p.mother_id = h.mother_id OR p.father_id = h.father_id)
       AND p.id <> h.home_id
),

aunts_uncles AS (
    SELECT
        p.id,
        TRIM(CONCAT(
            p.first_name, ' ', COALESCE(p.middle_name,''), ' ', p.last_name, ' ',
            COALESCE(p.suffix,''), COALESCE(' ('||p.other_names||')','')
        )) AS full_name,
        CASE 
            WHEN p.gender = 'Male' THEN 
                CASE WHEN p.mother_id = gp.mother_id THEN 'Maternal Uncle'
                     WHEN p.father_id = gp.father_id THEN 'Paternal Uncle'
                     ELSE 'Uncle'
                END
            WHEN p.gender = 'Female' THEN
                CASE WHEN p.mother_id = gp.mother_id THEN 'Maternal Aunt'
                     WHEN p.father_id = gp.father_id THEN 'Paternal Aunt'
                     ELSE 'Aunt'
                END
            ELSE 'Aunt/Uncle'
        END AS relation,
        -1 AS generation,
        CASE
            WHEN p.mother_id = gp.mother_id THEN 'Maternal'
            WHEN p.father_id = gp.father_id THEN 'Paternal'
            ELSE 'N/A'
        END AS side,
        p.paternal_haplogroup,
        p.maternal_haplogroup,
        p.enslaved,
        p.dna_match
    FROM public.persons p
    INNER JOIN home h ON TRUE
    INNER JOIN public.persons gp 
        ON gp.id = h.mother_id OR gp.id = h.father_id
    WHERE 
        (p.mother_id = gp.mother_id OR p.father_id = gp.father_id)
        AND p.id <> gp.id
),

nieces_nephews AS (
    SELECT
        p.id,
        TRIM(CONCAT(
            p.first_name, ' ', COALESCE(p.middle_name,''), ' ', p.last_name, ' ',
            COALESCE(p.suffix,''), COALESCE(' ('||p.other_names||')','')
        )) AS full_name,
        CASE p.gender
            WHEN 'Male' THEN 'Nephew'
            WHEN 'Female' THEN 'Niece'
            ELSE 'Niece/Nephew'
        END AS relation,
        1 AS generation,
        'N/A' AS side,
        p.paternal_haplogroup,
        p.maternal_haplogroup,
        p.enslaved,
        p.dna_match
    FROM public.persons p
    INNER JOIN siblings s ON p.mother_id = s.id OR p.father_id = s.id
),

cousins AS (
    SELECT
        c.id,
        TRIM(CONCAT(
            c.first_name, ' ', COALESCE(c.middle_name,''), ' ', c.last_name, ' ',
            COALESCE(c.suffix,''), COALESCE(' ('||c.other_names||')','')
        )) AS full_name,
        'Cousin' AS relation,
        0 AS generation,
        'N/A' AS side,
        c.paternal_haplogroup,
        c.maternal_haplogroup,
        c.enslaved,
        c.dna_match
    FROM public.persons c
    INNER JOIN aunts_uncles au 
        ON c.mother_id = au.id OR c.father_id = au.id
)

SELECT * FROM siblings
UNION ALL
SELECT * FROM aunts_uncles
UNION ALL
SELECT * FROM nieces_nephews
UNION ALL
SELECT * FROM cousins;

CREATE OR REPLACE VIEW public.descendants_relations AS
WITH RECURSIVE descendants_tree AS (
  SELECT
    p.id,
    TRIM(CONCAT(
      p.first_name,' ',COALESCE(p.middle_name,''),' ',p.last_name,' ',
      COALESCE(p.suffix,''),COALESCE(' ('||p.other_names||')','')
    )) AS full_name,
    CASE p.gender WHEN 'Male' THEN 'Son'
                  WHEN 'Female' THEN 'Daughter'
                  ELSE 'Child'
    END AS relation,
    1 AS generation,
    'N/A' AS side,
    p.paternal_haplogroup,
    p.maternal_haplogroup,
    p.enslaved,
    p.dna_match
  FROM public.persons p
  INNER JOIN public.persons home
    ON (p.mother_id = home.id OR p.father_id = home.id)
   AND home.is_home_person = TRUE

  UNION ALL

  SELECT
    child.id,
    TRIM(CONCAT(
      child.first_name,' ',COALESCE(child.middle_name,''),' ',child.last_name,' ',
      COALESCE(child.suffix,''),COALESCE(' ('||child.other_names||')','')
    )) AS full_name,
    CONCAT(
      REPEAT('Great-', GREATEST(descendants_tree.generation - 1,0)),
      CASE child.gender WHEN 'Male' THEN 'Grandson'
                        WHEN 'Female' THEN 'Granddaughter'
                        ELSE 'Grandchild'
      END
    ) AS relation,
    descendants_tree.generation + 1 AS generation,
    'N/A' AS side,
    child.paternal_haplogroup,
    child.maternal_haplogroup,
    child.enslaved,
    child.dna_match
  FROM public.persons child
  INNER JOIN descendants_tree
    ON child.mother_id = descendants_tree.id OR child.father_id = descendants_tree.id
)
SELECT *
FROM descendants_tree
ORDER BY generation ASC;

CREATE TABLE IF NOT EXISTS public.dataset (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  query TEXT NOT NULL,
  response TEXT NOT NULL,
  example_type TEXT NOT NULL,
  source TEXT NOT NULL,
  context JSONB,
  derived_from UUID,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE c.conname = 'dataset_derived_from_fk'
      AND n.nspname = 'public'
      AND t.relname = 'dataset'
  ) THEN
    ALTER TABLE public.dataset
      ADD CONSTRAINT dataset_derived_from_fk
      FOREIGN KEY (derived_from)
      REFERENCES public.dataset(id)
      ON DELETE SET NULL;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'dataset_timestamp') THEN
    CREATE TRIGGER dataset_timestamp
      BEFORE UPDATE ON public.dataset
      FOR EACH ROW
      EXECUTE FUNCTION public.update_timestamp();
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  query TEXT NOT NULL,
  response TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating IN (-1,1)),
  comments TEXT,
  person_id UUID REFERENCES public.persons(id),
  marriage_id UUID REFERENCES public.marriages(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chat_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent TEXT NOT NULL,
  user_message TEXT NOT NULL,
  agent_response TEXT NOT NULL,
  person_id UUID REFERENCES public.persons(id),
  marriage_id UUID REFERENCES public.marriages(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.marriages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.dataset ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polname = 'persons_select'
      AND polrelid = 'public.persons'::regclass
  ) THEN
    CREATE POLICY persons_select
      ON public.persons
      FOR SELECT
      TO PUBLIC
      USING (true);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polname = 'persons_insert'
      AND polrelid = 'public.persons'::regclass
  ) THEN
    CREATE POLICY persons_insert
      ON public.persons
      FOR INSERT
      TO authenticated
      WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polname = 'persons_update'
      AND polrelid = 'public.persons'::regclass
  ) THEN
    CREATE POLICY persons_update
      ON public.persons
      FOR UPDATE
      TO authenticated
      USING ((SELECT auth.uid()) IS NOT NULL)
      WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polname = 'marriages_select'
      AND polrelid = 'public.marriages'::regclass
  ) THEN
    CREATE POLICY marriages_select
      ON public.marriages
      FOR SELECT
      TO PUBLIC
      USING (true);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polname = 'marriages_insert'
      AND polrelid = 'public.marriages'::regclass
  ) THEN
    CREATE POLICY marriages_insert
      ON public.marriages
      FOR INSERT
      TO authenticated
      WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polname = 'marriages_update'
      AND polrelid = 'public.marriages'::regclass
  ) THEN
    CREATE POLICY marriages_update
      ON public.marriages
      FOR UPDATE
      TO authenticated
      USING ((SELECT auth.uid()) IS NOT NULL)
      WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polname = 'dataset_select'
      AND polrelid = 'public.dataset'::regclass
  ) THEN
    CREATE POLICY dataset_select
      ON public.dataset
      FOR SELECT
      TO PUBLIC
      USING (true);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polname = 'dataset_insert'
      AND polrelid = 'public.dataset'::regclass
  ) THEN
    CREATE POLICY dataset_insert
      ON public.dataset
      FOR INSERT
      TO authenticated
      WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polname = 'dataset_update'
      AND polrelid = 'public.dataset'::regclass
  ) THEN
    CREATE POLICY dataset_update
      ON public.dataset
      FOR UPDATE
      TO authenticated
      USING ((SELECT auth.uid()) IS NOT NULL)
      WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polname = 'feedback_select'
      AND polrelid = 'public.feedback'::regclass
  ) THEN
    CREATE POLICY feedback_select
      ON public.feedback
      FOR SELECT
      TO PUBLIC
      USING (true);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polname = 'feedback_insert'
      AND polrelid = 'public.feedback'::regclass
  ) THEN
    CREATE POLICY feedback_insert
      ON public.feedback
      FOR INSERT
      TO authenticated
      WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polname = 'chat_history_select'
      AND polrelid = 'public.chat_history'::regclass
  ) THEN
    CREATE POLICY chat_history_select
      ON public.chat_history
      FOR SELECT
      TO PUBLIC
      USING (true);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polname = 'chat_history_insert'
      AND polrelid = 'public.chat_history'::regclass
  ) THEN
    CREATE POLICY chat_history_insert
      ON public.chat_history
      FOR INSERT
      TO authenticated
      WITH CHECK ((SELECT auth.uid()) IS NOT NULL);
  END IF;
END;
$$;
