"""
Resume Parser Service
Main entry point for resume parsing operations.
Coordinates between extraction and NLP parsing.
"""

import os
import logging
from typing import Dict, Optional, Any
from django.conf import settings
from django.db import transaction

from .resume_extraction import ResumeExtractionEngine
from .nlp_parser import ResumeNLPParser
from ..models import Document, ResumeData

logger = logging.getLogger(__name__)


class ResumeParserService:
    """
    Service class for parsing resumes.
    Handles the complete pipeline: raw text extraction -> NLP parsing -> database storage.
    """
    
    def __init__(self):
        self.extraction_engine = ResumeExtractionEngine()
        self.nlp_parser = ResumeNLPParser()
    
    def parse_resume(self, document_id: int) -> Optional[Dict[str, Any]]:
        """
        Parse a resume document and store the extracted data.
        
        Args:
            document_id: ID of the Document to parse
            
        Returns:
            Dictionary containing parsed data or None if parsing failed
        """
        try:
            # Get the document
            document = Document.objects.get(id=document_id)
            
            # Only process RESUME type documents
            if document.document_type != 'RESUME':
                logger.warning(f"Document {document_id} is not a RESUME type")
                return None
            
            # Check if already parsed
            if document.is_parsed and hasattr(document, 'resume_data'):
                logger.info(f"Document {document_id} already parsed")
                return self._serialize_resume_data(document.resume_data)
            
            # Get the file path
            file_path = document.file.path
            if not os.path.exists(file_path):
                logger.error(f"File not found: {file_path}")
                return None
            
            # Step 1: Extract raw text
            raw_text, error = self.extraction_engine.extract_text(file_path)
            if error:
                logger.error(f"Text extraction failed for document {document_id}: {error}")
                return None
            
            # Store raw text
            document.raw_text = raw_text
            document.save(update_fields=['raw_text'])
            
            # Step 2: Parse with NLP
            parsed_data = self.nlp_parser.parse_resume(raw_text)
            
            # Step 3: Store parsed data
            with transaction.atomic():
                # Calculate additional fields
                years_of_education = self._calculate_years_of_education(parsed_data.get('education', []))
                internship_info = self._extract_internship_info(parsed_data.get('experience', []))
                
                # Update or create ResumeData
                resume_data, created = ResumeData.objects.update_or_create(
                    document=document,
                    defaults={
                        'user': document.owner or document.uploaded_by,
                        'name': parsed_data.get('name'),
                        'email': parsed_data.get('email'),
                        'phone': parsed_data.get('phone'),
                        'skills': parsed_data.get('skills', []),
                        'education': parsed_data.get('education', []),
                        'experience': parsed_data.get('experience', []),
                        'projects': parsed_data.get('projects', []),
                        'certifications': parsed_data.get('certifications', []),
                        'tools': parsed_data.get('tools', []),
                        'total_experience_years': parsed_data.get('total_experience_years', 0.0),
                        # Phase 2 - Part 1 fields
                        'applied_role': parsed_data.get('applied_role'),
                        'years_of_education': years_of_education,
                        'has_internship_experience': internship_info['has_internship'],
                        'internship_count': internship_info['count'],
                    }
                )
                
                # Mark document as parsed
                document.is_parsed = True
                document.save(update_fields=['is_parsed'])
            
            logger.info(f"Successfully parsed resume {document_id}")
            return self._serialize_resume_data(resume_data)
            
        except Document.DoesNotExist:
            logger.error(f"Document {document_id} not found")
            return None
        except Exception as e:
            logger.error(f"Error parsing resume {document_id}: {str(e)}")
            return None
    
    def parse_resume_async(self, document_id: int) -> bool:
        """
        Trigger async parsing of a resume.
        In production, this would queue a Celery task.
        For now, it calls parse_resume directly.
        
        Args:
            document_id: ID of the Document to parse
            
        Returns:
            True if parsing was triggered, False otherwise
        """
        try:
            document = Document.objects.get(id=document_id)
            if document.document_type != 'RESUME':
                return False
            # For now, parse synchronously
            # In production, replace with: parse_resume_task.delay(document_id)
            self.parse_resume(document_id)
            return True
        except Document.DoesNotExist:
            return False
    
    def get_resume_data(self, document_id: int) -> Optional[Dict[str, Any]]:
        """
        Get parsed resume data for a document.
        
        Args:
            document_id: ID of the Document
            
        Returns:
            Dictionary containing parsed data or None
        """
        try:
            document = Document.objects.get(id=document_id)
            if hasattr(document, 'resume_data'):
                return self._serialize_resume_data(document.resume_data)
            return None
        except Document.DoesNotExist:
            return None
    
    def _serialize_resume_data(self, resume_data: ResumeData) -> Dict[str, Any]:
        """
        Serialize ResumeData model to dictionary.
        """
        return {
            'id': resume_data.id,
            'document_id': resume_data.document_id,
            'user_id': resume_data.user_id,
            'name': resume_data.name,
            'email': resume_data.email,
            'phone': resume_data.phone,
            'skills': resume_data.skills,
            'education': resume_data.education,
            'experience': resume_data.experience,
            'projects': resume_data.projects,
            'certifications': resume_data.certifications,
            'tools': resume_data.tools,
            'total_experience_years': resume_data.total_experience_years,
            'applied_role': resume_data.applied_role,
            'years_of_education': resume_data.years_of_education,
            'has_internship_experience': resume_data.has_internship_experience,
            'internship_count': resume_data.internship_count,
            'parsed_at': resume_data.parsed_at.isoformat() if resume_data.parsed_at else None,
            'updated_at': resume_data.updated_at.isoformat() if resume_data.updated_at else None,
        }
    
    def _calculate_years_of_education(self, education: list) -> float:
        """
        Calculate total years of education from education entries.
        
        Args:
            education: List of education dictionaries
            
        Returns:
            Total years of education
        """
        if not education:
            return 0.0
        
        total_years = 0.0
        
        # Education level to years mapping
        education_years = {
            'ph.d': 4.0,
            'phd': 4.0,
            'doctorate': 4.0,
            'doctoral': 4.0,
            'master': 2.0,
            'mba': 2.0,
            'm.s': 2.0,
            'm.sc': 2.0,
            'm.tech': 2.0,
            'bachelor': 4.0,
            'b.s': 4.0,
            'b.sc': 4.0,
            'b.tech': 4.0,
            'b.e': 4.0,
            'bachelor of': 4.0,
            'associate': 2.0,
            'diploma': 3.0,
            'high school': 12.0,
            '12th': 12.0,
            '10th': 10.0,
            'secondary': 10.0,
            'higher secondary': 12.0,
        }
        
        for edu in education:
            degree = edu.get('degree', '').lower()
            
            # Find matching education level
            for level, years in education_years.items():
                if level in degree:
                    total_years = max(total_years, years)
                    break
        
        return total_years
    
    def _extract_internship_info(self, experience: list) -> Dict[str, Any]:
        """
        Extract internship information from experience entries.
        
        Args:
            experience: List of experience dictionaries
            
        Returns:
            Dictionary with has_internship and count
        """
        if not experience:
            return {
                'has_internship': False,
                'count': 0
            }
        
        internship_count = 0
        internship_keywords = ['intern', 'internship', 'trainee', 'apprentice']
        
        for exp in experience:
            title = exp.get('title', '').lower()
            company = exp.get('company', '').lower()
            
            # Check if this is an internship
            if any(keyword in title for keyword in internship_keywords):
                internship_count += 1
            elif any(keyword in company for keyword in internship_keywords):
                internship_count += 1
        
        return {
            'has_internship': internship_count > 0,
            'count': internship_count
        }
