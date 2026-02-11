from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q
from .models import Document, ResumeData
from .serializers import DocumentSerializer, ResumeDataSerializer
from .services import ResumeParserService
from apps.analytics.services import AnalyticsDashboardService


class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_create(self, serializer):
        # Set owner to the current user who is uploading
        document = serializer.save(uploaded_by=self.request.user, owner=self.request.user)
        
        # Trigger resume parsing if this is a resume
        if document.document_type == 'RESUME':
            self._trigger_resume_parsing(document.id)
    
    def _trigger_resume_parsing(self, document_id: int):
        """
        Trigger resume parsing asynchronously.
        Uses the ResumeParserService to parse the resume.
        Then triggers feature engineering.
        """
        try:
            parser_service = ResumeParserService()
            # For production, use async task: parser_service.parse_resume_async(document_id)
            result = parser_service.parse_resume(document_id)
            
            # Trigger feature engineering after successful parsing
            if result:
                self._trigger_feature_engineering(document_id)
                
        except Exception as e:
            # Log error but don't fail the upload
            print(f"Error triggering resume parsing: {e}")
    
    def _trigger_feature_engineering(self, document_id: int):
        """
        Trigger feature engineering and intelligence computation.
        """
        try:
            # Get the document and resume data
            document = Document.objects.get(id=document_id)
            resume_data = ResumeData.objects.filter(document=document).first()
            
            if resume_data:
                # Compute resume features
                from .services import FeatureEngineeringEngine
                feature_engine = FeatureEngineeringEngine()
                data = {
                    'skills': resume_data.skills or [],
                    'experience': resume_data.experience or [],
                    'education': resume_data.education or [],
                    'projects': resume_data.projects or [],
                    'tools': resume_data.tools or [],
                    'total_experience_years': resume_data.total_experience_years or 0,
                }
                features = feature_engine.compute_features(data)
                
                # Store features
                from apps.analytics.models import ResumeFeature
                ResumeFeature.objects.update_or_create(
                    resume_data=resume_data,
                    defaults={
                        'skill_vector': features.get('skill_vector', {}),
                        'skill_frequency': features.get('skill_frequency', {}),
                        'tfidf_embedding': features.get('tfidf_embedding', {}),
                        'skill_categories': features.get('skill_categories', {}),
                        'skill_diversity_score': features.get('skill_diversity_score', 0.0),
                        'experience_depth_score': features.get('experience_depth_score', 0.0),
                        'technical_ratio': features.get('technical_ratio', 0.0),
                        'leadership_indicator': features.get('leadership_indicator', 0.0),
                        'domain_specialization': features.get('domain_specialization', {}),
                        'experience_score': features.get('experience_score', 0.0),
                        'education_score': features.get('education_score', 0.0),
                        'project_score': features.get('project_score', 0.0),
                        'overall_score': features.get('overall_score', 0.0),
                    }
                )
                
                # Compute intern intelligence
                analytics_service = AnalyticsDashboardService()
                analytics_service.compute_intern_intelligence(resume_data.user_id)
                
                print(f"Feature engineering completed for document {document_id}")
                
        except Exception as e:
            print(f"Error in feature engineering: {e}")
    
    @action(detail=True, methods=['post'], url_path='parse-resume')
    def parse_resume(self, request, pk=None):
        """
        API endpoint to manually trigger resume parsing for a document.
        
        POST /api/documents/<id>/parse-resume/
        """
        document = self.get_object()
        
        if document.document_type != 'RESUME':
            return Response(
                {'error': 'Only RESUME documents can be parsed'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            parser_service = ResumeParserService()
            parsed_data = parser_service.parse_resume(document.id)
            
            if parsed_data:
                return Response({
                    'message': 'Resume parsed successfully',
                    'data': parsed_data
                }, status=status.HTTP_200_OK)
            else:
                return Response(
                    {'error': 'Failed to parse resume'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'], url_path='parsed-data')
    def get_parsed_data(self, request, pk=None):
        """
        API endpoint to get parsed resume data for a document.
        
        GET /api/documents/<id>/parsed-data/
        """
        document = self.get_object()
        
        if document.document_type != 'RESUME':
            return Response(
                {'error': 'Only RESUME documents have parsed data'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            parser_service = ResumeParserService()
            parsed_data = parser_service.get_resume_data(document.id)
            
            if parsed_data:
                return Response(parsed_data, status=status.HTTP_200_OK)
            elif document.is_parsed:
                return Response(
                    {'message': 'Document is parsed but no structured data found'},
                    status=status.HTTP_200_OK
                )
            else:
                return Response(
                    {'message': 'Document has not been parsed yet'},
                    status=status.HTTP_404_NOT_FOUND
                )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def get_queryset(self):
        user = self.request.user
        
        if user.role == "INTERN":
            # Interns can only see their own documents (owner = themselves)
            return Document.objects.filter(owner=user)
        
        elif user.role == "MANAGER":
            # Managers can see:
            # 1. Their own documents (owner = themselves)
            # 2. Documents owned by interns in the same department
            return Document.objects.filter(
                Q(owner=user) | 
                Q(owner__department=user.department, owner__role='INTERN')
            ).distinct()
        
        else:
            # Admin can see all documents
            # Or documents from their department
            if user.department:
                return Document.objects.filter(
                    Q(owner__department=user.department) |
                    Q(uploaded_by__department=user.department)
                ).distinct()
            return Document.objects.all()


class ResumeDataViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing parsed resume data.
    Only read operations are allowed.
    """
    queryset = ResumeData.objects.all()
    serializer_class = ResumeDataSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        if user.role == "INTERN":
            # Interns can only see their own resume data
            return ResumeData.objects.filter(user=user)
        
        elif user.role == "MANAGER":
            # Managers can see:
            # 1. Their own resume data
            # 2. Resume data of interns in the same department
            return ResumeData.objects.filter(
                Q(user=user) |
                Q(user__department=user.department, user__role='INTERN')
            ).distinct()
        
        else:
            # Admin can see all resume data
            # Or resume data from their department
            if user.department:
                return ResumeData.objects.filter(
                    Q(user__department=user.department)
                ).distinct()
            return ResumeData.objects.all()
