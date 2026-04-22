import os
import sys

# Add the current directory to sys.path
path = os.path.dirname(os.path.abspath(__file__))
sys.path.append(path)

# Import the WSGI application
from core.wsgi import application

# This is what Vercel will call
app = application
