# n8n Workflow Specification  
## Dataset Refinement + Supabase Synchronization  
### (Aligned With Final SQL Schema)

---

## Overview

This workflow powers the Dataset Agent (Agent 2) and automates the generation, refinement, and synchronization of dataset rows stored across:

- **Supabase** (`dataset`, `feedback`, `chat_history`)
- **Google Sheets**
- **Optional:** `dataset_sheet_mirror` (Supabase sync table)

It ensures Agent 2 always works with correct Supabase data and uses all relational context from your views (`ancestry_relations`, `descendants_relations`, `lateral_relations`, and all trace views).

---

# 1. Trigger

### Webhook Input:
- `feedback_id`
- `query`
- `response`
- `comments`
- `timestamp`

Triggered when:
- Feedback is saved
- User clicks "Refine Dataset"
- App requests dataset expansion

---

# 2. Fetch Feedback Row

Using Supabase node:

```sql
SELECT * 
FROM public.feedback 
WHERE id = $1;
```

Extract:
- Query
- Response
- Rating
- Comments
- Linked person/marriage IDs

---

# 3. Fetch Related Chat History

```sql
SELECT *
FROM public.chat_history
WHERE user_message ILIKE '%' || $1 || '%'
ORDER BY created_at DESC
LIMIT 10;
```

Purpose:
- Provide context continuity
- Detect earlier mistakes
- Improve dataset consistency

---

# 4. Fetch Genealogical Context (ALL VIEWS)

The workflow loads structural context from the Supabase database:

```sql
SELECT * FROM public.ancestry_relations;
SELECT * FROM public.descendants_relations;
SELECT * FROM public.lateral_relations;

SELECT * FROM public.paternal_haplogroup_trace;
SELECT * FROM public.maternal_haplogroup_trace;
SELECT * FROM public.paternal_enslaved_trace;
SELECT * FROM public.maternal_enslaved_trace;
```

Plus base tables:

```sql
SELECT * FROM public.persons;
SELECT * FROM public.marriages;
```

Filtering is done using:
- Person IDs in feedback
- Keywords in feedback query
- Keywords in chat history

---

# 5. Anonymization Step

Workflow converts personally identifiable information into placeholders:

- George Freeney Jr → {{PERSON_1}}
- Ancestor X → {{PERSON_2}}
- City names (optional) → generalized region tags

Dates may be kept or coarsened depending on desired privacy.

---

# 6. Generate 3–5 New Dataset Entries

Using GPT-OSS (Ollama) or Gemini node.

AI must produce array items:

```json
{
  "query": "...",
  "response": "...",
  "example_type": "genealogy_factual | correction | narrative | qa_pair",
  "source": "feedback | agent_generated | manual | view:paternal_enslaved_trace",
  "context": { ... },
  "derived_from": "<UUID or null>"
}
```

Context includes:
- ancestry view rows
- descendants rows
- lateral relations
- enslaved traces
- haplogroup traces
- anonymized people/marriages
- chat history excerpts

---

# 7. Append Dataset Rows to Google Sheet

For each generated item:
- Append as a new sheet row
- Include JSON-encoded `context`

Columns:
- Query  
- Response  
- Example Type  
- Source  
- Context JSON  
- Timestamp

---

# 8. Mirror Data Back to Supabase

(Two-way sync)

Upsert into:

```sql
INSERT INTO public.dataset (
  query,
  response,
  example_type,
  source,
  context,
  derived_from
)
VALUES (...)
RETURNING id;
```

Optional mirror table:

```sql
INSERT INTO public.dataset_sheet_mirror (
  sheet_row_id,
  query,
  response,
  example_type,
  source,
  context
)
VALUES (...);
```

This ensures:
- Dataset is always available even if Sheets becomes inconsistent
- Agent 2 can track dataset lineage

---

# 9. Post-Generation Validation

Check that:
- At least 3 valid entries were created
- All required fields exist
- No empty strings
- Example types are valid
- Context JSON parses correctly

If validation fails:
- Retry the AI step (max retries configured)
- Log errors

---

# 10. Error Handling

If any Supabase or AI step fails:

- Send error email  
- Log to:
  - `feedback`
  - `chat_history`
  - Optional: `logs` table  
- Return structured error response to app

---

# 11. Completion Webhook

Return:
- Status ("ok")
- Number of dataset rows added
- Dataset row UUIDs
- Total dataset size after insertion

---

# 12. Daily Batch Scheduler

Nightly run:
- Fetch unrefined feedback rows
- Auto-generate dataset entries
- Auto-append to sheet + Supabase
- Email summary
