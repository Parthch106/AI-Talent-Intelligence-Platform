# Phase 2 - Part 2: During Internship Monitoring System

## Overview

Phase 2 - Part 2 implements a comprehensive monitoring system for tracking intern performance, attendance, task completion, and generating predictive analytics for dropout risk and PPO (Pre-Placement Offer) eligibility.

## Models

### 1. TaskTracking Model
Tracks individual tasks assigned to interns during their internship.

**Fields:**
- `task_id` (CharField): Unique task identifier
- `title` (CharField): Task title
- `description` (TextField): Task description
- `status` (CharField): ASSIGNED, IN_PROGRESS, UNDER_REVIEW, COMPLETED, BLOCKED
- `priority` (CharField): LOW, MEDIUM, HIGH, CRITICAL
- `complexity` (CharField): SIMPLE, MODERATE, COMPLEX, VERY_COMPLEX
- `assigned_at` (DateTimeField): When task was assigned
- `due_date` (DateField): Task deadline
- `completed_at` (DateTimeField): When task was completed
- `estimated_hours` (FloatField): Estimated hours to complete
- `actual_hours` (FloatField): Actual hours spent
- `quality_rating` (FloatField): Quality score (0-100)
- `code_review_score` (FloatField): Code review score (0-100)

### 2. AttendanceRecord Model
Tracks daily attendance for interns.

**Fields:**
- `date` (DateField): Date of attendance
- `status` (CharField): PRESENT, ABSENT, LATE, HALF_DAY, WORK_FROM_HOME, HOLIDAY, LEAVE
- `check_in_time` (TimeField): Time when intern checked in
- `check_out_time` (TimeField): Time when intern checked out
- `working_hours` (FloatField): Total working hours
- `notes` (TextField): Additional notes

### 3. WeeklyReport Model
Weekly progress reports submitted by interns.

**Fields:**
- `week_start_date` (DateField): Start date of the week
- `week_end_date` (DateField): End date of the week
- `tasks_completed` (IntegerField): Number of tasks completed
- `tasks_in_progress` (IntegerField): Number of tasks in progress
- `tasks_blocked` (IntegerField): Number of blocked tasks
- `accomplishments` (TextField): Key accomplishments
- `challenges` (TextField): Challenges faced
- `learnings` (TextField): Key learnings
- `next_week_goals` (TextField): Goals for next week
- `self_rating` (FloatField): Self-assigned rating (0-10)
- `is_submitted` (BooleanField): Whether report is submitted
- `submitted_at` (DateTimeField): Submission timestamp

### 4. PerformanceMetrics Model
Aggregated performance metrics for interns.

**Fields:**
- `period_start` (DateField): Start of evaluation period
- `period_end` (DateField): End of evaluation period
- `period_type` (CharField): WEEKLY, BIWEEKLY, MONTHLY

**Score Fields:**
- `overall_performance_score` (FloatField): Overall score (0-100)
- `productivity_score` (FloatField): Productivity score (0-100)
- `quality_score` (FloatField): Quality score (0-100)
- `engagement_score` (FloatField): Engagement score (0-100)
- `growth_score` (FloatField): Growth score (0-100)
- `task_completion_rate` (FloatField): Percentage of tasks completed
- `avg_task_completion_time` (FloatField): Average time to complete tasks
- `attendance_rate` (FloatField): Attendance percentage
- `code_quality_score` (FloatField): Code quality metrics
- `peer_collaboration_score` (FloatField): Collaboration rating
- `communication_score` (FloatField): Communication skills
- `initiative_score` (FloatField): Initiative displayed
- `learning_agility_score` (FloatField): Learning speed
- `adaptability_score` (FloatField): Adaptability rating

**Risk Assessment Fields:**
- `dropout_risk` (CharField): HIGH, MEDIUM, LOW, NONE
- `dropout_risk_score` (FloatField): Numerical risk score (0-100)
- `dropout_risk_factors` (JSONField): List of contributing factors

**Readiness Fields:**
- `full_time_readiness_score` (FloatField): PPO eligibility score (0-100)
- `promotion_probability` (FloatField): Probability of conversion (0-100)
- `recommended_actions` (JSONField): Suggested actions
- `strengths` (JSONField): Identified strengths
- `improvement_areas` (JSONField): Areas needing improvement

