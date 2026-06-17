"""
PHASE 1: Resume Parsing & Structured Extraction Engine
======================================================

This module extracts structured features from raw resume data.
It processes ResumeData model and outputs features ready for ML model input.

Features extracted:
- Skill & Role Matching Features
- Education Features
- Experience Features
- Project Features
- Resume Quality Features

Author: AI Talent Intelligence Platform
"""

import re
import ast
import logging
from typing import Dict, List, Any, Optional
from collections import Counter

# PDF/DOCX parsing imports
try:
    import fitz  # PyMuPDF
    PYMMU_AVAILABLE = True
except ImportError:
    PYMMU_AVAILABLE = False

try:
    import docx
    DOCX_AVAILABLE = True
except ImportError:
    DOCX_AVAILABLE = False

logger = logging.getLogger(__name__)


class ResumeParsingEngine:
    """
    Enterprise-grade Resume Parsing & Feature Extraction Engine.
    
    Extracts structured features from resume text and parsed resume data
    for ML model input.
    """
    
    # =========================================================================
    # SKILL & ROLE MATCHING FEATURES
    # =========================================================================
    
    # Core technical skills database
    TECHNICAL_SKILLS = {
        'programming_languages': [
            'python', 'java', 'javascript', 'typescript', 'c', 'c++', 'c#', 
            'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala', 'r',
            'matlab', 'perl', 'shell', 'bash'
        ],
        'web_frameworks': [
            'django', 'flask', 'fastapi', 'spring', 'express', 'react', 
            'angular', 'vue', 'next.js', 'nuxt.js', 'node.js', 'asp.net',
            'laravel', 'rails', 'fastapi', 'nestjs'
        ],
        'frontend': [
            'html', 'css', 'sass', 'less', 'tailwind', 'bootstrap', 
            'redux', 'context api', 'graphql', 'ajax'
        ],
        'backend': [
            'rest api', 'graphql', 'microservices', 'grpc', 'websocket',
            'authentication', 'authorization', 'jwt', 'oauth'
        ],
        'databases': [
            'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch',
            'sqlite', 'oracle', 'cassandra', 'dynamodb', 'firebase'
        ],
        'cloud_devops': [
            'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins',
            'ci/cd', 'terraform', 'ansible', 'nginx', 'apache'
        ],
        'data_science_ml': [
            'tensorflow', 'pytorch', 'keras', 'scikit-learn', 'pandas',
            'numpy', 'matplotlib', 'seaborn', 'nltk', 'spacy', 'opencv',
            'jupyter', 'tableau', 'power bi', 'machine learning',
            'deep learning', 'data analysis', 'statistics'
        ],
        'tools': [
            'git', 'github', 'gitlab', 'jira', 'confluence', 'postman',
            'swagger', 'insomnia', 'vs code', 'visual studio', 'intellij'
        ]
    }
    
    # Leadership keywords
    LEADERSHIP_KEYWORDS = [
        'lead', 'leader', 'managed', 'mentored', 'coordinated',
        'supervised', 'directed', 'headed', 'organized', 'led team'
    ]
    
    # Action verbs for impact detection
    ACTION_VERBS = [
        'achieved', 'developed', 'created', 'implemented', 'designed',
        'built', 'launched', 'optimized', 'improved', 'increased',
        'reduced', 'managed', 'led', 'coordinated', 'collaborated',
        'analyzed', 'automated', 'integrated', 'deployed', 'maintained'
    ]
    
    # =========================================================================
    # EDUCATION FEATURES
    # =========================================================================
    
    DEGREE_LEVELS = {
        'high school': 1,
        'diploma': 1,
        'associate': 2,
        'bachelor': 2,
        'b.tech': 2,
        'b.e.': 2,
        'b.sc.': 2,
        'm.tech': 3,
        'm.sc.': 3,
        'mba': 3,
        'phd': 3,
        'ph.d': 3
    }
    
    TIER_1_UNIVERSITIES = [
        'iit', 'iim', 'nit', 'bits pilani', 'iiit', 'mit', 'stanford',
        'harvard', 'berkeley', 'cmu', 'caltech', 'oxford', 'cambridge',
        ' ETH zurich', 'EPFL', 'imperial college', 'yale', 'princeton'
    ]
    
    TIER_2_UNIVERSITIES = [
        'vit', 'manipal', 'rvce', 'pesit', 'dsce', 'bmsce', 'rnsit',
        'dy patil', 'symbiosis', 'amrita', ' Bennett', 'University of Toronto',
        'University of Waterloo', 'University of British Columbia'
    ]
    
    # =========================================================================
    # EXPERIENCE FEATURES
    # =========================================================================
    
    INTERNSHIP_KEYWORDS = [
        'intern', 'internship', 'trainee', 'student developer',
        'summer intern', 'winter intern', 'placement'
    ]
    
    OPEN_SOURCE_KEYWORDS = [
        'open source', 'github', 'contributed', 'pull request',
        'github contributions', 'opensource'
    ]
    
    HACKATHON_KEYWORDS = [
        'hackathon', 'codeathon', 'ideathon', 'hackfest'
    ]
    
    # =========================================================================
    # PROJECT FEATURES
    # =========================================================================
    
    PRODUCTION_TOOLS = [
        'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'jenkins',
        'ci/cd', 'github actions', 'gitlab ci', 'nginx', 'apache',
        'redis', 'postgresql', 'mongodb', 'elasticsearch', 'kafka'
    ]
    
    PROJECT_COMPLEXITY_INDICATORS = [
        'microservices', 'distributed', 'scalable', 'high availability',
        'real-time', 'multi-threaded', 'algorithm', 'machine learning',
        'deep learning', 'natural language processing', 'computer vision'
    ]
    
    QUANTIFIED_WORDS = [
        'percentage', '%', 'increased', 'decreased', 'improved',
        'reduced', 'optimized', 'faster', 'better', 'number of',
        'users', 'customers', 'revenue', 'performance', 'efficiency'
    ]
    
    # =========================================================================
    # RESUME QUALITY FEATURES
    # =========================================================================
    
    RESUME_SECTION_KEYWORDS = {
        'education': ['education', 'academic', 'qualification', 'degree'],
        'experience': ['experience', 'employment', 'work history', 'internship'],
        'projects': ['projects', 'project', 'work samples'],
        'skills': ['skills', 'technical skills', 'technologies'],
        'achievements': ['achievements', 'awards', 'recognition']
    }
    
    def __init__(self):
        """Initialize the parsing engine with compiled patterns."""
        # Compile regex patterns for efficiency
        self._compile_patterns()
        
    def _compile_patterns(self):
        """Compile regex patterns for feature extraction."""
        # Skill pattern
        all_skills = []
        for skills in self.TECHNICAL_SKILLS.values():
            all_skills.extend(skills)
        
        self.skill_pattern = re.compile(
            r'\b(' + '|'.join(all_skills) + r')\b',
            re.IGNORECASE
        )
        
        # Email pattern
        self.email_pattern = re.compile(
            r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        )
        
        # Phone pattern
        self.phone_pattern = re.compile(
            r'\b\d{10,12}\b|\b\+?\d{1,3}[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b'
        )
        
        # Year/date pattern
        self.year_pattern = re.compile(
            r'\b(19|20)\d{2}\b'
        )
        
        # GPA pattern
        self.gpa_pattern = re.compile(
            r'(?:gpa|cgpa|gpa):?\s*(\d+\.?\d*)',
            re.IGNORECASE
        )
        
        # Percentage pattern
        self.percentage_pattern = re.compile(
            r'(\d+\.?\d*)\s*%'
        )
        
    # =========================================================================
    # MAIN EXTRACTION METHOD
    # =========================================================================
    
    def extract_features(self, resume_data: Any, job_role: Optional[str] = None) -> Dict[str, Any]:
        """
        Extract all structured features from resume data.
        
        Args:
            resume_data: ResumeData model instance OR Document instance
            job_role: Target job role (optional for role matching)
            
        Returns:
            Dictionary containing all extracted features
        """
        logger.info(f"Starting feature extraction for resume")
        
        # Check if this is a Document object (new approach)
        from apps.documents.models import Document
        if isinstance(resume_data, Document):
            return self.parse_document(resume_data, job_role)
        
        # Legacy: Check if resume_data has document attribute (ResumeData model)
        if hasattr(resume_data, 'document') and resume_data.document:
            # Try to get raw_text from Document if available
            doc = resume_data.document
            if doc.raw_text:
                # Create a mock data structure with raw_text
                raw_data = self._extract_raw_data(resume_data)
                raw_data['raw_text'] = doc.raw_text
                # Update the resume_data with raw_text for feature extraction
                resume_data.raw_text = doc.raw_text
        
        features = {}
        
        # Extract raw data
        raw_data = self._extract_raw_data(resume_data)
        
        # 1. Skill & Role Matching Features
        features.update(self._extract_skill_features(raw_data, job_role))
        
        # 2. Education Features
        features.update(self._extract_education_features(raw_data))
        
        # 3. Experience Features
        features.update(self._extract_experience_features(raw_data))
        
        # 4. Project Features
        features.update(self._extract_project_features(raw_data))
        
        # 5. Resume Quality Features
        features.update(self._extract_resume_quality_features(raw_data))
        
        logger.info(f"Feature extraction completed. Total features: {len(features)}")
        
        return features
    
    def parse_document(self, document: Any, job_role: Optional[str] = None) -> Dict[str, Any]:
        """
        Parse a Document (PDF/DOCX) directly and extract features.
        
        This is the new approach that doesn't require ResumeData model.
        
        Args:
            document: Document model instance (PDF or DOCX file)
            job_role: Target job role (optional for role matching)
            
        Returns:
            Dictionary containing all extracted features
        """
        logger.info(f"Parsing document: {document.id} - {document.title}")
        logger.info(f"Document has raw_text: {bool(document.raw_text)}, has file: {bool(document.file)}")
        
        # Step 1: Extract raw text from the file
        raw_text = self._extract_text_from_document(document)
        
        if not raw_text:
            logger.warning(f"No text extracted from document {document.id}")
            return {}
        
        # Step 2: Parse structured data from raw text
        parsed_data = self._parse_resume_text(raw_text)
        
        # Step 3: Build raw_data dictionary compatible with feature extraction
        raw_data = {
            'skills': parsed_data.get('skills', []),
            'experience': parsed_data.get('experience', []),
            'education': parsed_data.get('education', []),
            'projects': parsed_data.get('projects', []),
            'tools': parsed_data.get('tools', []),
            'certifications': parsed_data.get('certifications', []),
            'total_experience_years': parsed_data.get('total_experience_years', 0),
            'applied_role': job_role or '',
            'raw_text': raw_text,
        }
        
        # Step 4: Extract features
        features = {}
        
        # 1. Skill & Role Matching Features
        features.update(self._extract_skill_features(raw_data, job_role))
        
        # 2. Education Features
        features.update(self._extract_education_features(raw_data))
        
        # 3. Experience Features
        features.update(self._extract_experience_features(raw_data))
        
        # 4. Project Features
        features.update(self._extract_project_features(raw_data))
        
        # 5. Resume Quality Features
        features.update(self._extract_resume_quality_features(raw_data))
        
        # Add parsed data to features for reference
        features['_parsed_data'] = parsed_data
        features['_raw_text'] = raw_text[:5000]  # Store first 5000 chars
        
        logger.info(f"Document parsing completed. Total features: {len(features)}")
        logger.info(f"_parsed_data keys: {list(parsed_data.keys()) if parsed_data else None}")
        logger.info(f"_parsed_data sample: summary={parsed_data.get('summary', '')[:50] if parsed_data else None}, skills count={len(parsed_data.get('skills', [])) if parsed_data else 0}")
        
        return features
    
    def _extract_text_from_document(self, document: Any) -> str:
        """
        Extract raw text from Document file (PDF or DOCX).
        
        Args:
            document: Document model instance
            
        Returns:
            Extracted text as string
        """
        # If document already has raw_text, use it
        if document.raw_text:
            return document.raw_text
        
        # Otherwise, extract from file
        if not document.file:
            logger.warning(f"No file attached to document {document.id}")
            return ''
        
        try:
            # Get file extension
            file_name = document.file.name.lower()
            
            if file_name.endswith('.pdf'):
                return self._extract_text_from_pdf(document.file)
            elif file_name.endswith('.docx'):
                return self._extract_text_from_docx(document.file)
            elif file_name.endswith('.doc'):
                logger.warning("Old DOC format not supported, please convert to DOCX")
                return ''
            else:
                logger.warning(f"Unsupported file format: {file_name}")
                return ''
                
        except Exception as e:
            logger.error(f"Error extracting text from document {document.id}: {str(e)}")
            return ''
    
    def _extract_text_from_pdf(self, file_field) -> str:
        """Extract text from PDF file using PyMuPDF."""
        if not PYMMU_AVAILABLE:
            logger.error("PyMuPDF not available")
            return ''
        
        try:
            # Read file content
            file_field.open('rb')
            content = file_field.read()
            file_field.close()
            
            # Open with PyMuPDF
            doc = fitz.open(stream=content, filetype="pdf")
            text = ""
            
            for page in doc:
                text += page.get_text()
            
            doc.close()
            
            # Clean up text
            text = self._clean_extracted_text(text)
            
            return text
            
        except Exception as e:
            logger.error(f"Error extracting PDF text: {str(e)}")
            return ''
    
    def _extract_text_from_docx(self, file_field) -> str:
        """Extract text from DOCX file."""
        if not DOCX_AVAILABLE:
            logger.error("python-docx not available")
            return ''
        
        try:
            file_field.open('rb')
            doc = docx.Document(file_field)
            file_field.close()
            
            text = "\n".join([para.text for para in doc.paragraphs])
            
            # Clean up text
            text = self._clean_extracted_text(text)
            
            return text
            
        except Exception as e:
            logger.error(f"Error extracting DOCX text: {str(e)}")
            return ''
    
    def _clean_extracted_text(self, text: str) -> str:
        """Clean extracted text by removing extra whitespace and special chars."""
        # Replace multiple whitespace with single space
        text = re.sub(r'\s+', ' ', text)
        # Remove NUL characters
        text = text.replace('\x00', '')
        # Strip leading/trailing whitespace
        text = text.strip()
        return text
    
    def _parse_resume_text(self, raw_text: str) -> Dict[str, Any]:
        """
        Parse resume raw text to extract structured data.
        
        Handles both markdown-formatted resumes and plain text resumes.
        Maps to ResumeSection table columns.
        
        Args:
            raw_text: Raw text extracted from resume
            
        Returns:
            Dictionary with structured data matching ResumeSection fields
        """
        parsed = {
            # Skills
            'skills': [],
            'tools': [],
            'technical_skills': '',
            'tools_technologies': '',
            'frameworks_libraries': '',
            'databases': '',
            'cloud_platforms': '',
            'soft_skills': '',
            
            # Experience
            'experience': [],
            'experience_titles': '',
            'experience_descriptions': '',
            'experience_duration_text': '',
            'total_experience_years': 0,
            
            # Projects
            'projects': [],
            'project_titles': '',
            'project_descriptions': '',
            'project_technologies': '',
            
            # Education
            'education': [],
            'education_text': '',
            
            # Other
            'certifications': [],
            'certifications_text': '',
            'achievements': [],
            'achievements_text': '',
            'professional_summary': '',
            
            # Extracurriculars (internships, etc.)
            'extracurriculars': '',
        }
        
        if not raw_text or len(raw_text.strip()) < 50:
            logger.warning("_parse_resume_text: raw_text is too short or empty")
            return parsed
        
        logger.info(f"_parse_resume_text: length={len(raw_text)} markdown={'## ' in raw_text or '# ' in raw_text}")
        
        # Check if it's markdown format
        is_markdown = '## ' in raw_text or '# ' in raw_text
        
        if is_markdown:
            logger.info("Using MARKDOWN parsing")
            parsed = self._parse_markdown_resume(raw_text, parsed)
        else:
            # Try plain text parsing first
            is_plain_text = 'PERSONAL INFORMATION' in raw_text.upper() or 'OBJECTIVE' in raw_text.upper()
            
            if is_plain_text:
                logger.info("Using PLAIN TEXT parsing")
                parsed = self._parse_plain_text_resume(raw_text, parsed)
                
                # Check if plain text parsing produced any results
                # If not, fall back to intelligent parsing
                has_plain_text_results = (
                    parsed.get('skills') or 
                    parsed.get('experience') or 
                    parsed.get('projects') or 
                    parsed.get('education') or
                    parsed.get('professional_summary')
                )
                if not has_plain_text_results:
                    logger.info("Plain text parsing returned empty, falling back to INTELLIGENT parsing")
                    parsed = self._intelligent_resume_parse(raw_text, parsed)
            else:
                # Neither markdown nor plain text - do intelligent extraction
                logger.info("Using INTELLIGENT parsing")
                parsed = self._intelligent_resume_parse(raw_text, parsed)
        
        # After parsing, populate all text fields from the extracted lists
        parsed = self._populate_text_fields(parsed)
        
        logger.info("=== RESUME PARSING RESULTS ===")
        logger.info(f"professional_summary: {parsed.get('professional_summary', '')[:100]}...")
        logger.info(f"technical_skills: {parsed.get('technical_skills', '')[:200]}...")
        logger.info(f"tools_technologies: {parsed.get('tools_technologies', '')}")
        logger.info(f"frameworks_libraries: {parsed.get('frameworks_libraries', '')}")
        logger.info(f"databases: {parsed.get('databases', '')}")
        logger.info(f"cloud_platforms: {parsed.get('cloud_platforms', '')}")
        logger.info(f"soft_skills: {parsed.get('soft_skills', '')}")
        logger.info(f"experience_titles: {parsed.get('experience_titles', '')}")
        logger.info(f"experience_descriptions: {parsed.get('experience_descriptions', '')[:200]}...")
        logger.info(f"experience_duration_text: {parsed.get('experience_duration_text', '')}")
        logger.info(f"project_titles: {parsed.get('project_titles', '')}")
        logger.info(f"project_descriptions: {parsed.get('project_descriptions', '')[:200]}...")
        logger.info(f"project_technologies: {parsed.get('project_technologies', '')}")
        logger.info(f"education_text: {parsed.get('education_text', '')}")
        logger.info(f"certifications_text: {parsed.get('certifications_text', '')}")
        logger.info(f"achievements_text: {parsed.get('achievements_text', '')}")
        logger.info(f"extracurriculars: {parsed.get('extracurriculars', '')}")
        logger.info(f"skills count: {len(parsed.get('skills', []))}")
        logger.info(f"experience count: {len(parsed.get('experience', []))}")
        logger.info(f"projects count: {len(parsed.get('projects', []))}")
        logger.info(f"education count: {len(parsed.get('education', []))}")
        logger.info(f"certifications count: {len(parsed.get('certifications', []))}")
        logger.info(f"achievements count: {len(parsed.get('achievements', []))}")
        logger.info("=== END RESUME PARSING RESULTS ===")
        
        return parsed
    
    def _populate_text_fields(self, parsed: Dict) -> Dict:
        """
        Populate all text fields from extracted lists.
        This ensures all ResumeSection columns get filled.
        """
        # Technical skills - combine all skill categories
        all_skills = []
        all_skills.extend(parsed.get('skills', []))
        
        # Add tools to technical skills if not already there
        for tool in parsed.get('tools', []):
            if tool not in all_skills:
                all_skills.append(tool)
        
        parsed['technical_skills'] = ', '.join(all_skills)
        
        # Tools and technologies
        parsed['tools_technologies'] = ', '.join(parsed.get('tools', []))
        
        # Frameworks and libraries - extract from skills
        frameworks = [s for s in all_skills if s.lower() in [
            'tensorflow', 'pytorch', 'keras', 'scikit-learn', 'flask', 'django', 
            'react', 'angular', 'vue', 'node.js', 'express', 'spring', 'rails'
        ]]
        parsed['frameworks_libraries'] = ', '.join(frameworks)
        
        # Databases - extract from skills
        databases = [s for s in all_skills if s.lower() in [
            'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch',
            'sqlite', 'oracle', 'cassandra', 'dynamodb', 'firebase'
        ]]
        parsed['databases'] = ', '.join(databases)
        
        # Cloud platforms - extract from skills
        cloud = [s for s in all_skills if s.lower() in [
            'aws', 'azure', 'gcp', 'google cloud', 'amazon web services'
        ]]
        parsed['cloud_platforms'] = ', '.join(cloud)
        
        # Experience - populate text fields
        experience_list = parsed.get('experience', [])
        if experience_list and isinstance(experience_list[0], dict):
            titles = []
            descriptions = []
            durations = []
            for exp in experience_list:
                position = exp.get('position', '')
                # Include positions that look like job titles
                if position and len(position) > 3 and len(position) < 80:
                    # Skip very long text that looks like summary
                    if 'seeking' not in position.lower() and 'objective' not in position.lower():
                        titles.append(position)
                if exp.get('description'):
                    descriptions.append(exp.get('description', ''))
                if exp.get('duration'):
                    durations.append(exp.get('duration', ''))
            parsed['experience_titles'] = ', '.join(titles) if titles else parsed.get('experience_titles', '')
            parsed['experience_descriptions'] = ' '.join(descriptions)
            parsed['experience_duration_text'] = ', '.join(durations)
        elif experience_list:
            # Old format - list of strings
            parsed['experience_descriptions'] = ' '.join(str(e) for e in experience_list)
        
        # Projects - populate text fields
        projects_list = parsed.get('projects', [])
        if projects_list and isinstance(projects_list[0], dict):
            titles = []
            descriptions = []
            techs = []
            for proj in projects_list:
                name = proj.get('name', '')
                # Only include if name looks like a project name (not description)
                if name and len(name) > 3 and len(name) < 60:
                    # Filter out text that looks like descriptions
                    if not any(kw in name.lower() for kw in ['built', 'developed', 'implemented', 'achieved', 'created']):
                        titles.append(name)
                if proj.get('description'):
                    descriptions.append(proj.get('description', ''))
                if proj.get('technologies'):
                    techs.append(proj.get('technologies', ''))
            parsed['project_titles'] = ', '.join(titles) if titles else ''
            parsed['project_descriptions'] = ' '.join(descriptions)
            parsed['project_technologies'] = ', '.join(techs)
        elif projects_list:
            # Old format - list of strings
            parsed['project_descriptions'] = ' '.join(str(p) for p in projects_list)
        
        # Education - populate text field
        education_list = parsed.get('education', [])
        if education_list and isinstance(education_list[0], dict):
            edu_texts = []
            for edu in education_list:
                parts = []
                if edu.get('degree'):
                    parts.append(edu.get('degree', ''))
                if edu.get('institution'):
                    parts.append('at ' + edu.get('institution', ''))
                if edu.get('year'):
                    parts.append(edu.get('year', ''))
                if edu.get('gpa'):
                    parts.append('GPA: ' + edu.get('gpa', ''))
                if parts:
                    edu_texts.append(' | '.join(parts))
            parsed['education_text'] = ' | '.join(edu_texts)
        elif education_list:
            # Old format - list of strings
            parsed['education_text'] = ' '.join(str(e) for e in education_list)
        
        # Certifications
        certs = parsed.get('certifications', [])
        if certs:
            parsed['certifications_text'] = ', '.join(str(c) for c in certs)
        
        # Achievements
        achievements = parsed.get('achievements', [])
        if achievements:
            parsed['achievements_text'] = ', '.join(str(a) for a in achievements)
        
        return parsed
    
    def _intelligent_resume_parse(self, raw_text: str, parsed: Dict) -> Dict:
        """
        Intelligently parse resume text without clear section headers.
        Uses keyword-based section detection and regex extraction.
        
        This handles plain PDF resumes that don't have markdown or
        clear section headers.
        """
        text = raw_text
        text_lower = text.lower()
        
        logger.info(f"=== INTELLIGENT PARSING START (len={len(text)}) ===")
        
        logger.info("=== INTELLIGENT PARSING START ===")
        logger.info(f"Text length: {len(text)} characters")
        logger.info(f"First 200 chars: {text[:200]}")
        
        # Extract skills using pattern matching
        parsed['skills'] = self._extract_skills_from_text(text)
        parsed['tools'] = self._extract_tools_from_text(text)
        parsed['skills'] = self._extract_skills_from_text(text)
        parsed['tools'] = self._extract_tools_from_text(text)
        logger.info(f"Extracted skills: {len(parsed['skills'])} items")
        logger.info(f"Extracted tools: {len(parsed['tools'])} items")
        
        # Extract education
        parsed['education'] = self._extract_education_from_text(text)
        # Extract certifications
        parsed['certifications'] = self._extract_certifications_from_text(text)
        logger.info(f"Extracted certifications: {len(parsed['certifications'])} items")
        
        # Try to detect and extract professional summary/objective
        # Look for text at the beginning that looks like a summary
        lines = text.split('\n')
        summary_lines = []
        
        for i, line in enumerate(lines[:10]):  # Check first 10 lines
            line = line.strip()
            # Check if this is the objective/summary line or content after it
            if 'object' in line.lower() or 'summary' in line.lower() or 'profile' in line.lower():
                # This line contains objective/summary keyword, get content after it
                # Find where the keyword ends and get text after
                line_lower = line.lower()
                for kw in ['objective', 'summary', 'profile']:
                    idx = line_lower.find(kw)
                    if idx != -1:
                        # Get text after the keyword
                        after_kw = line[idx + len(kw):].strip()
                        if after_kw and len(after_kw) > 10:
                            summary_lines.append(after_kw)
                        break
                # Get next few lines as summary content
                for j in range(i+1, min(i+4, len(lines))):
                    next_line = lines[j].strip()
                    if next_line and len(next_line) > 20:
                        # Skip lines that are clearly not summary (like contact info)
                        if not any(kw in next_line.lower() for kw in ['email', 'phone', '@', 'linkedin', 'github']):
                            summary_lines.append(next_line)
            elif len(line) > 30 and not any(kw in line.lower() for kw in ['email', 'phone', 'address', 'skill', 'experience', 'education', 'project', 'personal']):
                # Also capture lines that look like a summary but don't contain these keywords
                if not line.startswith('•') and not line.startswith('-'):
                    summary_lines.append(line)
        
        if summary_lines:
            parsed['professional_summary'] = ' '.join(summary_lines[:3])
        
        # Extract achievements
        achievements = []
        certifications = []
        achievement_keywords = ['award', 'honor', 'achievement', 'recognition', 'winner', 'prize', 'certificate']
        certification_keywords = ['certificate', 'certified', 'certification']
        
        for keyword in achievement_keywords + certification_keywords:
            pattern = rf'.{{0,50}}{keyword}.{{0,100}}'
            matches = re.findall(pattern, text_lower)
            for match in matches:
                if len(match) > 20:
                    if keyword in certification_keywords:
                        if match not in certifications:
                            certifications.append(match.strip())
                    else:
                        if match not in achievements:
                            achievements.append(match.strip())
        
        parsed['achievements'] = achievements[:10]
        parsed['certifications'] = certifications[:10]
        parsed['achievements'] = achievements[:10]
        parsed['certifications'] = certifications[:10]
        # Extract extracurriculars (internships, leadership, etc.)
        extracurriculars = []
        logger.info(f"Extracted extracurriculars: {len(extracurriculars)} items")
        # Look for internship keywords
        intern_patterns = [
            r'intern(?:ship)?\s+(?:at\s+)?([A-Za-z\s]+)',
            r'trainee\s+(?:at\s+)?([A-Za-z\s]+)',
        ]
        for pattern in intern_patterns:
            matches = re.findall(pattern, text_lower)
            for match in matches:
                if len(match.strip()) > 2:
                    extracurriculars.append(f"Internship at {match.strip()}")
        if extracurriculars:
            parsed['extracurriculars'] = ' | '.join(extracurriculars)
        if extracurriculars:
            parsed['extracurriculars'] = ' | '.join(extracurriculars)
        logger.info(f"Extracted extracurriculars: {extracurriculars}")
        
        # Try to extract experience descriptions more intelligently
        # Look for patterns like "Company | Position | Duration"
        exp_pattern = r'([A-Z][A-Za-z\s]+)\s*\|\s*([A-Za-z\s]+(?: Engineer| Developer| Analyst| Manager| Intern))?\s*\|?\s*(\d{4}\s*[-–]?\s*\d{4}|\d{4}\s*[-–]?\s*present)?'
        matches = re.findall(exp_pattern, text)
        
        for match in matches:
            if len(match[0].strip()) > 2:
                # This could be a job entry
                position = match[1].strip() if match[1] else ''
                company = match[0].strip()
                duration = match[2].strip() if match[2] else ''
                
                # Add to experience if not already there
                if position and not any(exp.get('position') == position for exp in parsed.get('experience', [])):
                    parsed['experience'].append({
                        'position': position,
                        'company': company,
                        'duration': duration,
                        'description': f"Worked at {company}"
                    })
        
        # Populate experience_duration_text from experience list
        if parsed.get('experience'):
            durations = []
            for exp in parsed['experience']:
                if exp.get('duration'):
                    durations.append(exp['duration'])
            if durations:
                parsed['experience_duration_text'] = ', '.join(durations)
        
        # Try to extract project names more intelligently
        # Look for patterns like "Project Name: Description" or "Project Name - Description"
        proj_pattern = r'([A-Z][A-Za-z0-9\s]+(?:System|App|Platform|Tool|API|Model|Network|Website|Application|Project))\s*[-:]\s*([A-Za-z0-9\s,.]{20,150})'
        proj_matches = re.findall(proj_pattern, text)
        
        for match in proj_matches:
            if len(match[0].strip()) > 3 and len(match[1].strip()) > 10:
                proj_name = match[0].strip()
                proj_desc = match[1].strip()
                
                # Check if project already exists
                if not any(proj.get('name') == proj_name for proj in parsed.get('projects', [])):
                    # Try to extract technologies from description
                    proj_techs = []
                    for skill in parsed.get('skills', []):
                        if skill.lower() in proj_desc.lower():
                            proj_techs.append(skill)
                    
                    parsed['projects'].append({
                        'name': proj_name,
                        'description': proj_desc,
                        'technologies': ', '.join(proj_techs),
                        'role': ''
                    })
        
        logger.info(f"Final projects after intelligent extraction: {len(parsed['projects'])} entries")
        logger.info("=== INTELLIGENT PARSING END ===")
        logger.info(f"Final projects after intelligent extraction: {len(parsed['projects'])} entries")
        logger.info("=== INTELLIGENT PARSING END ===")
        
        return parsed
    
    def _parse_markdown_resume(self, raw_text: str, parsed: Dict) -> Dict:
        """
        Parse markdown or plain text resume into structured sections.
        Maps directly to ResumeSection table columns.
        
        Handles both:
        - Markdown format (## headers)
        - Plain text format (CAPS section headers with bullet points)
        """
        # Check if it's plain text format (CAPS headers with bullet points)
        is_plain_text = 'PERSONAL INFORMATION' in raw_text.upper() or 'OBJECTIVE' in raw_text
        
        if is_plain_text:
            parsed = self._parse_plain_text_resume(raw_text, parsed)
            return parsed
        
        # Otherwise use markdown parsing
        # Split by headers
        sections = re.split(r'(?:\n##\s+|\n#\s+)', raw_text)
        
        current_section = ''
        section_content = []
        
        for part in sections:
            part = part.strip()
            if not part:
                continue
            
            # First part is the title (before first ##)
            if not current_section:
                # This is content before any ## header
                continue
            
            # Parse each section
            lines = part.split('\n')
            section_name = lines[0].strip() if lines else ''
            content = '\n'.join(lines[1:]) if len(lines) > 1 else ''
            
            # Map section to parsed fields
            section_lower = section_name.lower()
            
            if 'personal' in section_lower or 'information' in section_lower:
                # Extract name, email, etc.
                parsed['professional_summary'] = self._extract_from_personal_info(content)
            
            elif 'objective' in section_lower or 'summary' in section_lower:
                parsed['professional_summary'] = content.strip()
            
            elif 'skill' in section_lower:
                self._parse_skills_section(content, parsed)
            
            elif 'experience' in section_lower or 'work' in section_lower:
                self._parse_experience_section(content, parsed)
            
            elif 'project' in section_lower:
                self._parse_projects_section(content, parsed)
            
            elif 'education' in section_lower:
                self._parse_education_section(content, parsed)
            
            elif 'certification' in section_lower:
                self._parse_certifications_section(content, parsed)
            
            elif 'achievement' in section_lower:
                self._parse_achievements_section(content, parsed)
            
            elif 'internship' in section_lower:
                parsed['extracurriculars'] = content.strip()
        
        return parsed
    
    def _extract_from_personal_info(self, content: str) -> str:
        """Extract professional summary from personal info section."""
        # Look for objective or summary nearby
        lines = content.split('\n')
        for line in lines:
            if 'objective' in line.lower() or 'summary' in line.lower():
                return line.split('|')[-1].strip() if '|' in line else line.strip()
        # Return first few lines as summary
        return ' '.join(lines[:3])
    
    def _parse_skills_section(self, content: str, parsed: Dict):
        """Parse technical skills section."""
        all_skills = []
        tools_tech = []
        frameworks = []
        databases = []
        cloud = []
        soft = []
        
        lines = content.split('\n')
        for line in lines:
            line = line.strip().lstrip('-*').strip()
            if not line:
                continue
            
            # Check for category headers
            line_lower = line.lower()
            if any(kw in line_lower for kw in ['programming', 'language', 'ml/dl', 'tools', 'database', 'cloud', 'math', 'soft']):
                # This is a category header, continue
                continue
            
            # Extract skills from bullet points
            if ':' in line:
                # Format: "Category: Skills"
                parts = line.split(':', 1)
                category = parts[0].lower()
                skills_str = parts[1] if len(parts) > 1 else ''
                skills = [s.strip() for s in skills_str.replace(',', ' ').split() if s.strip()]
                
                if 'programming' in category or 'language' in category:
                    all_skills.extend(skills)
                elif 'ml' in category or 'dl' in category or 'machine learning' in category:
                    all_skills.extend(skills)
                    frameworks.extend([s for s in skills if s in ['TensorFlow', 'PyTorch', 'Scikit-learn', 'Keras']])
                elif 'tool' in category:
                    tools_tech.extend(skills)
                elif 'database' in category:
                    databases.extend(skills)
                elif 'cloud' in category:
                    cloud.extend(skills)
                elif 'math' in category:
                    pass  # Skip math skills
                else:
                    all_skills.extend(skills)
            else:
                # Just a list of skills
                skills = [s.strip() for s in line.replace(',', ' ').split() if s.strip()]
                all_skills.extend(skills)
        
        # Set parsed fields
        parsed['skills'] = list(set(all_skills))
        parsed['tools'] = list(set(tools_tech))
        parsed['technical_skills'] = ', '.join(parsed['skills'])
        parsed['tools_technologies'] = ', '.join(tools_tech)
        parsed['frameworks_libraries'] = ', '.join(frameworks)
        parsed['databases'] = ', '.join(databases)
        parsed['cloud_platforms'] = ', '.join(cloud)
    
    def _parse_experience_section(self, content: str, parsed: Dict):
        """Parse work experience section."""
        experience_list = []
        titles = []
        descriptions = []
        durations = []
        
        # Split by job entries (### or similar markers)
        jobs = re.split(r'(?:###|\n\d+\.\s*)', content)
        
        for job in jobs:
            job = job.strip()
            if not job or len(job) < 10:
                continue
            
            lines = job.split('\n')
            first_line = lines[0].strip() if lines else ''
            
            # Extract title, company, duration from first line
            # Format: "Job Title | Company | Date"
            parts = first_line.split('|')
            title = parts[0].strip() if parts else ''
            company = parts[1].strip() if len(parts) > 1 else ''
            duration = parts[2].strip() if len(parts) > 2 else ''
            
            # Get description bullets
            desc_lines = [l.strip().lstrip('-*') for l in lines[1:] if l.strip().startswith('-') or l.strip().startswith('*')]
            description = ' '.join(desc_lines)
            
            if title:
                titles.append(title)
                experience_list.append({
                    'position': title,
                    'company': company,
                    'duration': duration,
                    'description': description
                })
                descriptions.append(description)
                if duration:
                    durations.append(duration)
                else:
                    # Try to find duration in job text
                    date_pattern = r'(\d{4}\s*[-–to]+\s*\d{4}|\d{4}\s*[-–to]+\s*present|current|now)'
                    date_matches = re.findall(date_pattern, job, re.IGNORECASE)
                    if date_matches:
                        durations.append(date_matches[0])
        
        parsed['experience'] = experience_list
        parsed['experience_titles'] = ', '.join(titles)
        parsed['experience_descriptions'] = ' '.join(descriptions)
        parsed['experience_duration_text'] = ', '.join(durations)
    
    def _parse_projects_section(self, content: str, parsed: Dict):
        """Parse projects section."""
        projects_list = []
        project_titles = []
        project_descs = []
        project_techs = []
        
        # Split by project entries
        projects = re.split(r'(?:###|\n\d+\.\s*)', content)
        
        for project in projects:
            project = project.strip()
            if not project or len(project) < 10:
                continue
            
            lines = project.split('\n')
            first_line = lines[0].strip() if lines else ''
            
            # Extract project name
            project_name = first_line.split('|')[0].strip() if '|' in first_line else first_line
            
            # Get description and technologies
            desc_lines = []
            techs = []
            for line in lines[1:]:
                line = line.strip()
                if line.startswith('-') or line.startswith('*'):
                    line = line.lstrip('-*').strip()
                    if 'technolog' in line.lower():
                        # Extract technologies
                        tech_part = line.split(':', 1)[-1] if ':' in line else line
                        techs = [t.strip() for t in tech_part.replace(',', ' ').split()]
                    else:
                        desc_lines.append(line)
            
            description = ' '.join(desc_lines)
            
            # If no technologies found, try to extract from the whole project text
            if not techs and project:
                # Use skill_pattern to find technologies
                found_techs = self.skill_pattern.findall(project)
                techs = list(set([t.lower() for t in found_techs]))
            
            if project_name:
                project_titles.append(project_name)
                project_descs.append(description)
                project_techs.extend(techs)
                projects_list.append({
                    'name': project_name,
                    'description': description,
                    'technologies': ', '.join(techs),
                    'role': ''
                })
        
        parsed['projects'] = projects_list
        parsed['project_titles'] = ', '.join(project_titles)
        parsed['project_descriptions'] = ' '.join(project_descs)
        parsed['project_technologies'] = ', '.join(set(project_techs))
    
    def _parse_education_section(self, content: str, parsed: Dict):
        """Parse education section."""
        education_list = []
        edu_texts = []
        
        # Split by education entries
        degrees = re.split(r'(?:###|\n\d+\.\s*)', content)
        
        for degree in degrees:
            degree = degree.strip()
            if not degree or len(degree) < 10:
                continue
            
            lines = degree.split('\n')
            first_line = lines[0].strip() if lines else ''
            
            # Extract degree name, institution, year
            # Format: "Degree | Institution | Year"
            parts = first_line.split('|')
            degree_name = parts[0].strip() if parts else ''
            institution = parts[1].strip() if len(parts) > 1 else ''
            year = parts[2].strip() if len(parts) > 2 else ''
            
            # Get GPA from bullet points
            gpa = ''
            for line in lines[1:]:
                if 'gpa' in line.lower():
                    gpa_match = re.search(r'(\d+\.?\d*)\s*/\s*(\d+\.?\d*)', line)
                    if gpa_match:
                        gpa = f"{gpa_match.group(1)}/{gpa_match.group(2)}"
            
            if degree_name:
                education_list.append({
                    'degree': degree_name,
                    'institution': institution,
                    'year': year,
                    'gpa': gpa
                })
                edu_texts.append(f"{degree_name} at {institution} {year} GPA: {gpa}")
        
        parsed['education'] = education_list
        parsed['education_text'] = ' | '.join(edu_texts)
    
    def _parse_certifications_section(self, content: str, parsed: Dict):
        """Parse certifications section."""
        certs = []
        
        lines = content.split('\n')
        for line in lines:
            line = line.strip().lstrip('-*').strip()
            if line and not line.startswith('#'):
                certs.append(line)
        
        parsed['certifications'] = certs
        parsed['certifications_text'] = ', '.join(certs)
    
    def _parse_achievements_section(self, content: str, parsed: Dict):
        """Parse achievements section."""
        achievements = []
        
        lines = content.split('\n')
        for line in lines:
            line = line.strip().lstrip('-*').strip()
            if line and not line.startswith('#'):
                achievements.append(line)
        
        parsed['achievements'] = achievements
        parsed['achievements_text'] = ', '.join(achievements)
    
    def _parse_plain_text_resume(self, raw_text: str, parsed: Dict) -> Dict:
        """
        Parse plain text resume (like Alex Johnson's) into structured sections.
        
        Format:
        - SECTION NAME (all caps)
        - Content with bullet points (•)
        
        Example:
        PERSONAL INFORMATION
        • Email: alex.johnson@email.com
        • Phone: (555) 123-4567
        
        OBJECTIVE
        Machine Learning Engineer with 2+ years...
        
        TECHNICAL SKILLS
        • Programming: Python, SQL, Java, C++
        • ML/DL: TensorFlow, PyTorch, Scikit-learn, Keras
        """
        # Split by section headers (all caps words at start of line)
        # Match patterns like "SECTION NAME" followed by content
        
        # First, split by section headers
        section_pattern = r'\n([A-Z][A-Z\s]{2,})\n'
        parts = re.split(section_pattern, raw_text)
        
        # parts[0] is content before first header (usually empty or name)
        # parts[1], parts[3], parts[5]... are section names
        # parts[2], parts[4], parts[6]... are section contents
        
        current_section = ''
        
        for i, part in enumerate(parts):
            part = part.strip()
            if not part:
                continue
            
            # Even indices contain section content (after first empty skip)
            if i == 0:
                # This is content before any header (probably name)
                # Check if it looks like a name (letters and spaces)
                if part and part.split('\n')[0].strip():
                    # Could be name, store as potential header
                    first_line = part.split('\n')[0].strip()
                    if len(first_line.split()) <= 4 and first_line.replace(' ', '').isalpha():
                        parsed['professional_summary'] = f"Name: {first_line}"
                continue
            
            # Odd indices are section names
            section_name = part.upper().strip()
            section_content = ''
            
            # Get the next part as content if available
            if i + 1 < len(parts):
                section_content = parts[i + 1]
            
            # Parse based on section name
            self._parse_plain_section(section_name, section_content, parsed)
        
        return parsed
    
    def _parse_plain_section(self, section_name: str, content: str, parsed: Dict):
        """Parse a single section of plain text resume."""
        
        if 'PERSONAL' in section_name or 'CONTACT' in section_name:
            # Extract email, phone, location, etc.
            lines = content.split('\n')
            info_parts = []
            for line in lines:
                line = line.strip()
                if line.startswith('•') or line.startswith('-'):
                    line = line.lstrip('•-').strip()
                    if ':' in line:
                        info_parts.append(line.split(':', 1)[1].strip())
            parsed['professional_summary'] = ' | '.join(info_parts)
        
        elif 'OBJECTIVE' in section_name or 'SUMMARY' in section_name:
            # Objective/summary is the content itself
            parsed['professional_summary'] = content.strip()
        
        elif 'SKILL' in section_name:
            self._parse_plain_skills(content, parsed)
        
        elif 'EXPERIENCE' in section_name or 'WORK' in section_name:
            self._parse_plain_experience(content, parsed)
        
        elif 'PROJECT' in section_name:
            self._parse_plain_projects(content, parsed)
        
        elif 'EDUCATION' in section_name:
            self._parse_plain_education(content, parsed)
        
        elif 'CERTIFICATION' in section_name:
            self._parse_plain_certifications(content, parsed)
        
        elif 'ACHIEVEMENT' in section_name:
            self._parse_plain_achievements(content, parsed)
        
        elif 'INTERNSHIP' in section_name:
            parsed['extracurriculars'] = content.strip()
    
    def _parse_plain_skills(self, content: str, parsed: Dict):
        """Parse technical skills from plain text."""
        all_skills = []
        tools_tech = []
        frameworks = []
        databases = []
        cloud = []
        
        lines = content.split('\n')
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Remove bullet points
            line = line.lstrip('•-').strip()
            
            if ':' in line:
                # Format: "Category: Skills"
                parts = line.split(':', 1)
                category = parts[0].strip().lower()
                skills_str = parts[1].strip() if len(parts) > 1 else ''
                
                # Extract skills
                skills = [s.strip() for s in skills_str.replace(',', ' ').split() if s.strip()]
                
                if 'programming' in category or 'language' in category:
                    all_skills.extend(skills)
                elif 'ml' in category or 'dl' in category or 'machine learning' in category:
                    all_skills.extend(skills)
                    frameworks.extend([s for s in skills if s in ['TensorFlow', 'PyTorch', 'Scikit-learn', 'Keras']])
                elif 'tool' in category:
                    tools_tech.extend(skills)
                elif 'database' in category:
                    databases.extend(skills)
                elif 'cloud' in category:
                    cloud.extend(skills)
                else:
                    all_skills.extend(skills)
        
        # Also search for skills anywhere in content
        text_lower = content.lower()
        for category, skills in self.TECHNICAL_SKILLS.items():
            for skill in skills:
                pattern = r'\b' + re.escape(skill) + r'\b'
                if re.search(pattern, text_lower):
                    if skill not in all_skills:
                        all_skills.append(skill)
        
        parsed['skills'] = list(set(all_skills))
        parsed['technical_skills'] = ', '.join(parsed['skills'])
        parsed['tools_technologies'] = ', '.join(set(tools_tech))
        parsed['frameworks_libraries'] = ', '.join(set(frameworks))
        parsed['databases'] = ', '.join(set(databases))
        parsed['cloud_platforms'] = ', '.join(set(cloud))
    
    def _parse_plain_experience(self, content: str, parsed: Dict):
        """Parse work experience from plain text."""
        experience_list = []
        titles = []
        descriptions = []
        durations = []
        
        # Split by job entries (each job starts with a title | company | date)
        jobs = re.split(r'\n(?=[A-Z])', content)
        
        for job in jobs:
            job = job.strip()
            if not job or len(job) < 20:
                continue
            
            lines = job.split('\n')
            first_line = lines[0].strip() if lines else ''
            
            # Extract title, company, duration
            # Format: "Job Title | Company | Date"
            parts = first_line.split('|')
            title = parts[0].strip() if parts else ''
            company = parts[1].strip() if len(parts) > 1 else ''
            duration = parts[2].strip() if len(parts) > 2 else ''
            
            # Get description bullets
            desc_lines = []
            for line in lines[1:]:
                line = line.strip()
                if line.startswith('•') or line.startswith('-'):
                    desc_lines.append(line.lstrip('•-').strip())
            description = ' '.join(desc_lines)
            
            if title:
                titles.append(title)
                experience_list.append({
                    'position': title,
                    'company': company,
                    'duration': duration,
                    'description': description
                })
                descriptions.append(description)
                if duration:
                    durations.append(duration)
        
        parsed['experience'] = experience_list
        parsed['experience_titles'] = ', '.join(titles)
        parsed['experience_descriptions'] = ' '.join(descriptions)
        parsed['experience_duration_text'] = ', '.join(durations)
    
    def _parse_plain_projects(self, content: str, parsed: Dict):
        """Parse projects from plain text."""
        projects_list = []
        project_titles = []
        project_descs = []
        project_techs = []
        
        # Split by project entries
        projects = re.split(r'\n(?=[A-Z])', content)
        
        for project in projects:
            project = project.strip()
            if not project or len(project) < 20:
                continue
            
            lines = project.split('\n')
            first_line = lines[0].strip() if lines else ''
            
            # Extract project name
            project_name = first_line.split('|')[0].strip() if '|' in first_line else first_line
            
            # Get description and technologies
            desc_lines = []
            techs = []
            for line in lines[1:]:
                line = line.strip()
                if not line:
                    continue
                line = line.lstrip('•-').strip()
                
                if 'technolog' in line.lower():
                    # Extract technologies
                    tech_part = line.split(':', 1)[-1] if ':' in line else line
                    techs = [t.strip() for t in tech_part.replace(',', ' ').split()]
                else:
                    desc_lines.append(line)
            
            description = ' '.join(desc_lines)
            
            if project_name:
                project_titles.append(project_name)
                project_descs.append(description)
                project_techs.extend(techs)
                projects_list.append({
                    'name': project_name,
                    'description': description,
                    'technologies': ', '.join(techs),
                    'role': ''
                })
        
        parsed['projects'] = projects_list
        parsed['project_titles'] = ', '.join(project_titles)
        parsed['project_descriptions'] = ' '.join(project_descs)
        parsed['project_technologies'] = ', '.join(set(project_techs))
    
    def _parse_plain_education(self, content: str, parsed: Dict):
        """Parse education from plain text."""
        education_list = []
        edu_texts = []
        
        # Split by degree entries
        degrees = re.split(r'\n(?=[A-Z])', content)
        
        for degree in degrees:
            degree = degree.strip()
            if not degree or len(degree) < 15:
                continue
            
            lines = degree.split('\n')
            first_line = lines[0].strip() if lines else ''
            
            # Extract degree name, institution, year
            # Format: "Degree Name | Institution | Year | GPA"
            parts = first_line.split('|')
            degree_name = parts[0].strip() if parts else ''
            institution = parts[1].strip() if len(parts) > 1 else ''
            year = parts[2].strip() if len(parts) > 2 else ''
            gpa = parts[3].strip() if len(parts) > 3 else ''
            
            # Also look for GPA in any line
            for line in lines:
                if 'gpa' in line.lower():
                    gpa_match = re.search(r'(\d+\.?\d*)\s*/\s*(\d+)', line)
                    if gpa_match:
                        gpa = f"{gpa_match.group(1)}/{gpa_match.group(2)}"
            
            if degree_name:
                education_list.append({
                    'degree': degree_name,
                    'institution': institution,
                    'year': year,
                    'gpa': gpa
                })
                edu_texts.append(f"{degree_name} at {institution} {year} GPA: {gpa}")
        
        parsed['education'] = education_list
        parsed['education_text'] = ' | '.join(edu_texts)
    
    def _parse_plain_certifications(self, content: str, parsed: Dict):
        """Parse certifications from plain text."""
        certs = []
        
        lines = content.split('\n')
        for line in lines:
            line = line.strip()
            if not line:
                continue
            line = line.lstrip('•-').strip()
            if line and not line.startswith('#'):
                certs.append(line)
        
        parsed['certifications'] = certs
        parsed['certifications_text'] = ', '.join(certs)
    
    def _parse_plain_achievements(self, content: str, parsed: Dict):
        """Parse achievements from plain text."""
        achievements = []
        
        lines = content.split('\n')
        for line in lines:
            line = line.strip()
            if not line:
                continue
            line = line.lstrip('•-').strip()
            if line and not line.startswith('#'):
                achievements.append(line)
        
        parsed['achievements'] = achievements
        parsed['achievements_text'] = ', '.join(achievements)
    
    def _extract_skills_from_text(self, text: str) -> List[str]:
        """Extract skills from raw text using pattern matching."""
        logger.info(f"_extract_skills_from_text: Starting with text length {len(text)}")
        text_lower = text.lower()
        found_skills = []
        
        for category, skills in self.TECHNICAL_SKILLS.items():
            for skill in skills:
                # Use word boundary matching
                pattern = r'\b' + re.escape(skill) + r'\b'
                if re.search(pattern, text_lower):
                    found_skills.append(skill)
        
        logger.info(f"_extract_skills_from_text: Found {len(found_skills)} skills: {found_skills[:10]}")
        
        # Remove duplicates while preserving order
        seen = set()
        unique_skills = []
        for skill in found_skills:
            if skill not in seen:
                seen.add(skill)
                unique_skills.append(skill)
        
        return unique_skills
    
    def _extract_tools_from_text(self, text: str) -> List[str]:
        """Extract tools from raw text."""
        # Tools are similar to skills, use the tools category
        text_lower = text.lower()
        found_tools = []
        
        for tool in self.TECHNICAL_SKILLS.get('tools', []):
            pattern = r'\b' + re.escape(tool) + r'\b'
            if re.search(pattern, text_lower):
                found_tools.append(tool)
        
        return found_tools
    
    def _extract_education_from_text(self, text: str) -> List[Dict]:
        """Extract education information from raw text."""
        logger.info(f"_extract_education_from_text: Starting with text length {len(text)}")
        education = []
        
        # If text looks like a dict string representation, try to parse it
        if text.strip().startswith("{") and text.strip().endswith("}"):
            try:
                parsed = ast.literal_eval(text)
                if isinstance(parsed, dict):
                    # Single education entry
                    if parsed.get('degree') or parsed.get('institution'):
                        education.append({
                            'degree': str(parsed.get('degree', '')),
                            'institution': str(parsed.get('institution', '')),
                            'year': str(parsed.get('year', '')),
                            'gpa': str(parsed.get('gpa', ''))
                        })
                    return education
            except (ValueError, SyntaxError):
                pass
        
        text_lower = text.lower()
        
        # Degree patterns
        degree_patterns = [
            (r'\bph\.?d\b|\bdoctorate\b', 'Ph.D'),
            (r'\bm\.?s\.?|\bm\.?sc\.?|\bmaster', 'Masters'),
            (r'\bb\.?s\.?|\bb\.?sc\.?|\bbachelor', 'Bachelors'),
            (r'\bdiploma\b', 'Diploma'),
            (r'\bhigh school\b', 'High School'),
        ]
        
        # Common institutions
        institution_pattern = r'(IIT|IIIT|NIT|BITS|IISc|Stanford|MIT|Harvard|Google|Microsoft|Amazon|Apple|Meta)\s*[-a-zA-Z]*'
        
        # Year pattern
        year_pattern = r'(19|20)\d{2}'
        
        # Find education sections
        sections = re.split(r'(?:education|academic|qualification)', text_lower)
        
        for section in sections[1:]:  # Skip first part (before education keyword)
            # Extract degree
            degree = 'Unknown'
            for pattern, degree_name in degree_patterns:
                if re.search(pattern, section):
                    degree = degree_name
                    break
            
            # Extract institution
            institution_match = re.search(institution_pattern, section)
            institution = institution_match.group() if institution_match else ''
            
            # Extract year
            year_match = re.search(year_pattern, section)
            year = year_match.group() if year_match else ''
            
            if degree != 'Unknown' or institution:
                education.append({
                    'degree': degree,
                    'institution': institution,
                    'year': year,
                    'gpa': ''
                })
        
        logger.info(f"_extract_education_from_text: Found {len(education)} education entries")
        return education
    
    def _extract_experience_from_text(self, text: str) -> tuple:
        """Extract experience information from raw text."""
        logger.info(f"_extract_experience_from_text: Starting with text length {len(text)}")
        experience = []
        total_years = 0
        
        # If text looks like a dict string representation, try to parse it
        if text.strip().startswith("{") and text.strip().endswith("}"):
            try:
                parsed = ast.literal_eval(text)
                if isinstance(parsed, dict):
                    # Single experience entry
                    if parsed.get('description') or parsed.get('position'):
                        experience.append({
                            'company': str(parsed.get('company', 'Unknown')),
                            'position': str(parsed.get('position', ''))[:100],
                            'duration': str(parsed.get('duration', '')),
                            'description': str(parsed.get('description', ''))[:300]
                        })
                    return experience, 0
                elif isinstance(parsed, list):
                    # Multiple experience entries
                    for exp in parsed:
                        if isinstance(exp, dict):
                            experience.append({
                                'company': str(exp.get('company', 'Unknown')),
                                'position': str(exp.get('position', ''))[:100],
                                'duration': str(exp.get('duration', '')),
                                'description': str(exp.get('description', ''))[:300]
                            })
                    return experience, 0
            except (ValueError, SyntaxError):
                pass
        
        # Look for duration patterns like "2 years", "6 months", "1-2 years"
        duration_patterns = [
            r'(\d+)\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:experience|exp)',
            r'(?:experience|exp):?\s*(\d+)\+?\s*(?:years?|yrs?)',
            r'(\d+)\+?\s*(?:months?|mos?)',
        ]
        
        for pattern in duration_patterns:
            matches = re.findall(pattern, text.lower())
            for match in matches:
                try:
                    years = int(match)
                    if 'month' in pattern:
                        total_years += years / 12
                    else:
                        total_years += years
                except:
                    pass
        
        # Look for work experience section
        try:
            exp_sections = re.split(r'(?:experience|work history|employment|internship)', text, flags=re.IGNORECASE)
        except:
            exp_sections = text.split('experience')
        
        for section in exp_sections[1:]:  # Skip first part
            # Split by newlines to get individual entries
            lines = section.split('\n')
            
            current_entry = []
            for line in lines:
                line = line.strip()
                if line:
                    # If line looks like a new entry (has year/dates), save previous
                    if re.search(r'\d{4}|present|intern|engineer|developer|analyst|manager', line, re.IGNORECASE):
                        if current_entry:
                            desc = ' '.join(current_entry)[:300]
                            if desc:
                                # Try to find duration in the entry
                                duration = ''
                                date_pattern = r'(\d{4}\s*[-–to]+\s*\d{4}|\d{4}\s*[-–to]+\s*present|current|now|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec\s*\d{4})'
                                date_matches = re.findall(date_pattern, ' '.join(current_entry), re.IGNORECASE)
                                if date_matches:
                                    duration = date_matches[0]
                                
                                experience.append({
                                    'company': 'Unknown',
                                    'position': current_entry[0][:100] if current_entry else '',
                                    'duration': duration,
                                    'description': desc
                                })
                            current_entry = []
                    current_entry.append(line)
            
            # Don't forget last entry
            if current_entry:
                desc = ' '.join(current_entry)[:300]
                if desc:
                    experience.append({
                        'company': 'Unknown',
                        'position': current_entry[0][:100] if current_entry else '',
                        'duration': '',
                        'description': desc
                    })
        
        return experience[:10], round(total_years, 1)
    
    def _extract_projects_from_text(self, text: str) -> List[Dict]:
        """Extract project information from raw text."""
        projects = []
        
        # If text looks like a dict string representation, try to parse it
        if text.strip().startswith("{") and text.strip().endswith("}"):
            try:
                # Try to evaluate as Python dict
                parsed = ast.literal_eval(text)
                if isinstance(parsed, dict):
                    # Check if it's a single project dict with 'name'/'description' keys
                    if 'name' in parsed and parsed['name']:
                        projects.append({
                            'name': str(parsed.get('name', ''))[:100],
                            'description': str(parsed.get('description', ''))[:500],
                            'technologies': str(parsed.get('technologies', '')),
                            'role': str(parsed.get('role', ''))
                        })
                    # Check if it's a list of projects
                    elif isinstance(parsed, list):
                        for proj in parsed:
                            if isinstance(proj, dict):
                                projects.append({
                                    'name': str(proj.get('name', ''))[:100],
                                    'description': str(proj.get('description', ''))[:500],
                                    'technologies': str(proj.get('technologies', '')),
                                    'role': str(proj.get('role', ''))
                                })
                    return projects[:10]
            except (ValueError, SyntaxError):
                # Not a valid dict string, continue with normal parsing
                pass
        
        # Look for project section - case insensitive
        try:
            project_sections = re.split(r'(?:projects?|project work|academic projects?)', text, flags=re.IGNORECASE)
        except:
            project_sections = text.split('project')
        
        for section in project_sections[1:]:  # Skip first part
            # Split by newlines
            lines = section.split('\n')
            
            current_project = []
            for line in lines:
                line = line.strip()
                if line:
                    # If line looks like a new project (has year or tech terms)
                    if re.search(r'20\d{2}|github|built|developed|created|implemented|technologies', line, re.IGNORECASE):
                        if current_project:
                            desc = ' '.join(current_project)[:300]
                            if desc:
                                # Extract technologies from description using skill pattern
                                proj_techs = self.skill_pattern.findall(desc)
                                technologies = ', '.join(list(set([t.lower() for t in proj_techs])))
                                projects.append({
                                    'name': current_project[0][:100] if current_project else '',
                                    'description': desc,
                                    'technologies': technologies,
                                    'role': ''
                                })
                            current_project = []
                    current_project.append(line)
            
            # Don't forget last project
            if current_project:
                desc = ' '.join(current_project)[:300]
                if desc:
                    # Extract technologies from description using skill pattern
                    proj_techs = self.skill_pattern.findall(desc)
                    technologies = ', '.join(list(set([t.lower() for t in proj_techs])))
                    projects.append({
                        'name': current_project[0][:100] if current_project else '',
                        'description': desc,
                        'technologies': technologies,
                        'role': ''
                    })
        
        return projects[:10]  # Limit to 10 projects
    
    def _extract_certifications_from_text(self, text: str) -> List[str]:
        """Extract certifications from raw text."""
        certifications = []
        
        # Certification patterns
        cert_patterns = [
            r'\bAWS\s+(Certified|Solutions Architect|Developer|SysOps)',
            r'\bAzure\s+(Administrator|Developer|Architect)',
            r'\bGoogle\s+(Cloud|Cloud Platform)',
            r'\b(GCP|PCA|Professional)',
            r'\bCertified\s+(Kubernetes|K8s)',
            r'\bDocker\s+Certification',
            r'\b(?:ISTQB|Agile| Scrum| PMP| Six Sigma)',
        ]
        
        text_lower = text.lower()
        
        for pattern in cert_patterns:
            matches = re.findall(pattern, text_lower)
            certifications.extend(matches)
        
        # Remove duplicates
        return list(set(certifications))
    
    def _extract_raw_data(self, resume_data: Any) -> Dict[str, Any]:
        """Extract raw data from ResumeData model."""
        return {
            'skills': resume_data.skills or [],
            'experience': resume_data.experience or [],
            'education': resume_data.education or [],
            'projects': resume_data.projects or [],
            'tools': resume_data.tools or [],
            'certifications': resume_data.certifications or [],
            'total_experience_years': resume_data.total_experience_years or 0,
            'applied_role': resume_data.applied_role or '',
            'raw_text': getattr(resume_data, 'raw_text', '') or '',
        }
    
    # =========================================================================
    # SKILL & ROLE MATCHING FEATURES
    # =========================================================================
    
    def _extract_skill_features(self, raw_data: Dict, job_role: Optional[str]) -> Dict[str, Any]:
        """Extract skill and role matching features."""
        features = {}
        
        # Normalize skills
        skills = self._normalize_skills(raw_data.get('skills', []))
        tools = self._normalize_skills(raw_data.get('tools', []))
        all_skills = set(skills + tools)
        
        # Get job role requirements
        role_requirements = self._get_role_requirements(job_role)
        
        # 1. Skill Match Ratio
        if role_requirements['mandatory_skills']:
            matched = sum(1 for skill in role_requirements['mandatory_skills'] 
                        if skill.lower() in [s.lower() for s in all_skills])
            features['skill_match_ratio'] = matched / len(role_requirements['mandatory_skills'])
        else:
            features['skill_match_ratio'] = 0.5  # Default middle value
        
        # 2. Mandatory Skill Coverage
        mandatory_matched = all(
            skill.lower() in [s.lower() for s in all_skills]
            for skill in role_requirements['mandatory_skills']
        ) if role_requirements['mandatory_skills'] else True
        features['mandatory_skill_coverage'] = mandatory_matched
        
        # 3. Skill Depth Score (based on skill variety and level)
        features['skill_depth_score'] = self._calculate_skill_depth(all_skills)
        
        # 4. Domain Similarity Score
        features['domain_similarity_score'] = self._calculate_domain_similarity(
            all_skills, role_requirements.get('required_domains', [])
        )
        
        # 5. Skill-to-Project Consistency
        projects = raw_data.get('projects', [])
        features['skill_project_consistency'] = self._calculate_skill_project_consistency(
            all_skills, projects
        )
        
        # 6. Critical Skill Gap Count
        features['critical_skill_gap_count'] = self._count_critical_skill_gaps(
            all_skills, role_requirements['mandatory_skills']
        )
        
        return features
    
    def _normalize_skills(self, skills: List[Any]) -> List[str]:
        """Normalize skills to lowercase strings."""
        normalized = []
        for skill in skills:
            if isinstance(skill, dict):
                skill_name = skill.get('name', '')
            elif isinstance(skill, str):
                skill_name = skill
            else:
                continue
            
            if skill_name:
                normalized.append(skill_name.strip())
        
        return normalized
    
    def _get_role_requirements(self, job_role: Optional[str]) -> Dict[str, Any]:
        """Get role requirements based on job role."""
        # Predefined role requirements
        role_requirements = {
            'FRONTEND_DEVELOPER': {
                'mandatory_skills': ['javascript', 'typescript', 'react', 'html', 'css'],
                'preferred_skills': ['vue', 'angular', 'next.js', 'redux', 'tailwind'],
                'required_domains': ['frontend', 'web']
            },
            'BACKEND_DEVELOPER': {
                'mandatory_skills': ['python', 'django', 'sql', 'rest api'],
                'preferred_skills': ['flask', 'fastapi', 'postgresql', 'redis', 'docker'],
                'required_domains': ['backend', 'api']
            },
            'FULLSTACK_DEVELOPER': {
                'mandatory_skills': ['javascript', 'python', 'react', 'django', 'sql'],
                'preferred_skills': ['typescript', 'node.js', 'postgresql', 'docker'],
                'required_domains': ['frontend', 'backend']
            },
            'DATA_SCIENTIST': {
                'mandatory_skills': ['python', 'pandas', 'numpy', 'scikit-learn'],
                'preferred_skills': ['tensorflow', 'pytorch', 'matplotlib', 'sql'],
                'required_domains': ['data_science', 'ml']
            },
            'ML_ENGINEER': {
                'mandatory_skills': ['python', 'tensorflow', 'pytorch', 'machine learning'],
                'preferred_skills': ['keras', 'scikit-learn', 'docker', 'aws'],
                'required_domains': ['machine_learning', 'ml']
            },
            'DEVOPS_ENGINEER': {
                'mandatory_skills': ['docker', 'kubernetes', 'git', 'ci/cd'],
                'preferred_skills': ['aws', 'terraform', 'jenkins', 'linux'],
                'required_domains': ['devops', 'cloud']
            },
            'SOFTWARE_ENGINEER': {
                'mandatory_skills': ['python', 'java', 'javascript', 'git'],
                'preferred_skills': ['sql', 'docker', 'rest api'],
                'required_domains': ['software']
            }
        }
        
        if job_role and job_role.upper() in role_requirements:
            return role_requirements[job_role.upper()]
        
        return {
            'mandatory_skills': [],
            'preferred_skills': [],
            'required_domains': []
        }
    
    def _calculate_skill_depth(self, skills: set) -> float:
        """Calculate skill depth score based on variety and categorization."""
        if not skills:
            return 0.0
        
        # Count skills in each category
        category_count = 0
        for category, category_skills in self.TECHNICAL_SKILLS.items():
            if any(skill.lower() in [s.lower() for s in skills] for skill in category_skills):
                category_count += 1
        
        # Depth is based on number of categories and total skills
        skill_count = len(skills)
        
        # Normalize to 0-1
        depth = min((category_count / 6) * 0.6 + (min(skill_count, 20) / 20) * 0.4, 1.0)
        
        return depth
    
    def _calculate_domain_similarity(self, skills: set, required_domains: List[str]) -> float:
        """Calculate domain similarity between skills and required domains."""
        if not required_domains:
            return 0.5  # Default middle value
        
        # Map domains to skills
        domain_skills = {
            'frontend': ['html', 'css', 'javascript', 'typescript', 'react', 'vue', 'angular'],
            'backend': ['python', 'java', 'node.js', 'django', 'flask', 'api'],
            'web': ['html', 'css', 'javascript', 'rest api', 'http'],
            'data_science': ['python', 'pandas', 'numpy', 'scikit-learn', 'tensorflow'],
            'ml': ['machine learning', 'deep learning', 'tensorflow', 'pytorch'],
            'devops': ['docker', 'kubernetes', 'ci/cd', 'jenkins'],
            'cloud': ['aws', 'azure', 'gcp', 'cloud'],
            'software': ['python', 'java', 'javascript', 'git']
        }
        
        # Count matching skills for required domains
        matched_domains = 0
        for domain in required_domains:
            domain_keywords = domain_skills.get(domain.lower(), [])
            if any(skill.lower() in [s.lower() for s in skills] for skill in domain_keywords):
                matched_domains += 1
        
        return matched_domains / len(required_domains) if required_domains else 0.5
    
    def _calculate_skill_project_consistency(self, skills: set, projects: List) -> float:
        """Calculate consistency between listed skills and project descriptions."""
        if not projects:
            return 0.5  # Default
        
        # Extract project descriptions
        project_text = ' '.join([
            str(p.get('description', '')) + ' ' + str(p.get('technologies', ''))
            for p in projects if isinstance(p, dict)
        ]).lower()
        
        if not project_text:
            return 0.5
        
        # Check how many skills are mentioned in projects
        mentioned_in_projects = sum(
            1 for skill in skills 
            if skill.lower() in project_text
        )
        
        # Consistency = skills mentioned in projects / total skills
        if not skills:
            return 0.5
            
        return min(mentioned_in_projects / len(skills), 1.0)
    
    def _count_critical_skill_gaps(self, skills: set, mandatory_skills: List[str]) -> int:
        """Count missing critical/mandatory skills."""
        if not mandatory_skills:
            return 0
        
        gaps = 0
        for skill in mandatory_skills:
            if not any(skill.lower() in s.lower() for s in skills):
                gaps += 1
        
        return gaps
    
    # =========================================================================
    # EDUCATION FEATURES
    # =========================================================================
    
    def _extract_education_features(self, raw_data: Dict) -> Dict[str, Any]:
        """Extract education-related features."""
        features = {}
        
        education = raw_data.get('education', [])
        
        # 1. Degree Level Encoded
        features['degree_level_encoded'] = self._extract_degree_level(education)
        
        # 2. GPA Normalized
        features['gpa_normalized'] = self._extract_gpa(education, features['degree_level_encoded'])
        
        # 3. University Tier Score
        features['university_tier_score'] = self._extract_university_tier(education)
        
        # 4. Coursework Relevance Score
        features['coursework_relevance_score'] = self._extract_coursework_relevance(education)
        
        return features
    
    def _extract_degree_level(self, education: List) -> int:
        """Extract highest degree level."""
        max_level = 1
        
        for edu in education:
            if isinstance(edu, dict):
                degree = edu.get('degree', '') or edu.get('qualification', '')
            else:
                degree = str(edu)
            
            degree_lower = degree.lower()
            
            for degree_name, level in self.DEGREE_LEVELS.items():
                if degree_name in degree_lower:
                    max_level = max(max_level, level)
        
        return max_level
    
    def _extract_gpa(self, education: List, degree_level: int) -> float:
        """Extract and normalize GPA."""
        # For freshers, GPA is typically in 10-point or 4-point scale
        max_gpa = 10.0 if degree_level == 2 else 4.0
        
        gpa_values = []
        
        for edu in education:
            if isinstance(edu, dict):
                gpa = edu.get('gpa', '') or edu.get('cgpa', '')
            else:
                continue
            
            if gpa:
                try:
                    gpa_float = float(gpa)
                    # Normalize to 0-1
                    normalized = min(gpa_float / max_gpa, 1.0)
                    gpa_values.append(normalized)
                except (ValueError, TypeError):
                    continue
        
        return max(gpa_values) if gpa_values else 0.5
    
    def _extract_university_tier(self, education: List) -> float:
        """Extract university tier based on name."""
        for edu in education:
            if isinstance(edu, dict):
                institution = edu.get('institution', '') or edu.get('university', '')
            else:
                continue
            
            institution_lower = institution.lower()
            
            # Check for tier 1
            if any(tier1 in institution_lower for tier1 in self.TIER_1_UNIVERSITIES):
                return 1.0
            
            # Check for tier 2
            if any(tier2 in institution_lower for tier2 in self.TIER_2_UNIVERSITIES):
                return 0.7
        
        return 0.5  # Default for unknown universities
    
    def _extract_coursework_relevance(self, education: List) -> float:
        """Extract relevant coursework and score based on technical content."""
        technical_keywords = [
            'data structure', 'algorithm', 'database', 'operating system',
            'computer network', 'machine learning', 'artificial intelligence',
            'software engineering', 'web development', 'mobile development'
        ]
        
        coursework_count = 0
        
        for edu in education:
            if isinstance(edu, dict):
                courses = edu.get('courses', []) or edu.get('coursework', [])
                if isinstance(courses, list):
                    courses_text = ' '.join(str(c) for c in courses).lower()
                    for keyword in technical_keywords:
                        if keyword in courses_text:
                            coursework_count += 1
        
        # Normalize: assume 5+ relevant courses = 1.0
        return min(coursework_count / 5, 1.0)
    
    # =========================================================================
    # EXPERIENCE FEATURES
    # =========================================================================
    
    def _extract_experience_features(self, raw_data: Dict) -> Dict[str, Any]:
        """Extract experience-related features."""
        features = {}
        
        experience = raw_data.get('experience', [])
        raw_text = raw_data.get('raw_text', '').lower()
        
        # 1. Experience Duration (months)
        features['experience_duration_months'] = self._calculate_experience_months(experience)
        
        # 2. Internship Relevance Score
        features['internship_relevance_score'] = self._calculate_internship_relevance(
            experience, raw_text
        )
        
        # 3. Open Source Contribution Indicator
        features['open_source_score'] = self._calculate_open_source_score(raw_text)
        
        # 4. Hackathon Participation Indicator
        features['hackathon_count'] = self._count_hackathons(raw_text)
        
        return features
    
    def _calculate_experience_months(self, experience: List) -> int:
        """Calculate total experience in months."""
        total_months = 0
        
        for exp in experience:
            if isinstance(exp, dict):
                duration = exp.get('duration', '') or exp.get('months', 0)
                
                # Try to parse duration
                if isinstance(duration, (int, float)):
                    total_months += int(duration)
                elif isinstance(duration, str):
                    # Try to extract months from string
                    month_match = re.search(r'(\d+)\s*month', duration, re.IGNORECASE)
                    if month_match:
                        total_months += int(month_match.group(1))
                    year_match = re.search(r'(\d+)\s*year', duration, re.IGNORECASE)
                    if year_match:
                        total_months += int(year_match.group(1)) * 12
        
        return min(total_months, 36)  # Cap at 3 years
    
    def _calculate_internship_relevance(self, experience: List, raw_text: str) -> float:
        """Calculate relevance of internship experience to target role."""
        internship_count = 0
        relevant_internships = 0
        
        for exp in experience:
            if isinstance(exp, dict):
                title = exp.get('title', '') or exp.get('position', '')
                description = exp.get('description', '')
                
                # Check if it's an internship
                if any(kw in str(title).lower() for kw in self.INTERNSHIP_KEYWORDS):
                    internship_count += 1
                    
                    # Check relevance (technical keywords)
                    exp_text = (str(title) + ' ' + str(description)).lower()
                    technical_count = sum(
                        1 for skills in self.TECHNICAL_SKILLS.values()
                        for skill in skills
                        if skill in exp_text
                    )
                    
                    if technical_count >= 3:
                        relevant_internships += 1
        
        if internship_count == 0:
            return 0.5  # Default for freshers
        
        return relevant_internships / internship_count
    
    def _calculate_open_source_score(self, raw_text: str) -> float:
        """Calculate open source contribution score."""
        if any(kw in raw_text for kw in self.OPEN_SOURCE_KEYWORDS):
            # Check for specific contributions
            contribution_keywords = ['pull request', 'merged', 'contributor', 'repository']
            contribution_count = sum(1 for kw in contribution_keywords if kw in raw_text)
            
            if contribution_count >= 2:
                return 1.0
            elif contribution_count >= 1:
                return 0.7
        
        return 0.3  # Default low score
    
    def _count_hackathons(self, raw_text: str) -> int:
        """Count hackathon participations."""
        count = 0
        for keyword in self.HACKATHON_KEYWORDS:
            count += len(re.findall(keyword, raw_text))
        
        return min(count, 5)  # Cap at 5
    
    # =========================================================================
    # PROJECT FEATURES
    # =========================================================================
    
    def _extract_project_features(self, raw_data: Dict) -> Dict[str, Any]:
        """Extract project-related features."""
        features = {}
        
        projects = raw_data.get('projects', [])
        raw_text = raw_data.get('raw_text', '').lower()
        
        # 1. Project Count
        features['project_count'] = len(projects) if projects else 0
        
        # 2. Project Complexity Score
        features['project_complexity_score'] = self._calculate_project_complexity(projects)
        
        # 3. Quantified Impact Detection
        features['quantified_impact_presence'] = self._detect_quantified_impact(projects)
        
        # 4. Production Tools Usage
        features['production_tools_usage_score'] = self._calculate_production_tools_score(
            raw_text, projects
        )
        
        # 5. GitHub Activity Score (based on mentions)
        features['github_activity_score'] = self._calculate_github_score(raw_text)
        
        return features
    
    def _calculate_project_complexity(self, projects: List) -> float:
        """Calculate project complexity based on technologies and scope."""
        if not projects:
            return 0.0
        
        complexity_scores = []
        
        for project in projects:
            if isinstance(project, dict):
                description = str(project.get('description', ''))
                technologies = str(project.get('technologies', ''))
                project_text = (description + ' ' + technologies).lower()
                
                # Check for complexity indicators
                complexity_count = sum(
                    1 for indicator in self.PROJECT_COMPLEXITY_INDICATORS
                    if indicator in project_text
                )
                
                complexity_scores.append(min(complexity_count / 3, 1.0))
        
        return max(complexity_scores) if complexity_scores else 0.0
    
    def _detect_quantified_impact(self, projects: List) -> bool:
        """Detect if projects have quantified impact."""
        for project in projects:
            if isinstance(project, dict):
                description = str(project.get('description', ''))
                
                # Check for quantified words
                if any(word in description.lower() for word in self.QUANTIFIED_WORDS):
                    return True
        
        return False
    
    def _calculate_production_tools_score(self, raw_text: str, projects: List) -> float:
        """Calculate production tools usage score."""
        # Check raw text for production tools
        tool_count = 0
        for tool in self.PRODUCTION_TOOLS:
            if tool in raw_text:
                tool_count += 1
        
        # Check project technologies
        for project in projects:
            if isinstance(project, dict):
                tech = str(project.get('technologies', '')).lower()
                for tool in self.PRODUCTION_TOOLS:
                    if tool in tech:
                        tool_count += 1
        
        # Normalize to 0-1 (assume 5+ tools = 1.0)
        return min(tool_count / 5, 1.0)
    
    def _calculate_github_score(self, raw_text: str) -> float:
        """Calculate GitHub activity score."""
        github_indicators = ['github', 'gitlab', 'repository', 'pull request', 'commit']
        
        count = sum(1 for indicator in github_indicators if indicator in raw_text)
        
        return min(count / 3, 1.0)
    
    # =========================================================================
    # RESUME QUALITY FEATURES
    # =========================================================================
    
    def _extract_resume_quality_features(self, raw_data: Dict) -> Dict[str, Any]:
        """Extract resume quality features."""
        features = {}
        
        raw_text = raw_data.get('raw_text', '').lower()
        skills = raw_data.get('skills', [])
        
        # 1. Keyword Stuffing Ratio
        features['keyword_stuffing_ratio'] = self._calculate_keyword_stuffing(
            raw_text, skills
        )
        
        # 2. Writing Clarity Score
        features['writing_clarity_score'] = self._calculate_clarity_score(raw_text)
        
        # 3. Action Verb Density
        features['action_verb_density'] = self._calculate_action_verb_density(raw_text)
        
        # 4. Consistency Score
        features['resume_consistency_score'] = self._calculate_consistency_score(raw_data)
        
        # 5. Resume Length Normalized
        features['resume_length_normalized'] = self._calculate_length_score(raw_text)
        
        return features
    
    def _calculate_keyword_stuffing(self, raw_text: str, skills: List) -> float:
        """Calculate keyword stuffing ratio."""
        if not skills:
            return 0.0
        
        skill_count = len(skills) if isinstance(skills, list) else 1
        
        # If too many skills listed (>20), likely keyword stuffing
        if skill_count > 20:
            return 0.8
        elif skill_count > 15:
            return 0.6
        elif skill_count > 10:
            return 0.4
        else:
            return 0.2
    
    def _calculate_clarity_score(self, raw_text: str) -> float:
        """Calculate writing clarity based on sentence structure."""
        if not raw_text:
            return 0.0
        
        # Simple metrics: check for bullet points, proper spacing
        bullet_count = raw_text.count('•') + raw_text.count('-') + raw_text.count('*')
        
        # Good resumes have structured bullet points
        if bullet_count >= 5:
            return 0.9
        elif bullet_count >= 3:
            return 0.7
        elif bullet_count >= 1:
            return 0.5
        else:
            return 0.3
    
    def _calculate_action_verb_density(self, raw_text: str) -> float:
        """Calculate action verb density."""
        if not raw_text:
            return 0.0
        
        action_count = sum(
            1 for verb in self.ACTION_VERBS 
            if verb in raw_text
        )
        
        # Normalize: assume 5+ action verbs = 1.0
        return min(action_count / 5, 1.0)
    
    def _calculate_consistency_score(self, raw_data: Dict) -> float:
        """Calculate overall resume consistency."""
        # Check if all sections are present
        required_sections = ['education', 'skills']
        
        raw_text = raw_data.get('raw_text', '').lower()
        
        present_sections = sum(
            1 for section in required_sections
            if any(kw in raw_text for kw in self.RESUME_SECTION_KEYWORDS.get(section, []))
        )
        
        return present_sections / len(required_sections)
    
    def _calculate_length_score(self, raw_text: str) -> float:
        """Calculate resume length score."""
        word_count = len(raw_text.split())
        
        # Optimal resume length: 300-800 words
        if 300 <= word_count <= 800:
            return 1.0
        elif word_count < 300:
            return word_count / 300
        else:
            return max(0, 1 - (word_count - 800) / 1000)
    
    # =========================================================================
    # UTILITY METHODS
    # =========================================================================
    
    def get_feature_vector(self, resume_data: Any, job_role: Optional[str] = None) -> Dict[str, Any]:
        """
        Public method to get complete feature vector.
        
        This is the main entry point for feature extraction.
        """
        return self.extract_features(resume_data, job_role)


# Singleton instance
resume_parsing_engine = ResumeParsingEngine()
