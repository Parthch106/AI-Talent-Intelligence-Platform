"""
Weekly Report Parser
Extracts structured data from weekly report PDF documents.
Supports multiple formats including the standard format:
- Date
- Intern Name
- Project Title
- Tasks Completed
- Problems Faced
- Solutions Found
- Plans for Tomorrow
"""

import re
import logging
from typing import Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class WeeklyReportParser:
    """
    Parser for weekly report PDF documents.
    Extracts structured data like tasks completed, challenges, learnings, etc.
    """
    
    # Patterns for date extraction
    DATE_PATTERN = re.compile(
        r'Date[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
        re.IGNORECASE
    )
    
    # Patterns for intern name
    INTERN_NAME_PATTERN = re.compile(
        r'(?:Intern(?:\s*Name)?|INTERN)[:\s]*(?:\n|\s)*([A-Za-z\s\.\,\-]+?)(?=\s+DATE|[\n\r]|$)',
        re.IGNORECASE
    )
    
    # Patterns for project title
    PROJECT_TITLE_PATTERN = re.compile(
        r'(?:Project(?:\s*Title)?|PROJECT)[:\s]*(?:\n|\s)*([A-Za-z0-9\s\-\._\&]+?)(?=\s+[\n\r]|$)',
        re.IGNORECASE
    )
    
    # Patterns for extracting task lists
    TASK_PATTERN = re.compile(
        r'(\d+)[\.\)]\s*(.+?)(?=\d+[\.\)]|$)',
        re.IGNORECASE | re.DOTALL
    )
    
    # Standard delimiters for sections (labels) - used with lookahead
    DELIM = r'(?:I\.|II\.|III\.|IV\.|V\.|VI\.|VII\.|V\.\s*KEY|Problems?\s*Faced|Tasks?\s*In\s*Progress|InProgress|Ongoing|Ongoing\s*Development|Challenges?|Blocked|Impediments|Blockers|Solutions?\s*Found|Learnings?|Next\s*day|Plans?\s*for\s*Tomorrow|Tomorrow|Rating|SELF\s*EVALUATION|Next\s*Week\s*Goals|FOR\s*NEXT\s*PERIOD)[:\s\*\-\)]*(?:\n|$)'

    # Section patterns
    SECTIONS = {
        'tasks_completed': [
            r'COMPLETED\s*TASKS[:\s\*\-\)]*(.*?)(?=(?:' + DELIM + ')|\Z)',
            r'(?:I\.\s*)?(?:Tasks?\s*Completed|Completed\s*Tasks?|Accomplishments?|ACCOMPLISHMENTS)[:\s\*\-\)]*(.*?)(?=(?:' + DELIM + ')|\Z)',
        ],
        'tasks_in_progress': [
            r'(?:II\.\s*)?(?:Tasks?\s*(?:In\s*Progress|InProgress|Ongoing)|InProgress|Tasks?\s*Started|Ongoing\s*(?:Development|Tasks?))[:\s\*\-\)]*(.*?)(?=(?:' + DELIM + ')|\Z)',
        ],
        'tasks_blocked': [
            r'(?:III\.\s*)?(?:Tasks?\s*Blocked|Blocked|Blocked\s*Tasks?|Impediments|Blockers|IMPEDIMENTS)[:\s\*\-\)]*(.*?)(?=(?:' + DELIM + ')|\Z)',
        ],
        'challenges': [
            r'(?:IV\.\s*)?(?:Problems?\s*Faced|Challenges?|Difficulties?|Issues?|CHALLENGES)[:\s\*\-\)]*(.*?)(?=(?:' + DELIM + ')|\Z)',
            r'V\.\s*KEY\s*Challenges\s*ENCOUNTERED[:\s\*\-\)]*(.*?)(?=(?:' + DELIM + ')|\Z)',
        ],
        'learnings': [
            r'(?:V\.\s*)?(?:Solutions?\s*Found|Learnings?|What\s+(?:I|we)\s+learned|KEY\s*LEARNINGS)[:\s\*\-\)]*(.*?)(?=(?:' + DELIM + ')|\Z)',
            r'V\.\s*KEY\s*Learnings[:\s\*\-\)]*(.*?)(?=(?:' + DELIM + ')|\Z)',
        ],
        'next_week_goals': [
            r'(?:VI\.\s*)?(?:Plans?\s*(?:for\s*)?Tomorrow|Tomorrow[\']?s\s*Plans?|Upcoming\s*Tasks?|Next\s*Week|Goals?\s*for\s*Next\s*Week|STRATEGIC\s*GOALS)[:\s\*\-\)]*(.*?)(?=(?:' + DELIM + ')|\Z)',
            r'V\.\s*KEY\s*Next\s*Week\s*Goals\s*FOR\s*NEXT\s*PERIOD[:\s\*\-\)]*(.*?)(?=(?:' + DELIM + ')|\Z)',
        ],
    }
    
    def __init__(self):
        """Initialize the parser."""
        pass
    
    def parse(self, text: str) -> Dict[str, Any]:
        """
        Parse the extracted text from a weekly report PDF.
        
        Args:
            text: Raw text extracted from the PDF
            
        Returns:
            Dictionary containing parsed weekly report data
        """
        if not text or len(text.strip()) < 30:
            return self._empty_result()
        
        # Clean up the text
        text = self._clean_text(text)
        
        result = {
            'intern_name': self._extract_intern_name(text),
            'project_title': self._extract_project_title(text),
            'date': self._extract_date(text),
            'tasks_completed_count': 0, # Will be set by extraction
            'tasks_in_progress': self._extract_section(text, 'tasks_in_progress'),
            'tasks_blocked': self._extract_section(text, 'tasks_blocked'),
            'challenges': self._extract_section(text, 'challenges'),
            'learnings': self._extract_section(text, 'learnings'),
            'next_week_goals': self._extract_section(text, 'next_week_goals'),
            'raw_text': text[:2000] if len(text) > 2000 else text,
        }
        
        # Extract tasks and count
        tasks_text = self._extract_tasks_completed(text)
        result['tasks_completed'] = tasks_text
        
        # Simple count based on newlines or bullet points if present, or just use 1 if text exists
        if tasks_text:
            items = [t for t in tasks_text.split('\n') if t.strip()]
            result['tasks_completed_count'] = len(items) if items else 1
        
        # Set compatibility fields
        result['tasks_in_progress_count'] = 1 if result['tasks_in_progress'] else 0
        result['tasks_blocked_count'] = 1 if result['tasks_blocked'] else 0
        
        # Set week dates from extracted date
        if result['date']:
            try:
                parsed_date = datetime.strptime(result['date'], '%d/%m/%Y')
                result['week_start_date'] = parsed_date.strftime('%Y-%m-%d')
                result['week_end_date'] = parsed_date.strftime('%Y-%m-%d')
            except ValueError:
                pass
        
        return result
    
    def _clean_text(self, text: str) -> str:
        """Clean and normalize text."""
        # Remove specialized page headers/footers from the Professional format
        text = re.sub(r'AI TALENT INTELLIGENCE PLATFORM.*?PRIVATE & CONFIDENTIAL', '', text, flags=re.IGNORECASE)
        text = re.sub(r'Weekly Internship Performance Report.*?Page \d+ of \d+', '', text, flags=re.IGNORECASE)
        
        # Remove excessive whitespace
        text = re.sub(r'\n{3,}', '\n\n', text)
        # Remove page numbers and other artifacts
        text = re.sub(r'\n\s*\d+\s*\n', '\n', text)
        # Normalize dates
        text = re.sub(r'(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})', r'\1/\2/\3', text)
        return text.strip()
    
    def _empty_result(self) -> Dict[str, Any]:
        """Return empty result structure."""
        return {
            'week_start_date': None,
            'week_end_date': None,
            'intern_name': '',
            'project_title': '',
            'date': '',
            'tasks_completed': '',
            'tasks_completed_count': 0,
            'tasks_in_progress': 0,
            'tasks_blocked': 0,
            'challenges': '',
            'learnings': '',
            'next_week_goals': '',
            'raw_text': '',
        }
    
    def _extract_date(self, text: str) -> Optional[str]:
        """Extract the date from the report."""
        match = self.DATE_PATTERN.search(text)
        if match:
            date_str = match.group(1).strip()
            # Normalize to DD/MM/YYYY format
            try:
                parsed = datetime.strptime(date_str, '%d/%m/%Y')
                return parsed.strftime('%d/%m/%Y')
            except ValueError:
                try:
                    parsed = datetime.strptime(date_str, '%d-%m-%Y')
                    return parsed.strftime('%d/%m/%Y')
                except ValueError:
                    return date_str
        return None
    
    def _extract_intern_name(self, text: str) -> Optional[str]:
        """Extract the intern name from the report."""
        match = self.INTERN_NAME_PATTERN.search(text)
        if match:
            return match.group(1).strip()
        return None
    
    def _extract_project_title(self, text: str) -> Optional[str]:
        """Extract the project title from the report."""
        match = self.PROJECT_TITLE_PATTERN.search(text)
        if match:
            return match.group(1).strip()
        return None
    
    def _extract_tasks_completed(self, text: str) -> str:
        """Extract tasks completed section."""
        tasks = []
        
        for pattern in self.SECTIONS.get('tasks_completed', []):
            match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
            if match:
                section_text = match.group(1).strip()
                # Extract numbered tasks (e.g., 1., 1), or just 1 followed by space)
                # Look for numbers at the start or preceded by whitespace
                task_items = re.findall(r'(?:^|\s+)(\d+)[\.\)]?[\s\t]+(.+?)(?=\s+\d+[\.\)]?[\s\t]+|$)', section_text, re.IGNORECASE | re.DOTALL)
                
                if task_items:
                    for num, task in task_items:
                        task = task.strip()
                        task = re.sub(r'\n+', ' ', task)  # Replace newlines with spaces
                        task = re.sub(r'\s+', ' ', task)   # Normalize spaces
                        if len(task) > 3:
                            tasks.append(f"{num}. {task}")
                    break
                else:
                    # If no numbered tasks, return the section as-is
                    return section_text
        
        return '\n'.join(tasks) if tasks else ''
    
    def _extract_section(self, text: str, section_type: str) -> str:
        """Extract a specific section from the text."""
        patterns = self.SECTIONS.get(section_type, [])
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
            if match:
                section_text = match.group(1).strip()
                # Clean up the section
                section_text = re.sub(r'\n+', ' ', section_text)
                section_text = re.sub(r'\s+', ' ', section_text)
                section_text = section_text.strip()
                if len(section_text) > 5:
                    return section_text
        
        return ''



