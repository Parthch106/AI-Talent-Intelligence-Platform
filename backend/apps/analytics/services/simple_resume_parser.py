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
