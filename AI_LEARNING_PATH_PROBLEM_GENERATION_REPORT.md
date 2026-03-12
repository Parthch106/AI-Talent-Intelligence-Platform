# AI-Powered Learning Path Problem Generation System

## Implementation Report

---

## 1. Executive Summary

This report outlines the implementation strategy for an AI-powered system that generates practice problems for interns based on their learning path using LangChain LLM, assigns these problems for technical skill enhancement, and tracks learning progress.

The existing project already has:

- LangChain integration with GPT-4o-mini (via GitHub Models)
- Learning path system with milestones
- LLM task generator service
- RL-based task recommendations

We will extend these components to add problem generation functionality.

---

## 2. Current System Architecture

### 2.1 Existing Components

```
┌─────────────────────────────────────────────────────────────────┐
│                      Frontend (React)                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │
│  │ LearningPath  │ │ Performance   │ │ MonitoringDashboard   │ │
│  │    Page       │ │  Analytics   │ │                       │ │
│  └──────────────┘ └──────────────┘ └──────────────────────────┘ │
└────────────────────────────┬────────────────────────────────────┘
                             │ API
┌────────────────────────────▼────────────────────────────────────┐
│                   Django Backend                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌───────────────┐  │
│  │ LearningPath    │  │ LLMTaskGenerator│  │ RLTaskAssigner│  │
│  │ Optimizer      │  │                 │  │               │  │
│  └─────────────────┘  └─────────────────┘  └───────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              LangChain LLM (GPT-4o-mini)                   ││
│  └─────────────────────────────────────────────────────────────┘│
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                     PostgreSQL Database                         │
│  - User, LearningPath, SkillProfile, TaskTemplate, Milestones  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Proposed System Design

### 3.1 New Components

```
┌─────────────────────────────────────────────────────────────────┐
│                      NEW COMPONENTS                             │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │           ProblemGeneratorService (LangChain)              ││
│  │  - generate_practice_problems()                            ││
│  │  - generate_code_challenge()                                ││
│  │  - evaluate_solution()                                      ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │           LearningProblem Model                             ││
│  │  - problem_id, type, difficulty, skills                    ││
│  │  - problem_statement, test_cases, hints                    ││
│  │  - solution, evaluation_criteria                            ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │           ProblemAssignment Model                           ││
│  │  - intern, problem, assigned_by, due_date                 ││
│  │  - status, submitted_solution, feedback, score             ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │           LearningTracker Service                           ││
│  │  - track_progress()                                         ││
│  │  - calculate_mastery()                                      ││
│  │  - generate_insights()                                     ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Database Schema Changes

### 4.1 New Models

