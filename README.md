# **My Black :[ROOTS] Dataset Builder**

My Black :[ROOTS] Dataset Builder is a browser-based system designed to help users preserve, explore, and analyze George Freeney Jr's family heritage while building high-quality datasets for AI model fine-tuning. It combines structured genealogy, recursive relationship tracing, memory-aware AI responses, and automated dataset generation for open-source models such as gpt-oss:20b and gpt-oss:120b.

### NOTE:
ALWAYS refer to and review the repo's current supabase.sql file for this project.

The platform integrates a full Supabase PostgreSQL schema, recursive SQL views, pgvector embeddings, cultural feedback loops, and two AI agents:  
- **Agent 1** answers genealogy questions using database tables and views + chat history, feedback memory, and embedding tables.  
- **Agent 2** builds curated training examples using genealogy data, feedback, and past interactions.

This repository contains the full SQL bootstrap file, schema, and application logic needed to deploy the Dataset Builder.

---

## 🚀 Features

### **Genealogy Management**
Uses structured tables and recursive views to explore:
- Ancestry relationships  
- Descendants  
- Siblings, aunts/uncles, nieces/nephews, cousins  
- Haplogroup tracing  
- Enslaved ancestry tracing  
- DNA match indicators  
- Stories, alternate names, suffixes, approximate dates  

### **AI Dataset Generation**
Automatically builds dataset examples for:
- AI fine-tuning  
- Retrieval-augmented tasks  
- Cultural reasoning and accuracy  
- Question/answer examples from traces and relationships  

Dataset entries are stored in:
- Supabase (`dataset` table)
- Optional Google Sheets mirror
- Vector embeddings table (`embeddings`) using pgvector

### **Self-Improving Feedback Loop**
The `feedback` and `chat_history` tables allow the system to:
- Record user ratings
- Improve future genealogy answers  
- Improve dataset generation  
- Track cultural corrections  
- Provide long-term memory for both agents  

---

# 📦 Full SQL Schema

The database includes **all** tables, views, extensions, triggers, functions, and RLS policies required for the Dataset Builder.

### **Core Tables**
- `persons`  
- `marriages`

### **AI Tables**
- `dataset`  
- `feedback`  
- `chat_history`  
- `embeddings` (pgvector, 768-dimensional vectors)

### **Relationship Views**
- `ancestry_relations`  
- `descendants_relations`  
- `lateral_relations`

### **Trace Views**
- `paternal_haplogroup_trace`  
- `maternal_haplogroup_trace`  
- `paternal_enslaved_trace`  
- `maternal_enslaved_trace`

### **Functions**
- `update_timestamp()`  
- `enforce_single_home_person()`

### **Triggers**
- Auto-update timestamps for:
  - persons  
  - marriages  
  - dataset  
- Enforce single home person  
- Dataset timestamp behavior  

### **Extensions**
- `uuid-ossp`  
- `vector` (pgvector)

### **Row Level Security (RLS)**
- RLS enabled on:
  - persons  
  - marriages  
  - dataset  
  - feedback  
  - chat_history  
  - embeddings  
- Public read-only for genealogy  
- Authenticated insert/update for AI tables  

A **complete SQL bootstrap file** is included in the repository and can recreate the entire schema without data loss.

---

# 🧠 AI Agents

### **Agent 1 — Genealogy Q&A**
- Uses all views + persons & marriages  
- Leverages the feedback table as memory  
- Answers questions such as:
  - “List my paternal enslaved ancestors.”
  - “Show my maternal cousins.”
  - “Trace my haplogroups.”

### **Agent 2 — Dataset Builder**
Uses:
- dataset  
- feedback  
- chat_history  
- persons  
- marriages  
- all relationship views  

Produces:
- curated query/response examples  
- anonymized person-based training data  
- context-aware pairing examples  
- improved versions of incorrect responses  

Supports Ollama and OpenAI gpt-oss models.

---

# 📊 Dataset Workflow (n8n Optional)

The system can integrate with n8n to:

1. Receive a webhook (`feedback_id` or manual refine request)  
2. Pull `feedback`, `chat_history`, and related genealogy context  
3. Generate 3–10 dataset rows  
4. Append rows to:
   - Supabase `dataset`  
   - Google Sheets  
   - `embeddings` (vector representation)
5. Return status updates to the app

This allows continuous dataset improvement.

---

# 🛠 Development

### Requirements
- Supabase project  
- pgvector extension enabled  
- SQL bootstrap applied  
- Local or deployed frontend  
- Optional n8n cloud account for dataset automation  

### SQL Bootstrap
Located in:  
`/sql/full_bootstrap.sql`

Running it will create:
- All tables  
- All views  
- All functions  
- All triggers  
- All RLS  
- All indexes  
- Embeddings table  
with no destructive actions.

---

# 🔒 Privacy

All genealogy, feedback, datasets, and embeddings remain in the user’s private Supabase instance. Nothing leaves the user's database unless they explicitly export it.

---

# 📁 Repository Structure

```

/
│── sql/
│     └── full_bootstrap.sql
│
│── src/
│     ├── components/
│     ├── agents/
│     ├── views/
│     └── utils/
│
│── README.md
└── package.json

```

---

# 📬 Contact

This project is part of the **My Black :[ROOTS]** ecosystem and supports ongoing development of culturally accurate AI tools for Black American genealogy and historical preservation.

