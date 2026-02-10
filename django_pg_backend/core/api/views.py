from django.http import JsonResponse
from .models import User

def get_users(request):
    users = list(User.objects.values())
    return JsonResponse(users, safe=False)