```python
# django_pg_backend/core/apps/analytics/models.py

class LearningProblem(models.Model):
    """
    AI-generated practice problem for skill development.
    """
    PROBLEM_TYPES = [
        ('CODING', 'Coding Challenge'),
        ('DEBUGGING', 'Debugging Exercise'),
        ('CODE_REVIEW', 'Code Review'),
        ('DESIGN', 'System Design'),
        ('ALGORITHM', 'Algorithm Problem'),
        ('PROJECT', 'Mini Project'),
    ]

    DIFFICULTY_LEVELS = [
        (1, 'Beginner'),
        (2, 'Easy'),
        (3, 'Moderate'),
        (4, 'Advanced'),
        (5, 'Expert'),
    ]

    problem_id = models.CharField(max_length=50, unique=True)
    problem_type = models.CharField(max_length=20, choices=PROBLEM_TYPES)
    difficulty = models.IntegerField(choices=DIFFICULTY_LEVELS)
    title = models.CharField(max_length=255)
    description = models.TextField()
    problem_statement = models.TextField()

    # Skills targeted by this problem
    targeted_skills = models.JSONField(default=list)

    # Problem content
    test_cases = models.JSONField(default=list)  # List of input/output pairs
    starter_code = models.JSONField(default=dict)  # Language -> starter code
    solution = models.TextField()
    evaluation_criteria = models.JSONField(default=dict)

    # Hints (progressive)
    hints = models.JSONField(default=list)

    # Metadata
    estimated_minutes = models.IntegerField(default=30)
    created_by = models.CharField(max_length=50, default='AI')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class ProblemAssignment(models.Model):
    """
    Assignment of a learning problem to an intern.
    """
    STATUS_CHOICES = [
        ('ASSIGNED', 'Assigned'),
        ('IN_PROGRESS', 'In Progress'),
        ('SUBMITTED', 'Submitted'),
        ('EVALUATED', 'Evaluated'),
        ('OVERDUE', 'Overdue'),
    ]

    intern = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='problem_assignments'
    )
    problem = models.ForeignKey(
        LearningProblem,
        on_delete=models.CASCADE,
        related_name='assignments'
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='assigned_problems'
    )

    # Assignment details
    assigned_at = models.DateTimeField(auto_now_add=True)
    due_date = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ASSIGNED')

    # Solution & Feedback
    submitted_solution = models.TextField(blank=True, null=True)
    submitted_at = models.DateTimeField(blank=True, null=True)

    # AI Evaluation
    ai_feedback = models.TextField(blank=True, null=True)
    score = models.FloatField(blank=True, null=True)
    evaluation_details = models.JSONField(default=dict)

    # Connection to learning path
    learning_path = models.ForeignKey(
        'LearningPath',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='problem_assignments'
    )
    milestone_skill = models.CharField(max_length=100, blank=True, null=True)


class ProblemSubmission(models.Model):
    """
    Tracks each submission attempt for a problem.
    """
    assignment = models.ForeignKey(
        ProblemAssignment,
        on_delete=models.CASCADE,
        related_name='submissions'
    )
    attempt_number = models.IntegerField(default=1)
    submitted_code = models.TextField()
    submitted_at = models.DateTimeField(auto_now_add=True)

    # Test results
    test_results = models.JSONField(default=list)  # List of test case results
    passed_tests = models.IntegerField(default=0)
    total_tests = models.IntegerField(default=0)

    # AI feedback for this attempt
    ai_feedback = models.TextField(blank=True, null=True)
    error_analysis = models.TextField(blank=True, null=True)


class LearningProgress(models.Model):
    """
    Aggregated learning progress per skill area.
    """
    intern = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='learning_progress'
    )
    skill = models.CharField(max_length=100)

    # Mastery levels (0-100)
    current_mastery = models.FloatField(default=0)
    problems_completed = models.IntegerField(default=0)
    total_attempts = models.IntegerField(default=0)
    average_score = models.FloatField(default=0)

    # Progress over time
    progress_history = models.JSONField(default=list)  # [{date, mastery, score}]

    # Last activity
    last_problem_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['intern', 'skill']
```

---

## 5. Backend Implementation

### 5.1 Problem Generator Service (LangChain)

