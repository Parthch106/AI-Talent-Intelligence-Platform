#!/usr/bin/env python
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.analytics.models import AttendanceRecord
from django.db.models import Count

print('=== ATTENDANCE RECORD DATES ===')
records = AttendanceRecord.objects.all()
print(f'Total records: {records.count()}')

# Get date range
if records.exists():
    min_date = records.order_by('date').first().date
    max_date = records.order_by('-date').first().date
    print(f'Date range: {min_date} to {max_date}')

# Check records by month
monthly = AttendanceRecord.objects.extra(
    select={'month': "strftime('%%Y-%%m', date)"}
).values('month').annotate(count=Count('id')).order_by('month')

print('\n=== RECORDS BY MONTH ===')
for m in monthly:
    print(f"  {m['month']}: {m['count']} records")

# Also check specific for 2025
print('\n=== 2025 MONTHLY BREAKDOWN ===')
for month in range(1, 13):
    count = AttendanceRecord.objects.filter(date__year=2025, date__month=month).count()
    print(f"  2025-{month:02d}: {count} records")
