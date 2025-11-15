# My Black :[ROOTS] Dataset Builder  
## Comprehensive Project Checklist

This document defines the authoritative, end-to-end checklist for auditing, maintaining, and expanding the My Black :[ROOTS] Dataset Builder. It covers the full PostgreSQL schema, AI components, views, triggers, integration layers, and repository structure.

---

# 1. Core Database Foundation

## 1.1 Extensions
- [ ] uuid-ossp enabled
- [ ] vector (pgvector) enabled
- [ ] Both included in full bootstrap SQL

## 1.2 Core Tables

### persons
- [ ] Full field set present
- [ ] Correct parent foreign keys
- [ ] No relationship cycles
- [ ] Indexes on names and parent IDs

### marriages
- [ ] spouse1_id and spouse2_id present
- [ ] Marriage and divorce fields present
- [ ] Unique constraint on spouse pairs
- [ ] Indexes created

---

# 2. Recursive and Contextual Views

## 2.1 ancestry_relations
- [ ] Correct recursive parent expansion
- [ ] Accurate generation calculation
- [ ] Correct side (maternal/paternal/N/A)
- [ ] Correct naming and suffix logic
- [ ] Unknown handling for missing haplogroups

## 2.2 descendants_relations
- [ ] Supports infinite descendant depth
- [ ] Correct great-grand logic
- [ ] No duplicate inclusions

## 2.3 lateral_relations
- [ ] Siblings detected correctly
- [ ] Aunts and uncles assigned correctly by side
- [ ] Nieces and nephews detected
- [ ] Cousins detected via aunts/uncles
- [ ] No self-inclusion
- [ ] No duplicates

---

# 3. Trace Views (Haplogroups and Enslavement)

## 3.1 Haplogroup Traces
- [ ] paternal_haplogroup_trace correct
- [ ] maternal_haplogroup_trace correct
- [ ] Side detection is accurate
- [ ] Unknown male/female appears only when appropriate

## 3.2 Enslaved Traces
- [ ] paternal_enslaved_trace correct
- [ ] maternal_enslaved_trace correct
- [ ] Filtering and ordering validated

---

# 4. Functions and Triggers

## 4.1 Functions
- [ ] update_timestamp()
- [ ] enforce_single_home_person()

## 4.2 Triggers
- [ ] Timestamp triggers on persons, marriages, dataset
- [ ] Single-home-person trigger active
- [ ] Dataset timestamp trigger
- [ ] All wrapped in idempotent DO blocks

---

# 5. AI Tables (Dataset Memory System)

## 5.1 dataset
- [ ] query, response stored
- [ ] example_type, source stored
- [ ] context JSONB present
- [ ] derived_from linkage operational
- [ ] Versioning fields present
- [ ] Triggers update timestamps

## 5.2 feedback
- [ ] Stores rating -1 or +1
- [ ] Person/marriage mapping optional
- [ ] Comments supported

## 5.3 chat_history
- [ ] Stores user and agent messages
- [ ] Optional person/marriage association

---

# 6. Embeddings (pgvector)

## 6.1 Table
- [ ] embeddings table exists
- [ ] Uses vector dimension 768
- [ ] Linked to dataset rows
- [ ] Stores raw embedding text

## 6.2 Indexes
- [ ] ivfflat index created
- [ ] Index trained with data

## 6.3 RLS
- [ ] Public read
- [ ] Authenticated write

---

# 7. Row Level Security (RLS)

RLS must be enabled for:
- [ ] persons
- [ ] marriages
- [ ] dataset
- [ ] feedback
- [ ] chat_history
- [ ] embeddings

## 7.1 Genealogy Tables
- [ ] Public SELECT allowed
- [ ] Writes restricted

## 7.2 AI Tables
- [ ] INSERT allowed only to authenticated users
- [ ] UPDATE allowed only to authenticated users

---

# 8. Full SQL Bootstrap Requirements

The bootstrap SQL file must include:
- [ ] All extensions
- [ ] All table definitions
- [ ] All indexes
- [ ] All triggers
- [ ] All functions
- [ ] All views
- [ ] All RLS policies
- [ ] All DO-block guarded triggers and policies
- [ ] Syntax verified, no errors

---

# 9. Frontend Alignment

## 9.1 UI Features Required
- [ ] Home person selection
- [ ] Ancestry summary
- [ ] Descendants summary
- [ ] Lateral relations summary
- [ ] Haplogroup traces
- [ ] Enslaved traces
- [ ] Person editor
- [ ] Dataset builder controls
- [ ] Feedback review interface
- [ ] Embeddings status panel
- [ ] Agent 1 chat
- [ ] Agent 2 chat

---

# 10. Documentation Requirements

## 10.1 README.md Must Contain
- [ ] Project description
- [ ] Schema overview
- [ ] Explanation of relationships and views
- [ ] AI dataset workflow
- [ ] pgvector usage
- [ ] Agent 1 and Agent 2 descriptions
- [ ] Bootstrap SQL instructions
- [ ] Privacy section
- [ ] Repository structure diagram

## 10.2 Additional Recommended Docs
- [ ] docs/architecture.md
- [ ] docs/database_schema.md
- [ ] docs/dataset_workflow.md
- [ ] docs/ai_agents.md

---

# 11. Future Enhancements

Optional improvements:
- [ ] Full text search for stories and notes
- [ ] n8n workflow templates
- [ ] Photo table for ancestor images
- [ ] GEDCOM import/export
- [ ] Migrations timeline mapping
- [ ] Cousin-degree calculator
- [ ] Data quality scoring
- [ ] LLM reasoning validation suite

---

# 12. Validation Tests

## 12.1 SQL Validation
- [ ] No missing dependencies
- [ ] Views compile without error
- [ ] Recursive queries work with real data

## 12.2 Functional Validation
- [ ] Lateral relations are correct
- [ ] Haplogroup traces are correct
- [ ] Enslaved traces are correct
- [ ] Single home person is enforced
- [ ] Embedding search works
- [ ] Dataset writes succeed
- [ ] RLS blocks unauthorized writes

---

# 13. Final Certification
- [ ] Repo aligned with full specification
- [ ] All SQL validated
- [ ] All UI components aligned
- [ ] Agents fully integrated
- [ ] Dataset builder functioning end-to-end
- [ ] Vector search operational
- [ ] Feedback loop active