```python
# django_pg_backend/core/apps/analytics/services/problem_generator.py

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from typing import Dict, Any, List, Optional
import json
import logging

logger = logging.getLogger(__name__)


class ProblemGeneratorService:
    """
    Uses LangChain LLM to generate practice problems based on
    intern's learning path and skill gaps.
    """

    def __init__(self):
        self._llm = None

    @property
    def llm(self):
        if self._llm is None:
            self._initialize_llm()
        return self._llm

    def _initialize_llm(self):
        """Initialize LangChain LLM with GitHub Models."""
        import os
        from dotenv import load_dotenv

        load_dotenv()

        # Try GitHub Models first, then OpenAI
        api_key = os.environ.get('GITHUB_TOKEN') or os.environ.get('OPENAI_API_KEY')

        if not api_key:
            raise ValueError("No LLM API key configured")

        os.environ["OPENAI_API_KEY"] = api_key

        from langchain_openai import ChatOpenAI

        # Use gpt-4o-mini via GitHub Models
        self._llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.7,
            max_tokens=4000
        )

    def generate_practice_problems(
        self,
        skill: str,
        difficulty: int,
        count: int = 3,
        problem_type: str = 'CODING'
    ) -> List[Dict[str, Any]]:
        """
        Generate practice problems for a specific skill at given difficulty.

        Args:
            skill: The skill to generate problems for (e.g., "Python", "React")
            difficulty: 1-5 difficulty level
            count: Number of problems to generate
            problem_type: Type of problem (CODING, DEBUGGING, etc.)

        Returns:
            List of problem dictionaries
        """
        prompt = ChatPromptTemplate.from_template("""You are an expert technical educator.
Generate {count} practice problems for learning {skill} at {difficulty_label} level.

Each problem should include:
1. problem_id: Unique ID (e.g., "PYTHON_BASIC_001")
2. title: Short descriptive title
3. problem_statement: The actual problem description
4. difficulty: {difficulty} (1-5 scale)
5. estimated_minutes: Estimated time to complete
6. test_cases: Array of test cases with input and expected_output
7. starter_code: Starter code template (if applicable)
8. hints: Array of progressive hints
9. solution: Complete working solution

Problem type: {problem_type}

Return ONLY valid JSON array.""")

        difficulty_labels = {1: "Beginner", 2: "Easy", 3: "Moderate", 4: "Advanced", 5: "Expert"}

        chain = prompt | self.llm | JsonOutputParser()

        try:
            result = chain.invoke({
                "skill": skill,
                "difficulty": difficulty,
                "difficulty_label": difficulty_labels.get(difficulty, "Moderate"),
                "count": count,
                "problem_type": problem_type
            })

            # Ensure we return a list
            if isinstance(result, dict) and 'problems' in result:
                return result['problems']
            elif isinstance(result, list):
                return result
            else:
                return [result]

        except Exception as e:
            logger.error(f"Error generating problems: {e}")
            return []

    def generate_code_challenge(
        self,
        skill: str,
        topic: str,
        difficulty: int
    ) -> Dict[str, Any]:
        """
        Generate a single code challenge with full evaluation framework.
        """
        prompt = ChatPromptTemplate.from_template("""Generate a coding challenge for {skill}
focusing on {topic} at {difficulty_label} level.

Include:
- Unique problem_id
- Clear problem_statement with examples
- Multiple test cases (at least 3)
- Starter code in Python, JavaScript, and Java
- Complete solution code
- Evaluation criteria with point allocation
- 2-3 progressive hints

Return as JSON object.""")

        difficulty_labels = {1: "Beginner", 2: "Easy", 3: "Moderate", 4: "Advanced", 5: "Expert"}

        chain = prompt | self.llm | JsonOutputParser()

        return chain.invoke({
            "skill": skill,
            "topic": topic,
            "difficulty_label": difficulty_labels.get(difficulty, "Moderate")
        })

    def evaluate_solution(
        self,
        problem: Dict[str, Any],
        submitted_code: str,
        test_cases: List[Dict]
    ) -> Dict[str, Any]:
        """
        Evaluate a submitted solution using LLM analysis.
        """
        prompt = ChatPromptTemplate.from_template("""You are a code reviewer. Evaluate the following
submission for a {skill} problem.

Problem: {problem_title}
Problem Statement: {problem_statement}

Expected Solution:
{solution}

Test Cases:
{test_cases}

Student's Submission:
{submitted_code}

Evaluate and return:
1. score: 0-100 overall score
2. passed_tests: number of tests passed
3. total_tests: total number of tests
4. feedback: Detailed feedback on the solution
5. improvements: Specific suggestions for improvement
6. concepts_mastered: List of concepts the student demonstrated
7. concepts_to_learn: Areas that need more practice

Return as JSON object.""")

        chain = prompt | self.llm | JsonOutputParser()

        return chain.invoke({
            "skill": problem.get('targeted_skills', ['Programming'])[0],
            "problem_title": problem.get('title', ''),
            "problem_statement": problem.get('problem_statement', ''),
            "solution": problem.get('solution', ''),
            "test_cases": json.dumps(problem.get('test_cases', [])),
            "submitted_code": submitted_code
        })

    def generate_skill_assessment(
        self,
        intern_id: int,
        skills: List[str]
    ) -> Dict[str, Any]:
        """
        Generate an assessment quiz for multiple skills.
        """
        prompt = ChatPromptTemplate.from_template("""Create a skill assessment with 5 questions
to evaluate proficiency in: {skills}.

For each question include:
- question_id
- question_text
- question_type (multiple_choice, coding, short_answer)
- options (for multiple choice)
- correct_answer
- explanation
- difficulty (1-5)
- skill_tag

Return as JSON array.""")

        chain = prompt | self.llm | JsonOutputParser()

        return chain.invoke({"skills": ", ".join(skills)})


# Singleton instance
problem_generator = ProblemGeneratorService()
```