def extract_text_from_pdf(pdf_file) -> str:
    """
    Extract text from a PDF file.
    
    Args:
        pdf_file: Django UploadedFile or file-like object
        
    Returns:
        Extracted text from the PDF
    """
    try:
        # Try using pdfplumber (Usually better layout preservation)
        import pdfplumber
        
        with pdfplumber.open(pdf_file) as pdf:
            text = ''
            for page in pdf.pages:
                text += page.extract_text() + '\n'
            
            # If text extraction was successful, return it
            if text.strip():
                return text.strip()
    
    except Exception:
        # Fallback to PyPDF2 if pdfplumber fails or is not available
        pass

    try:
        # Try using PyPDF2
        import PyPDF2
        
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        text = ''
        for page in pdf_reader.pages:
            text += page.extract_text() + '\n'
        return text.strip()
    
    except Exception:
        pass
    
    # Fallback: return empty string if no PDF library available
    return ''


def parse_weekly_report(pdf_file) -> Dict[str, Any]:
    """
    Parse a weekly report PDF file and extract structured data.
    Uses LLM parsing as primary and Regex as fallback.
    """
    # Extract text from PDF
    text = extract_text_from_pdf(pdf_file)
    
    if not text or len(text.strip()) < 20:
        return WeeklyReportParser()._empty_result()

    # Try LLM Parser First
    try:
        from .llm_weekly_report_parser import llm_weekly_report_parser
        logger.info("Using LLM-based weekly report parser")
        return llm_weekly_report_parser.parse(text)
    except Exception as e:
        logger.warning(f"LLM parsing failed, falling back to regex: {e}")
        # Fallback to Regex Parser
        parser = WeeklyReportParser()
        return parser.parse(text)
