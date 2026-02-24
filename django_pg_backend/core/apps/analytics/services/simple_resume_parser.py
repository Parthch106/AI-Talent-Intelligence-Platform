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