### 5.2 Learning Tracker Service

```python
# django_pg_backend/core/apps/analytics/services/learning_tracker.py

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class LearningTrackerService:
    """
    Tracks intern learning progress across problems and skills.
    """

    def track_progress(
        self,
        intern_id: int,
        problem_id: int,
        score: float,
        time_spent_minutes: int
    ) -> Dict[str, Any]:
        """
        Update learning progress after problem submission.
        """
        from apps.analytics.models import (
            LearningProgress, ProblemAssignment, LearningProblem
        )

        problem = LearningProblem.objects.get(id=problem_id)
        assignment = ProblemAssignment.objects.get(
            intern_id=intern_id,
            problem=problem
        )

        # Update skill mastery based on score
        for skill in problem.targeted_skills:
            progress, _ = LearningProgress.objects.get_or_create(
                intern_id=intern_id,
                skill=skill,
                defaults={
                    'current_mastery': 0,
                    'problems_completed': 0,
                    'total_attempts': 0,
                    'average_score': 0
                }
            )

            # Calculate new mastery (weighted average)
            old_weight = progress.problems_completed
            new_weight = old_weight + 1
            progress.current_mastery = (
                (progress.current_mastery * old_weight + score) / new_weight
            )
            progress.problems_completed = new_weight
            progress.total_attempts += 1
            progress.average_score = (
                (progress.average_score * (progress.total_attempts - 1) + score)
                / progress.total_attempts
            )
            progress.last_problem_at = datetime.now()

            # Add to history
            history_entry = {
                'date': datetime.now().isoformat(),
                'mastery': progress.current_mastery,
                'score': score,
                'problem_id': problem_id
            }
            progress.progress_history = (
                progress.progress_history[-29:] + [history_entry]
            )  # Keep last 30 entries
            progress.save()

        return {
            'success': True,
            'updated_skills': problem.targeted_skills
        }

    def calculate_mastery(
        self,
        intern_id: int,
        skill: str
    ) -> Dict[str, Any]:
        """
        Calculate detailed mastery metrics for a skill.
        """
        from apps.analytics.models import LearningProgress

        try:
            progress = LearningProgress.objects.get(
                intern_id=intern_id,
                skill=skill
            )

            # Calculate trend
            history = progress.progress_history or []
            if len(history) >= 2:
                recent = history[-5:]
                if recent:
                    first_score = recent[0].get('score', 0)
                    last_score = recent[-1].get('score', 0)
                    trend = 'improving' if last_score > first_score else 'stable'
                    if last_score < first_score - 10:
                        trend = 'declining'
            else:
                trend = 'starting'

            return {
                'skill': skill,
                'current_mastery': progress.current_mastery,
                'problems_completed': progress.problems_completed,
                'total_attempts': progress.total_attempts,
                'average_score': progress.average_score,
                'trend': trend,
                'last_activity': progress.last_problem_at,
                'progress_history': history
            }
        except LearningProgress.DoesNotExist:
            return {
                'skill': skill,
                'current_mastery': 0,
                'problems_completed': 0,
                'trend': 'starting'
            }

    def generate_insights(
        self,
        intern_id: int
    ) -> Dict[str, Any]:
        """
        Generate AI-powered insights about intern's learning progress.
        """
        from apps.analytics.models import LearningProgress

        all_progress = LearningProgress.objects.filter(intern_id=intern_id)

        if not all_progress.exists():
            return {
                'insights': ['Start practicing to see learning insights!'],
                'strengths': [],
                'areas_for_improvement': [],
                'recommended_difficulty': 2
            }

        # Analyze strengths and weaknesses
        strengths = []
        improvements = []

        for progress in all_progress:
            if progress.current_mastery >= 70:
                strengths.append(progress.skill)
            elif progress.current_mastery < 40:
                improvements.append(progress.skill)

        # Calculate recommended difficulty
        avg_mastery = sum(p.current_mastery for p in all_progress) / all_progress.count()

        if avg_mastery >= 80:
            recommended_difficulty = 4  # Advanced
        elif avg_mastery >= 60:
            recommended_difficulty = 3  # Moderate
        elif avg_mastery >= 40:
            recommended_difficulty = 2  # Easy
        else:
            recommended_difficulty = 1  # Beginner

        # Generate insights using LLM
        insights = self._generate_llm_insights(
            intern_id, strengths, improvements, avg_mastery
        )

        return {
            'insights': insights,
            'strengths': strengths,
            'areas_for_improvement': improvements,
            'recommended_difficulty': recommended_difficulty,
            'average_mastery': avg_mastery,
            'total_problems_completed': sum(p.problems_completed for p in all_progress)
        }

    def _generate_llm_insights(
        self,
        intern_id: int,
        strengths: List[str],
        improvements: List[str],
        avg_mastery: float
    ) -> List[str]:
        """
        Use LLM to generate personalized learning insights.
        """
        # Could integrate with problem_generator.llm here
        insights = []

        if strengths:
            insights.append(f"Great job on {', '.join(strengths[:2])}! Keep building on these strengths.")

        if improvements:
            insights.append(f"Focus on practicing {', '.join(improvements[:2])} to boost your skills.")

        if avg_mastery < 50:
            insights.append("Start with easier problems to build confidence before tackling harder challenges.")
        elif avg_mastery > 80:
            insights.append("You're ready for advanced challenges! Consider exploring real-world projects.")

        return insights


# Singleton
learning_tracker = LearningTrackerService()
```

