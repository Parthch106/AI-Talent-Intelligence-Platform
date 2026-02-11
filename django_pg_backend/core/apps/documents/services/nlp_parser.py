"""
Resume NLP Parser
Uses spaCy NER and pattern matching to extract structured data from resume text.
"""

import re
from typing import Dict, List, Optional, Any
from datetime import datetime
from dateutil import parser as date_parser

# Try to import spaCy, but make it optional
try:
    import spacy
    SPACY_AVAILABLE = True
except ImportError:
    SPACY_AVAILABLE = False

# Try optional imports
try:
    import phonenumbers
    PHONE_AVAILABLE = True
except ImportError:
    PHONE_AVAILABLE = False

try:
    from email_validator import validate_email, EmailNotValidError
    EMAIL_AVAILABLE = True
except ImportError:
    EMAIL_AVAILABLE = False


class ResumeNLPParser:
    """
    NLP-based resume parser using spaCy for Named Entity Recognition
    and custom pattern matching for resume-specific entities.
    
    Falls back to regex-based parsing if spaCy is not available.
    """
    
    # Common skill keywords across domains
    COMMON_SKILLS = {
        # Programming Languages
        'python', 'java', 'javascript', 'typescript', 'c', 'c++', 'c#', 'go', 'rust',
        'ruby', 'php', 'swift', 'kotlin', 'scala', 'r', 'matlab', 'sql', 'html', 'css',
        
        # Web Frameworks
        'django', 'flask', 'fastapi', 'spring', 'express', 'react', 'angular', 'vue',
        'next.js', 'nuxt.js', 'node.js', 'asp.net', 'laravel', 'rails',
        
        # Data Science & ML
        'tensorflow', 'pytorch', 'keras', 'scikit-learn', 'pandas', 'numpy', 'matplotlib',
        'seaborn', 'nltk', 'spacy', 'opencv', 'jupyter', 'tableau', 'power bi',
        
        # Cloud & DevOps
        'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'git', 'ci/cd',
        'terraform', 'ansible', 'linux', 'bash', 'shell', 'nginx', 'apache',
        
        # Databases
        'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'sqlite', 'oracle',
        'sql server', 'cassandra', 'dynamodb',
        
        # Tools & Others
        'git', 'github', 'gitlab', 'jira', 'confluence', 'slack', 'figma', 'postman',
        'swagger', 'graphql', 'rest api', 'soap', 'json', 'xml', 'yaml', 'markdown',
    }
    
    # Education degree patterns
    DEGREE_PATTERNS = [
        r'(?:bachelor|b\.?s\.?|b\.?tech\.?|b\.?e\.?)\s*(?:of\s+)?(?:science|engineering|technology|arts)?',
        r'(?:master|m\.?s\.?|m\.?tech\.?|m\.?e\.?|m\.?b\.?a\.?)\s*(?:of\s+)?(?:science|engineering|technology|business\s+administration|arts)?',
        r'(?:ph\.?d\.?|doctorate|doctor)\s*(?:of\s+)?(?:philosophy|science)?',
        r'(?:associate|a\.?a\.?|a\.?s\.?)\s*(?:of\s+)?(?:arts|science|applied\s+science)?',
        r'(?:diploma|certificate)\s*(?:in\s+)?',
    ]
    
    # Certification patterns
    CERTIFICATION_PATTERNS = [
        r'(?:certified|certification|certificate)\s+(?:[\w\s]+)',
        r'(?:aws|azure|gcp|google|microsoft|oracle|cisco|pmp|scrum)\s+(?:certified|certification)',
        r'(?:ccna|ccnp|ccie|aws\s+(?:solution\s+)?architect|azure\s+(?:solution\s+)?architect)',
    ]
    
    def __init__(self, model_name: str = 'en_core_web_lg'):
        """
        Initialize the NLP parser with spaCy model.
        
        Args:
            model_name: Name of the spaCy model to use
        """
        self.nlp = None
        self.use_spacy = False
        
        if SPACY_AVAILABLE:
            try:
                self.nlp = spacy.load(model_name)
                self.use_spacy = True
            except OSError:
                try:
                    self.nlp = spacy.load('en_core_web_sm')
                    self.use_spacy = True
                except OSError:
                    pass
        
        # Compile regex patterns
        self.email_pattern = re.compile(
            r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        )
        self.phone_pattern = re.compile(
            r'(?:\+?(\d{1,3})[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'
        )
        self.url_pattern = re.compile(
            r'https?://(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b'
        )
        self.linkedin_pattern = re.compile(
            r'linkedin\.com/in/[\w-]+'
        )
        self.github_pattern = re.compile(
            r'github\.com/[\w-]+'
        )
        
        # Compile degree and certification patterns
        self.degree_regex = re.compile(
            '|'.join(self.DEGREE_PATTERNS), re.IGNORECASE
        )
        self.certification_regex = re.compile(
            '|'.join(self.CERTIFICATION_PATTERNS), re.IGNORECASE
        )
    
    def parse_resume(self, text: str) -> Dict[str, Any]:
        """
        Parse resume text and extract structured information.
        
        Args:
            text: Raw resume text
            
        Returns:
            Dictionary containing parsed resume data
        """
        if not text or len(text.strip()) < 50:
            return self._empty_result()
        
        doc = None
        if self.use_spacy and self.nlp:
            doc = self.nlp(text)
        
        # Extract basic data
        skills = self._extract_skills(text)
        experience = self._extract_experience(text)
        projects = self._extract_projects(text)
        
        result = {
            'name': self._extract_name(doc, text),
            'email': self._extract_email(text),
            'phone': self._extract_phone(text),
            'skills': skills,
            'education': self._extract_education(text),
            'experience': experience,
            'projects': projects,
            'certifications': self._extract_certifications(text),
            'tools': self._extract_tools(text),
            'total_experience_years': self._calculate_total_experience(text),
            # Phase 2 - Part 1: Extract applied role
            'applied_role': self._infer_applied_role(skills, experience, projects),
        }
        
        return result
    
    def _empty_result(self) -> Dict[str, Any]:
        """Return empty result structure."""
        return {
            'name': None,
            'email': None,
            'phone': None,
            'skills': [],
            'education': [],
            'experience': [],
            'projects': [],
            'certifications': [],
            'tools': [],
            'total_experience_years': 0.0,
        }
    
    def _extract_name(self, doc: Any, text: str) -> Optional[str]:
        """
        Extract candidate name from resume.
        """
        if doc:
            # Find PERSON entities in first lines
            first_lines = '\n'.join(text.split('\n')[:5])
            for ent in doc.ents:
                if ent.label_ == 'PERSON' and len(ent.text.split()) >= 2:
                    if ent.start_char < len(first_lines):
                        if not any(word in ent.text.lower() for word in 
                                  ['resume', 'curriculum', 'vitae', 'cv', 'page']):
                            return ent.text.strip()
        
        # Fallback: look for first non-empty line that might be a name
        lines = text.split('\n')
        for line in lines[:5]:
            line = line.strip()
            if line and len(line.split()) >= 2:
                # Skip lines that look like section headers
                if not any(keyword in line.lower() for keyword in 
                          ['education', 'experience', 'skills', 'summary', 'objective', 'contact']):
                    if '@' not in line:  # Not an email
                        return line
        
        return None
    
    def _extract_email(self, text: str) -> Optional[str]:
        """Extract email address from text."""
        match = self.email_pattern.search(text)
        if match:
            email = match.group()
            if EMAIL_AVAILABLE:
                try:
                    validate_email(email)
                    return email.lower()
                except EmailNotValidError:
                    pass
            return email.lower()
        return None
    
    def _extract_phone(self, text: str) -> Optional[str]:
        """Extract phone number from text."""
        match = self.phone_pattern.search(text)
        if match:
            phone = match.group()
            if PHONE_AVAILABLE:
                try:
                    parsed = phonenumbers.parse(phone, None)
                    if phonenumbers.is_valid_number(parsed):
                        return phonenumbers.format_number(
                            parsed, phonenumbers.PhoneNumberFormat.E164
                        )
                except Exception:
                    pass
            return phone
        return None
    
    def _extract_skills(self, text: str) -> List[str]:
        """
        Extract skills from resume using keyword matching.
        """
        skills = set()
        text_lower = text.lower()
        
        # Extract from common skills list
        for skill in self.COMMON_SKILLS:
            if skill in text_lower:
                skills.add(skill)
        
        # Extract from skill sections
        skill_section = self._extract_section(text, ['skills', 'technical skills', 'technologies', 'tech stack'])
        if skill_section:
            for skill in self.COMMON_SKILLS:
                if skill in skill_section.lower():
                    skills.add(skill)
        
        return sorted(list(skills))
    
    def _extract_education(self, text: str) -> List[Dict[str, str]]:
        """
        Extract education information from resume.
        """
        education_entries = []
        
        # Find education section
        education_section = self._extract_section(
            text, 
            ['education', 'academic', 'qualifications', 'educational background']
        )
        
        if not education_section:
            return education_entries
        
        # Split by common delimiters
        entries = re.split(r'\n{2,}|\n(?=[A-Z])', education_section)
        
        for entry in entries:
            entry = entry.strip()
            if len(entry) < 20:
                continue
            
            # Extract degree
            degree_match = self.degree_regex.search(entry)
            degree = degree_match.group() if degree_match else None
            
            # Extract institution (look for university keywords)
            university_match = re.search(
                r'(?:university|college|institute|school|academy)\s+[\w\s,\.]+',
                entry, re.IGNORECASE
            )
            institution = university_match.group() if university_match else None
            
            # Extract year
            year_match = re.search(r'\b(19|20)\d{2}\b', entry)
            year = year_match.group() if year_match else None
            
            # Extract GPA if present
            gpa_match = re.search(r'(?:gpa|cgpa)[:\s]*([0-3]\.\d{2}|4\.0)', entry, re.IGNORECASE)
            gpa = gpa_match.group(1) if gpa_match else None
            
            if degree or institution:
                education_entries.append({
                    'degree': degree or '',
                    'institution': institution or '',
                    'year': year or '',
                    'gpa': gpa or '',
                })
        
        return education_entries
    
    def _extract_experience(self, text: str) -> List[Dict[str, str]]:
        """
        Extract work experience from resume.
        """
        experience_entries = []
        
        # Find experience section
        experience_section = self._extract_section(
            text,
            ['experience', 'work experience', 'employment', 'work history', 'professional experience']
        )
        
        if not experience_section:
            return experience_entries
        
        # Split by common delimiters (new job entries)
        entries = re.split(r'\n{2,}|\n(?=[A-Z][a-z]+ [A-Z])', experience_section)
        
        for entry in entries:
            entry = entry.strip()
            if len(entry) < 30:
                continue
            
            # Extract job title (usually first line)
            lines = entry.split('\n')
            title = lines[0].strip() if lines else None
            
            # Extract company (look for Inc., Corp., Ltd., etc.)
            company_match = re.search(
                r'([\w\s]+)\s+(?:Inc|Corp|Ltd|LLC|Company|Co\.)',
                entry
            )
            company = company_match.group(1).strip() if company_match else None
            
            # Extract dates
            dates = self._extract_dates(entry)
            start_date = dates.get('start')
            end_date = dates.get('end')
            
            # Extract description (remaining text)
            description = '\n'.join(lines[1:]) if len(lines) > 1 else ''
            
            if title or company:
                experience_entries.append({
                    'title': title or '',
                    'company': company or '',
                    'start_date': start_date or '',
                    'end_date': end_date or '',
                    'description': description.strip(),
                })
        
        return experience_entries
    
    def _extract_projects(self, text: str) -> List[Dict[str, Any]]:
        """
        Extract project information from resume.
        """
        project_entries = []
        
        # Find projects section
        projects_section = self._extract_section(
            text,
            ['projects', 'personal projects', 'academic projects', 'key projects']
        )
        
        if not projects_section:
            return project_entries
        
        # Split by common delimiters
        entries = re.split(r'\n{2,}|\n(?=[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)', projects_section)
        
        for entry in entries:
            entry = entry.strip()
            if len(entry) < 20:
                continue
            
            # Extract project name (usually first line)
            lines = entry.split('\n')
            name = lines[0].strip() if lines else None
            
            # Extract description
            description = '\n'.join(lines[1:]) if len(lines) > 1 else ''
            
            # Extract technologies mentioned
            technologies = []
            for skill in self.COMMON_SKILLS:
                if skill in entry.lower():
                    technologies.append(skill)
            
            if name:
                project_entries.append({
                    'name': name,
                    'description': description.strip(),
                    'technologies': technologies,
                })
        
        return project_entries
    
    def _extract_certifications(self, text: str) -> List[Dict[str, str]]:
        """
        Extract certifications from resume.
        """
        certification_entries = []
        
        # Find certifications section
        certifications_section = self._extract_section(
            text,
            ['certifications', 'certificates', 'credentials', 'licenses']
        )
        
        if not certifications_section:
            return certification_entries
        
        # Find all certification patterns
        matches = self.certification_regex.finditer(certifications_section)
        
        for match in matches:
            cert_text = match.group().strip()
            
            # Extract year if present
            year_match = re.search(r'\b(19|20)\d{2}\b', cert_text)
            year = year_match.group() if year_match else ''
            
            # Extract issuer
            issuer_match = re.search(
                r'(aws|azure|gcp|google|microsoft|oracle|cisco|ibm|amazon)',
                cert_text, re.IGNORECASE
            )
            issuer = issuer_match.group() if issuer_match else ''
            
            certification_entries.append({
                'name': cert_text,
                'issuer': issuer or '',
                'date': year,
            })
        
        return certification_entries
    
    def _extract_tools(self, text: str) -> List[str]:
        """
        Extract tools and technologies from resume.
        """
        tools = set()
        text_lower = text.lower()
        
        # Tool-specific keywords
        tool_keywords = [
            'git', 'github', 'gitlab', 'jira', 'confluence', 'slack', 'trello',
            'figma', 'sketch', 'adobe', 'photoshop', 'illustrator', 'postman',
            'swagger', 'insomnia', 'vs code', 'visual studio', 'intellij', 'eclipse',
            'docker', 'kubernetes', 'jenkins', 'travis ci', 'circleci',
            'aws', 'azure', 'gcp', 'heroku', 'vercel', 'netlify',
            'mongodb compass', 'pgadmin', 'mysql workbench', 'dbeaver',
        ]
        
        for tool in tool_keywords:
            if tool in text_lower:
                tools.add(tool)
        
        return sorted(list(tools))
    
    def _calculate_total_experience(self, text: str) -> float:
        """
        Calculate total years of experience from resume.
        """
        total_years = 0.0
        
        # Find experience section
        experience_section = self._extract_section(
            text,
            ['experience', 'work experience', 'employment', 'work history']
        )
        
        if not experience_section:
            return total_years
        
        # Extract all date ranges
        date_ranges = re.findall(
            r'((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4})\s*(?:-|–|to)\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|present|current)',
            experience_section,
            re.IGNORECASE
        )
        
        for start_str, end_str in date_ranges:
            try:
                start_date = date_parser.parse(start_str)
                
                if end_str.lower() in ['present', 'current']:
                    end_date = datetime.now()
                else:
                    end_date = date_parser.parse(end_str)
                
                # Calculate years difference
                years = (end_date - start_date).days / 365.25
                total_years += years
            except Exception:
                continue
        
        # Round to 1 decimal place
        return round(total_years, 1)
    
    def _extract_section(self, text: str, section_names: List[str]) -> Optional[str]:
        """
        Extract a specific section from resume text.
        """
        text_lower = text.lower()
        
        # Find section start
        section_start = None
        for name in section_names:
            pattern = rf'\n\s*{re.escape(name)}\s*[:\n]'
            match = re.search(pattern, text_lower, re.IGNORECASE)
            if match:
                section_start = match.start()
                break
        
        if section_start is None:
            return None
        
        # Find section end (next major section)
        section_end = len(text)
        next_section_pattern = r'\n\s*(?:education|experience|skills|projects|certifications|references|interests|activities)\s*[:\n]'
        next_match = re.search(next_section_pattern, text[section_start:], re.IGNORECASE)
        if next_match:
            section_end = section_start + next_match.start()
        
        return text[section_start:section_end].strip()
    
    def _extract_dates(self, text: str) -> Dict[str, Optional[str]]:
        """
        Extract start and end dates from text.
        """
        dates = {'start': None, 'end': None}
        
        # Look for date range patterns
        date_range_pattern = r'((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4})\s*(?:-|–|to)\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|present|current)'
        match = re.search(date_range_pattern, text, re.IGNORECASE)
        
        if match:
            dates['start'] = match.group(1)
            end_str = match.group(2)
            dates['end'] = end_str if end_str.lower() not in ['present', 'current'] else 'Present'
        
        return dates
    
    def _infer_applied_role(
        self,
        skills: List[str],
        experience: List[Dict[str, str]],
        projects: List[Dict[str, Any]]
    ) -> Optional[str]:
        """
        Infer the applied role based on skills, experience, and projects.
        
        Args:
            skills: List of extracted skills
            experience: List of experience entries
            projects: List of project entries
            
        Returns:
            Inferred role name or None
        """
        # Role-specific skill mappings
        role_skill_mapping = {
            'FRONTEND_DEVELOPER': {
                'core': ['javascript', 'typescript', 'react', 'html', 'css'],
                'bonus': ['vue', 'angular', 'next.js', 'redux', 'tailwind', 'webpack', 'vite']
            },
            'BACKEND_DEVELOPER': {
                'core': ['python', 'django', 'sql', 'rest api'],
                'bonus': ['flask', 'fastapi', 'postgresql', 'mysql', 'redis', 'docker', 'nginx']
            },
            'FULLSTACK_DEVELOPER': {
                'core': ['javascript', 'python', 'react', 'django', 'sql'],
                'bonus': ['typescript', 'node.js', 'express', 'postgresql', 'mongodb', 'docker']
            },
            'DATA_SCIENTIST': {
                'core': ['python', 'pandas', 'numpy', 'scikit-learn'],
                'bonus': ['tensorflow', 'pytorch', 'matplotlib', 'seaborn', 'jupyter', 'sql']
            },
            'ML_ENGINEER': {
                'core': ['python', 'tensorflow', 'pytorch', 'machine learning'],
                'bonus': ['keras', 'scikit-learn', 'pandas', 'numpy', 'docker', 'kubernetes']
            },
            'DEVOPS_ENGINEER': {
                'core': ['docker', 'kubernetes', 'git', 'ci/cd'],
                'bonus': ['aws', 'azure', 'gcp', 'terraform', 'ansible', 'jenkins', 'linux']
            },
            'MOBILE_DEVELOPER': {
                'core': ['react native', 'javascript', 'mobile'],
                'bonus': ['flutter', 'ios', 'android', 'swift', 'kotlin', 'xcode', 'android studio']
            },
            'QA_ENGINEER': {
                'core': ['testing', 'automation', 'python'],
                'bonus': ['selenium', 'pytest', 'junit', 'cypress', 'postman', 'jira']
            },
            'UI_UX_DESIGNER': {
                'core': ['ui', 'ux', 'design', 'figma'],
                'bonus': ['adobe xd', 'sketch', 'prototyping', 'user research', 'wireframing']
            },
            'PRODUCT_MANAGER': {
                'core': ['product management', 'agile', 'scrum'],
                'bonus': ['jira', 'confluence', 'user stories', 'roadmap', 'analytics', 'kanban']
            },
        }
        
        # Normalize skills to lowercase
        skills_lower = [s.lower() for s in skills]
        
        # Calculate role scores
        role_scores = {}
        for role, role_skills in role_skill_mapping.items():
            core_skills = role_skills['core']
            bonus_skills = role_skills['bonus']
            
            # Count matching core skills (weighted higher)
            core_matches = sum(1 for skill in core_skills if skill in skills_lower)
            core_score = core_matches / len(core_skills) if core_skills else 0
            
            # Count matching bonus skills
            bonus_matches = sum(1 for skill in bonus_skills if skill in skills_lower)
            bonus_score = bonus_matches / len(bonus_skills) if bonus_skills else 0
            
            # Combined score (core skills weighted 70%, bonus skills 30%)
            role_scores[role] = (core_score * 0.7) + (bonus_score * 0.3)
        
        # Find the role with the highest score
        if role_scores:
            best_role = max(role_scores, key=role_scores.get)
            # Only return if score is above threshold (at least 30% match)
            if role_scores[best_role] >= 0.3:
                return best_role
        
        return None
