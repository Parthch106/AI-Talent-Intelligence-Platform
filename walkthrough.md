# Session Report — SimpleResumeParser Alignment & Frontend Fixes

## Overview

This session focused on three goals:
1. Making [SimpleResumeParser](file:///e:/CSU%20Internship/AI-Talent-Intelligence-Platform/django_pg_backend/core/apps/analytics/services/simple_resume_parser.py#37-803) robust enough to handle real-world PDF text (Markdown symbols, complex layouts)
2. Aligning the simple parser's output schema with `LLMResumeParser` for consistent data handling
3. Ensuring the frontend correctly displays all parsed fields, especially dates

---

## Files Changed

| File | Change Type | Summary |
|---|---|---|
| [simple_resume_parser.py](file:///e:/CSU%20Internship/AI-Talent-Intelligence-Platform/django_pg_backend/core/apps/analytics/services/simple_resume_parser.py) | Modified | Full robustness + schema alignment |
| [talent_intelligence_service.py](file:///e:/CSU Internship/AI-Talent-Intelligence-Platform/django_pg_backend/core/apps/analytics/services/talent_intelligence_service.py) | Modified | Duration parsing + project date storage |
| [AnalysisPage.tsx](file:///e:/CSU%20Internship/AI-Talent-Intelligence-Platform/frontend/src/pages/AnalysisPage.tsx) | Modified | Date field fallbacks + TypeScript interfaces |

---

## Changes Made

### 1. Markdown & PDF Artifact Cleaning

The PDF extractor (`pymupdf4llm`) emits markdown formatting in the raw text — `**bold**`, `#`, [__](file:///e:/CSU%20Internship/AI-Talent-Intelligence-Platform/django_pg_backend/core/apps/analytics/models.py#853-855), etc. These broke regex matching and section detection.

- **Fix**: Strip `**`, `#`, [__](file:///e:/CSU%20Internship/AI-Talent-Intelligence-Platform/django_pg_backend/core/apps/analytics/models.py#853-855) and normalize whitespace before any section parsing.

---

### 2. Strict Section Boundary Splitting

Data from one section (e.g. Summary) was bleeding into adjacent sections (Skills, Experience).

- **Fix**: Rewrote [_split_into_sections](file:///e:/CSU%20Internship/AI-Talent-Intelligence-Platform/django_pg_backend/core/apps/analytics/services/simple_resume_parser.py#355-401) with tighter boundary detection, anchored to known section keywords.

---

### 3. Contact Info Extraction

Added a dedicated [_extract_contact_info](file:///e:/CSU%20Internship/AI-Talent-Intelligence-Platform/django_pg_backend/core/apps/analytics/services/simple_resume_parser.py#250-299) method:
- Email via regex
- Phone numbers (various formats including `+91 ...`)
- LinkedIn and GitHub links
- Candidate name from the top of the resume (ignoring symbols)

The [contact](file:///e:/CSU%20Internship/AI-Talent-Intelligence-Platform/django_pg_backend/core/apps/analytics/services/simple_resume_parser.py#250-299) field is now a **JSON string** to match the `LLMResumeParser` schema:
```json
{"name": "Parth Chauhan", "email": "...", "phone": "...", "linkedin": "", "github": "...", "location": ""}
```

---

### 4. Experience Date Extraction  ✅ Fixed

**Problem**: Dates like [(JAN-2025-JUN-2025)](file:///e:/CSU%20Internship/AI-Talent-Intelligence-Platform/django_pg_backend/core/apps/analytics/services/llm_resume_parser.py#131-137) in parentheses were not extracted.  
**Root cause 1**: Old regex only handled `YEAR-YEAR` format.  
**Root cause 2**: Even when extracted into `duration`, the service was saving empty `start_date`/`end_date` to the DB.

**Fixes**:
- Added `DATE_RANGE_RE` compiled regex that handles parenthesized month-year ranges
- Added [_extract_date_range()](file:///e:/CSU%20Internship/AI-Talent-Intelligence-Platform/django_pg_backend/core/apps/analytics/services/simple_resume_parser.py#479-485) helper used in both experience and project parsing
- In [talent_intelligence_service.py](file:///e:/CSU%20Internship/AI-Talent-Intelligence-Platform/django_pg_backend/core/apps/analytics/services/talent_intelligence_service.py): splits `duration → start_date + end_date` using a boundary-aware regex before saving to [ResumeExperience](file:///e:/CSU%20Internship/AI-Talent-Intelligence-Platform/django_pg_backend/core/apps/analytics/models.py#830-855)

**Result**: `JAN-2025 → start_date`, `JUN-2025 → end_date`

---

### 5. Project GitHub URL & Date Extraction  ✅ Fixed

**Problem**: GitHub URLs and project dates (e.g. `OCT-2024`) were stripped from the title but never stored.

**Fixes in [_parse_projects_section](file:///e:/CSU%20Internship/AI-Talent-Intelligence-Platform/django_pg_backend/core/apps/analytics/services/simple_resume_parser.py#571-665)**:
- Extract GitHub URL from `[Link](url)` markdown and bare URLs
- Extract project date using `DATE_RANGE_RE` and a standalone `MON-YEAR` fallback pattern
- Store `github_url` and [date](file:///e:/CSU%20Internship/AI-Talent-Intelligence-Platform/django_pg_backend/core/apps/analytics/services/simple_resume_parser.py#479-485) in each project dict

**Fix in [talent_intelligence_service.py](file:///e:/CSU%20Internship/AI-Talent-Intelligence-Platform/django_pg_backend/core/apps/analytics/services/talent_intelligence_service.py)**:
- When `impact` is empty but [date](file:///e:/CSU%20Internship/AI-Talent-Intelligence-Platform/django_pg_backend/core/apps/analytics/services/simple_resume_parser.py#479-485) exists, store [date](file:///e:/CSU%20Internship/AI-Talent-Intelligence-Platform/django_pg_backend/core/apps/analytics/services/simple_resume_parser.py#479-485) in the `impact` column (avoids DB migration)

**Result**: GitHub links are clickable. `OCT-2024` / `FEB-2025` appear in project cards.

---

### 6. Education GPA & Year Extraction  ✅ Fixed

**Problem**: In the user's resume, CGPA and year are on a **separate line** from the degree header. Old logic only searched the same line.

**Fix**: Two-pass merge — when a line contains a degree keyword, the next 1–3 lines are absorbed into it. Then GPA pattern and year pattern search across the full merged string.

**Result**: `gpa: "9"`, `year: "2021 - July,2025"` correctly extracted.

---

### 7. Schema Alignment with LLMResumeParser

Updated `SimpleResumeParser.parse()` to produce the same output structure as `LLMResumeParser`:

| Field | Type | Notes |
|---|---|---|
| [contact](file:///e:/CSU%20Internship/AI-Talent-Intelligence-Platform/django_pg_backend/core/apps/analytics/services/simple_resume_parser.py#250-299) | JSON string | `{name, email, phone, linkedin, github, location}` |
| [skills](file:///e:/CSU%20Internship/AI-Talent-Intelligence-Platform/django_pg_backend/core/apps/analytics/services/talent_intelligence_service.py#1038-1051) | list | flat list of skill strings |
| `experience_list` | list of dicts | `{title, company, location, duration, is_current, is_internship, description, technologies}` |
| `projects_list` | list of dicts | `{name, description, technologies, github_url, date}` |
| `education_list` | list of dicts | `{degree, field_of_study, institution, year, gpa}` |
| Legacy string fields | strings | backward-compatible `;`-joined strings |

---

### 8. Frontend Field Fixes (AnalysisPage.tsx)

**Problem**: Frontend used `exp.start_date`/`end_date`, `edu.start_year`/`end_year`, but the simple parser provides `duration` and `year` respectively.

**Fixes**:
- Experience: shows `duration` as fallback when `start_date`/`end_date` are empty
- Projects: renders `project.date` on project cards alongside impact
- Education: falls back to `edu.year` when `start_year`/`end_year` are absent
- TypeScript interfaces updated with new optional fields (`duration?`, `date?`, `year?`)

---

## Verification Results

| Check | Result |
|---|---|
| Experience duration extracted | ✅ `JAN-2025 – JUN-2025` |
| Project GitHub URL captured | ✅ `https://github.com/Parthch106/...` |
| Project date captured | ✅ `OCT-2024`, `FEB-2025` |
| Education GPA extracted | ✅ `9` (from separate CGPA line) |
| Education year range | ✅ `2021 - July,2025` |
| Contact JSON format | ✅ Matches LLM parser schema |
| No frontend `.map()` crash | ✅ `technologies` always an array |
| Missing [json](file:///C:/Users/parth/AppData/Local/Temp/repro_results.json) import fix | ✅ Added `import json` |

```diff:simple_resume_parser.py
"""
Simple Resume Parser - Maps directly to ResumeSection columns
===========================================================

This parser extracts structured data from resume text and maps it directly
to ResumeSection model fields.

ResumeSection columns:
1. professional_summary - Professional summary / objective
2. technical_skills - Technical skills
3. tools_technologies - Tools and technologies  
4. frameworks_libraries - Frameworks and libraries
5. databases - Database technologies
6. cloud_platforms - Cloud platforms
7. soft_skills - Soft skills
8. experience_titles - Job/internship titles
9. experience_descriptions - Experience descriptions
10. experience_duration_text - Duration for each experience
11. project_titles - Project titles
12. project_descriptions - Project descriptions
13. project_technologies - Technologies in projects
14. education_text - Education details
15. certifications - Certifications
16. achievements - Awards and achievements
17. extracurriculars - Extracurricular activities

"""

import re
import logging
from typing import Dict, List, Any

logger = logging.getLogger(__name__)


class SimpleResumeParser:
    """
    Simple, clean resume parser that maps directly to ResumeSection columns.
    """
    
    # Skill categories
    PROGRAMMING_LANGUAGES = [
        'python', 'java', 'javascript', 'typescript', 'c', 'c++', 'c#', 
        'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala', 'r',
        'matlab', 'perl', 'shell', 'bash'
    ]
    
    FRAMEWORKS = [
        'django', 'flask', 'fastapi', 'spring', 'express', 'react',
        'angular', 'vue', 'next.js', 'nuxt.js', 'node.js', 'asp.net',
        'laravel', 'rails', 'nestjs', 'tensorflow', 'pytorch', 'keras',
        'scikit-learn', 'huggingface', 'langchain', 'xgboost', 'lightgbm',
    ]  # Note: no duplicates — flask/fastapi were previously listed twice
    
    DATABASES = [
        'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch',
        'sqlite', 'oracle', 'cassandra', 'dynamodb', 'firebase'
    ]
    
    CLOUD = ['aws', 'azure', 'gcp', 'google cloud', 'amazon web services']
    
    TOOLS = [
        'git', 'github', 'gitlab', 'docker', 'kubernetes', 'jenkins',
        'jira', 'confluence', 'postman', 'tableau', 'power bi', 'jupyter'
    ]
    
    # Section keywords for detection
    SECTION_KEYWORDS = {
        'summary': ['objective', 'summary', 'profile', 'about'],
        'skills': ['skill', 'technical skill', 'technologies', 'tech stack', 'competencies'],
        'experience': ['experience', 'employment', 'work history', 'internship', 'professional experience'],
        'project': ['project', 'project work', 'academic project'],
        'education': ['education', 'academic', 'qualification', 'degree'],
        'certification': ['certification', 'certificate', 'certified'],
        'achievement': ['achievement', 'award', 'honor', 'recognition'],
        'extracurricular': ['extracurricular', 'activity', 'leadership', 'volunteer']
    }
    
    def __init__(self):
        """Initialize the parser."""
        self.raw_text = ""
        
    def parse(self, text: str) -> Dict[str, str]:
        """
        Parse resume text and return dict matching ResumeSection columns.
        
        Args:
            text: Raw resume text
            
        Returns:
            Dictionary with ResumeSection field names and values
        """
        self.raw_text = text
        text_lower = text.lower()
        
        # Initialize result dict with all ResumeSection fields
        result = {
            'professional_summary': '',
            'technical_skills': '',
            'tools_technologies': '',
            'frameworks_libraries': '',
            'databases': '',
            'cloud_platforms': '',
            'soft_skills': '',
            'experience_titles': '',
            'experience_descriptions': '',
            'experience_duration_text': '',
            'project_titles': '',
            'project_descriptions': '',
            'project_technologies': '',
            'education_text': '',
            'certifications': '',
            'achievements': '',
            'extracurriculars': ''
        }
        
        # Step 1: Extract professional summary from top of resume
        result['professional_summary'] = self._extract_summary(text)
        
        # Step 2: Split into sections and extract each
        sections = self._split_into_sections(text)
        
        # Step 3: Parse each section
        for section_name, section_content in sections.items():
            if section_name == 'skills':
                skills_data = self._parse_skills_section(section_content)
                result.update(skills_data)
            elif section_name == 'experience':
                exp_data = self._parse_experience_section(section_content)
                result.update(exp_data)
            elif section_name == 'project':
                proj_data = self._parse_projects_section(section_content)
                result.update(proj_data)
            elif section_name == 'education':
                result['education_text'] = self._parse_education(section_content)
            elif section_name == 'certification':
                result['certifications'] = self._parse_certifications(section_content)
            elif section_name == 'achievement':
                result['achievements'] = self._parse_achievements(section_content)
                
        # If sections weren't detected, try to extract from full text
        if not result['technical_skills']:
            skills_data = self._extract_skills_from_full_text(text)
            result.update(skills_data)
        
        # Always try to extract education if not found
        if not result['education_text']:
            result['education_text'] = self._extract_education_from_text(text)
        
        # Always try to extract experience if not found
        if not result['experience_descriptions']:
            exp_data = self._extract_experience_from_text(text)
            if exp_data['experience_titles']:
                result['experience_titles'] = exp_data['experience_titles']
            if exp_data['experience_descriptions']:
                result['experience_descriptions'] = exp_data['experience_descriptions']
            if exp_data['experience_duration_text']:
                result['experience_duration_text'] = exp_data['experience_duration_text']
        
        # Always try to extract projects if not found
        if not result['project_titles']:
            proj_data = self._extract_projects_from_text(text)
            if proj_data['project_titles']:
                result['project_titles'] = proj_data['project_titles']
            if proj_data['project_descriptions']:
                result['project_descriptions'] = proj_data['project_descriptions']
            if proj_data['project_technologies']:
                result['project_technologies'] = proj_data['project_technologies']
        
        # If professional_summary is still empty, use experience content as fallback
        if not result['professional_summary'] and result['experience_descriptions']:
            exp_text = result['experience_descriptions']
            if len(exp_text) > 50:
                result['professional_summary'] = exp_text[:200] + '...' if len(exp_text) > 200 else exp_text
        
        # Clean up education_text - remove .html prefix
        if result['education_text'] and result['education_text'].startswith('.html'):
            result['education_text'] = result['education_text'][5:].strip()
        
        # Add legacy keys for feature engineering compatibility
        result['skills'] = result['technical_skills'].split(', ') if result['technical_skills'] else []
        result['experience'] = result['experience_descriptions']
        result['education'] = result['education_text']
        result['projects'] = result['project_titles'].split(' | ') if result['project_titles'] else []
        result['tools'] = result['tools_technologies'].split(', ') if result['tools_technologies'] else []
        result['certifications'] = result['certifications'].split('\n') if result['certifications'] else []
        
        return result
    
    def _extract_summary(self, text: str) -> str:
        """Extract professional summary from top of resume."""
        # Clean up HTML first
        text = re.sub(r'<[^>]+>', ' ', text)  # Remove HTML tags
        text = re.sub(r'\s+', ' ', text)  # Normalize whitespace
        
        lines = text.split('\n')
        summary_lines = []
        
        for i, line in enumerate(lines[:20]):  # Check first 20 lines
            line = line.strip()
            line_lower = line.lower()
            
            # Skip empty or very short lines
            if len(line) < 10:
                continue
            
            # Skip contact info
            if any(kw in line_lower for kw in ['email', 'phone', '@', 'linkedin', 'github', 'http']):
                continue
            
            # Skip common section headers that appear at top
            if any(kw in line_lower for kw in ['education', 'experience', 'skills', 'project', 
                                                'certification', 'achievement', 'work history']):
                if len(line) < 30:  # It's probably a section header
                    continue
            
            # If this line contains objective/summary keyword, get next few lines
            if any(kw in line_lower for kw in ['objective', 'summary', 'profile', 'about']):
                for j in range(i+1, min(i+5, len(lines))):
                    next_line = lines[j].strip()
                    if next_line and len(next_line) > 20:
                        # Skip if it looks like contact info
                        if not any(kw in next_line.lower() for kw in ['email', 'phone', '@']):
                            summary_lines.append(next_line)
                break
            
            # Otherwise, collect substantial lines that could be summary
            if len(line) > 30 and len(line) < 200:
                if not any(kw in line_lower for kw in ['skill', 'experience', 'education', 'project', 
                                                        'certification', 'achievement', 'employment']):
                    summary_lines.append(line)
                    
        return ' '.join(summary_lines[:3])
    
    def _split_into_sections(self, text: str) -> Dict[str, str]:
        """Split text into sections based on keywords."""
        sections = {}
        text_lower = text.lower()
        
        # Find all section boundaries
        section_positions = []
        for section_name, keywords in self.SECTION_KEYWORDS.items():
            for keyword in keywords:
                pattern = rf'^\s*{re.escape(keyword)}[\s:]*$'
                matches = list(re.finditer(pattern, text_lower, re.MULTILINE))
                for match in matches:
                    section_positions.append((match.start(), section_name))
        
        # Sort by position
        section_positions.sort(key=lambda x: x[0])
        
        # Extract each section
        for i, (pos, section_name) in enumerate(section_positions):
            # Find end of section (next section or end of text)
            if i + 1 < len(section_positions):
                end_pos = section_positions[i + 1][0]
            else:
                end_pos = len(text)
                
            section_text = text[pos:end_pos].strip()
            if section_text:
                sections[section_name] = section_text
                
        return sections
    
    def _parse_skills_section(self, text: str) -> Dict[str, str]:
        """Parse skills section into categories."""
        result = {
            'technical_skills': '',
            'tools_technologies': '',
            'frameworks_libraries': '',
            'databases': '',
            'cloud_platforms': '',
            'soft_skills': ''
        }
        
        text_lower = text.lower()
        
        # Extract all skills using pattern matching
        found_skills = {
            'programming': [],
            'frameworks': [],
            'databases': [],
            'cloud': [],
            'tools': [],
            'other': []
        }
        
        # Check each category
        for skill in self.PROGRAMMING_LANGUAGES:
            if skill in text_lower:
                found_skills['programming'].append(skill)
                
        for skill in self.FRAMEWORKS:
            if skill in text_lower:
                found_skills['frameworks'].append(skill)
                
        for skill in self.DATABASES:
            if skill in text_lower:
                found_skills['databases'].append(skill)
                
        for skill in self.CLOUD:
            if skill in text_lower:
                found_skills['cloud'].append(skill)
                
        for skill in self.TOOLS:
            if skill in text_lower:
                found_skills['tools'].append(skill)
        
        # Build result strings
        all_skills = found_skills['programming'] + found_skills['frameworks']
        result['technical_skills'] = ', '.join(all_skills) if all_skills else ', '.join(found_skills['programming'])
        result['frameworks_libraries'] = ', '.join(found_skills['frameworks'])
        result['databases'] = ', '.join(found_skills['databases'])
        result['cloud_platforms'] = ', '.join(found_skills['cloud'])
        result['tools_technologies'] = ', '.join(found_skills['tools'])
        
        return result
    
    def _extract_skills_from_full_text(self, text: str) -> Dict[str, str]:
        """Extract skills from full text if no skills section found."""
        text_lower = text.lower()
        
        result = {
            'technical_skills': '',
            'tools_technologies': '',
            'frameworks_libraries': '',
            'databases': '',
            'cloud_platforms': '',
            'soft_skills': ''
        }
        
        programming = [s for s in self.PROGRAMMING_LANGUAGES if s in text_lower]
        frameworks = [s for s in self.FRAMEWORKS if s in text_lower]
        databases = [s for s in self.DATABASES if s in text_lower]
        cloud = [s for s in self.CLOUD if s in text_lower]
        tools = [s for s in self.TOOLS if s in text_lower]
        
        # Combine programming and frameworks as technical_skills
        result['technical_skills'] = ', '.join(programming + frameworks)
        result['frameworks_libraries'] = ', '.join(frameworks)
        result['databases'] = ', '.join(databases)
        result['cloud_platforms'] = ', '.join(cloud)
        result['tools_technologies'] = ', '.join(tools)
        
        return result
    
    def _parse_experience_section(self, text: str) -> Dict[str, str]:
        """Parse experience section."""
        result = {
            'experience_titles': '',
            'experience_descriptions': '',
            'experience_duration_text': ''
        }
        
        lines = text.split('\n')
        titles = []
        descriptions = []
        durations = []
        
        current_job = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            line_lower = line.lower()
            
            # Skip section header
            if any(kw in line_lower for kw in self.SECTION_KEYWORDS['experience']):
                continue
                
            # Check if this is a job entry (has title/company and date)
            # Patterns: "Job Title | Company | Date" or "Job Title at Company"
            job_pattern = r'([A-Z][a-zA-Z\s]+(?:Engineer|Developer|Intern|Analyst|Manager|Scientist|Lead|Consultant))'
            date_pattern = r'(\d{4}\s*[-–to]+\s*\d{4}|\d{4}\s*[-–to]+\s*present|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec\s+\d{4})'
            
            has_job_title = re.search(job_pattern, line)
            has_date = re.search(date_pattern, line, re.IGNORECASE)
            
            if has_job_title and has_date:
                # Save previous job
                if current_job:
                    descriptions.append(' '.join(current_job))
                    current_job = []
                    
                # Extract this job
                titles.append(has_job_title.group(1))
                durations.append(has_date.group(1))
                current_job.append(line)
            else:
                # Add to description
                current_job.append(line)
        
        # Don't forget last job
        if current_job:
            descriptions.append(' '.join(current_job))
        
        result['experience_titles'] = ' | '.join(titles) if titles else ''
        result['experience_descriptions'] = ' '.join(descriptions) if descriptions else ''
        result['experience_duration_text'] = ' | '.join(durations) if durations else ''
        
        return result
    
    def _parse_projects_section(self, text: str) -> Dict[str, str]:
        """Parse projects section."""
        result = {
            'project_titles': '',
            'project_descriptions': '',
            'project_technologies': ''
        }
        
        lines = text.split('\n')
        titles = []
        descriptions = []
        technologies = []
        
        current_project = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            line_lower = line.lower()
            
            # Skip section header
            if any(kw in line_lower for kw in self.SECTION_KEYWORDS['project']):
                continue
                
            # Check if this is a project name (short line with specific patterns)
            # Project names often have | GitHub or are short with specific keywords
            if len(line) < 60 and ('|' in line or 'github' in line_lower or any(kw in line_lower for kw in ['built', 'developed', 'created'])):
                # Skip contact info lines with |
                if 'email' in line_lower or 'phone' in line_lower or '@' in line:
                    continue
                    
                # Save previous project
                if current_project:
                    proj_text = ' '.join(current_project)
                    descriptions.append(proj_text)
                    
                    # Extract technologies from project text
                    proj_techs = []
                    for tech in self.FRAMEWORKS + self.TOOLS + self.PROGRAMMING_LANGUAGES:
                        if tech in proj_text.lower():
                            proj_techs.append(tech)
                    technologies.extend(proj_techs)
                    
                    current_project = []
                
                # Extract title (first part before |)
                title = line.split('|')[0].strip()
                # Additional filter on title
                title_lower = title.lower()
                if title and len(title) > 2 and not any(kw in title_lower for kw in ['email', 'phone', 'linkedin']):
                    titles.append(title)
                    current_project.append(line)
            else:
                current_project.append(line)
        
        # Don't forget last project
        if current_project:
            proj_text = ' '.join(current_project)
            descriptions.append(proj_text)
            for tech in self.FRAMEWORKS + self.TOOLS + self.PROGRAMMING_LANGUAGES:
                if tech in proj_text.lower():
                    technologies.append(tech)
        
        result['project_titles'] = ' | '.join(titles) if titles else ''
        result['project_descriptions'] = ' '.join(descriptions) if descriptions else ''
        result['project_technologies'] = ', '.join(list(set(technologies)))
        
        return result
    
    def _parse_education(self, text: str) -> str:
        """Parse education section."""
        lines = text.split('\n')
        edu_entries = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            line_lower = line.lower()
            
            # Skip section header
            if any(kw in line_lower for kw in self.SECTION_KEYWORDS['education']):
                continue
                
            # Look for degree patterns
            degree_pattern = r'(bachelor|master|phd|b\.sc|m\.sc|b\.tech|m\.tech|b\.e\.|m\.e\.)'
            if re.search(degree_pattern, line_lower):
                # Extract year
                year_match = re.search(r'(19|20)\d{2}', line)
                year = year_match.group(0) if year_match else ''
                
                # Extract GPA
                gpa_match = re.search(r'gpa[:\s]*(\d+\.?\d*)', line_lower)
                gpa = f"GPA: {gpa_match.group(1)}" if gpa_match else ''
                
                parts = [line, year, gpa]
                edu_entries.append(' | '.join([p for p in parts if p]))
        
        return ' \n '.join(edu_entries)
    
    def _parse_certifications(self, text: str) -> str:
        """Parse certifications."""
        lines = text.split('\n')
        certs = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            line_lower = line.lower()
            
            # Skip section header
            if any(kw in line_lower for kw in self.SECTION_KEYWORDS['certification']):
                continue
                
            # Look for certification patterns
            cert_patterns = [
                r'aws\s+(certified|certification)',
                r'azure\s+(certified|certification)',
                r'google\s+cloud',
                r'certificate',
                r'certified'
            ]
            
            if any(re.search(p, line_lower) for p in cert_patterns):
                # Extract year if present
                year_match = re.search(r'(19|20)\d{2}', line)
                year = year_match.group(0) if year_match else ''
                
                cert = line
                if year:
                    cert = f"{line} ({year})"
                certs.append(cert)
        
        return ' \n '.join(certs)
    
    def _parse_achievements(self, text: str) -> str:
        """Parse achievements."""
        lines = text.split('\n')
        achievements = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            line_lower = line.lower()
            
            # Skip section header
            if any(kw in line_lower for kw in self.SECTION_KEYWORDS['achievement']):
                continue
                
            # Look for achievement patterns
            achievement_patterns = [
                r'award',
                r'honor',
                r'winner',
                r'achievement',
                r'recognition',
                r'dean.*list',
                r'published'
            ]
            
            if any(re.search(p, line_lower) for p in achievement_patterns):
                achievements.append(line)
        
        return ' \n '.join(achievements)
    
    def _extract_education_from_text(self, text: str) -> str:
        """Extract education from full text."""
        text_lower = text.lower()
        edu_entries = []
        
        # Look for degree patterns
        degree_patterns = [
            r'(bachelor|master|phd|b\.sc|m\.sc|b\.tech|m\.tech|b\.e\.|m\.e\.)[^.]*',
        ]
        
        for pattern in degree_patterns:
            matches = re.findall(pattern, text_lower)
            for match in matches:
                # Find surrounding context
                idx = text_lower.find(match)
                if idx != -1:
                    # Get surrounding text
                    start = max(0, idx - 20)
                    end = min(len(text), idx + len(match) + 30)
                    context = text[start:end].strip()
                    if context and context not in edu_entries:
                        edu_entries.append(context)
        
        return ' | '.join(edu_entries[:5])
    
    def _extract_experience_from_text(self, text: str) -> Dict[str, str]:
        """Extract experience from full text."""
        text_lower = text.lower()
        
        result = {
            'experience_titles': '',
            'experience_descriptions': '',
            'experience_duration_text': ''
        }
        
        # Look for job title patterns
        job_patterns = [
            r'([A-Z][a-zA-Z]+(?: Engineer| Developer| Scientist| Analyst| Manager| Intern| Lead| Consultant))',
        ]
        
        titles = []
        durations = []
        descriptions = []
        
        for pattern in job_patterns:
            matches = re.findall(pattern, text)
            for match in matches:
                if len(match) > 3 and match not in titles:
                    titles.append(match)
                    
                    # Try to find duration for this job
                    idx = text.find(match)
                    if idx != -1:
                        context = text[idx:idx+100]
                        date_match = re.search(r'(\d{4}\s*[-–to]+\s*\d{4}|\d{4}\s*[-–to]+\s*present)', context, re.IGNORECASE)
                        if date_match:
                            durations.append(date_match.group(1))
        
        # Get experience section if exists
        exp_match = re.search(r'experience.{0,200}', text_lower)
        if exp_match:
            descriptions.append(exp_match.group(0))
        
        result['experience_titles'] = ' | '.join(titles[:5])
        result['experience_descriptions'] = ' '.join(descriptions[:3])
        result['experience_duration_text'] = ' | '.join(durations[:5])
        
        return result
    
    def _extract_projects_from_text(self, text: str) -> Dict[str, str]:
        """Extract projects from full text."""
        result = {
            'project_titles': '',
            'project_descriptions': '',
            'project_technologies': ''
        }
        
        text_lower = text.lower()
        
        # Look for project section
        project_keywords = ['project', 'projects', 'work samples', 'portfolio']
        
        titles = []
        techs = []
        
        # Try to find a projects section first
        lines = text.split('\n')
        in_project_section = False
        
        for i, line in enumerate(lines):
            line_lower = line.lower()
            
            # Check if we're entering a project section
            for kw in project_keywords:
                if kw in line_lower and len(line) < 50:
                    in_project_section = True
                    continue
            
            if in_project_section:
                line = line.strip()
                if not line:
                    continue
                
                # Skip contact info
                if 'email' in line_lower or '@' in line or 'phone' in line_lower:
                    continue
                if 'linkedin' in line_lower or 'github.com' in line_lower:
                    continue
                
                # Look for lines that might be project names
                if len(line) > 10 and len(line) < 80:
                    # Exclude common non-project lines
                    exclude_patterns = ['experience', 'education', 'skills', 'certification', 
                                       'achievement', 'summary', 'objective', 'contact', 'name']
                    is_excluded = any(p in line_lower for p in exclude_patterns)
                    
                    if not is_excluded:
                        titles.append(line)
                        for tech in self.FRAMEWORKS + self.TOOLS + self.PROGRAMMING_LANGUAGES:
                            if tech in line_lower:
                                techs.append(tech)
        
        # If no project section found, try more aggressive extraction
        # Look for lines that start with a project-like pattern
        if not titles:
            for line in lines:
                line = line.strip()
                line_lower = line.lower()
                
                # Skip contact info - CRITICAL - must be first
                if any(x in line_lower for x in ['email', 'phone', '@', 'linkedin', 'github.com']):
                    continue
                
                # Skip if it's a header
                if len(line) < 30 and any(kw in line_lower for kw in 
                    ['education', 'experience', 'skills', 'project', 'certification', 
                     'achievement', 'summary', 'objective', 'contact', 'name', 'profile']):
                    continue
                
                # Look for lines with | that could be projects
                if '|' in line:
                    parts = re.split(r'[|]', line)
                    title = parts[0].strip()
                    # Additional check on title itself
                    title_lower = title.lower()
                    if title and len(title) > 5 and len(title) < 60:
                        if '@' not in title and 'email' not in title_lower and 'phone' not in title_lower:
                            titles.append(title)
                            # Extract tech from rest of line
                            rest = '|'.join(parts[1:])
                            for tech in self.FRAMEWORKS + self.TOOLS + self.PROGRAMMING_LANGUAGES:
                                if tech in rest.lower():
                                    techs.append(tech)
        
        # Last resort: use tech stack lines as project indicators
        if not titles:
            # Look for lines that mention technologies
            tech_count = 0
            for line in lines:
                line_lower = line.lower()
                for tech in self.FRAMEWORKS + self.TOOLS + self.PROGRAMMING_LANGUAGES:
                    if tech in line_lower:
                        tech_count += 1
                if tech_count >= 2 and len(line.strip()) > 20:
                    # This looks like a tech-related line, could be project
                    titles.append(line.strip()[:50])
                    break
        
        result['project_titles'] = ' | '.join(titles[:5])
        result['project_technologies'] = ', '.join(list(set(techs))[:10])
        
        return result


# Singleton instance
simple_resume_parser = SimpleResumeParser()
===
"""
Simple Resume Parser - Maps directly to ResumeSection columns
===========================================================

This parser extracts structured data from resume text and maps it directly
to ResumeSection model fields.

ResumeSection columns:
1. professional_summary - Professional summary / objective
2. technical_skills - Technical skills
3. tools_technologies - Tools and technologies  
4. frameworks_libraries - Frameworks and libraries
5. databases - Database technologies
6. cloud_platforms - Cloud platforms
7. soft_skills - Soft skills
8. experience_titles - Job/internship titles
9. experience_descriptions - Experience descriptions
10. experience_duration_text - Duration for each experience
11. project_titles - Project titles
12. project_descriptions - Project descriptions
13. project_technologies - Technologies in projects
14. education_text - Education details
15. certifications - Certifications
16. achievements - Awards and achievements
17. extracurriculars - Extracurricular activities

"""

import re
import logging
import json
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)


class SimpleResumeParser:
    """
    Simple, clean resume parser that maps directly to ResumeSection columns.
    """
    
    # Skill categories
    PROGRAMMING_LANGUAGES = [
        'python', 'java', 'javascript', 'typescript', 'c', 'c++', 'c#', 
        'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala', 'r',
        'matlab', 'perl', 'shell', 'bash', 'dart', 'html', 'css', 'sql',
        'objective-c', 'lua', 'assembly', 'fortran', 'cobol'
    ]
    
    FRAMEWORKS = [
        'django', 'flask', 'fastapi', 'spring', 'express', 'react',
        'angular', 'vue', 'next.js', 'nuxt.js', 'node.js', 'asp.net',
        'laravel', 'rails', 'nestjs', 'tensorflow', 'pytorch', 'keras',
        'scikit-learn', 'huggingface', 'langchain', 'xgboost', 'lightgbm',
        'bootstrap', 'tailwind', 'jquery', 'redux', 'flutter', 'react native',
        'ionic', 'cordova', 'electron', 'symfony', 'codeigniter', 'cakephp'
    ]
    
    DATABASES = [
        'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch',
        'sqlite', 'oracle', 'cassandra', 'dynamodb', 'firebase', 'mariadb',
        'ms sql', 'microsoft sql server', 'couchdb', 'neo4j', 'influxdb'
    ]
    
    CLOUD = [
        'aws', 'azure', 'gcp', 'google cloud', 'amazon web services',
        'heroku', 'digitalocean', 'netlify', 'vercel', 'firebase',
        'ibm cloud', 'oracle cloud', 'linode'
    ]
    
    TOOLS = [
        'git', 'github', 'gitlab', 'docker', 'kubernetes', 'jenkins',
        'jira', 'confluence', 'postman', 'tableau', 'power bi', 'jupyter',
        'vscode', 'intellij', 'pycharm', 'vim', 'bitbucket', 'ansible',
        'terraform', 'prometheus', 'grafana', 'trello', 'slack', 'notion'
    ]

    SOFT_SKILLS = [
        'leadership', 'communication', 'teamwork', 'problem solving',
        'critical thinking', 'time management', 'adaptability', 'creativity',
        'emotional intelligence', 'mentoring', 'collaboration', 'presentation'
    ]
    
    # Section keywords for detection
    SECTION_KEYWORDS = {
        'summary': ['objective', 'summary', 'profile', 'about', 'professional profile', 'executive summary'],
        'skills': ['skill', 'technical skill', 'technologies', 'tech stack', 'competencies', 'expertise', 'capabilities'],
        'experience': ['experience', 'employment', 'work history', 'internship', 'professional experience', 'background', 'professional experience / training', 'industrial training'],
        'project': ['project', 'project work', 'academic project', 'personal project', 'open source', 'project title'],
        'education': ['education', 'academic', 'qualification', 'degree', 'schooling', 'university'],
        'certification': ['certification', 'certificate', 'certified', 'license', 'credential'],
        'achievement': ['achievement', 'award', 'honor', 'recognition', 'accomplishment'],
        'extracurricular': ['extracurricular', 'activity', 'leadership', 'volunteer', 'hobby', 'interest']
    }
    
    def __init__(self):
        """Initialize the parser."""
        self.raw_text = ""
        
    def parse(self, text: str) -> Dict[str, Any]:
        """
        Parse resume text and return dict matching ResumeSection columns.
        Enhanced to include structured lists for V2 analytics schema.
        """
        self.raw_text = text
        
        # Initialize result dict with all ResumeSection fields + structured fields
        result = {
            # Legacy/ResumeSection fields
            'professional_summary': '',
            'technical_skills': '',
            'tools_technologies': '',
            'frameworks_libraries': '',
            'databases': '',
            'cloud_platforms': '',
            'soft_skills': '',
            'experience_titles': '',
            'experience_descriptions': '',
            'experience_duration_text': '',
            'project_titles': '',
            'project_descriptions': '',
            'project_technologies': '',
            'education_text': '',
            'certifications': '',
            'achievements': '',
            'extracurriculars': '',
            
            # V2 Structured fields
            'contact': {},
            'skills': [],
            'experience_list': [],
            'projects_list': [],
            'education_list': [],
            'raw_skills': {
                'programming_languages': [],
                'frameworks_libraries': [],
                'databases': [],
                'cloud_platforms': [],
                'tools': [],
                'soft_skills': []
            }
        }
        
        # Pre-process text to remove Markdown bolding and common PDF artifacts
        text = text.replace('**', '').replace('#', '').replace('__', '')
        # Remove common bullet variations at the start of lines to avoid confusing them with headers
        text = re.sub(r'^\s*[•\*\-]\s+', '', text, flags=re.MULTILINE)
        
        # Step 1: Extract contact info and professional summary from top
        result['contact'] = self._extract_contact_info(text)
        result['professional_summary'] = self._extract_summary(text)
        
        # Step 2: Split into sections and extract each
        sections = self._split_into_sections(text)
        
        # Step 3: Parse each section
        for section_name, section_content in sections.items():
            if section_name == 'skills':
                skills_data = self._parse_skills_section(section_content)
                result.update(skills_data)
            elif section_name == 'experience':
                exp_data = self._parse_experience_section(section_content)
                result.update(exp_data)
            elif section_name == 'project':
                proj_data = self._parse_projects_section(section_content)
                result.update(proj_data)
            elif section_name == 'education':
                edu_data = self._parse_education_robust(section_content)
                result['education_text'] = edu_data['text']
                result['education_list'] = edu_data['list']
            elif section_name == 'certification':
                result['certifications'] = self._parse_certifications(section_content)
            elif section_name == 'achievement':
                result['achievements'] = self._parse_achievements(section_content)
                
        # If sections weren't detected, try to extract from full text
        if not result['technical_skills']:
            skills_data = self._extract_skills_from_full_text(text)
            result.update(skills_data)
        
        # Always try to extract education if not found or incomplete
        if not result['education_list']:
            target_text = sections.get('education', text)
            edu_data = self._extract_education_from_text_robust(target_text)
            result['education_text'] = edu_data['text']
            result['education_list'] = edu_data['list']
        
        # Always try to extract experience if not found or incomplete
        if not result['experience_list']:
            target_text = sections.get('experience', text)
            exp_data = self._extract_experience_from_text_robust(target_text)
            result.update(exp_data)
        
        # Always try to extract projects if not found
        if not result['projects_list']:
            target_text = sections.get('project', text)
            proj_data = self._extract_projects_from_text_robust(target_text)
            result.update(proj_data)
        
        # =====================================================================
        # ALIGNMENT WITH LLM PARSER SCHEMA (V2)
        # =====================================================================
        
        # 1. contact -> store as JSON string (matching llm_resume_parser.py)
        contact_obj = result.get('contact', {})
        result['contact'] = json.dumps({
            "name": contact_obj.get("name") or "",
            "email": contact_obj.get("email") or "",
            "phone": contact_obj.get("phone") or "",
            "linkedin": next((l for l in contact_obj.get("links", []) if 'linkedin.com' in l), ""),
            "github": next((l for l in contact_obj.get("links", []) if 'github.com' in l), ""),
            "location": contact_obj.get("location") or "",
        })

        # 2. Ensure all structured list fields exist
        result['skills'] = result.get('skills') or []
        result['experience_list'] = result.get('experience_list') or []
        result['projects_list'] = result.get('projects_list') or []
        result['education_list'] = result.get('education_list') or []

        # 3. Ensure legacy/alias string fields exist (matching llm_resume_parser.py)
        result['experience'] = "; ".join([e.get('description', '') for e in result['experience_list']])
        result['projects'] = "; ".join([p.get('description', '') for p in result['projects_list']])
        result['education'] = result.get('education_text') or ""
        
        # 4. Fill in missing fields with empty strings/defaults
        schema_defaults = {
            "professional_summary": "",
            "technical_skills": "",
            "tools_technologies": "",
            "frameworks_libraries": "",
            "databases": "",
            "cloud_platforms": "",
            "soft_skills": "",
            "experience_titles": "",
            "experience_descriptions": "",
            "experience_duration_text": "",
            "project_titles": "",
            "project_descriptions": "",
            "project_technologies": "",
            "certifications": "",
            "achievements": "",
        }
        for field, default in schema_defaults.items():
            if field not in result:
                result[field] = default

        return result

    def _extract_contact_info(self, text: str) -> Dict[str, Any]:
        """Extract name, email, phone, and links from resume."""
        contact = {'name': '', 'email': '', 'phone': '', 'links': []}
        
        # 1. Extract Email
        email_pattern = r'[a-zA-Z0-9._%+-]+ @ [a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        # Adjust for potential spaces from PDF extraction
        text_clean = text.replace(' @ ', '@')
        email_match = re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', text_clean)
        if email_match:
            contact['email'] = email_match.group(0)
            
        # 2. Extract Phone
        phone_patterns = [
            r'(\+\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}',  # US
            r'(\+\d{1,3}[- ]?)?\d{10}',                           # IN / Simple 10 digit
            r'\d{3}[- ]\d{3}[- ]\d{4}'                            # Fragmented
        ]
        for pattern in phone_patterns:
            phone_match = re.search(pattern, text)
            if phone_match:
                contact['phone'] = phone_match.group(0).strip()
                break
                
        # 3. Extract Links
        link_patterns = [
            r'linkedin\.com/in/[a-zA-Z0-9-]+',
            r'github\.com/[a-zA-Z0-9-]+',
            r'behance\.net/[a-zA-Z0-9-]+',
            r'portfolio:?\s*(https?://[^\s]+)'
        ]
        for pattern in link_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for m in matches:
                contact['links'].append(m)
                
        # 4. Extract Name (Heuristic: first non-empty line that isn't contact info)
        lines = text.split('\n')
        for line in lines[:10]:
            clean_line = line.replace('#', '').replace('*', '').strip()
            if not clean_line: continue
            if any(x in clean_line.lower() for x in ['email', 'phone', '@', 'linkedin', 'resume', 'curriculum']):
                continue
            # Look for 2-3 capitalized words
            if 3 < len(clean_line) < 30 and re.match(r'^[A-Z][a-z]+(\s[A-Z][a-z]+){1,2}$', clean_line):
                contact['name'] = clean_line
                break
                
        return contact
    
    def _extract_summary(self, text: str) -> str:
        """Extract professional summary from top of resume."""
        # Clean up HTML first (preserving structural spaces)
        text_no_html = re.sub(r'<[^>]+>', ' ', text)
        
        lines = text_no_html.split('\n')
        summary_lines = []
        
        for i, line in enumerate(lines[:20]):  # Check first 20 lines
            line = line.strip()
            line_lower = line.lower()
            
            # Skip empty or very short lines
            if len(line) < 10:
                continue
            
            # Skip contact info
            if any(kw in line_lower for kw in ['email', 'phone', '@', 'linkedin', 'github', 'http']):
                continue
            
            # Skip common section headers that appear at top
            if any(kw in line_lower for kw in ['education', 'experience', 'skills', 'project', 
                                                'certification', 'achievement', 'work history']):
                if len(line) < 30:  # It's probably a section header
                    continue
            
            # If this line contains objective/summary keyword, get next few lines
            if any(kw in line_lower for kw in ['objective', 'summary', 'profile', 'about']):
                for j in range(i+1, min(i+5, len(lines))):
                    next_line = lines[j].strip()
                    if next_line and len(next_line) > 20:
                        # Skip if it looks like contact info
                        if not any(kw in next_line.lower() for kw in ['email', 'phone', '@']):
                            summary_lines.append(next_line)
                break
            
            # Stop collecting if we hit ANY section header
            # Section headers are usually short (1-4 words) and contain a section keyword
            words = line_lower.split()
            if len(words) < 5 and any(kw in line_lower for kws in self.SECTION_KEYWORDS.values() for kw in kws):
                break
            
            # Skip if it looks like a header (uppercase, short, followed by colon or newline)
            if len(line) < 30 and re.match(r'^[A-Z\s/]+[:\s]*$', line):
                break # Summary should not cross into headers
            
            # Otherwise, collect substantial lines that could be summary
            if 30 < len(line) < 500:
                # Extra check: don't include lines that are just skill lists
                if line.count(',') > 5 or line.count('|') > 3:
                    continue
                summary_lines.append(line)
                    
        return ' '.join(summary_lines[:2])
    
    def _split_into_sections(self, text: str) -> Dict[str, str]:
        """Split text into sections based on keywords."""
        sections = {}
        text_lower = text.lower()
        
        # Find all section boundaries
        section_positions = []
        for section_name, keywords in self.SECTION_KEYWORDS.items():
            for keyword in keywords:
                # Flexible header detection: 
                # Start of line, optional symbols, keyword (maybe plural), optional colon/punctuation, spaces, end of line
                # We handle the 's?' for pluralization manually for each keyword if needed
                # But here we use a regex that matches common header patterns
                pattern = rf'^\s*[\#\-\*]*\s*({re.escape(keyword)}s?)[\s:/]*$'
                matches = list(re.finditer(pattern, text_lower, re.MULTILINE))
                for match in matches:
                    section_positions.append((match.start(), section_name))
        
        # If no sections found, try a looser match (must be a single line starting with keyword)
        if not section_positions:
             for section_name, keywords in self.SECTION_KEYWORDS.items():
                for keyword in keywords:
                    pattern = rf'^\s*({re.escape(keyword)}s?)[\s:/]*.*$'
                    matches = list(re.finditer(pattern, text_lower, re.MULTILINE))
                    for match in matches:
                        # Only accept if it's a short line
                        line_match = text_lower[match.start():text_lower.find('\n', match.start())]
                        if len(line_match.split()) < 5:
                            section_positions.append((match.start(), section_name))
        
        # Sort by position
        section_positions.sort(key=lambda x: x[0])
        
        # Extract each section
        for i, (pos, section_name) in enumerate(section_positions):
            # Find end of section (next section or end of text)
            if i + 1 < len(section_positions):
                end_pos = section_positions[i + 1][0]
            else:
                end_pos = len(text)
                
            section_text = text[pos:end_pos].strip()
            if section_text:
                sections[section_name] = section_text
                
        return sections
    
    def _parse_skills_section(self, text: str) -> Dict[str, Any]:
        """Parse skills section into categories."""
        result = {
            'technical_skills': '',
            'tools_technologies': '',
            'frameworks_libraries': '',
            'databases': '',
            'cloud_platforms': '',
            'soft_skills': '',
            'raw_skills': {
                'programming_languages': [],
                'frameworks_libraries': [],
                'databases': [],
                'cloud_platforms': [],
                'tools': [],
                'soft_skills': []
            }
        }
        
        text_lower = text.lower()
        
        # Check each category
        for skill in self.PROGRAMMING_LANGUAGES:
            if re.search(rf'\b{re.escape(skill)}\b', text_lower):
                result['raw_skills']['programming_languages'].append(skill)
                
        for skill in self.FRAMEWORKS:
            if re.search(rf'\b{re.escape(skill)}\b', text_lower):
                result['raw_skills']['frameworks_libraries'].append(skill)
                
        for skill in self.DATABASES:
            if re.search(rf'\b{re.escape(skill)}\b', text_lower):
                result['raw_skills']['databases'].append(skill)
                
        for skill in self.CLOUD:
            if re.search(rf'\b{re.escape(skill)}\b', text_lower):
                result['raw_skills']['cloud_platforms'].append(skill)
                
        for skill in self.TOOLS:
            if re.search(rf'\b{re.escape(skill)}\b', text_lower):
                result['raw_skills']['tools'].append(skill)

        for skill in self.SOFT_SKILLS:
            if re.search(rf'\b{re.escape(skill)}\b', text_lower):
                result['raw_skills']['soft_skills'].append(skill)
        
        # Build result strings
        result['technical_skills'] = ', '.join(result['raw_skills']['programming_languages'] + result['raw_skills']['frameworks_libraries'])
        result['frameworks_libraries'] = ', '.join(result['raw_skills']['frameworks_libraries'])
        result['databases'] = ', '.join(result['raw_skills']['databases'])
        result['cloud_platforms'] = ', '.join(result['raw_skills']['cloud_platforms'])
        result['tools_technologies'] = ', '.join(result['raw_skills']['tools'])
        result['soft_skills'] = ', '.join(result['raw_skills']['soft_skills'])
        
        return result
    
    def _extract_skills_from_full_text(self, text: str) -> Dict[str, Any]:
        """Extract skills from full text if no skills section found."""
        return self._parse_skills_section(text)
    
    # ---------------------------------------------------------------------------
    # Date extraction helper
    # ---------------------------------------------------------------------------
    DATE_RANGE_RE = re.compile(
        r'\(?'
        r'((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)'
        r'[\s\-./]*\d{2,4})'
        r'[\s\-–/to]*'
        r'((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)'
        r'[\s\-./]*\d{2,4}|\d{4}|present|current|now)'
        r'\)?'
        r'|\(?'
        r'(\d{4})[\s\-–/to]+(\d{4}|present|current|now)'
        r'\)?',
        re.IGNORECASE
    )

    def _extract_date_range(self, text: str) -> str:
        """Return the first date range found in text, or empty string."""
        m = self.DATE_RANGE_RE.search(text)
        if not m:
            return ''
        return m.group(0).strip(' ()').strip()

    def _parse_experience_section(self, text: str) -> Dict[str, Any]:
        """Parse experience section into structured lists."""
        result = {
            'experience_titles': '',
            'experience_descriptions': '',
            'experience_duration_text': '',
            'experience_list': []
        }
        
        # Split by double newlines or lines that look like a job title
        blocks = re.split(r'\n\n|\n(?=[A-Z][\w\s&]{5,50}(?:\s+\||$|\r))', text)
        
        titles = []
        durations = []
        descriptions = []
        
        for block in blocks:
            lines = [l.strip() for l in block.split('\n') if l.strip()]
            if not lines: continue
            
            header = lines[0]
            
            # --- Duration: pull from parentheses OR inline date range ---
            duration = self._extract_date_range(header)
            # Remove duration from header to isolate title/company
            header_clean = self.DATE_RANGE_RE.sub('', header).strip(' |()')
            
            # Split remaining by | to get title and company
            parts = [p.strip() for p in header_clean.split('|')]
            title = parts[0].strip()
            company = parts[1].strip() if len(parts) > 1 else ''
            
            # If company still has a location appended, separate it
            # e.g. "SAP & Edunet Foundation  Gujarat, India" → keep as company
            location = ''
            loc_match = re.search(r',\s*[A-Z][a-z]+(?:,\s*[A-Z][a-z]+)?\s*$', company)
            if loc_match:
                location = loc_match.group(0).strip(', ')
                company = company[:loc_match.start()].strip()
            
            # Clean title: remove leftover parentheses
            title = re.sub(r'\(.*?\)', '', title).strip()
            
            desc = " ".join(lines[1:])
            
            if title and desc:
                titles.append(title)
                durations.append(duration)
                descriptions.append(desc)
                exp_techs = []
                for tech in self.PROGRAMMING_LANGUAGES + self.FRAMEWORKS + self.TOOLS:
                    if re.search(rf'\b{re.escape(tech)}\b', block.lower()):
                        exp_techs.append(tech)
                exp_techs = list(set(exp_techs))

                result['experience_list'].append({
                    'title': title,
                    'company': company,
                    'location': location,
                    'start_date': '',
                    'end_date': '',
                    'duration': duration,
                    'is_current': bool(re.search(r'present|current|now', duration, re.I)),
                    'is_internship': bool(re.search(r'intern', title, re.I)),
                    'description': desc,
                    'technologies': exp_techs,
                    'technologies_used': exp_techs,
                    'quantified_achievements': []
                })
        
        result['experience_titles'] = ' | '.join(titles)
        result['experience_duration_text'] = ' | '.join(durations)
        result['experience_descriptions'] = ' '.join(descriptions)
        
        return result

    def _extract_experience_from_text_robust(self, text: str) -> Dict[str, Any]:
        """Extract experience from text block."""
        # Clean the text: if it starts with the section keyword, remove it
        cleaned_text = text
        for kw in self.SECTION_KEYWORDS['experience']:
            cleaned_text = re.sub(rf'^\s*{re.escape(kw)}s?[\s:]*', '', cleaned_text, flags=re.I | re.M)
        
        return self._parse_experience_section(cleaned_text)

    def _parse_projects_section(self, text: str) -> Dict[str, Any]:
        """Parse projects section into structured lists."""
        result = {
            'project_titles': '',
            'project_descriptions': '',
            'project_technologies': '',
            'projects_list': []
        }
        
        # Split on 'Project title:' markers when present, else on blank lines
        if 'project title:' in text.lower():
            blocks = re.split(r'\n(?=project title:)', text, flags=re.I)
        else:
            blocks = re.split(r'\n\n|\n(?=[A-Z][\w\s]{5,40}(?:$|\n))', text)
        
        titles = []
        descriptions = []
        technologies = []
        
        for block in blocks:
            # Remove 'Project title:' prefix
            block_clean = re.sub(r'^\s*project title:\s*', '', block, flags=re.I)
            lines = [l.strip() for l in block_clean.split('\n') if l.strip()]
            if not lines: continue
            
            title_line = lines[0]

            # --- Extract GitHub URL ---
            github_url = ''
            github_match = re.search(r'\(?(https?://github\.com/[^\s\)\]]+)\)?', title_line, re.I)
            if github_match:
                github_url = github_match.group(1)
            # Also capture [Link](URL) markdown style
            if not github_url:
                md_link = re.search(r'\[\w+\]\((https?://github\.com/[^\)]+)\)', title_line, re.I)
                if md_link:
                    github_url = md_link.group(1)

            # --- Extract project date ---
            project_date = self._extract_date_range(title_line)
            if not project_date:
                # Try standalone month-year like "OCT-2024" or "OCT 2024"
                mono_match = re.search(
                    r'\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[\s\-]\d{4}\b',
                    title_line, re.I
                )
                if mono_match:
                    project_date = mono_match.group(0)

            # --- Clean title: strip link markdown, dates, URLs ---
            title = re.sub(r'\[\s*\[?\w+\]?\([^)]+\)\s*\]', '', title_line)  # [[Link](url)]
            title = re.sub(r'https?://\S+', '', title)                         # bare URLs
            title = self.DATE_RANGE_RE.sub('', title)                           # date ranges
            title = re.sub(
                r'\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[\s\-]\d{4}\b',
                '', title, flags=re.I
            )
            title = title.strip(' |-,[]()').strip()

            if len(title) > 100 or len(title) < 3:
                continue
            
            # Skip pure section headers
            if any(kw in title.lower() for kws in self.SECTION_KEYWORDS.values() for kw in kws):
                if len(title) < 20:
                    continue

            desc = " ".join(lines[1:])

            # Extract techs from the whole block
            proj_techs = []
            for tech in self.PROGRAMMING_LANGUAGES + self.FRAMEWORKS + self.TOOLS:
                if re.search(rf'\b{re.escape(tech)}\b', block.lower()):
                    proj_techs.append(tech)
            proj_techs = list(set(proj_techs))

            titles.append(title)
            descriptions.append(desc)
            technologies.extend(proj_techs)

            result['projects_list'].append({
                'name': title,
                'description': desc,
                'technologies': proj_techs,
                'github_url': github_url,
                'date': project_date,
                'impact': None
            })
            
        result['project_titles'] = ' | '.join(titles)
        result['project_descriptions'] = ' '.join(descriptions)
        result['project_technologies'] = ', '.join(list(set(technologies)))
        
        return result

    def _extract_projects_from_text_robust(self, text: str) -> Dict[str, Any]:
        """Extract projects from text block."""
        # Clean the text: if it starts with the section keyword, remove it
        cleaned_text = text
        for kw in self.SECTION_KEYWORDS['project']:
            cleaned_text = re.sub(rf'^\s*{re.escape(kw)}s?[\s:]*', '', cleaned_text, flags=re.I | re.M)
            
        return self._parse_projects_section(cleaned_text)
    
    def _parse_education_robust(self, text: str) -> Dict[str, Any]:
        """Parse education section into structured lists."""
        edu_list = []
        lines = [l.strip() for l in text.split('\n') if l.strip()]
        
        DEGREE_PAT = re.compile(
            r'(bachelor|master|phd|b\.sc|m\.sc|b\.tech|m\.tech'
            r'|b\.e\.|m\.e\.|secondary|intermediate|diploma'
            r'|graduate|undergraduate|science|arts|commerce|engineering)',
            re.I
        )
        YEAR_PAT = re.compile(r'(?:19|20)\d{2}(?:[-–\s/to]+(?:(?:19|20)\d{2}|(?:july|june|may|april|march|february|january|dec|nov|oct|sep|aug|jul|jun|may|apr|mar|feb|jan)[\s,]*\d{2,4}))?', re.I)
        GPA_PAT  = re.compile(r'(?:cgpa|gpa)[\s:\-]*(\d+\.?\d*)', re.I)

        # Two-pass merge: join consecutive non-degree lines into the degree entry above them
        # so separate lines like "2021-2025  CGPA - 9" get merged in.
        merged = []
        i = 0
        while i < len(lines):
            line = lines[i]
            # If this line has a degree keyword, try to absorb the next few lines
            if DEGREE_PAT.search(line):
                combined = line
                j = i + 1
                while j < len(lines) and j < i + 4:
                    next_line = lines[j]
                    # Stop absorption if next line looks like a new section header
                    if any(kw == next_line.lower() for kws in self.SECTION_KEYWORDS.values() for kw in kws):
                        break
                    # Stop if next line itself has a degree (new entry)
                    if DEGREE_PAT.search(next_line) and j != i + 1:
                        break
                    combined += '  ' + next_line
                    j += 1
                merged.append(combined)
                i = j
            else:
                merged.append(line)
                i += 1

        for line in merged:
            # Skip pure short headers
            if len(line) < 15 and any(kw in line.lower() for kw in self.SECTION_KEYWORDS['education']):
                continue

            deg_match = DEGREE_PAT.search(line)
            if not deg_match:
                continue

            # Year
            year_match = YEAR_PAT.search(line)
            year = year_match.group(0).strip() if year_match else ''

            # GPA — search across whole combined line
            gpa_match = GPA_PAT.search(line)
            gpa = gpa_match.group(1) if gpa_match else ''

            # Field of study heuristic: text between degree keyword and institution keyword
            field_match = re.search(
                r'(?:of|in)\s+([\w\s&]+?)(?:\s+(?:at|from|,|\[|\())',
                line, re.I
            )
            field_of_study = field_match.group(1).strip() if field_match else ''

            # Institution: strip degree, field, year, gpa, brackets
            inst = line
            inst = DEGREE_PAT.sub('', inst)
            inst = YEAR_PAT.sub('', inst)
            inst = GPA_PAT.sub('', inst)
            inst = re.sub(r'\b(of|in|at|from)\b', '', inst, flags=re.I)
            inst = re.sub(r'[\[\]\(\)]', '', inst)
            # Strip "Relevant Coursework:" and everything after it
            inst = re.sub(r'relevant coursework[\s\S]*', '', inst, flags=re.I)
            inst = re.sub(r'\s{2,}', ' ', inst).strip(' ,-|')
            # Take the longest segment that looks like an institution name
            candidates = [p.strip() for p in re.split(r',|\|', inst) if p.strip()]
            if candidates:
                inst = max(candidates, key=len)

            edu_list.append({
                'degree': deg_match.group(0).upper(),
                'field_of_study': field_of_study,
                'institution': inst[:150],
                'year': year,
                'gpa': gpa,
                'start_date': '',
                'end_date': '',
                'location': ''
            })

        text_summary = " | ".join(
            [f"{e['degree']} in {e['field_of_study']} at {e['institution']} ({e['year']})"
             if e.get('field_of_study') else
             f"{e['degree']} at {e['institution']} ({e['year']})" for e in edu_list]
        )
        return {'text': text_summary, 'list': edu_list}

    def _extract_education_from_text_robust(self, text: str) -> Dict[str, Any]:
        """Extract education from text block."""
        cleaned_text = text
        for kw in self.SECTION_KEYWORDS['education']:
            cleaned_text = re.sub(rf'^\s*{re.escape(kw)}s?[\s:]*', '', cleaned_text, flags=re.I | re.M)
            
        return self._parse_education_robust(cleaned_text)

    def _parse_certifications(self, text: str) -> str:
        """Parse certifications."""
        lines = text.split('\n')
        certs = []
        for line in lines:
            line = line.strip()
            if not line: continue
            if any(kw in line.lower() for kw in self.SECTION_KEYWORDS['certification']):
                continue
            certs.append(line)
        return ' \n '.join(certs)
    
    def _parse_achievements(self, text: str) -> str:
        """Parse achievements."""
        lines = text.split('\n')
        achievements = []
        for line in lines:
            line = line.strip()
            if not line: continue
            if any(kw in line.lower() for kw in self.SECTION_KEYWORDS['achievement']):
                continue
            achievements.append(line)
        return ' \n '.join(achievements)


# Singleton instance
simple_resume_parser = SimpleResumeParser()
```
