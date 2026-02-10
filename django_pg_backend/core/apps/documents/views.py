from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Document
from .serializers import DocumentSerializer

class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)
    
    def get_queryset(self):
        user = self.request.user
        if user.role == "INTERN":
             return Document.objects.filter(owner=user) | Document.objects.filter(uploaded_by=user)
        elif user.role == "MANAGER":
             # Documents owned by their interns or uploaded by themselves
             # This assumes 'owner' is the intern.
             # We need to find interns assigned to manager's projects.
             return Document.objects.filter(owner__assigned_projects__project__mentor=user).distinct() | Document.objects.filter(uploaded_by=user)
        return Document.objects.all()
