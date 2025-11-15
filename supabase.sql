CREATE OR REPLACE VIEW public.lateral_relations AS
WITH home AS (
    SELECT id AS home_id, mother_id, father_id
    FROM public.persons
    WHERE is_home_person = TRUE
),

-- siblings and half-siblings
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

-- aunts and uncles
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

-- nieces and nephews
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

-- cousins (children of aunts/uncles)
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