### 5. MonthlyEvaluationReport Model
Monthly comprehensive evaluation reports.

**Fields:**
- `evaluation_month` (DateField): Month of evaluation
- `overall_performance_score` (FloatField): Overall monthly score
- `performance_grade` (CharField): EXCEPTIONAL, EXCEEDS_EXPECTATIONS, MEETS_EXPECTATIONS, NEEDS_IMPROVEMENT, UNSATISFACTORY
- `risk_status` (CharField): HIGH_RISK, MEDIUM_RISK, LOW_RISK, NO_RISK
- `recommendation` (CharField): EXTEND_INTERNSHIP, OFFER_PPO, CONCLUDE_INTERNSHIP, PROBATION, TERMINATE, CONTINUE
- `attendance_summary` (JSONField): Attendance breakdown
- `performance_trend` (CharField): IMPROVING, STABLE, DECLINING
- `key_accomplishments` (TextField): Major accomplishments
- `areas_for_development` (TextField): Development areas
- `manager_comments` (TextField): Manager feedback
- `hr_comments` (TextField): HR observations

## API Endpoints

### Task Tracking
- `GET /analytics/tasks/` - Get tasks for current intern or specified intern
- `POST /analytics/tasks/create/` - Create a new task (Admin/Manager only)

### Attendance
- `GET /analytics/attendance/` - Get attendance records
- `POST /analytics/attendance/mark/` - Mark attendance

### Weekly Reports
- `GET /analytics/weekly-reports/` - Get weekly reports
- `POST /analytics/weekly-reports/submit/` - Submit weekly report

### Performance Metrics
- `GET /analytics/performance/` - Get performance metrics
- `POST /analytics/performance/compute/` - Compute performance metrics

### Monthly Evaluations
- `GET /analytics/monthly-evaluations/` - Get monthly evaluations

### Dashboards
- `GET /analytics/dropout-risk/` - Dropout risk dashboard (Admin/Manager only)
- `GET /analytics/ppo-eligibility/` - PPO eligibility dashboard (Admin/Manager only)

## Performance Scoring Algorithm

### Productivity Score (25%)
- Task completion rate: 40%
- On-time delivery: 30%
- Task throughput: 30%

### Quality Score (25%)
- Code review scores: 50%
- Bug rate: 25%
- Code complexity handling: 25%

### Engagement Score (20%)
- Attendance rate: 40%
- Weekly report submission: 30%
- Communication responsiveness: 30%

### Growth Score (15%)
- Learning agility: 40%
- Skill acquisition rate: 30%
- Initiative displayed: 30%

### Dropout Risk Factors
1. **Attendance Issues**
   - Consecutive absences
   - Pattern of late arrivals
   - Extended unapproved leaves

2. **Performance Decline**
   - Decreasing task completion
   - Quality score drop
   - Missed deadlines

3. **Engagement Indicators**
   - Delayed weekly reports
   - Low self-ratings
   - Lack of participation

4. **Behavioral Signals**
   - Reduced communication
   - Missed meetings
   - Declining responsiveness

### PPO Eligibility Criteria

**Eligible (80%+):**
- Overall score > 80
- No critical risk factors
- Consistent performance
- Positive growth trajectory

**Potential (70-79%):**
- Overall score 70-79
- Minor improvement areas
- Good engagement

**Not Ready (<70%):**
- Overall score < 70
- Multiple risk factors
- Declining trend

## Frontend Dashboard

The MonitoringDashboard component provides:
- **Overview Tab**: Summary cards for tasks, attendance, performance, and risk
- **Tasks Tab**: Task tracking with status and priority filters
- **Attendance Tab**: Attendance records with status breakdown
- **Performance Tab**: Detailed performance metrics and risk assessment
- **Weekly Reports Tab**: Weekly report submission and history

## Usage

### For Interns
1. Mark daily attendance
2. View assigned tasks
3. Submit weekly reports
4. Monitor personal performance

### For Managers/Admins
1. Assign and track tasks
2. Review weekly reports
3. Monitor team performance
4. Identify at-risk interns
5. Generate monthly evaluations
6. Make PPO recommendations

## Database Migration

Run the migration to create the new tables:
```bash
cd django_pg_backend/core
python manage.py migrate analytics
```
