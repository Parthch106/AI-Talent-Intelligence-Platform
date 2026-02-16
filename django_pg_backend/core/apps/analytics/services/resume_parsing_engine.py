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
        
        Uses regex patterns to extract:
        - Skills
        - Education
        - Experience
        - Projects
        - Tools
        - Certifications
        
        Args:
            raw_text: Raw text extracted from resume
            
        Returns:
            Dictionary with structured data
        """
        parsed = {
            'skills': [],
            'education': [],
            'experience': [],
            'projects': [],
            'tools': [],
            'certifications': [],
            'total_experience_years': 0,
        }
        
        # Extract skills using the skill patterns defined in the engine
        parsed['skills'] = self._extract_skills_from_text(raw_text)
        parsed['tools'] = self._extract_tools_from_text(raw_text)
        
        # Extract education
        parsed['education'] = self._extract_education_from_text(raw_text)
        
        # Extract experience
        parsed['experience'], parsed['total_experience_years'] = self._extract_experience_from_text(raw_text)
        
        # Extract projects
        parsed['projects'] = self._extract_projects_from_text(raw_text)
        
        # Extract certifications
        parsed['certifications'] = self._extract_certifications_from_text(raw_text)
        
        return parsed
    
    def _extract_skills_from_text(self, text: str) -> List[str]:
        """Extract skills from raw text using pattern matching."""
        text_lower = text.lower()
        found_skills = []
        
        for category, skills in self.TECHNICAL_SKILLS.items():
            for skill in skills:
                # Use word boundary matching
                pattern = r'\b' + re.escape(skill) + r'\b'
                if re.search(pattern, text_lower):
                    found_skills.append(skill)
        
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
        education = []
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
        
        text_lower = text.lower()
        
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
        
        return education
    
    def _extract_experience_from_text(self, text: str) -> tuple:
        """Extract experience information from raw text."""
        experience = []
        total_years = 0
        text_lower = text.lower()
        
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
        exp_sections = re.split(r'(?:experience|work history|employment|internship)', text_lower)
        
        for section in exp_sections[1:]:
            # Extract company names (common ones)
            companies = re.findall(r'\b(Google|Microsoft|Amazon|Meta|Apple|Netflix|Adobe|Salesforce|Tesla|IBM|Oracle|Intel|AMD|NVIDIA|Qualcomm|Flipkart|Walmart|Accenture|TCS|Infosys|Wipro|Capgemini)\b', section)
            
            for company in companies[:3]:  # Limit to 3 entries per section
                experience.append({
                    'company': company,
                    'position': '',
                    'duration': '',
                    'description': section[:200]
                })
        
        return experience, round(total_years, 1)
    
    def _extract_projects_from_text(self, text: str) -> List[Dict]:
        """Extract project information from raw text."""
        projects = []
        text_lower = text.lower()
        
        # Look for project section
        project_sections = re.split(r'(?:projects?|project work)', text_lower)
        
        for section in project_sections[1:]:  # Skip first part
            # Extract project name (usually followed by description)
            lines = section.split('\n')
            
            for line in lines[:5]:  # Limit to 5 projects
                line = line.strip()
                if line and len(line) > 10:
                    projects.append({
                        'name': line[:100],
                        'description': line,
                        'technologies': '',
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