### 5.3 API Views

```python
# django_pg_backend/core/apps/analytics/views.py

class ProblemGeneratorView(APIView):
    """
    POST /api/analytics/problems/generate/ - Generate problems for a skill
    GET /api/analytics/problems/ - List available problems
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Generate practice problems using LLM."""
        skill = request.data.get('skill')
        difficulty = request.data.get('difficulty', 3)
        count = request.data.get('count', 3)
        problem_type = request.data.get('problem_type', 'CODING')

        if not skill:
            return Response(
                {'error': 'Skill is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            from apps.analytics.services.problem_generator import problem_generator

            problems = problem_generator.generate_practice_problems(
                skill=skill,
                difficulty=int(difficulty),
                count=int(count),
                problem_type=problem_type
            )

            # Save generated problems to database
            from apps.analytics.models import LearningProblem
            saved_problems = []

            for problem_data in problems:
                problem, created = LearningProblem.objects.update_or_create(
                    problem_id=problem_data.get('problem_id'),
                    defaults={
                        'problem_type': problem_type,
                        'difficulty': difficulty,
                        'title': problem_data.get('title', ''),
                        'problem_statement': problem_data.get('problem_statement', ''),
                        'targeted_skills': [skill],
                        'test_cases': problem_data.get('test_cases', []),
                        'starter_code': problem_data.get('starter_code', {}),
                        'solution': problem_data.get('solution', ''),
                        'hints': problem_data.get('hints', []),
                        'estimated_minutes': problem_data.get('estimated_minutes', 30),
                        'created_by': 'AI'
                    }
                )
                saved_problems.append(problem)

            return Response({
                'message': f'Generated {len(saved_problems)} problems',
                'problems': [
                    {
                        'id': p.id,
                        'problem_id': p.problem_id,
                        'title': p.title,
                        'difficulty': p.difficulty,
                        'estimated_minutes': p.estimated_minutes
                    }
                    for p in saved_problems
                ]
            })

        except Exception as e:
            logger.error(f"ProblemGeneratorView error: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ProblemAssignmentView(APIView):
    """
    POST /api/analytics/problems/assign/ - Assign problem to intern
    GET /api/analytics/problems/assignments/ - Get intern's assignments
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Assign a problem to an intern."""
        intern_id = request.data.get('intern_id')
        problem_id = request.data.get('problem_id')
        due_date = request.data.get('due_date')

        # Validate permissions
        user = request.user
        if user.role not in ['ADMIN', 'MANAGER']:
            return Response(
                {'error': 'Only admins and managers can assign problems'},
                status=status.HTTP_403_FORBIDDEN
            )

        from apps.analytics.models import (
            LearningProblem, ProblemAssignment, LearningPath
        )

        try:
            problem = LearningProblem.objects.get(id=problem_id)

            # Try to find active learning path
            learning_path = LearningPath.objects.filter(
                intern_id=intern_id
            ).order_by('-updated_at').first()

            assignment = ProblemAssignment.objects.create(
                intern_id=intern_id,
                problem=problem,
                assigned_by=user,
                due_date=due_date,
                learning_path=learning_path,
                milestone_skill=problem.targeted_skills[0] if problem.targeted_skills else None
            )

            return Response({
                'message': 'Problem assigned successfully',
                'assignment_id': assignment.id
            })

        except LearningProblem.DoesNotExist:
            return Response(
                {'error': 'Problem not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    def get(self, request):
        """Get assignments for current intern or specified intern."""
        intern_id = request.query_params.get('intern_id')

        if not intern_id:
            intern_id = request.user.id

        from apps.analytics.models import ProblemAssignment

        assignments = ProblemAssignment.objects.filter(
            intern_id=intern_id
        ).select_related('problem').order_by('-assigned_at')

        return Response({
            'assignments': [
                {
                    'id': a.id,
                    'problem': {
                        'id': a.problem.id,
                        'title': a.problem.title,
                        'difficulty': a.problem.difficulty,
                        'targeted_skills': a.problem.targeted_skills
                    },
                    'status': a.status,
                    'assigned_at': a.assigned_at,
                    'due_date': a.due_date,
                    'score': a.score,
                    'ai_feedback': a.ai_feedback
                }
                for a in assignments
            ]
        })


class ProblemSubmissionView(APIView):
    """
    POST /api/analytics/problems/submit/ - Submit solution
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Submit solution for evaluation."""
        assignment_id = request.data.get('assignment_id')
        submitted_code = request.data.get('code')

        from apps.analytics.models import (
            ProblemAssignment, ProblemSubmission, LearningProblem
        )

        try:
            assignment = ProblemAssignment.objects.get(id=assignment_id)
            problem = assignment.problem

            # Create submission record
            attempt_count = ProblemSubmission.objects.filter(
                assignment=assignment
            ).count() + 1

            submission = ProblemSubmission.objects.create(
                assignment=assignment,
                attempt_number=attempt_count,
                submitted_code=submitted_code
            )

            # Evaluate using LLM
            from apps.analytics.services.problem_generator import problem_generator

            evaluation = problem_generator.evaluate_solution(
                problem={
                    'title': problem.title,
                    'problem_statement': problem.problem_statement,
                    'targeted_skills': problem.targeted_skills,
                    'solution': problem.solution,
                    'test_cases': problem.test_cases
                },
                submitted_code=submitted_code,
                test_cases=problem.test_cases
            )

            # Update submission with results
            submission.test_results = evaluation.get('test_results', [])
            submission.passed_tests = evaluation.get('passed_tests', 0)
            submission.total_tests = evaluation.get('total_tests', 0)
            submission.ai_feedback = evaluation.get('feedback', '')
            submission.error_analysis = evaluation.get('improvements', '')
            submission.save()

            # Update assignment status
            if submission.passed_tests == submission.total_tests:
                assignment.status = 'EVALUATED'
            else:
                assignment.status = 'SUBMITTED'

            assignment.submitted_solution = submitted_code
            assignment.submitted_at = datetime.now()
            assignment.score = evaluation.get('score', 0)
            assignment.ai_feedback = evaluation.get('feedback', '')
            assignment.evaluation_details = evaluation
            assignment.save()

            # Update learning progress
            from apps.analytics.services.learning_tracker import learning_tracker
            learning_tracker.track_progress(
                intern_id=request.user.id,
                problem_id=problem.id,
                score=evaluation.get('score', 0),
                time_spent_minutes=30  # Could calculate from timestamps
            )

            return Response({
                'submission_id': submission.id,
                'score': evaluation.get('score'),
                'passed_tests': submission.passed_tests,
                'total_tests': submission.total_tests,
                'feedback': evaluation.get('feedback'),
                'improvements': evaluation.get('improvements'),
                'concepts_mastered': evaluation.get('concepts_mastered', []),
                'concepts_to_learn': evaluation.get('concepts_to_learn', [])
            })

        except ProblemAssignment.DoesNotExist:
            return Response(
                {'error': 'Assignment not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class LearningProgressView(APIView):
    """
    GET /api/analytics/learning/progress/ - Get learning progress
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get comprehensive learning progress."""
        intern_id = request.query_params.get('intern_id', request.user.id)

        from apps.analytics.services.learning_tracker import learning_tracker
        from apps.analytics.models import LearningProgress

        # Get skill-level progress
        all_progress = LearningProgress.objects.filter(intern_id=intern_id)

        skills_progress = []
        for progress in all_progress:
            skills_progress.append(
                learning_tracker.calculate_mastery(
                    intern_id=intern_id,
                    skill=progress.skill
                )
            )

        # Get AI insights
        insights = learning_tracker.generate_insights(intern_id)

        return Response({
            'skills_progress': skills_progress,
            'insights': insights,
            'summary': {
                'total_skills': len(skills_progress),
                'average_mastery': insights.get('average_mastery', 0),
                'total_problems_completed': insights.get('total_problems_completed', 0)
            }
        })
```

