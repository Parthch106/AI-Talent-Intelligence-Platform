#!/usr/bin/env python
import os
import sys
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

import django
django.setup()

from django.db import connection
cursor = connection.cursor()

# Check MonthlyEvaluationReport table
cursor.execute("""
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'analytics_monthlyevaluationreport'
    )
""")
exists = cursor.fetchone()[0]
sys.stdout.write(f'analytics_monthlyevaluationreport exists: {exists}\n')
sys.stdout.flush()
