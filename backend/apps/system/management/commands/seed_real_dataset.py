import os
import pandas as pd
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from apps.accounts.models import User, InternProfile
import random
import string

class Command(BaseCommand):
    help = 'Seeds the database with real intern and manager data from Excel'

    def handle(self, *args, **options):
        file_path = r"e:\CSU Internship\AI-Talent-Intelligence-Platform\work\CSU Interns & Employee List.xlsx"
        
        if not os.path.exists(file_path):
            self.stdout.write(self.style.ERROR(f"File not found: {file_path}"))
            return

        df = pd.read_excel(file_path)
        
        # Track data for credentials file
        created_users = []
        
        current_department = "General"
        department_managers = {} # {dept_name: [manager_objects]}

        with transaction.atomic():
            for index, row in df.iterrows():
                name = str(row['Name']).strip()
                if pd.isna(row['Name']) or name == "nan":
                    continue
                
                # Check if it's a department header
                # Department header usually has NaN for Joining Date and Ending Date
                if pd.isna(row['Joining Date']) and pd.isna(row['Ending Date']) and pd.isna(row['Department']):
                    current_department = name
                    if current_department not in department_managers:
                        department_managers[current_department] = []
                    self.stdout.write(self.style.SUCCESS(f"Processing Department: {current_department}"))
                    continue

                # Identify if Manager or Intern
                joining_date_val = str(row['Joining Date']).strip()
                
                if joining_date_val == "EMPLOYEE":
                    # Create Manager
                    email = self.generate_email(name)
                    password = "CSU@Staff2026"
                    
                    user, created = User.objects.get_or_create(
                        email=email,
                        defaults={
                            'full_name': name,
                            'role': User.Role.MANAGER,
                            'department': current_department,
                        }
                    )
                    user.set_password(password)
                    user.save()
                    
                    department_managers[current_department].append(user)
                    created_users.append({
                        'name': name,
                        'email': email,
                        'password': password,
                        'role': 'MANAGER',
                        'department': current_department
                    })
                    self.stdout.write(f"  Created Manager: {name}")
                
                elif not pd.isna(row['Joining Date']):
                    # Create Intern
                    email = self.generate_email(name)
                    password = "CSU@Intern2026"
                    
                    user, created = User.objects.get_or_create(
                        email=email,
                        defaults={
                            'full_name': name,
                            'role': User.Role.INTERN,
                            'department': current_department,
                        }
                    )
                    user.set_password(password)
                    user.save()

                    # Create or update profile
                    join_date = pd.to_datetime(row['Joining Date']).date() if not pd.isna(row['Joining Date']) else None
                    end_date = pd.to_datetime(row['Ending Date']).date() if not pd.isna(row['Ending Date']) else None
                    
                    # Assign a manager from the department
                    manager = None
                    if current_department in department_managers and department_managers[current_department]:
                        # Cycle through managers if there are multiple
                        manager = department_managers[current_department][index % len(department_managers[current_department])]
                    
                    profile, _ = InternProfile.objects.get_or_create(user=user)
                    profile.join_date = join_date
                    profile.expected_end_date = end_date
                    profile.assigned_manager = manager
                    profile.status = 'ACTIVE_INTERN'
                    profile.save()

                    created_users.append({
                        'name': name,
                        'email': email,
                        'password': password,
                        'role': 'INTERN',
                        'department': current_department
                    })
                    self.stdout.write(f"  Created Intern: {name}")

        # Generate credentials file
        self.generate_credentials_file(created_users)
        self.stdout.write(self.style.SUCCESS("Seeding completed successfully!"))

    def generate_email(self, name):
        # Clean name and generate email
        clean_name = "".join(c for c in name if c.isalnum() or c.isspace()).lower()
        parts = clean_name.split()
        if len(parts) >= 2:
            email_prefix = f"{parts[0]}.{parts[-1]}"
        else:
            email_prefix = parts[0] if parts else "user"
        
        email = f"{email_prefix}@csu.aims.tech"
        
        # Ensure uniqueness if multiple people have same name
        base_email = email
        counter = 1
        while User.objects.filter(email=email).exists():
            email = f"{email_prefix}{counter}@csu.aims.tech"
            counter += 1
        return email

    def generate_credentials_file(self, users):
        output_path = r"e:\CSU Internship\AI-Talent-Intelligence-Platform\work\real_dataset_credentials.md"
        with open(output_path, "w") as f:
            f.write("# CSU Real Dataset Credentials\n\n")
            f.write("| Name | Role | Department | Email | Password |\n")
            f.write("| --- | --- | --- | --- | --- |\n")
            for u in users:
                f.write(f"| {u['name']} | {u['role']} | {u['department']} | {u['email']} | {u['password']} |\n")
        self.stdout.write(self.style.SUCCESS(f"Credentials file generated at: {output_path}"))