---

## 6. Frontend Implementation

### 6.1 New Components Structure

```
frontend/src/
├── components/
│   ├── learning/
│   │   ├── ProblemCard.tsx          # Display individual problem
│   │   ├── ProblemList.tsx          # List of available problems
│   │   ├── ProblemEditor.tsx        # Code editor for submissions
│   │   ├── ProblemResults.tsx       # Show evaluation results
│   │   ├── SkillProgressChart.tsx  # Visual progress tracking
│   │   └── LearningInsights.tsx    # AI-generated insights
│   └── common/
│       ├── CodeEditor.tsx           # Monaco/code editor wrapper
│       └── TestRunner.tsx           # Run test cases locally
├── pages/
│   ├── LearningProblems.tsx        # New page for problem practice
│   └── LearningProgress.tsx         # Updated progress tracking
└── api/
    └── learningApi.ts               # API calls for problems
```

### 6.2 Frontend API Service

```typescript
// frontend/src/api/learningApi.ts

import api from "./axios";

export const learningApi = {
  // Generate new problems
  generateProblems: async (
    skill: string,
    difficulty: number,
    count: number = 3,
  ) => {
    const response = await api.post("/analytics/problems/generate/", {
      skill,
      difficulty,
      count,
    });
    return response.data;
  },

  // Get available problems
  getProblems: async (skill?: string, difficulty?: number) => {
    const params = new URLSearchParams();
    if (skill) params.append("skill", skill);
    if (difficulty) params.append("difficulty", difficulty.toString());
    const response = await api.get(`/analytics/problems/?${params}`);
    return response.data;
  },

  // Assign problem to intern
  assignProblem: async (
    internId: number,
    problemId: number,
    dueDate: string,
  ) => {
    const response = await api.post("/analytics/problems/assign/", {
      intern_id: internId,
      problem_id: problemId,
      due_date: dueDate,
    });
    return response.data;
  },

  // Get assignments
  getAssignments: async (internId?: number) => {
    const params = internId ? `?intern_id=${internId}` : "";
    const response = await api.get(`/analytics/problems/assignments/${params}`);
    return response.data;
  },

  // Submit solution
  submitSolution: async (assignmentId: number, code: string) => {
    const response = await api.post("/analytics/problems/submit/", {
      assignment_id: assignmentId,
      code,
    });
    return response.data;
  },

  // Get learning progress
  getLearningProgress: async (internId?: number) => {
    const params = internId ? `?intern_id=${internId}` : "";
    const response = await api.get(`/analytics/learning/progress/${params}`);
    return response.data;
  },
};
```

