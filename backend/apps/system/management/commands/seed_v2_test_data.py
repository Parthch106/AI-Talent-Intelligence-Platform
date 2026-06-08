import random
from datetime import date, timedelta, datetime
from unittest.mock import patch
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from django.db.models.signals import post_save
from apps.accounts.models import User, InternProfile, FullTimeOffer, StipendRecord
from apps.analytics.models import (
    TaskTracking, AttendanceRecord, WeeklyReportV2, PerformanceMetrics, 
    MonthlyEvaluationReport, EmploymentStage, CertificationCriteria, 
    CertificationRecord, PhaseEvaluation, ConversionScore, JobRole, Application
)
from apps.accounts.signals import create_intern_profile, save_intern_profile

class Command(BaseCommand):
    help = 'Seeds the V2 test database with 12 months of daily intern data'

    def handle(self, *args, **options):
        self.stdout.write("Starting V2 daily seeding simulation (Celery mocked)...")
        
        with patch('celery.app.task.Task.delay'):
            with transaction.atomic():
                # 1. Initial Setup
                self.setup_base_data()
                
                # 2. Simulation Loop
                self.run_simulation()
            
        self.stdout.write(self.style.SUCCESS("Successfully seeded 12 months of data!"))

    def setup_base_data(self):
        self.stdout.write("Setting up base entities (Admin, Manager, Roles, Criteria)...")
        
        # Admin
        self.admin = User.objects.create_superuser(
            email="admin@example.com",
            password="password123",
            full_name="Admin User"
        )
        
        # Manager
        self.manager = User.objects.create_user(
            email="manager@example.com",
            password="password123",
            full_name="Technical Manager",
            role="MANAGER",
            department="Engineering"
        )
        
        # Job Role
        self.role = JobRole.objects.create(
            role_title="FULL_STACK_DEVELOPER",
            role_description="Building modern web applications with React and Django",
            mandatory_skills=["Python", "React", "PostgreSQL"],
            preferred_skills=["Docker", "AWS", "TypeScript"]
        )
        
        # Intern
        self.intern_user = User.objects.create_user(
            email="intern@example.com",
            password="password123",
            full_name="John Doe",
            role="INTERN",
            department="Engineering"
        )
        
        # join_date is 365 days ago
        self.today = date.today()
        self.join_date = self.today - timedelta(days=366)
        
        # Intern Profile (Automatically created by signal, so we update it)
        self.profile, created = InternProfile.objects.get_or_create(user=self.intern_user)
        self.profile.status = 'ACTIVE_INTERN'
        self.profile.join_date = self.join_date
        self.profile.expected_end_date = self.join_date + timedelta(days=365)
        self.profile.assigned_manager = self.manager
        self.profile.save()
        
        # Application
        self.app = Application.objects.create(
            intern=self.intern_user,
            job_role=self.role,
            application_status='OFFERED'
        )
        
        # Employment Stage - Phase 1
        self.current_stage = EmploymentStage.objects.create(
            intern=self.intern_user,
            phase='PHASE_1',
            phase_start_date=self.join_date,
            promoted_by=self.admin
        )
        
        # Certification Criteria
        self.criteria_p1 = CertificationCriteria.objects.create(
            phase='PHASE_1',
            min_overall_score=70.0,
            min_productivity_score=60.0,
            min_quality_score=60.0,
            min_attendance_pct=80.0,
            description="Phase 1 Standard Internship Gate"
        )
        
        self.criteria_p2 = CertificationCriteria.objects.create(
            phase='PHASE_2',
            min_overall_score=75.0,
            min_productivity_score=70.0,
            min_quality_score=70.0,
            min_attendance_pct=85.0,
            description="Phase 2 Stipend Internship Gate"
        )
        
        self.criteria_ppo = CertificationCriteria.objects.create(
            phase='PPO',
            min_overall_score=80.0,
            description="PPO Offer Threshold"
        )

    def run_simulation(self):
        current_date = self.join_date
        week_count = 1
        month_count = 1
        
        # Metrics trackers for aggregates
        phase_tasks = []
        phase_attendance = []
        
        while current_date <= self.today:
            # 1. DAILY: Attendance
            is_weekend = current_date.weekday() >= 5
            if not is_weekend:
                # 90% chance of being present
                status = 'PRESENT' if random.random() < 0.95 else 'ABSENT'
                check_in = None
                if status == 'PRESENT':
                    is_late = random.random() < 0.1
                    status = 'LATE' if is_late else 'PRESENT'
                    check_in = datetime.combine(current_date, datetime.strptime("09:00", "%H:%M").time())
                    if is_late:
                        check_in += timedelta(minutes=random.randint(5, 45))
                    
                    AttendanceRecord.objects.create(
                        intern=self.intern_user,
                        date=current_date,
                        status=status,
                        check_in_time=check_in.time() if check_in else None,
                        working_hours=8.0 if status == 'PRESENT' else 7.0,
                        is_late=is_late
                    )
                    phase_attendance.append(1 if status in ['PRESENT', 'LATE'] else 0)
            
            # 2. DAILY: Tasks (Assign a task every 3 days if none in progress)
            if not is_weekend and random.random() < 0.3:
                task_id = f"TASK-{current_date.strftime('%Y%m%d')}-{random.randint(100, 999)}"
                TaskTracking.objects.create(
                    intern=self.intern_user,
                    task_id=task_id,
                    title=f"Development Task {task_id}",
                    description="Simulated task for V2 testing",
                    status='COMPLETED',
                    priority=random.choice(['LOW', 'MEDIUM', 'HIGH']),
                    due_date=current_date + timedelta(days=3),
                    completed_at=timezone.make_aware(datetime.combine(current_date, datetime.min.time())),
                    estimated_hours=8.0,
                    actual_hours=random.uniform(6.0, 10.0),
                    quality_rating=random.uniform(3.5, 5.0)
                )
            
            # 3. WEEKLY: Monday Reports
            if current_date.weekday() == 0: # Monday
                self.simulate_weekly_report(current_date, week_count)
                week_count += 1
            
            # 4. MONTHLY: Evaluation
            if current_date.day == 28: # Roughly monthly
                self.simulate_monthly_eval(current_date, month_count)
                
                # If in Phase 2, handle Stipend
                if self.profile.status == 'STIPEND_INTERN':
                    StipendRecord.objects.create(
                        intern=self.intern_user,
                        month=current_date.replace(day=1),
                        amount=15000.00,
                        status='DISBURSED',
                        performance_score_at_disbursement=random.uniform(75, 95)
                    )
                month_count += 1

            # 5. PHASE TRANSITIONS
            days_elapsed = (current_date - self.join_date).days
            
            # Phase 1 -> Phase 2 Transition (at 6 months / 180 days)
            if days_elapsed == 180 and self.profile.status == 'ACTIVE_INTERN':
                self.handle_phase_transition(current_date, 'PHASE_1')
                week_count = 1 # Reset week count for new phase
                
            # Phase 2 -> PPO Transition (at 12 months / 360 days)
            if days_elapsed == 360 and self.profile.status == 'STIPEND_INTERN':
                self.handle_phase_transition(current_date, 'PHASE_2')
                self.handle_ppo_offer(current_date)

            current_date += timedelta(days=1)

    def simulate_weekly_report(self, date, week_num):
        # Auto-generated report
        WeeklyReportV2.objects.create(
            intern=self.intern_user,
            week_start=date - timedelta(days=7),
            week_end=date - timedelta(days=1),
            week_number=week_num,
            is_auto_generated=True,
            tasks_assigned=random.randint(2, 5),
            tasks_completed=random.randint(2, 5),
            avg_task_quality_rating=random.uniform(3.8, 4.8),
            attendance_pct=random.uniform(85, 100),
            productivity_score=random.uniform(70, 95),
            quality_score=random.uniform(75, 98),
            overall_weekly_score=random.uniform(75, 95),
            cumulative_overall_score=random.uniform(70, 90),
            ai_narrative="Consistently meeting deadlines with high-quality code. Strong engagement in technical discussions."
        )
        
        # Intern self-report
        WeeklyReportV2.objects.create(
            intern=self.intern_user,
            week_start=date - timedelta(days=7),
            week_end=date - timedelta(days=1),
            week_number=week_num,
            is_auto_generated=False,
            tasks_completed=random.randint(2, 5),
            ai_narrative="I worked on the core features and fixed several bugs. Feeling productive."
        )

    def simulate_monthly_eval(self, date, month_num):
        MonthlyEvaluationReport.objects.create(
            intern=self.intern_user,
            evaluation_month=date.replace(day=1),
            period_start=date - timedelta(days=30),
            period_end=date,
            overall_performance_score=random.uniform(75, 95),
            performance_grade=random.choice(['A', 'B+']),
            risk_status='ON_TRACK',
            is_draft=False,
            is_submitted=True,
            is_reviewed=True,
            reviewed_by=self.manager
        )

    def handle_phase_transition(self, date, phase):
        self.stdout.write(f"Handling gate evaluation for {phase} at {date}...")
        
        # 1. Create Phase Evaluation
        eval_record = PhaseEvaluation.objects.create(
            intern=self.intern_user,
            employment_stage=self.current_stage,
            evaluated_by=self.manager,
            overall_score=85.0,
            productivity_score=82.0,
            quality_score=88.0,
            engagement_score=84.0,
            attendance_pct=95.0,
            weekly_reports_submitted=24,
            decision='PROMOTE',
            manager_notes="Excellent performance during this phase. Ready for the next stage.",
            criteria_snapshot={
                "min_overall": 70.0,
                "min_attendance": 80.0
            },
            criteria_met=True
        )
        
        # 2. Issue Certificate
        CertificationRecord.objects.create(
            intern=self.intern_user,
            phase_evaluation=eval_record,
            cert_type=phase,
            overall_score_at_issue=85.0,
            scores_snapshot={"productivity": 82, "quality": 88},
            criteria_snapshot={"min_overall": 70}
        )
        
        # 3. Close current stage
        self.current_stage.phase_end_date = date
        self.current_stage.save()
        
        # 4. Update Profile & New Stage
        if phase == 'PHASE_1':
            self.profile.status = 'STIPEND_INTERN'
            self.profile.save()
            self.current_stage = EmploymentStage.objects.create(
                intern=self.intern_user,
                phase='PHASE_2',
                phase_start_date=date + timedelta(days=1),
                stipend_amount=15000.00,
                promoted_by=self.admin
            )
        else: # PHASE_2
            self.profile.status = 'PHASE_2_COMPLETE'
            self.profile.save()

    def handle_ppo_offer(self, date):
        self.stdout.write(f"Generating PPO Offer for intern at {date}...")
        
        # 1. Conversion Score
        score = ConversionScore.objects.create(
            intern=self.intern_user,
            performance_trend_score=88.0,
            absolute_performance_score=86.5,
            skill_growth_delta=15.0,
            manager_sentiment_trend=90.0,
            peer_comparison_percentile=92.0,
            composite_score=87.5
        )
        
        # 2. Full Time Offer
        offer = FullTimeOffer.objects.create(
            intern=self.intern_user,
            conversion_score=score,
            issued_by=self.admin,
            issued_at=timezone.make_aware(datetime.combine(date, datetime.min.time())),
            status='ISSUED',
            recommended_role_title="Software Engineer I",
            recommended_department="Product Engineering",
            salary_band_min=600000,
            salary_band_max=800000,
            response_deadline=date + timedelta(days=14)
        )
        
        # 3. Simulate Acceptance
        offer.status = 'ACCEPTED'
        offer.intern_response_at = timezone.now()
        offer.save()
        
        self.profile.status = 'FULL_TIME'
        self.profile.save()
        
        # 4. Final PPO Certificate
        eval_ppo = PhaseEvaluation.objects.create(
            intern=self.intern_user,
            employment_stage=self.current_stage,
            evaluated_by=self.manager,
            overall_score=87.5,
            productivity_score=85.0,
            quality_score=90.0,
            engagement_score=88.0,
            attendance_pct=96.0,
            weekly_reports_submitted=48,
            decision='PROMOTE',
            criteria_met=True
        )
        
        CertificationRecord.objects.create(
            intern=self.intern_user,
            phase_evaluation=eval_ppo,
            cert_type='PPO',
            overall_score_at_issue=87.5,
            scores_snapshot={"composite": 87.5},
            criteria_snapshot={"min_overall": 80.0}
        )
