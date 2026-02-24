"""
Talent Intelligence API Views
=============================

REST API endpoints for the Talent Intelligence System.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework import status
from django.db.models import Q

from apps.accounts.models import User
from apps.documents.models import ResumeData, Document
from apps.analytics.models import (
    JobRole,
    Application,
    StructuredFeature,
    ModelPrediction,
    ResumeSkill,
    ResumeExperience,
    ResumeProject,
    ResumeEducation,
    ResumeCertification,
)
from apps.analytics.services.talent_intelligence_service import talent_intelligence_service


class AnalyzeInternView(APIView):
    """
    POST /api/analytics/analyze/
    
    Analyze a single intern's resume.
    
    Request Body:
    {
        "intern_id": 123,          # Required
        "job_role": "FRONTEND_DEVELOPER"  # Optional
    }
    
    Response:
    {
        "candidate_id": "123",
        "suitability_score": 0.82,
        "decision": "INTERVIEW_SHORTLIST",
        "technical_competency": 0.76,
        "growth_potential": 0.81,
        "resume_authenticity": 0.92,
        "communication_score": 0.68,
        "leadership_score": 0.55,
        "top_strengths": [...],
        "skill_gaps": [...],
        "feature_importance": {...}
    }
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        user = request.user
        
        # Only admins and managers can analyze interns
        if user.role not in [User.Role.ADMIN, User.Role.MANAGER]:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get intern_id from request
        intern_id = request.data.get('intern_id')
        if not intern_id:
            return Response(
                {'error': 'intern_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get intern
        try:
            intern = User.objects.get(id=intern_id, role=User.Role.INTERN)
        except User.DoesNotExist:
            return Response(
                {'error': 'Intern not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check manager access
        if user.role == User.Role.MANAGER and intern.department != user.department:
            return Response(
                {'error': 'You can only analyze interns in your department'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get job role (optional)
        job_role = request.data.get('job_role')
        
        # Run analysis
        try:
            result = talent_intelligence_service.analyze_resume(
                user=intern,
                job_role=job_role,
                create_application=True
            )
            return Response(result, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'Analysis failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AnalyzeAllInternsView(APIView):
    """
    POST /api/analytics/analyze-all/
    
    Analyze all interns' resumes.
    
    Request Body:
    {
        "job_role": "FRONTEND_DEVELOPER"  # Optional
    }
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        user = request.user
        
        # Only admins can analyze all interns
        if user.role != User.Role.ADMIN:
            return Response(
                {'error': 'Only admins can analyze all interns'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        job_role = request.data.get('job_role')
        
        try:
            results = talent_intelligence_service.analyze_all_interns(job_role)
            return Response({
                'total': len(results),
                'results': results
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': f'Analysis failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class GetInternAnalysisView(APIView):
    """
    GET /api/analytics/intern/{intern_id}/
    
    Get existing analysis for an intern.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, intern_id):
        user = request.user
        
        # Only admins and managers can view analysis
        if user.role not in [User.Role.ADMIN, User.Role.MANAGER]:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get intern
        try:
            intern = User.objects.get(id=intern_id, role=User.Role.INTERN)
        except User.DoesNotExist:
            return Response(
                {'error': 'Intern not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check manager access
        if user.role == User.Role.MANAGER and intern.department != user.department:
            return Response(
                {'error': 'You can only view interns in your department'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get application - filter by job_role if provided
        job_role_filter = request.query_params.get('job_role')
        
        application_filter = Application.objects.filter(intern=intern)
        
        if job_role_filter:
            application_filter = application_filter.filter(
                job_role__role_title=job_role_filter.upper()
            )
        
        application = application_filter.select_related('job_role').first()
        
        if not application:
            return Response(
                {'error': 'No analysis found for this intern'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get predictions
        prediction = ModelPrediction.objects.filter(
            application=application
        ).first()
        
        if not prediction:
            return Response(
                {'error': 'Analysis in progress or not available'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Build response
        result = {
            'candidate_id': str(intern.id),
            'candidate_email': intern.email,
            'candidate_name': intern.full_name,
            'job_role': application.job_role.role_title if application.job_role else None,
            'suitability_score': prediction.suitability_score,
            'decision': prediction.decision,
            'technical_competency': prediction.technical_competency_score,
            'growth_potential': prediction.growth_potential_score,
            'resume_authenticity': prediction.resume_authenticity_score,
            'communication_score': prediction.communication_score,
            'leadership_score': prediction.leadership_score,
            'confidence_score': prediction.confidence_score,
            'model_version': prediction.model_version,
            'analyzed_at': prediction.created_at.isoformat() if prediction.created_at else None,
        }
        
        return Response(result, status=status.HTTP_200_OK)


class JobRoleListView(APIView):
    """
    GET /api/analytics/job-roles/
    
    List all available job roles.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        job_roles = JobRole.objects.all().values(
            'id', 'role_title', 'role_description', 
            'mandatory_skills', 'preferred_skills'
        )
        return Response({'job_roles': list(job_roles)})


class ApplicationListView(APIView):
    """
    GET /api/analytics/applications/
    
    List all applications with optional filters.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        
        if user.role == User.Role.MANAGER:
            applications = applications.filter(intern__department=user.department)
        
        if status_filter:
            applications = applications.filter(status=status_filter)
        
        # Build response
        results = []
        for app in applications:
            prediction = ModelPrediction.objects.filter(application=app).first()
            
            results.append({
                'application_id': str(app.id),
                'intern_id': str(app.intern.id),
                'intern_name': app.intern.full_name,
                'intern_email': app.intern.email,
                'job_role': app.job_role.role_title if app.job_role else None,
                'status': app.application_status,
                'application_date': app.created_at.isoformat() if app.created_at else None,
                'suitability_score': prediction.suitability_score if prediction else None,
                'decision': prediction.decision if prediction else None,
            })
        
        return Response({
            'total': len(results),
            'applications': results
        }, status=status.HTTP_200_OK)


# ==============================================================================
# BACKWARD COMPATIBLE VIEWS FOR FRONTEND INTEGRATION
# ==============================================================================

class LegacyIntelligenceView(APIView):
    """
    GET /api/analytics/intelligence/?intern_id=...
    
    Backward compatible endpoint for frontend AnalysisPage.
    Returns intelligence data in the format expected by the frontend.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        intern_id = request.query_params.get('intern_id')
        
        if not intern_id:
            return Response(
                {'detail': 'intern_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Only admins and managers can view intelligence
        if user.role not in [User.Role.ADMIN, User.Role.MANAGER]:
            return Response(
                {'detail': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get intern
        try:
            intern = User.objects.get(id=intern_id, role=User.Role.INTERN)
        except User.DoesNotExist:
            return Response(
                {'detail': 'Intern not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check manager access
        if user.role == User.Role.MANAGER and intern.department != user.department:
            return Response(
                {'detail': 'You can only view interns in your department'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get application - filter by job_role if provided
        job_role_filter = request.query_params.get('job_role')
        
        application_filter = Application.objects.filter(intern=intern)
        
        if job_role_filter:
            application_filter = application_filter.filter(
                job_role__role_title=job_role_filter.upper()
            )
        
        application = application_filter.select_related('job_role').first()
        
        if not application:
            return Response(
                {'detail': 'No analysis found for this intern. Please run analysis first.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get predictions
        prediction = ModelPrediction.objects.filter(
            application=application
        ).first()
        
        if not prediction:
            return Response(
                {'detail': 'Analysis not completed. Please run analysis first.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get structured features (V2)
        structured_feature = StructuredFeature.objects.filter(
            application=application
        ).first()
        
        # Build response matching frontend interface
        response_data = self._build_intelligence_response(
            intern=intern,
            application=application,
            prediction=prediction,
            structured_feature=structured_feature
        )
        
        return Response(response_data, status=status.HTTP_200_OK)
    
    def _build_intelligence_response(self, intern, application, prediction, structured_feature):
        """Build intelligence response in format expected by frontend (V2)."""
        
        # Get job role
        job_role = application.job_role
        
        # Get resume document URL
        resume_document = None
        try:
            resume_doc = Document.objects.filter(
                owner=intern,
                document_type='RESUME'
            ).first()
            if resume_doc and resume_doc.file:
                resume_document = {
                    'id': resume_doc.id,
                    'url': resume_doc.file.url,
                    'filename': resume_doc.title,
                    'uploaded_at': resume_doc.created_at.isoformat() if resume_doc.created_at else None,
                }
        except Exception as e:
            pass  # If document lookup fails, continue without it
        
        # Build scores (V2 field names)
        scores = {
            'technical': prediction.technical_score or 0,
            'suitability': prediction.suitability_score or 0,
            'growth': prediction.growth_score or 0,
            'authenticity': prediction.authenticity_score or 0,
            'semantic_match': prediction.semantic_match_score or 0,
        }
        
        # Build skill profile from structured features
        skill_profile = {}
        if structured_feature:
            if structured_feature.skill_match_ratio:
                skill_profile['Skill Match'] = structured_feature.skill_match_ratio
            if structured_feature.domain_similarity_score:
                skill_profile['Domain Similarity'] = structured_feature.domain_similarity_score
            if structured_feature.project_complexity_score:
                skill_profile['Project Complexity'] = structured_feature.project_complexity_score
            if structured_feature.internship_relevance_score:
                skill_profile['Internship Relevance'] = structured_feature.internship_relevance_score
        
        # Top strengths
        domain_strengths = []
        if structured_feature:
            if structured_feature.skill_match_ratio and structured_feature.skill_match_ratio >= 0.6:
                domain_strengths.append("Strong skill alignment with role requirements")
            if structured_feature.domain_similarity_score and structured_feature.domain_similarity_score >= 0.6:
                domain_strengths.append("Domain expertise matches job requirements")
            if structured_feature.project_complexity_score and structured_feature.project_complexity_score >= 0.6:
                domain_strengths.append("Complex project experience demonstrated")
            if structured_feature.internship_relevance_score and structured_feature.internship_relevance_score >= 0.6:
                domain_strengths.append("Relevant internship experience")
            if prediction.authenticity_score and prediction.authenticity_score >= 0.7:
                domain_strengths.append("High resume authenticity score")
        
        # Skill gaps
        skill_gaps = []
        if structured_feature:
            if structured_feature.skill_match_ratio and structured_feature.skill_match_ratio < 0.5:
                skill_gaps.append("Skill match below target threshold")
            if structured_feature.critical_skill_gap_count and structured_feature.critical_skill_gap_count > 0:
                skill_gaps.append(f"{structured_feature.critical_skill_gap_count} critical skill gaps identified")
            if structured_feature.domain_similarity_score and structured_feature.domain_similarity_score < 0.5:
                skill_gaps.append("Domain alignment needs improvement")
        
        # Recommendations
        recommendations = []
        if structured_feature:
            if structured_feature.skill_match_ratio:
                if structured_feature.skill_match_ratio > 0.7:
                    recommendations.append("Strong skill match - highlight these in interviews")
                elif structured_feature.skill_match_ratio < 0.4:
                    recommendations.append("Consider developing required skills")
            
            if prediction.suitability_score:
                if prediction.suitability_score > 0.7:
                    recommendations.append("High suitability - prioritize for hiring")
                elif prediction.suitability_score < 0.4:
                    recommendations.append("Consider additional skill development before re-evaluation")
            
            if prediction.growth_score:
                if prediction.growth_score > 0.7:
                    recommendations.append("High growth potential - invest in training")
        
        # Risk flags
        risk_flags = []
        if structured_feature:
            if structured_feature.writing_clarity_score and structured_feature.writing_clarity_score < 0.3:
                risk_flags.append({'type': 'LOW_CLARITY', 'message': 'Low writing clarity - verify resume quality'})
        if prediction:
            if prediction.authenticity_score and prediction.authenticity_score < 0.5:
                risk_flags.append({'type': 'AUTHENTICITY_CONCERN', 'message': 'Low resume authenticity - verify credentials'})
        
        # Build resume analysis details
        resume_analysis = {
            'applied_role': job_role.role_title if job_role else None,
            'suitability_score': prediction.suitability_score,
            'decision': prediction.decision,
            'model_type': prediction.model_type,
            'decision_flags': [],
        }
        
        # Add structured feature details if available
        if structured_feature:
            resume_analysis.update({
                'has_internship_experience': structured_feature.internship_relevance_score > 0 if structured_feature.internship_relevance_score else False,
                'skill_match_percentage': structured_feature.skill_match_ratio * 100 if structured_feature.skill_match_ratio else 0,
                'core_skill_match_score': structured_feature.skill_match_ratio or 0,
                'critical_skill_gap_count': structured_feature.critical_skill_gap_count or 0,
                'domain_relevance_score': structured_feature.domain_similarity_score or 0,
                'internship_relevance_score': structured_feature.internship_relevance_score or 0,
                'authenticity_score': prediction.authenticity_score or 0,
                'role_alignment_score': structured_feature.skill_match_ratio or 0,
                'technical_clarity_score': structured_feature.writing_clarity_score or 0,
            })
        
        # Fetch structured data from normalized tables
        structured_resume = {
            'skills': list(ResumeSkill.objects.filter(application=application).values('name', 'category', 'is_major')),
            'experience': list(ResumeExperience.objects.filter(application=application).values(
                'title', 'company', 'location', 'start_date', 'end_date', 'is_current', 'is_internship', 'description', 'technologies'
            )),
            'projects': list(ResumeProject.objects.filter(application=application).values(
                'name', 'description', 'technologies', 'github_url', 'impact'
            )),
            'education': list(ResumeEducation.objects.filter(application=application).values(
                'degree', 'field_of_study', 'institution', 'start_year', 'end_year', 'gpa', 'honors'
            )),
            'certifications': list(ResumeCertification.objects.filter(application=application).values('name', 'issuer', 'date')),
        }
        
        return {
            'user_id': intern.id,
            'resume_document': resume_document,
            'scores': scores,
            'skill_profile': skill_profile,
            'domain_strengths': domain_strengths,
            'skill_gaps': skill_gaps,
            'recommendations': recommendations,
            'risk_flags': risk_flags,
            'resume_analysis': resume_analysis,
            'structured_resume': structured_resume,
        }


class LegacyComputeIntelligenceView(APIView):
    """
    POST /api/analytics/intelligence/compute/{intern_id}/
    
    Backward compatible endpoint for frontend AnalysisPage.
    Triggers analysis using the new ML pipeline.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, intern_id):
        user = request.user
        
        # Only admins and managers can compute intelligence
        if user.role not in [User.Role.ADMIN, User.Role.MANAGER]:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get intern
        try:
            intern = User.objects.get(id=intern_id, role=User.Role.INTERN)
        except User.DoesNotExist:
            return Response(
                {'error': 'Intern not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check manager access
        if user.role == User.Role.MANAGER and intern.department != user.department:
            return Response(
                {'error': 'You can only analyze interns in your department'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get job role from request body
        job_role = request.data.get('job_role')
        
        try:
            # Run analysis using new ML pipeline (v2.0 with embeddings)
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"Starting analysis for intern {intern.id} with job_role: {job_role}")
            
            result = talent_intelligence_service.analyze_resume(
                user=intern,
                job_role=job_role,
                create_application=True
            )
            
            logger.info(f"Analysis complete. Result: {result}")
            
            # Return full v2 response for frontend compatibility
            return Response({
                'message': 'Intelligence computed successfully!',
                'model_version': 'transformer_xgb_v2',
                # For frontend compatibility - wrap in scores object
                'scores': {
                    'suitability': result.get('suitability_score', 0),
                    'semantic_match': result.get('semantic_match_score', 0),
                    'growth': result.get('growth_score', 0),
                    'authenticity': result.get('authenticity_score', 0),
                    'technical': result.get('technical_competency_score', 0),
                },
                # Primary scores (also at top level for v2)
                'suitability_score': result.get('suitability_score'),
                'decision': result.get('decision'),
                # V2 additional scores
                'semantic_match_score': result.get('semantic_match_score'),
                'growth_score': result.get('growth_score'),
                'authenticity_score': result.get('authenticity_score'),
                'confidence_score': result.get('confidence_score'),
                # Resume analysis for frontend
                'resume_analysis': {
                    'applied_role': job_role,
                    'suitability_score': result.get('suitability_score', 0),
                    'decision': result.get('decision', 'MANUAL_REVIEW'),
                    'confidence_score': result.get('confidence_score', 0),
                },
                # Additional info
                'top_strengths': result.get('top_strengths', []),
                'risk_flags': result.get('risk_flags', []),
                # Add skill_gaps and recommendations for frontend
                'skill_gaps': result.get('skill_gaps', []),
                'recommendations': result.get('recommendations', []),
            }, status=status.HTTP_200_OK)
            
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'Analysis failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