---

## 7. Integration with Existing Learning Path

### 7.1 Problem Generation from Learning Path Milestones

The system will automatically generate problems based on the intern's current learning path:

```python
# In learning_path_optimizer.py or new service

def generate_problems_from_path(intern_id: int, count_per_skill: int = 2):
    """
    Generate practice problems for each skill in the intern's learning path.
    """
    from apps.analytics.models import LearningPath, SkillProfile
    from apps.analytics.services.problem_generator import problem_generator

    # Get current learning path
    path = LearningPath.objects.filter(
        intern_id=intern_id
    ).order_by('-updated_at').first()

    if not path or not path.milestones:
        return {'error': 'No learning path found'}

    generated_problems = []

    # Get current skill levels
    skill_profile = SkillProfile.objects.filter(intern_id=intern_id).first()
    current_skills = skill_profile.skill_levels if skill_profile else {}

    # Generate problems for each upcoming milestone
    for milestone in path.milestones[path.current_position:]:
        skill = milestone.get('skill')
        difficulty = milestone.get('difficulty', 3)

        # Adjust difficulty based on current mastery
        current_mastery = current_skills.get(skill, 0)
        if current_mastery > 70:
            difficulty = min(difficulty + 1, 5)
        elif current_mastery < 30:
            difficulty = max(difficulty - 1, 1)

        problems = problem_generator.generate_practice_problems(
            skill=skill,
            difficulty=difficulty,
            count=count_per_skill
        )

        generated_problems.extend(problems)

    return {
        'path_id': path.id,
        'generated_problems': generated_problems
    }
```

