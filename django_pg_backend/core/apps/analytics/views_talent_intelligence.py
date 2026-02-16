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
from apps.documents.models import ResumeData
from apps.analytics.models import (
    JobRole,
    Application,
    ResumeFeature,
    ModelPrediction,
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
        
        # Get application
        application = Application.objects.filter(
            intern=intern
        ).select_related('job_role').first()
        
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
                'status': app.status,
                'application_date': app.application_date.isoformat() if app.application_date else None,
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
        
        # Get application
        application = Application.objects.filter(
            intern=intern
        ).select_related('job_role').first()
        
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
        
        # Get resume features
        resume_feature = ResumeFeature.objects.filter(
            application=application
        ).first()
        
        # Build response matching frontend interface
        response_data = self._build_intelligence_response(
            intern=intern,
            application=application,
            prediction=prediction,
            resume_feature=resume_feature
        )
        
        return Response(response_data, status=status.HTTP_200_OK)
    
    def _build_intelligence_response(self, intern, application, prediction, resume_feature):
        """Build intelligence response in format expected by frontend."""
        
        # Get job role
        job_role = application.job_role
        
        # Build scores
        scores = {
            'technical': prediction.technical_competency_score or 0,
            'leadership': prediction.leadership_score or 0,
            'communication': prediction.communication_score or 0,
            'culture_fit': prediction.growth_potential_score or 0,  # Using growth as culture fit proxy
            'ai_readiness': prediction.suitability_score or 0,
            'predicted_growth': prediction.growth_potential_score or 0,
        }
        
        # Build skill profile
        skill_profile = {}
        if resume_feature:
            if resume_feature.skill_match_ratio:
                skill_profile['Skill Match'] = resume_feature.skill_match_ratio
            if resume_feature.domain_similarity_score:
                skill_profile['Domain Similarity'] = resume_feature.domain_similarity_score
            if resume_feature.project_complexity_score:
                skill_profile['Project Complexity'] = resume_feature.project_complexity_score
            if resume_feature.internship_relevance_score:
                skill_profile['Internship Relevance'] = resume_feature.internship_relevance_score
        
        # Top strengths from prediction (derived from resume features)
        domain_strengths = []
        if resume_feature:
            if resume_feature.skill_match_ratio and resume_feature.skill_match_ratio >= 0.6:
                domain_strengths.append("Strong skill alignment with role requirements")
            if resume_feature.domain_similarity_score and resume_feature.domain_similarity_score >= 0.6:
                domain_strengths.append("Domain expertise matches job requirements")
            if resume_feature.project_complexity_score and resume_feature.project_complexity_score >= 0.6:
                domain_strengths.append("Complex project experience demonstrated")
            if resume_feature.internship_relevance_score and resume_feature.internship_relevance_score >= 0.6:
                domain_strengths.append("Relevant internship experience")
            if prediction.resume_authenticity_score and prediction.resume_authenticity_score >= 0.7:
                domain_strengths.append("High resume authenticity score")
        
        # Skill gaps (derived from resume features)
        skill_gaps = []
        if resume_feature:
            if resume_feature.skill_match_ratio and resume_feature.skill_match_ratio < 0.5:
                skill_gaps.append("Skill match below target threshold")
            if resume_feature.critical_skill_gap_count and resume_feature.critical_skill_gap_count > 0:
                skill_gaps.append(f"{resume_feature.critical_skill_gap_count} critical skill gaps identified")
            if resume_feature.domain_similarity_score and resume_feature.domain_similarity_score < 0.5:
                skill_gaps.append("Domain alignment needs improvement")
        
        # Recommendations (build from available data)
        recommendations = []
        if resume_feature:
            if resume_feature.skill_match_ratio:
                if resume_feature.skill_match_ratio > 0.7:
                    recommendations.append("Strong skill match - highlight these in interviews")
                elif resume_feature.skill_match_ratio < 0.4:
                    recommendations.append("Consider developing required skills")
            
            if prediction.suitability_score:
                if prediction.suitability_score > 0.7:
                    recommendations.append("High suitability - prioritize for hiring")
                elif prediction.suitability_score < 0.4:
                    recommendations.append("Consider additional skill development before re-evaluation")
            
            if prediction.growth_potential_score:
                if prediction.growth_potential_score > 0.7:
                    recommendations.append("High growth potential - invest in training")
        
        # Risk flags (derived from prediction and resume features)
        risk_flags = []
        if resume_feature:
            if resume_feature.inflation_score and resume_feature.inflation_score > 0.5:
                risk_flags.append("Potential resume inflation detected")
            if resume_feature.keyword_stuffing_ratio and resume_feature.keyword_stuffing_ratio > 0.3:
                risk_flags.append("Possible keyword stuffing detected")
        if prediction:
            if prediction.resume_authenticity_score and prediction.resume_authenticity_score < 0.5:
                risk_flags.append("Low resume authenticity - verify credentials")
        
        # Resume analysis details
        resume_analysis = {
            'applied_role': job_role.role_title if job_role else None,
            'suitability_score': prediction.suitability_score,
            'decision': prediction.decision,
            'decision_flags': [],
        }
        
        # Add resume feature details if available
        if resume_feature:
            resume_analysis.update({
                'has_internship_experience': resume_feature.internship_relevance_score > 0 if resume_feature.internship_relevance_score else False,
                'skill_match_percentage': resume_feature.skill_match_ratio * 100 if resume_feature.skill_match_ratio else 0,
                'core_skill_match_score': resume_feature.skill_match_ratio or 0,
                'critical_skill_gap_count': resume_feature.critical_skill_gap_count or 0,
                'domain_relevance_score': resume_feature.domain_similarity_score or 0,
                'internship_relevance_score': resume_feature.internship_relevance_score or 0,
                'resume_authenticity_score': prediction.resume_authenticity_score or 0,
                'role_alignment_score': resume_feature.skill_match_ratio or 0,
                'technical_clarity_score': resume_feature.writing_clarity_score or 0,
            })
        
        return {
            'user_id': intern.id,
            'scores': scores,
            'skill_profile': skill_profile,
            'domain_strengths': domain_strengths,
            'skill_gaps': skill_gaps,
            'recommendations': recommendations,
            'risk_flags': risk_flags,
            'resume_analysis': resume_analysis,
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
            # Run analysis using new ML pipeline
            result = talent_intelligence_service.analyze_resume(
                user=intern,
                job_role=job_role,
                create_application=True
            )
            
            return Response({
                'message': 'Intelligence computed successfully!',
                'suitability_score': result.get('suitability_score'),
                'decision': result.get('decision'),
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
