# Daily Intern Report

Date: 18/02/2026
Intern Name: Parth Chauhan

---

## Project Title: AI Talent Intelligence Platform

---

## Tasks Completed Today:

### 1. Analyzed v1 vs v2 Documentation Differences

- Compared `ML_TALENT_INTELLIGENCE_SYSTEM.md` (v1.0) with `ML_TALENT-INTELLIGENCE-SYSTEM-V2.MD` (v2.0)
- Identified key architectural changes:
  - v1: TF-IDF based with 24 manual numeric features
  - v2: SentenceTransformer embeddings with data-driven learning
  - Updated decision thresholds (v1: ≥0.75, v2: ≥0.80)
  - Removed: TF-IDF, manual skill weights, hardcoded bonuses

### 2. Fixed Resume Parsing for CSV Data

- Issue: CSV data had dict string representations in fields like `project_descriptions` and `education_text`
- Added `ast.literal_eval()` parsing in `resume_parsing_engine.py` to handle these strings
- Created helper functions:
  - `_clean_resume_section_string()` - Parses dict strings
  - `_extract_resume_sections_from_stored_data()` - Reads from ResumeSection with cleanup

### 3. Updated Resume Parsing for Alex Johnson Resume Format

- Added support for plain text resumes with CAPS headers (e.g., "PERSONAL INFORMATION", "OBJECTIVE", "TECHNICAL SKILLS")
- New parsing methods:
  - `_parse_plain_text_resume()` - Detects and parses plain text format
  - `_parse_skills_section()` - Parses skills by category
  - `_parse_experience_section()` - Parses job entries (title | company | date)
  - `_parse_projects_section()` - Parses project entries with technologies
  - `_parse_education_section()` - Parses degree, institution, year, GPA

### 4. Updated Talent Intelligence Service

- Updated `_store_resume_sections()` to store all ResumeSection fields:
  - professional_summary, technical_skills, tools_technologies
  - frameworks_libraries, databases, cloud_platforms, soft_skills
  - experience_titles, experience_descriptions, experience_duration_text
  - project_titles, project_descriptions, project_technologies
  - education_text, certifications, achievements

- Updated `_extract_resume_sections()` to properly handle new parsed data format

### 5. Simplified ResumeParsingEngine Implementation

- Replaced complex parsing with simpler pattern-based approach
- Core methods:
  - `parse_document()` - Main entry point
  - `_extract_skills()` - Regex-based skill extraction
  - `_extract_education()` - Extracts year and GPA
  - `_estimate_experience()` - Calculates years from year patterns
  - `_generate_feature_vector()` - Creates features dict

---

## Problems Faced:

### 1. Semantic Match Score = 0

- **Root Cause**: SentenceTransformer model not installed in Django environment
- **Status**: Code has fallback to zeros when model unavailable
- **Solution**: Install sentence-transformers and torch in environment

### 2. Empty Resume Sections

- **Root Cause**: ResumeSection data stored as dict string representations
- **Status**: Fixed by adding cleanup functions to parse these strings

---

## Solutions Found:

1. Created helper function `_clean_resume_section_string()` to parse dict strings
2. Updated parsing to detect plain text vs markdown format automatically
3. Added proper field mapping from parsed data to ResumeSection table

---

## Plans for Tomorrow:

1. Test the complete v2 flow end-to-end
2. Install sentence-transformers and verify embeddings generate correctly
3. Test with Alex Johnson resume to verify parsing works
4. Verify semantic_match_score is non-zero after fix

---

## Files Modified:

1. `django_pg_backend/core/apps/analytics/services/resume_parsing_engine.py`
2. `django_pg_backend/core/apps/analytics/services/talent_intelligence_service.py`

---

## Notes:

- The v2 architecture uses SentenceTransformer (all-MiniLM-L6-v2) for semantic embeddings
- Data flow: Document → Parsing → ResumeSection → Embeddings → ML Models → Predictions
- Decision thresholds: INTERVIEW_SHORTLIST ≥ 0.80, TECHNICAL_ASSIGNMENT 0.65-0.79, MANUAL_REVIEW 0.50-0.64, REJECT < 0.50