---

## 8. Implementation Phases

### Phase 1: Database & Models (Week 1)

- Create LearningProblem, ProblemAssignment, ProblemSubmission, LearningProgress models
- Run migrations
- Add admin interfaces

### Phase 2: Backend Services (Week 1-2)

- Implement ProblemGeneratorService with LangChain
- Implement LearningTrackerService
- Create API endpoints

### Phase 3: Frontend - Problem Practice (Week 2-3)

- Create ProblemCard, ProblemList components
- Implement code editor integration
- Build submission and results display

### Phase 4: Frontend - Progress Tracking (Week 3)

- Update LearningProgress page with new visualizations
- Add AI insights display
- Create skill progress charts

### Phase 5: Integration & Testing (Week 4)

- Connect with existing LearningPath system
- Auto-generate problems from milestones
- End-to-end testing

---

## 9. Summary

This implementation will:

1. **Generate AI-powered problems** using LangChain LLM tailored to each intern's skill level
2. **Assign problems** automatically based on learning path milestones or manually by managers
3. **Evaluate submissions** using LLM-based code review and feedback
4. **Track progress** at both problem-level and skill-level mastery
5. **Provide insights** about learning patterns and recommendations

The system extends the existing Learning Path infrastructure and leverages the already-integrated LangChain LLM service for problem generation and evaluation.

---

## Next Steps

To proceed with implementation, I can:

1. Create the database models and migrations
2. Implement the ProblemGeneratorService
3. Build the API endpoints
4. Create the frontend components

Would you like me to proceed with any specific phase?
