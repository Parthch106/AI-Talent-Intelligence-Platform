"""
Talent Intelligence Analysis Service
===================================

Main service that orchestrates the resume analysis pipeline:
1. Resume Parsing & Feature Extraction (Phase 1)
2. Feature Engineering (Phase 2)
3. ML Model Inference (Phase 3-4)
4. Bias Mitigation (Phase 5)
5. Explainability Output (Phase 6)

This service handles the complete analysis pipeline.
"""

import logging
import numpy as np
from typing import Dict, Any, Optional, List
from django.db import transaction

from apps.accounts.models import User
from apps.documents.models import ResumeData
from apps.analytics.models import (
    JobRole,
    Application,
    StructuredFeature,
    ModelPrediction,
    HiringOutcome,
    GrowthTracking,
    ModelRegistry,
)
from .resume_parsing_engine import resume_parsing_engine
from .simple_resume_parser import simple_resume_parser
from .feature_engineering_advanced import advanced_feature_engine
from .embedding_engine import embedding_engine
from .ml_models import ml_model_registry
from .suitability_scorer import suitability_scorer, get_decision_explanation

logger = logging.getLogger(__name__)


class TalentIntelligenceService:
    """
    Enterprise-grade Talent Intelligence Analysis Service.
    
    Orchestrates the complete resume analysis pipeline:
    - Feature Extraction
    - ML Inference
    - Bias Mitigation
    - Explainability
    """
    
    # Decision thresholds (data-driven)
    DECISION_THRESHOLDS = {
        'INTERVIEW_SHORTLIST': 0.80,
        'TECHNICAL_ASSIGNMENT': 0.65,  # v2.0: increased from 0.60
        'MANUAL_REVIEW': 0.50,
    }
    
    def __init__(self):
        # Use simple resume parser instead of complex one
        self.parsing_engine = simple_resume_parser
    
    # =========================================================================
    # HELPER: Extract resume sections for embedding
    # =========================================================================
    
    def _clean_resume_section_string(self, text: str) -> str:
        """
        Clean up resume section strings that may contain dict representations.
        Extracts meaningful text from dict string format.
        """
        import ast
        
        if not text:
            return ''
        
        # If it looks like a dict string representation, try to parse it
        if text.strip().startswith("{") and text.strip().endswith("}"):
            try:
                parsed = ast.literal_eval(text)
                if isinstance(parsed, dict):
                    # Extract all text values from the dict
                    text_parts = []
                    for key, value in parsed.items():
                        if value and isinstance(value, str) and len(value) > 10:
                            text_parts.append(value)
                    if text_parts:
                        return ' '.join(text_parts)
                    # If just 'description' or 'name' exists, use that
                    if parsed.get('description'):
                        return str(parsed.get('description', ''))
                    if parsed.get('name'):
                        return str(parsed.get('name', ''))
            except (ValueError, SyntaxError, TypeError):
                pass
        
        return text

    def _extract_resume_sections_from_stored_data(self, application) -> Dict[str, str]:
        """
        Extract resume sections from stored ResumeSection data.
        Handles cleanup of dict string representations.
        """
        from apps.analytics.models import ResumeSection
        
        sections = {
            'professional_summary': '',
            'technical_skills': '',
            'frameworks_libraries': '',
            'tools_technologies': '',
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
        
        try:
            resume_section = ResumeSection.objects.get(application=application)
            
            # Clean each field that might contain dict strings
            sections['professional_summary'] = self._clean_resume_section_string(
                resume_section.professional_summary or ''
            )
            sections['technical_skills'] = resume_section.technical_skills or ''
            sections['frameworks_libraries'] = resume_section.frameworks_libraries or ''
            sections['tools_technologies'] = resume_section.tools_technologies or ''
            sections['databases'] = resume_section.databases or ''
            sections['cloud_platforms'] = resume_section.cloud_platforms or ''
            sections['soft_skills'] = resume_section.soft_skills or ''
            
            # These might contain dict strings
            sections['experience_titles'] = self._clean_resume_section_string(
                resume_section.experience_titles or ''
            )
            sections['experience_descriptions'] = self._clean_resume_section_string(
                resume_section.experience_descriptions or ''
            )
            sections['experience_duration_text'] = resume_section.experience_duration_text or ''
            sections['project_titles'] = self._clean_resume_section_string(
                resume_section.project_titles or ''
            )
            sections['project_descriptions'] = self._clean_resume_section_string(
                resume_section.project_descriptions or ''
            )
            sections['project_technologies'] = resume_section.project_technologies or ''
            sections['education_text'] = self._clean_resume_section_string(
                resume_section.education_text or ''
            )
            
            sections['certifications'] = resume_section.certifications or ''
            sections['achievements'] = resume_section.achievements or ''
            sections['extracurriculars'] = resume_section.extracurriculars or ''
            
            logger.info(f"_extract_resume_sections_from_stored_data: extracted sections for application {application.id}")
            
        except ResumeSection.DoesNotExist:
            logger.warning(f"_extract_resume_sections_from_stored_data: no ResumeSection for application {application.id}")
        except Exception as e:
            logger.error(f"_extract_resume_sections_from_stored_data: error - {e}")
        
        return sections

    def _extract_resume_sections(
        self,
        raw_features: Dict[str, Any],
        document: Any
    ) -> Optional[Dict[str, str]]:
        """
        Extract text sections from resume for embedding generation.
        
        Args:
            raw_features: Features from parsing engine
            document: Document model instance
            
        Returns:
            Dictionary of resume sections
        """
        sections = {}
        
        logger.info(f"=== _extract_resume_sections START ===")
        logger.info(f"_extract_resume_sections: raw_features type = {type(raw_features)}, is None = {raw_features is None}, is empty = {not raw_features}")
        logger.info(f"_extract_resume_sections: document type = {type(document) if document else None}")
        
        # Handle None or empty raw_features
        if not raw_features:
            logger.warning("_extract_resume_sections: raw_features is None or empty, using document fallback")
            raw_features = {}
        
        logger.info(f"_extract_resume_sections: raw_features keys = {list(raw_features.keys()) if raw_features else None}")
        logger.info(f"_extract_resume_sections: document = {document}, has parsed_data = {hasattr(document, 'parsed_data') if document else False}")
        
        # Try to get parsed data from raw_features
        logger.info(f"_extract_resume_sections: checking for _parsed_data in raw_features: {'_parsed_data' in raw_features if raw_features else False}")
        
        print("\n" + "-"*50)
        print("_extract_resume_sections: raw_features keys:")
        if raw_features:
            print(list(raw_features.keys()))
            print(f"_parsed_data in raw_features: {'_parsed_data' in raw_features}")
            if '_parsed_data' in raw_features:
                print(f"_parsed_data type: {type(raw_features.get('_parsed_data'))}")
                print(f"_parsed_data keys: {list(raw_features.get('_parsed_data', {}).keys())}")
        else:
            print("raw_features is None or empty")
        print("-"*50 + "\n")
        
        # Handle case where document is None
        if not document:
            logger.warning("_extract_resume_sections: document is None, returning empty sections")
            return sections if any(v.strip() for v in sections.values()) else None
        
        if '_parsed_data' in raw_features:
            parsed_data = raw_features['_parsed_data']
            logger.info(f"_extract_resume_sections: found _parsed_data with keys = {list(parsed_data.keys()) if parsed_data else None}")
            
            print("\n" + "="*50)
            print("DEBUG _parsed_data in _extract_resume_sections:")
            print(f"education: {parsed_data.get('education')}")
            print(f"experience: {parsed_data.get('experience')}")
            print(f"projects: {parsed_data.get('projects')}")
            print(f"education_text: {parsed_data.get('education_text')}")
            print("="*50 + "\n")
            
            # Map parsed_data keys to section keys (v2 format)
            # First, try to use the pre-formatted text fields if available
            sections['professional_summary'] = parsed_data.get('professional_summary', '')
            sections['technical_skills'] = parsed_data.get('technical_skills', '') or ', '.join(parsed_data.get('skills', []))
            sections['tools_technologies'] = parsed_data.get('tools_technologies', '') or ', '.join(parsed_data.get('tools', []))
            sections['frameworks_libraries'] = parsed_data.get('frameworks_libraries', '')
            sections['databases'] = parsed_data.get('databases', '')
            sections['cloud_platforms'] = parsed_data.get('cloud_platforms', '')
            sections['soft_skills'] = parsed_data.get('soft_skills', '')
            
            # Format experience as text - check if pre-formatted text exists first
            if parsed_data.get('experience_titles'):
                sections['experience_titles'] = parsed_data.get('experience_titles', '')
            else:
                experience_list = parsed_data.get('experience', [])
                if experience_list and isinstance(experience_list[0], dict) if experience_list else False:
                    sections['experience_titles'] = ', '.join([str(exp.get('position', '')) for exp in experience_list])
            
            if parsed_data.get('experience_descriptions'):
                sections['experience_descriptions'] = parsed_data.get('experience_descriptions', '')
            else:
                experience_list = parsed_data.get('experience', [])
                if experience_list and isinstance(experience_list[0], dict) if experience_list else False:
                    sections['experience_descriptions'] = ' '.join([str(exp.get('description', '')) for exp in experience_list])
            
            if parsed_data.get('experience_duration_text'):
                sections['experience_duration_text'] = parsed_data.get('experience_duration_text', '')
            else:
                experience_list = parsed_data.get('experience', [])
                if experience_list and isinstance(experience_list[0], dict) if experience_list else False:
                    sections['experience_duration_text'] = ', '.join([str(exp.get('duration', '')) for exp in experience_list])
            
            # Format projects as text
            if parsed_data.get('project_titles'):
                sections['project_titles'] = parsed_data.get('project_titles', '')
            else:
                projects_list = parsed_data.get('projects', [])
                if projects_list and isinstance(projects_list[0], dict) if projects_list else False:
                    sections['project_titles'] = ', '.join([str(proj.get('name', '')) for proj in projects_list])
            
            if parsed_data.get('project_descriptions'):
                sections['project_descriptions'] = parsed_data.get('project_descriptions', '')
            else:
                projects_list = parsed_data.get('projects', [])
                if projects_list and isinstance(projects_list[0], dict) if projects_list else False:
                    sections['project_descriptions'] = ' '.join([str(proj.get('description', '')) for proj in projects_list])
            
            if parsed_data.get('project_technologies'):
                sections['project_technologies'] = parsed_data.get('project_technologies', '')
            else:
                projects_list = parsed_data.get('projects', [])
                if projects_list and isinstance(projects_list[0], dict) if projects_list else False:
                    sections['project_technologies'] = ', '.join([str(proj.get('technologies', '')) for proj in projects_list])
            
            # Format education as text
            if parsed_data.get('education_text'):
                sections['education_text'] = parsed_data.get('education_text', '')
            else:
                education_list = parsed_data.get('education', [])
                if education_list and isinstance(education_list[0], dict) if education_list else False:
                    sections['education_text'] = ' | '.join([f"{edu.get('degree', '')} at {edu.get('institution', '')} {edu.get('year', '')}" for edu in education_list])
            
            sections['certifications'] = parsed_data.get('certifications_text', '') or ', '.join(parsed_data.get('certifications', []))
            sections['achievements'] = parsed_data.get('achievements_text', '') or ', '.join(parsed_data.get('achievements', []))
            sections['extracurriculars'] = parsed_data.get('extracurriculars', '')
            
            logger.info(f"_extract_resume_sections: extracted sections - skills: {len(parsed_data.get('skills', []))}, experience: {len(parsed_data.get('experience', []))}, projects: {len(parsed_data.get('projects', []))}")
        else:
            # No _parsed_data found - return empty sections
            logger.warning("_extract_resume_sections: _parsed_data NOT found in raw_features")
        
        # Check if we have meaningful content
        has_content = any(v.strip() for v in sections.values())
        
        logger.info(f"_extract_resume_sections: has_content = {has_content}, sections with content = {[k for k, v in sections.items() if v.strip()]}")
        
        # Log each section for debugging
        for key, value in sections.items():
            logger.info(f"_extract_resume_sections: section '{key}' = '{value[:100]}..." if len(value) > 100 else f"_extract_resume_sections: section '{key}' = '{value}'")
        
        return sections if has_content else None
    
    # =========================================================================
    # MAIN ANALYSIS METHODS
    # =========================================================================
    
    def analyze_resume(
        self,
        user: User,
        job_role: Optional[str] = None,
        create_application: bool = True
    ) -> Dict[str, Any]:
        """
        Main entry point for resume analysis.
        
        Args:
            user: User (intern) to analyze
            job_role: Target job role (optional)
            create_application: Whether to create Application record
            
        Returns:
            Complete analysis results
        """
        logger.info(f"Starting analysis for user: {user.email}")
        
        # 1. Get document for the user
        from apps.documents.models import Document
        document = Document.objects.filter(
            uploaded_by=user,
            document_type='RESUME'
        ).first()
        
        if not document:
            raise ValueError(f"No resume document found for user {user.email}")
        
        # 2. Create or get job role
        job_role_obj = None
        if job_role:
            # Define default role descriptions for common roles
            role_descriptions = {
                'ML_ENGINEER': 'Machine Learning Engineer with experience in deep learning, TensorFlow, PyTorch, NLP, computer vision, MLOps, model deployment, data pipeline development, and production ML systems. Should have strong Python skills and experience with cloud platforms.',
                'DATA_SCIENTIST': 'Data Scientist with skills in data analysis, machine learning, statistics, Python, R, SQL, data visualization, predictive modeling, and experience with tools like Tableau or Power BI.',
                'SOFTWARE_ENGINEER': 'Software Engineer with proficiency in Python, Java, JavaScript, software development, APIs, databases, version control, and agile methodologies.',
                'FULL_STACK_DEVELOPER': 'Full Stack Developer with experience in frontend (React, Angular, Vue), backend (Node.js, Django, Flask), databases, and REST APIs.',
                'DEVOPS_ENGINEER': 'DevOps Engineer with skills in Docker, Kubernetes, CI/CD, AWS, Azure, Jenkins, Terraform, and infrastructure automation.',
                'DATA_ENGINEER': 'Data Engineer with experience in ETL, data pipelines, Apache Spark, SQL, NoSQL databases, cloud platforms, and data warehousing.',
            }
            
            # Get proper description or use default
            role_desc = role_descriptions.get(job_role.upper(), f'{job_role} position requiring technical skills, experience with relevant tools and frameworks')
            
            # Define mandatory and preferred skills for common roles
            role_skills = {
                'ML_ENGINEER': {
                    'mandatory': ['python', 'machine learning', 'tensorflow', 'pytorch', 'deep learning'],
                    'preferred': ['scikit-learn', 'keras', 'nlp', 'computer vision', 'mlops', 'aws', 'docker', 'kubernetes']
                },
                'DATA_SCIENTIST': {
                    'mandatory': ['python', 'machine learning', 'data analysis', 'sql'],
                    'preferred': ['tableau', 'power bi', 'statistics', 'r', 'pandas']
                },
                'SOFTWARE_ENGINEER': {
                    'mandatory': ['python', 'java', 'javascript'],
                    'preferred': ['git', 'sql', 'rest api', 'agile']
                },
                'DEVOPS_ENGINEER': {
                    'mandatory': ['docker', 'kubernetes', 'ci/cd'],
                    'preferred': ['aws', 'azure', 'jenkins', 'terraform']
                },
            }
            
            skills = role_skills.get(job_role.upper(), {'mandatory': [], 'preferred': []})
            
            # Always try to update the role description and skills for better matching
            job_role_obj, created = JobRole.objects.get_or_create(
                role_title=job_role.upper(),
                defaults={
                    'role_description': role_desc,
                    'mandatory_skills': skills['mandatory'],
                    'preferred_skills': skills['preferred']
                }
            )
            
            # Update skills and description if role already exists
            if job_role_obj:
                job_role_obj.role_description = role_desc
                job_role_obj.mandatory_skills = skills['mandatory']
                job_role_obj.preferred_skills = skills['preferred']
                job_role_obj.save()
                logger.info(f"Updated JobRole {job_role.upper()} with description: {role_desc[:100]}...")
                print(f"=== JOB ROLE UPDATED ===")
                print(f"Role: {job_role.upper()}")
                print(f"Description: {role_desc[:200]}...")
                print(f"Mandatory Skills: {skills['mandatory']}")
        
        # 3. Create or get application
        application = None
        
        # Get raw text from document
        resume_raw_text = ''
        if document.raw_text:
            resume_raw_text = document.raw_text
        elif document.file:
            try:
                if document.file:
                    content = document.file.read() if hasattr(document.file, 'read') else b''
                    # Decode and filter out NUL characters
                    resume_raw_text = content.decode('utf-8', errors='ignore').replace('\x00', '')
            except:
                pass
        
        # Print role description for debugging
        print(f"=== ROLE DESCRIPTION DEBUG ===")
        print(f"job_role_obj: {job_role_obj}")
        print(f"job_role_obj.role_description: {job_role_obj.role_description[:200] if job_role_obj and job_role_obj.role_description else 'None'}")
        
        if create_application and job_role_obj:
            application, created = Application.objects.get_or_create(
                intern=user,
                job_role=job_role_obj,
                defaults={'resume_raw_text': resume_raw_text[:10000]}  # Limit text length
            )
        
        # 4. Extract features - use simple parser
        # The simple parser has .parse() method that takes raw text
        parsed = self.parsing_engine.parse(document.raw_text)
        raw_features = {'_parsed_data': parsed}
        
        print("\n" + "="*50)
        print("SIMPLE PARSER RESULT")
        print("="*50)
        for key, value in parsed.items():
            if value:
                print(f"{key}: {value[:80]}...")
        print("="*50 + "\n")
        
        # 4b. Store parsed resume data directly to ResumeSection
        if application and raw_features and '_parsed_data' in raw_features:
            parsed_data = raw_features['_parsed_data']
            self._store_parsed_resume_sections(application, parsed_data)
        
        # 5. Apply feature engineering (Phase 2)
        engineered_features = self._apply_feature_engineering(
            raw_features, 
            target_job_role=job_role
        )
        
        # 5b. Generate embeddings (v2.0 - Phase 2b)
        # Extract text sections from parsed data for embedding
        # First try to get from stored ResumeSection with cleanup
        from apps.analytics.models import ResumeSection
        
        
        # ALWAYS extract fresh resume sections from raw features for embedding
        # (Don't use cached old data from database)
        resume_sections = self._extract_resume_sections(raw_features, document)
        logger.info("analyze_resume: extracted fresh sections from raw features for embedding")
        
        role_description = job_role_obj.role_description if job_role_obj else f'{job_role} position'
        
        logger.info(f"resume_sections extracted: {bool(resume_sections)}, keys: {list(resume_sections.keys()) if resume_sections else None}")
        
        print("\n" + "="*50)
        print("_extract_resume_sections RESULT")
        print("="*50)
        print(f"resume_sections is None: {resume_sections is None}")
        if resume_sections:
            print(f"technical_skills: {resume_sections.get('technical_skills', '')[:100]}...")
            print(f"education_text: {resume_sections.get('education_text', '')}")
            print(f"experience_titles: {resume_sections.get('experience_titles', '')}")
            print(f"project_titles: {resume_sections.get('project_titles', '')}")
        print("="*50 + "\n")
        
        embedding_results = None
        if resume_sections:
            try:
                logger.info(f"=== Calling embedding_engine.process_resume ===")
                logger.info(f"role_description passed to embedding: {role_description[:200] if role_description else 'None'}...")
                print(f"=== EMBEDDING DEBUG ===")
                print(f"role_description: {role_description[:300]}...")
                print(f"resume_sections keys: {list(resume_sections.keys())}")
                
                try:
                    embedding_results = embedding_engine.process_resume(
                        resume_sections=resume_sections,
                        role_description=role_description,
                        apply_bias_mitigation=True
                    )
                    logger.info(f"Generated embeddings with semantic_match_score: {embedding_results.get('semantic_match_score', 0)}")
                    print(f"=== EMBEDDING RESULT ===")
                    print(f"semantic_match_score: {embedding_results.get('semantic_match_score', 'Not found')}")
                    if embedding_results:
                        print(f"resume_vector length: {len(embedding_results.get('resume_vector', []))}")
                        print(f"role_embedding length: {len(embedding_results.get('role_embedding', []))}")
                except Exception as e:
                    print(f"=== EMBEDDING ERROR ===")
                    print(f"Error: {str(e)}")
                    embedding_results = None
                logger.info(f"embedding_results keys: {list(embedding_results.keys()) if embedding_results else None}")
                logger.info(f"resume_vector shape: {len(embedding_results.get('resume_vector', [])) if embedding_results else 0}")
                
                # Store resume sections in database
                self._store_resume_sections(application, resume_sections)
                
                # Store embeddings in database (use 'resume_vector' not 'combined_embedding')
                if embedding_results and 'resume_vector' in embedding_results:
                    resume_vector = embedding_results['resume_vector']
                    # Convert to numpy array if it's a list
                    if isinstance(resume_vector, list):
                        resume_vector = np.array(resume_vector)
                    self._store_embeddings(application, resume_vector)
                    
            except Exception as e:
                logger.warning(f"Embedding generation failed: {e}")
        
        # 6. Store features in database (V2: StructuredFeature)
        structured_feature = self._store_structured_features(
            application,
            engineered_features
        )
        
        # 7. Run ML inference (Phase 3-4) - now with embeddings
        predictions = self._run_ml_inference(
            engineered_features,
            embedding_results=embedding_results
        )
        
        # 8. Store predictions
        model_prediction = self._store_predictions(
            application,
            predictions
        )
        
        # 9. Apply bias mitigation (Phase 5)
        bias_report = self._apply_bias_mitigation(
            engineered_features,
            predictions
        )
        
        # 10. Generate explainability output (Phase 6) - v2.0 format
        analysis_result = self._generate_explainable_output(
            user=user,
            features=engineered_features,
            predictions=predictions,
            bias_report=bias_report,
            embedding_results=embedding_results
        )
        
        logger.info(f"Analysis completed for user: {user.email}")
        
        return analysis_result
    
    @transaction.atomic
    def _store_structured_features(
        self,
        application: Optional[Application],
        features: Dict[str, Any]
    ) -> Optional[StructuredFeature]:
        """Store extracted features in database using V2 StructuredFeature model."""
        
        if not application:
            return None
        
        # Get valid field names from StructuredFeature model
        valid_field_names = set(f.name for f in StructuredFeature._meta.get_fields())
        
        # V2 field mapping (reduced feature set)
        field_mapping = {
            'skill_match_ratio': 'skill_match_ratio',
            'domain_similarity_score': 'domain_similarity_score',
            'critical_skill_gap_count': 'critical_skill_gap_count',
            'experience_duration_months': 'experience_duration_months',
            'internship_relevance_score': 'internship_relevance_score',
            'project_complexity_score': 'project_complexity_score',
            'degree_level_encoded': 'degree_level_encoded',
            'gpa_normalized': 'gpa_normalized',
            'quantified_impact_presence': 'quantified_impact_presence',
            'writing_clarity_score': 'writing_clarity_score',
        }
        
        # Filter and map features to valid model fields
        valid_features = {}
        for key, value in features.items():
            # Skip internal fields and non-numeric fields
            if key.startswith('_') or not isinstance(value, (int, float, bool)):
                continue
            
            # Map to correct field name if needed
            field_name = field_mapping.get(key, key)
            
            # Only include fields that exist in the model
            if field_name in valid_field_names:
                valid_features[field_name] = value
        
        structured_feature, _ = StructuredFeature.objects.update_or_create(
            application=application,
            defaults=valid_features
        )
        
        return structured_feature
    
    def _store_predictions(
        self,
        application: Optional[Application],
        predictions: Dict[str, Any]
    ) -> Optional[ModelPrediction]:
        """Store ML predictions in database using V2 schema."""
        
        if not application:
            return None
            
        prediction, _ = ModelPrediction.objects.update_or_create(
            application=application,
            defaults={
                'suitability_score': predictions.get('suitability_score', 0),
                'technical_score': predictions.get('technical_competency_score',
                                    predictions.get('technical_score', 0)),
                'growth_score': predictions.get('growth_potential_score',
                                 predictions.get('growth_score', 0)),
                'authenticity_score': predictions.get('resume_authenticity_score',
                                      predictions.get('authenticity_score', 0)),
                'semantic_match_score': predictions.get('semantic_match_score', 0),
                'decision': predictions.get('decision', 'MANUAL_REVIEW'),
                'model_type': predictions.get('model_type', 'xgboost'),
                'model_version': predictions.get('model_version', 'transformer_xgb'),
                'confidence_score': predictions.get('confidence_score', 0.5),
            }
        )
        
        return prediction
    
    def _store_parsed_resume_sections(
        self,
        application: Optional[Application],
        parsed_data: Dict[str, Any]
    ) -> Optional[Any]:
        """Store parsed resume data directly to ResumeSection table."""
        from apps.analytics.models import ResumeSection
        
        print("\n" + "="*50)
        print("_store_parsed_resume_sections CALLED - STORING DIRECTLY")
        print("="*50)
        print(f"application: {application}")
        print(f"parsed_data keys: {list(parsed_data.keys()) if parsed_data else None}")
        
        if not application or not parsed_data:
            print("Skipping - no application or parsed_data")
            return None
        
        # Helper function to format lists to comma-separated strings
        def to_string(value):
            if isinstance(value, list):
                return ', '.join(str(v) for v in value)
            return str(value) if value else ''
        
        # Format experience as text
        experience_list = parsed_data.get('experience', [])
        experience_titles = ''
        experience_descriptions = ''
        experience_durations = ''
        if experience_list and isinstance(experience_list[0], dict):
            experience_titles = ', '.join([str(exp.get('position', '')) for exp in experience_list])
            experience_descriptions = ' '.join([str(exp.get('description', '')) for exp in experience_list])
            experience_durations = ', '.join([str(exp.get('duration', '')) for exp in experience_list])
        
        # Format projects as text
        projects_list = parsed_data.get('projects', [])
        project_titles = ''
        project_descriptions = ''
        project_technologies = ''
        if projects_list and isinstance(projects_list[0], dict):
            project_titles = ', '.join([str(proj.get('name', '')) for proj in projects_list])
            project_descriptions = ' '.join([str(proj.get('description', '')) for proj in projects_list])
            project_technologies = ', '.join([str(proj.get('technologies', '')) for proj in projects_list])
        
        # Format education as text
        education_list = parsed_data.get('education', [])
        education_text = ''
        if education_list and isinstance(education_list[0], dict):
            education_text = ' | '.join([f"{edu.get('degree', '')} at {edu.get('institution', '')} {edu.get('year', '')}" for edu in education_list])
        
        # Format certifications
        certs = parsed_data.get('certifications', [])
        certifications = to_string(certs) if certs else (parsed_data.get('certifications_text', '') or '')
        
        # Format achievements
        achievements_list = parsed_data.get('achievements', [])
        achievements = to_string(achievements_list) if achievements_list else (parsed_data.get('achievements_text', '') or '')
        
        section, _ = ResumeSection.objects.update_or_create(
            application=application,
            defaults={
                'professional_summary': parsed_data.get('professional_summary', ''),
                'technical_skills': parsed_data.get('technical_skills', '') or to_string(parsed_data.get('skills', [])),
                'tools_technologies': parsed_data.get('tools_technologies', '') or to_string(parsed_data.get('tools', [])),
                'frameworks_libraries': parsed_data.get('frameworks_libraries', ''),
                'databases': parsed_data.get('databases', ''),
                'cloud_platforms': parsed_data.get('cloud_platforms', ''),
                'soft_skills': parsed_data.get('soft_skills', ''),
                'experience_titles': parsed_data.get('experience_titles', '') or experience_titles,
                'experience_descriptions': parsed_data.get('experience_descriptions', '') or experience_descriptions,
                'experience_duration_text': parsed_data.get('experience_duration_text', '') or experience_durations,
                'project_titles': parsed_data.get('project_titles', '') or project_titles,
                'project_descriptions': parsed_data.get('project_descriptions', '') or project_descriptions,
                'project_technologies': parsed_data.get('project_technologies', '') or project_technologies,
                'education_text': parsed_data.get('education_text', '') or education_text,
                'certifications': certifications,
                'achievements': achievements,
                'extracurriculars': parsed_data.get('extracurriculars', ''),
            }
        )
        
        print(f"Successfully stored ResumeSection for application {application.id}")
        print(f"technical_skills: {section.technical_skills[:100]}..." if section.technical_skills else "technical_skills: (empty)")
        print(f"education_text: {section.education_text}")
        print("="*50 + "\n")
        
        logger.info(f"Stored parsed resume sections directly for application {application.id}")
        return section
    
    def _store_resume_sections(
        self,
        application: Optional[Application],
        resume_sections: Dict[str, str]
    ) -> Optional[Any]:
        """Store resume sections in database."""
        from apps.analytics.models import ResumeSection
        
        print("\n" + "="*50)
        print("_store_resume_sections CALLED")
        print("="*50)
        print(f"application: {application}")
        print(f"resume_sections keys: {list(resume_sections.keys()) if resume_sections else None}")
        print(f"technical_skills: {resume_sections.get('technical_skills', '')[:100] if resume_sections else 'None'}...")
        print(f"education_text: {resume_sections.get('education_text', '') if resume_sections else 'None'}")
        print("="*50 + "\n")
        
        logger.info(f"_store_resume_sections called with application={application}, resume_sections keys={list(resume_sections.keys()) if resume_sections else None}")
        
        if not application or not resume_sections:
            logger.warning(f"_store_resume_sections: skipping - application={bool(application)}, resume_sections={bool(resume_sections)}")
            return None
        
        section, _ = ResumeSection.objects.update_or_create(
            application=application,
            defaults={
                'professional_summary': resume_sections.get('professional_summary', ''),
                'technical_skills': resume_sections.get('technical_skills', ''),
                'tools_technologies': resume_sections.get('tools_technologies', ''),
                'frameworks_libraries': resume_sections.get('frameworks_libraries', ''),
                'databases': resume_sections.get('databases', ''),
                'cloud_platforms': resume_sections.get('cloud_platforms', ''),
                'soft_skills': resume_sections.get('soft_skills', ''),
                'experience_titles': resume_sections.get('experience_titles', ''),
                'experience_descriptions': resume_sections.get('experience_descriptions', ''),
                'experience_duration_text': resume_sections.get('experience_duration_text', ''),
                'project_titles': resume_sections.get('project_titles', ''),
                'project_descriptions': resume_sections.get('project_descriptions', ''),
                'project_technologies': resume_sections.get('project_technologies', ''),
                'education_text': resume_sections.get('education_text', ''),
                'certifications': resume_sections.get('certifications_text', '') or resume_sections.get('certifications', ''),
                'achievements': resume_sections.get('achievements_text', '') or resume_sections.get('achievements', ''),
                'extracurriculars': resume_sections.get('extracurriculars', ''),
            }
        )
        
        logger.info(f"Stored resume sections for application {application.id}")
        return section
    
    def _store_embeddings(
        self,
        application: Optional[Application],
        embedding: np.ndarray
    ) -> Optional[Any]:
        """Store resume embeddings in database."""
        from apps.analytics.models import ResumeEmbedding
        
        logger.info(f"_store_embeddings called with application={application}, embedding is None={embedding is None}")
        
        if not application or embedding is None:
            logger.warning(f"_store_embeddings: skipping - application={bool(application)}, embedding is None={embedding is None}")
            return None
        
        # Convert numpy array to list for storage
        embedding_list = embedding.tolist() if hasattr(embedding, 'tolist') else list(embedding)
        
        resume_embedding, _ = ResumeEmbedding.objects.update_or_create(
            application=application,
            defaults={
                'combined_embedding': embedding_list,
            }
        )
        
        logger.info(f"Stored embeddings for application {application.id}")
        return resume_embedding
    
    # =========================================================================
    # PHASE 2: FEATURE ENGINEERING
    # =========================================================================
    
    def _apply_feature_engineering(
        self,
        raw_features: Dict[str, Any],
        resume_data: Any = None,
        target_job_role: str = None
    ) -> Dict[str, Any]:
        """
        Phase 2: Advanced Feature Engineering Layer
        
        Uses advanced techniques:
        - TF-IDF vectorization
        - Cosine similarity
        - Feature normalization
        - Categorical encoding
        - Resume inflation detection
        
        Args:
            raw_features: Features from Phase 1 (can include parsed data)
            resume_data: ResumeData model instance (optional, for backward compatibility)
            
        Returns:
            Engineered features ready for ML
        """
        # Extract data from raw_features (new approach) or resume_data (legacy)
        if '_parsed_data' in raw_features:
            # New approach: data is in raw_features
            parsed_data = raw_features['_parsed_data']
            resume_skills = self._normalize_skills(parsed_data.get('skills', []))
            resume_tools = self._normalize_skills(parsed_data.get('tools', []))
            all_skills = resume_skills + resume_tools
            
            projects = parsed_data.get('projects', [])
            raw_text = raw_features.get('_raw_text', '')
            # Use the job_role parameter, not the parsed applied_role
            # job_role = parsed_data.get('applied_role', '')  # This was wrong
            job_role = target_job_role if target_job_role else parsed_data.get('applied_role', '')
        else:
            # Legacy approach: data is in resume_data
            resume_skills = self._normalize_skills(resume_data.skills or [])
            resume_tools = self._normalize_skills(resume_data.tools or [])
            all_skills = resume_skills + resume_tools
            
            projects = resume_data.projects or []
            raw_text = getattr(resume_data, 'raw_text', '') or ''
            job_role = target_job_role if target_job_role else getattr(resume_data, 'applied_role', '') or ''
        
        # Get job role requirements
        role_requirements = self._get_role_requirements_simple(job_role)
        required_skills = role_requirements.get('mandatory_skills', [])
        
        # Build advanced feature vector using TF-IDF and similarity
        advanced_features = advanced_feature_engine.build_ml_feature_vector(
            raw_features=raw_features,
            resume_skills=all_skills,
            required_skills=required_skills,
            projects=projects,
            raw_text=raw_text
        )
        
        # Merge with raw features
        engineered = raw_features.copy()
        engineered.update(advanced_features)
        
        # Compute derived features
        engineered['overall_technical_score'] = self._compute_technical_score_advanced(engineered)
        engineered['overall_qualification_score'] = self._compute_qualification_score(engineered)
        engineered['project_strength_score'] = self._compute_project_strength(engineered)
        
        return engineered
    
    def _normalize_skills(self, skills: List[Any]) -> List[str]:
        """Normalize skills to strings."""
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
    
    def _get_role_requirements_simple(self, job_role: Optional[str]) -> Dict[str, Any]:
        """Get simplified role requirements."""
        role_requirements = {
            'FRONTEND_DEVELOPER': {
                'mandatory_skills': ['javascript', 'typescript', 'react', 'html', 'css'],
                'required_domains': ['frontend']
            },
            'BACKEND_DEVELOPER': {
                'mandatory_skills': ['python', 'django', 'sql', 'rest api'],
                'required_domains': ['backend']
            },
            'FULLSTACK_DEVELOPER': {
                'mandatory_skills': ['javascript', 'python', 'react', 'django', 'sql'],
                'required_domains': ['frontend', 'backend']
            },
            'DATA_SCIENTIST': {
                'mandatory_skills': ['python', 'pandas', 'numpy', 'scikit-learn'],
                'required_domains': ['data_science']
            },
            'ML_ENGINEER': {
                'mandatory_skills': ['python', 'tensorflow', 'pytorch', 'machine learning'],
                'required_domains': ['ml']
            },
            'DEVOPS_ENGINEER': {
                'mandatory_skills': ['docker', 'kubernetes', 'git', 'ci/cd'],
                'required_domains': ['devops']
            },
        }
        
        if job_role and job_role.upper() in role_requirements:
            return role_requirements[job_role.upper()]
        
        return {'mandatory_skills': [], 'required_domains': []}
    
    def _compute_technical_score_advanced(self, features: Dict) -> float:
        """Compute overall technical score using advanced features."""
        # Use TF-IDF and advanced similarity
        weights = {
            'tfidf_skill_similarity': 0.20,
            'skill_match_ratio': 0.15,
            'skill_depth_score': 0.10,
            'domain_similarity_advanced': 0.15,
            'skill_project_consistency': 0.10,
            'production_tools_usage_score': 0.15,
            'technical_readiness': 0.15,
        }
        
        score = sum(
            features.get(key, 0) * weight 
            for key, weight in weights.items()
        )
        
        return min(score, 1.0)
    
    def _compute_qualification_score(self, features: Dict) -> float:
        """Compute overall qualification score."""
        weights = {
            'degree_level_encoded': 0.30,
            'gpa_normalized': 0.25,
            'university_tier_score': 0.25,
            'coursework_relevance_score': 0.20,
        }
        
        # Normalize degree level
        degree = features.get('degree_level_encoded', 1) / 3
        
        score = (
            degree * weights['degree_level_encoded'] +
            features.get('gpa_normalized', 0) * weights['gpa_normalized'] +
            features.get('university_tier_score', 0) * weights['university_tier_score'] +
            features.get('coursework_relevance_score', 0) * weights['coursework_relevance_score']
        )
        
        return min(score, 1.0)
    
    def _compute_project_strength(self, features: Dict) -> float:
        """Compute project strength score."""
        weights = {
            'project_count': 0.20,
            'project_complexity_score': 0.30,
            'quantified_impact_presence': 0.25,
            'production_tools_usage_score': 0.25,
        }
        
        project_count = min(features.get('project_count', 0) / 5, 1.0)
        
        score = (
            project_count * weights['project_count'] +
            features.get('project_complexity_score', 0) * weights['project_complexity_score'] +
            (1.0 if features.get('quantified_impact_presence') else 0.3) * weights['quantified_impact_presence'] +
            features.get('production_tools_usage_score', 0) * weights['production_tools_usage_score']
        )
        
        return min(score, 1.0)
    
    # =========================================================================
    # PHASE 3-4: ML MODEL INFERENCE
    # =========================================================================
    
    def _run_ml_inference(
        self, 
        features: Dict[str, Any],
        embedding_results: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Phase 3-4: ML Model Inference (v2.0)
        
        Runs ML models to generate predictions using the ML Model Registry.
        Now integrates with embeddings for semantic matching.
        """
        
        # Use ML model registry for predictions
        predictions = ml_model_registry.predict_all(features)
        
        # Add semantic match score from embeddings if available
        if embedding_results and 'semantic_match_score' in embedding_results:
            predictions['semantic_match_score'] = embedding_results['semantic_match_score']
        
        # Get suitability probability for decision
        suitability_score = predictions.get('suitability_score', 0.5)
        
        # v2.0: Use suitability_scorer with v2 thresholds and no manual adjustments
        final_result = suitability_scorer.compute_final_suitability(
            ml_predictions=predictions,
            embedding_results=embedding_results
        )
        
        # Update predictions with final results
        predictions.update(final_result)
        
        # Use transformer model version
        predictions['model_version'] = 'transformer_xgb'
        
        # Get red flags from authenticity model
        if predictions.get('authenticity_score', 1.0) < 0.5:
            predictions['red_flags'] = ml_model_registry.get_model('authenticity').get_red_flags(features)
        
        return predictions
    
    def _compute_ml_confidence(self, predictions: Dict[str, float]) -> float:
        """Compute confidence based on model agreement."""
        scores = [
            predictions.get('suitability_score', 0.5),
            predictions.get('growth_potential_score', 0.5),
            predictions.get('resume_authenticity_score', 0.5),
        ]
        
        # Low variance = high confidence
        mean = sum(scores) / len(scores)
        variance = sum((s - mean) ** 2 for s in scores) / len(scores)
        confidence = 1.0 - min(variance * 2, 0.5)
        
        return max(0.3, min(confidence, 0.95))
    
    # =========================================================================
    # PHASE 5: BIAS MITIGATION
    # =========================================================================
    
    def _apply_bias_mitigation(
        self,
        features: Dict,
        predictions: Dict
    ) -> Dict[str, Any]:
        """
        Phase 5: Bias Mitigation & Fairness Layer
        
        Applies bias detection and mitigation.
        """
        bias_report = {
            'education_bias_detected': False,
            'normalization_applied': False,
            'fairness_metrics': {}
        }
        
        # 1. Education Bias Detection
        if features.get('university_tier_score', 0) > 0.8:
            bias_report['education_bias_detected'] = True
        
        # 2. Apply normalization if bias detected
        if bias_report['education_bias_detected']:
            # Normalize education score to reduce bias
            education_score = features.get('overall_qualification_score', 0.5)
            normalized_education = 0.5 + (education_score - 0.5) * 0.7
            bias_report['normalization_applied'] = True
            bias_report['normalized_education_score'] = normalized_education
        
        # 3. Compute fairness metrics
        bias_report['fairness_metrics'] = {
            'demographic_parity': self._compute_demographic_parity(predictions),
            'equal_opportunity': self._compute_equal_opportunity(predictions),
        }
        
        return bias_report
    
    def _compute_demographic_parity(self, predictions: Dict) -> float:
        """Compute demographic parity metric."""
        # Simplified: Based on education distribution
        return 0.85  # Placeholder
    
    def _compute_equal_opportunity(self, predictions: Dict) -> float:
        """Compute equal opportunity metric."""
        return 0.80  # Placeholder
    
    # =========================================================================
    # PHASE 6: EXPLAINABILITY
    # =========================================================================
    
    def _generate_explainable_output(
        self,
        user: User,
        features: Dict,
        predictions: Dict,
        bias_report: Dict,
        embedding_results: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Phase 6: Explainability & Dashboard Output (v2.0)
        
        Generates final explainable output with v2.0 format:
        - risk_flags instead of feature_importance
        - semantic_match_score
        - model_version: transformer_xgb_v2
        """
        
        # Identify top strengths and gaps
        strengths, gaps = self._identify_strengths_and_gaps(features, predictions)
        
        # v2.0: Get risk flags from predictions (set by suitability_scorer)
        risk_flags = predictions.get('risk_flags', [])
        
        # Build final output (v2.0 format)
        output = {
            'candidate_id': str(user.id),
            'candidate_email': user.email,
            'suitability_score': round(predictions.get('suitability_score', 0), 2),
            'decision': predictions.get('decision', 'MANUAL_REVIEW'),
            # v2.0 field names
            'growth_score': round(predictions.get('growth_score', 
                                   predictions.get('growth_potential_score', 0)), 2),
            'authenticity_score': round(predictions.get('authenticity_score',
                                        predictions.get('resume_authenticity_score', 0)), 2),
            'semantic_match_score': round(predictions.get('semantic_match_score', 0), 2),
            'confidence_score': round(predictions.get('confidence_score', 0), 2),
            'top_strengths': strengths or predictions.get('top_strengths', []),
            'risk_flags': risk_flags,  # v2.0: replaces skill_gaps and feature_importance
            'model_version': predictions.get('model_version', 'transformer_xgb_v2'),
            'bias_report': bias_report,
        }
        
        return output
    
    def _identify_strengths_and_gaps(
        self,
        features: Dict,
        predictions: Dict
    ) -> tuple[List[str], List[str]]:
        """Identify top strengths and skill gaps (v2.0)."""
        strengths = []
        gaps = []
        
        # v2.0: Check ML predictions
        if predictions.get('suitability_score', 0) >= 0.7:
            strengths.append('Strong overall suitability for role')
        if predictions.get('growth_score', 0) >= 0.6:
            strengths.append('Strong growth potential indicators')
        if predictions.get('authenticity_score', 0) >= 0.7:
            strengths.append('High resume authenticity')
        if predictions.get('semantic_match_score', 0) >= 0.6:
            strengths.append('Good semantic alignment with role requirements')
        
        # Legacy: Check features
        if features.get('skill_match_ratio', 0) >= 0.7:
            strengths.append('Strong skill alignment with role requirements')
        if features.get('project_complexity_score', 0) >= 0.7:
            strengths.append('Complex project experience')
        if features.get('production_tools_usage_score', 0) >= 0.7:
            strengths.append('Production environment experience')
        
        # Check gaps
        if predictions.get('authenticity_score', 1.0) < 0.4:
            gaps.append('Low resume authenticity - possible inflation')
        if predictions.get('semantic_match_score', 1.0) < 0.4:
            gaps.append('Low semantic alignment with role')
        if features.get('critical_skill_gap_count', 0) > 0:
            gaps.append(f'Missing {features["critical_skill_gap_count"]} critical skills')
        if features.get('skill_match_ratio', 0) < 0.5:
            gaps.append('Low skill match with role requirements')
        
        return strengths[:3], gaps[:3]  # Top 3 each
    
    def _compute_feature_importance(
        self,
        features: Dict,
        predictions: Dict
    ) -> Dict[str, float]:
        """Compute feature importance for explainability."""
        
        # Simplified feature importance based on contribution to final score
        importance = {
            'skill_match_ratio': features.get('skill_match_ratio', 0) * 0.20,
            'technical_competency': predictions.get('technical_competency_score', 0) * 0.25,
            'growth_potential': predictions.get('growth_potential_score', 0) * 0.15,
            'project_experience': features.get('project_complexity_score', 0) * 0.15,
            'education_quality': features.get('overall_qualification_score', 0) * 0.15,
            'resume_authenticity': predictions.get('resume_authenticity_score', 0) * 0.10,
        }
        
        return importance
    
    # =========================================================================
    # BATCH ANALYSIS
    # =========================================================================
    
    def analyze_all_interns(self, job_role: Optional[str] = None) -> List[Dict[str, Any]]:
        """Analyze resumes for all interns with resume data."""
        interns = User.objects.filter(
            role=User.Role.INTERN,
            resume_data__isnull=False
        ).select_related('resume_data')
        
        results = []
        
        for intern in interns:
            try:
                result = self.analyze_resume(intern, job_role)
                results.append(result)
            except Exception as e:
                logger.error(f"Error analyzing intern {intern.email}: {str(e)}")
                results.append({
                    'candidate_id': str(intern.id),
                    'candidate_email': intern.email,
                    'error': str(e)
                })
        
        return results


# Singleton instance
talent_intelligence_service = TalentIntelligenceService()
