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
from typing import Dict, Any, Optional
from datetime import datetime


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
        r'Intern\s*Name[:\s]*([A-Za-z\s]+)',
        re.IGNORECASE
    )
    
    # Patterns for project title
    PROJECT_TITLE_PATTERN = re.compile(
        r'Project\s*Title[:\s]*([A-Za-z0-9\s]+)',
        re.IGNORECASE
    )
    
    # Patterns for extracting task lists
    TASK_PATTERN = re.compile(
        r'(\d+)[\.\)]\s*(.+?)(?=\d+[\.\)]|$)',
        re.IGNORECASE | re.DOTALL
    )
    
    # Section patterns
    SECTIONS = {
        'tasks_completed': [
            r'(?:Tasks?\s*Completed|Completed\s*Tasks?|Accomplishments?)[:\s]*(.*?)(?=(?:Problems?\s*Faced|Challenges?|Difficulties?|Issues?)[:\s]*(?:\n|$))',
            r'(?:Tasks?\s*Completed\s*Today|Today['']?s\s*Tasks?)[:\s]*(.*?)(?=(?:Problems?\s*Faced|Challenges?)[:\s]*(?:\n|$))',
        ],
        'challenges': [
            r'(?:Problems?\s*Faced|Challenges?|Difficulties?|Issues?)[:\s]*(.*?)(?=(?:Solutions?\s*Found|Learnings?|Next\s*day|Plans?\s*for\s*Tomorrow|Tomorrow)[:\s]*(?:\n|$))',
        ],
        'learnings': [
            r'(?:Solutions?\s*Found|Learnings?|What\s+(?:I|we)\s+learned)[:\s]*(.*?)(?=(?:Plans?\s*for\s*Tomorrow|Tomorrow|Upcoming)[:\s]*(?:\n|$))',
        ],
        'next_week_goals': [
            r'(?:Plans?\s*(?:for\s*)?Tomorrow|Tomorrow['']?s\s*Plans?|Upcoming\s*Tasks?|Next\s*Week)[:\s]*(.*?)(?=\n\n|\Z)',
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
            'tasks_completed': self._extract_tasks_completed(text),
            'challenges': self._extract_section(text, 'challenges'),
            'learnings': self._extract_section(text, 'learnings'),
            'next_week_goals': self._extract_section(text, 'next_week_goals'),
            'self_rating': None,  # Will be calculated or left blank
            'raw_text': text[:2000] if len(text) > 2000 else text,
        }
        
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
        # Remove excessive whitespace
        text = re.sub(r'\n{3,}', '\n\n', text)
        # Remove page numbers
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
            'challenges': '',
            'learnings': '',
            'next_week_goals': '',
            'self_rating': None,
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
                # Extract numbered tasks
                task_items = re.findall(r'(\d+)[\.\)]\s*(.+?)(?=\d+[\.\)]|$)', section_text, re.IGNORECASE | re.DOTALL)
                
                if task_items:
                    for num, task in task_items:
                        task = task.strip()
                        task = re.sub(r'\n+', ' ', task)  # Replace newlines with spaces
                        task = re.sub(r'\s+', ' ', task)   # Normalize spaces
                        if len(task) > 3:
                            tasks.append(task)
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
        # Try using PyPDF2
        import PyPDF2
        
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        text = ''
        for page in pdf_reader.pages:
            text += page.extract_text() + '\n'
        return text.strip()
    
    except ImportError:
        pass
    
    try:
        # Try using pdfplumber
        import pdfplumber
        
        with pdfplumber.open(pdf_file) as pdf:
            text = ''
            for page in pdf.pages:
                text += page.extract_text() + '\n'
        return text.strip()
    
    except ImportError:
        pass
    
    # Fallback: return empty string if no PDF library available
    return ''


def parse_weekly_report(pdf_file) -> Dict[str, Any]:
    """
    Parse a weekly report PDF file and extract structured data.
    
    Args:
        pdf_file: Django UploadedFile object containing the PDF
        
    Returns:
        Dictionary containing parsed weekly report data
    """
    # Extract text from PDF
    text = extract_text_from_pdf(pdf_file)
    
    # Parse the extracted text
    parser = WeeklyReportParser()
    return parser.parse(text)
