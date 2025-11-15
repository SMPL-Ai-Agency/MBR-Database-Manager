# My Black :[ROOTS] Database Manager
## Functional Specification (Aligned With SQL Schema)

---

## Executive Summary

My Black :[ROOTS] Database Manager is a browser-based genealogy and AI dataset-building system designed to preserve, explore, and elevate Black family heritage. The application integrates structured genealogy management, AI-assisted insights, dataset creation for custom model fine-tuning, and a built-in cultural feedback loop.

The backend is powered by a Supabase PostgreSQL database containing:

- **Core Tables:** `persons`, `marriages`
- **Relationship Views:** `ancestry_relations`, `descendants_relations`, `lateral_relations`
- **Trace Views:** paternal/maternal haplogroup & enslaved traces
- **AI Tables:** `dataset`, `feedback`, `chat_history`

Two AI agents drive the experience:
- **Agent 1:** Genealogy expert using views and feedback memory.
- **Agent 2:** Dataset builder that converts user interactions, feedback, and genealogy records into training examples for models such as gpt-oss:20b and 120b.

This system turns personal Black family history into a living AI-powered knowledge environment.

---

# 1. High-Level Overview

## Purpose 1 — Genealogy Management

The application uses the `persons` and `marriages` tables plus multiple recursive and contextual views to allow users to:

- Build and manage complete family trees.
- Track enslaved ancestors (`enslaved` flag).
- Track DNA matches, stories, alt names, haplogroups.
- Explore relationships:
  - **Ancestry:** parents → grandparents → great-generations  
  - **Descendants:** children → grandchildren → great-grandchildren  
  - **Lateral:** siblings, aunts/uncles, nieces/nephews, cousins  
- Analyze Black historical patterns such as:
  - Migration paths  
  - Haplogroup origins  
  - Lineage branches affected by slavery  

Users can query:
- “List my paternal enslaved ancestors.”
- “Show cousins on my maternal side.”
- “Explain my Y-haplogroup migration.”

Agent 1 uses all SQL views to provide direct, accurate answers.

---

## Purpose 2 — Dataset Building for AI Fine-Tuning

The `dataset` table stores examples for training AI models.  
Each row contains:

- `query`, `response`
- `example_type`
- `source`
- `context` (structured JSONB)
- `derived_from`
- Versioning and timestamps

Agent 2 builds new dataset entries by:

1. Pulling context from:
   - `persons`
   - `marriages`
   - All major relationship views
   - `feedback`
   - `chat_history`
2. Anonymizing personal data.
3. Generating high-quality training pairs.
4. Storing them in:
   - Google Sheets  
   - `dataset` table in Supabase  
   - Optional: `dataset_sheet_mirror`

This produces a clean dataset ready for Ollama fine-tuning.

---

## Purpose 3 — Feedback Loop (Self-Improving AI)

The `feedback` table captures:

- Query  
- Response  
- Rating (+1 / −1)  
- Comments  
- Optional person/marriage references  

This feedback directly affects:

- Agent 1: Prevents repeated mistakes, applies prior corrections.
- Agent 2: Builds improved dataset examples automatically.

---

# 2. User Flows and Features

## 2.1 Initial Setup
- Configure Supabase URL & key.
- Test database structure.
- Optionally enter Demo Mode (preloaded data).

## 2.2 Navigation
- Dashboard
- People
- Datasets
- Feedback
- Settings (DB + agents + theme)

---

## 2.3 Settings View

**Database Connection:**  
- Tests all required tables + views.

**Agent 1 — Genealogy Q&A:**  
- Uses views + persons + marriages + feedback.

**Agent 2 — Dataset Builder:**  
- Uses dataset + feedback + chat_history + all relationship views.

---

## 2.4 Dashboard View

Shows:
**NOTE:** Anything already existing in the current UI. Never remove what is there unless directed. This spec was written after the UI protype was built and only needs adjust. The items below may or may not be present already. If not add them if so adjust as directed.
- Home person
- Ancestry view summary  
- Descendants view summary  
- Lateral relations (siblings, aunts/uncles, nieces, nephews, cousins)
- Enslaved traces  
- Haplogroup traces  
- Dataset summary  
- Feedback summary  
- Chat panels for both agents

---

## 2.5 People List View

Search and manage:
- Names, dates, gender
- Parents
- Haplogroups
- Enslaved and DNA flags
- Set Home Person  
- Add selected person to dataset (Agent 2)

---

## 2.6 Data Entry and Viewing

Every field aligns exactly with your SQL schema:
- Approx dates
- Birth/death places
- Story
- Suffix
- Other names
- DNA match  
- Enslaved  
- Notes  

Validation ensures no impossible or cyclic relationships.

---

## 2.7 Datasets View

Manage dataset entries with:
- View/edit/delete/export
- Automatic example generation:
  - “Create 10 examples using paternal haplogroup trace.”
  - “Add dataset entries based on feedback.”

All dataset rows go into Supabase AND optionally into Google Sheets.

---

## 2.8 Feedback View

- Display all feedback
- Open/inspect detailed comments
- “Send to Dataset” triggers Agent 2 refinement

---

## 2.9 AI Agent Interactions

### Agent 1:
Uses:
- persons  
- marriages  
- ancestry_relations  
- descendants_relations  
- lateral_relations  
- haplogroup & enslaved traces  
- feedback memory  

Ensures culturally accurate, historically grounded responses.

### Agent 2:
Builds new dataset entries from:
- feedback  
- chat_history  
- persons & marriages  
- all views  

Performs:
- Context extraction  
- Anonymization  
- Dataset row creation  
- Sheet mirroring  
- Versioning  

---

# 3. Additional User Benefits

- Privacy-first: all data remains local to the user’s database.
- Durable AI memory via feedback and dataset refinement.
- Demo mode for frictionless onboarding.
- Structured, export-ready dataset creation for AI training.
