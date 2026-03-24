"""
Learning Path Optimizer Service
================================
Generates a personalised skill-learning sequence for an intern targeting a
specific job role, using A* search over a skill dependency DAG.

Skill Graph Nodes: skills derived from JobRole.mandatory_skills / preferred_skills
Edge weight      : difficulty / max(intern_mastery, 0.1)  → lower mastery = harder
A* heuristic     : remaining skill count to target

The optimizer also integrates with SkillProfile for live mastery data and
updates the LearningPath model after path generation.
"""

import heapq
import logging
import uuid
from dataclasses import dataclass, field
from typing import Optional
from django.utils import timezone

logger = logging.getLogger(__name__)

# ─── Hard-coded prerequisite graph (can later be DB-driven) ──────────────────
# Format: { skill: [prerequisites] }
PREREQUISITE_GRAPH: dict[str, list[str]] = {
    # Python track
    "Django": ["Python"],
    "Django REST Framework": ["Django"],
    "FastAPI": ["Python"],
    "Celery": ["Python", "Django"],

    # JavaScript / Frontend track
    "React": ["JavaScript"],
    "Next.js": ["React"],
    "TypeScript": ["JavaScript"],
    "Redux": ["React"],
    "Vue.js": ["JavaScript"],
    "Angular": ["TypeScript"],

    # Database track
    "PostgreSQL": ["SQL"],
    "MongoDB": ["NoSQL Basics"],
    "Redis": ["SQL"],
    "SQLAlchemy": ["Python", "SQL"],

    # DevOps / Cloud track
    "Docker": ["Linux Basics"],
    "Kubernetes": ["Docker"],
    "GitHub Actions": ["Git"],
    "AWS": ["Linux Basics"],
    "Azure": ["Linux Basics"],

    # ML track
    "Scikit-learn": ["Python", "NumPy"],
    "TensorFlow": ["Python", "NumPy"],
    "PyTorch": ["Python", "NumPy"],
    "Pandas": ["Python"],
    "NumPy": ["Python"],

    # Fundamentals (no prerequisites)
    "Python": [],
    "JavaScript": [],
    "Java": [],
    "SQL": [],
    "Git": [],
    "Linux Basics": [],
    "NoSQL Basics": [],
    "C++": [],
    "Go": [],
    "REST APIs": ["HTTP Basics"],
    "HTTP Basics": [],
    "Data Structures": [],
    "Algorithms": ["Data Structures"],
    "System Design": ["Data Structures", "SQL"],
}

# Difficulty estimates for common skills (1-5)
SKILL_DIFFICULTY: dict[str, int] = {
    "Python": 1, "JavaScript": 1, "HTML": 1, "CSS": 1, "Git": 1,
    "SQL": 2, "Linux Basics": 2, "HTTP Basics": 1, "NoSQL Basics": 2,
    "React": 2, "Django": 2, "NumPy": 2, "Pandas": 2,
    "TypeScript": 3, "PostgreSQL": 2, "Docker": 3, "Vue.js": 2,
    "Django REST Framework": 3, "FastAPI": 3, "SQLAlchemy": 3, "Redux": 3,
    "Scikit-learn": 3, "AWS": 4, "Azure": 4, "Celery": 3,
    "Kubernetes": 5, "TensorFlow": 4, "PyTorch": 4, "Next.js": 3,
    "Angular": 4, "System Design": 5, "Algorithms": 4,
    "GitHub Actions": 3, "Redis": 3, "MongoDB": 3,
}

# Learning resources per skill
SKILL_RESOURCES: dict[str, list[dict]] = {
    "Python": [
        {"title": "Python Official Tutorial", "url": "https://docs.python.org/3/tutorial/", "type": "docs"},
        {"title": "Automate the Boring Stuff", "url": "https://automatetheboringstuff.com/", "type": "book"},
    ],
    "Django": [
        {"title": "Django Official Docs", "url": "https://docs.djangoproject.com/", "type": "docs"},
        {"title": "Django for Beginners", "url": "https://djangoforbeginners.com/", "type": "book"},
    ],
    "React": [
        {"title": "React Docs (beta)", "url": "https://react.dev/", "type": "docs"},
        {"title": "Frontend Masters - React", "url": "https://frontendmasters.com/", "type": "course"},
    ],
    "SQL": [
        {"title": "SQLZoo", "url": "https://sqlzoo.net/", "type": "interactive"},
        {"title": "Mode Analytics SQL Tutorial", "url": "https://mode.com/sql-tutorial/", "type": "tutorial"},
    ],
    "Docker": [
        {"title": "Docker Getting Started", "url": "https://docs.docker.com/get-started/", "type": "docs"},
    ],
    "Git": [
        {"title": "Pro Git Book", "url": "https://git-scm.com/book", "type": "book"},
    ],
}


def _get_default_resources(skill: str) -> list[dict]:
    """Return default resources or a generic search link."""
    if skill in SKILL_RESOURCES:
        return SKILL_RESOURCES[skill]
    return [{"title": f"Search '{skill}' on MDN / official docs", "url": f"https://www.google.com/search?q={skill}+tutorial", "type": "search"}]


def _get_skill_difficulty(skill: str) -> int:
    return SKILL_DIFFICULTY.get(skill, 3)


@dataclass(order=True)
class _PQItem:
    """Priority queue item for A* search."""
    priority: float
    skill: str = field(compare=False)


# ─── Internal Graph Helpers ───────────────────────────────────────────────────

def _get_all_prerequisite_skills(skill: str, visited: Optional[set] = None) -> list[str]:
    """Recursively collect all prerequisite skills (transitive closure)."""
    if visited is None:
        visited = set()
    if skill in visited:
        return []
    visited.add(skill)
    prereqs = PREREQUISITE_GRAPH.get(skill, [])
    result = list(prereqs)
    for p in prereqs:
        result.extend(_get_all_prerequisite_skills(p, visited))
    return list(dict.fromkeys(result))  # Deduplicate maintaining order


def _get_role_skill_requirements(target_role: str) -> tuple[list[str], list[str]]:
    """
    Fetch mandatory and preferred skill lists for a job role.
    Returns (mandatory_skills, preferred_skills)
    """
    from apps.analytics.models import JobRole
    try:
        role = JobRole.objects.get(role_title__iexact=target_role)
        mandatory = role.mandatory_skills or []
        preferred = role.preferred_skills or []
        return mandatory, preferred
    except JobRole.DoesNotExist:
        logger.warning(f"LearningPathOptimizer: role '{target_role}' not found in DB, using empty requirements")
        return [], []
    except Exception as e:
        logger.error(f"LearningPathOptimizer._get_role_skill_requirements error: {e}")
        return [], []


def _get_intern_mastery(intern_id: int) -> dict[str, float]:
    """
    Fetch intern's known skills from SkillProfile + ResumeSkill.
    Returns {skill_name: mastery_level}
    """
    from apps.analytics.models import SkillProfile, ResumeSkill
    mastery = {}

    # From SkillProfile (dynamically updated)
    for sp in SkillProfile.objects.filter(intern_id=intern_id):
        mastery[sp.skill_name] = sp.mastery_level

    # From ResumeSkill (initial skills at resume time, default 0.4 mastery)
    try:
        resume_skills = ResumeSkill.objects.filter(
            application__intern_id=intern_id
        ).values_list('name', flat=True)
        for skill in resume_skills:
            if skill not in mastery:
                mastery[skill] = 0.4  # Known but not proficient
    except Exception:
        pass

    return mastery


# ─── A* Path Finding ──────────────────────────────────────────────────────────

def _astar(
    current_skills: dict[str, float],
    target_skills: list[str],
    all_skills_needed: list[str],
) -> list[str]:
    """
    A* over the skill dependency DAG.
    Returns an ordered list of skills to learn (from easiest/most-ready first).

    Edge cost: difficulty / max(mastery, 0.1)
    Heuristic: number of remaining target skills not yet learned
    """
    # Skills already mastered (mastery >= 0.8)
    mastered = {s for s, m in current_skills.items() if m >= 0.8}
    # Skills to acquire
    to_learn = [s for s in all_skills_needed if s not in mastered]

    if not to_learn:
        return []

    # Track g-costs (cost from start to current skill)
    g_cost = {s: float('inf') for s in to_learn}
    # Which skills have been ordered (path built)
    path_order = []
    available_skills = set(mastered)  # Skills we can unlock

    def can_learn(skill: str) -> bool:
        """Check if all prerequisites for this skill are already available."""
        prereqs = PREREQUISITE_GRAPH.get(skill, [])
        return all(p in available_skills or p not in to_learn for p in prereqs)

    # Greedy A* pass: repeatedly pick the lowest-cost available skill
    remaining = list(to_learn)
    max_iterations = len(to_learn) * 2

    for _ in range(max_iterations):
        if not remaining:
            break

        # Find best skill to learn next
        learnable = [(s, _get_skill_difficulty(s) / max(current_skills.get(s, 0.0), 0.1)) for s in remaining if can_learn(s)]

        if not learnable:
            # No learnable skills available – add prerequisites first
            # Just take any remaining skill and add it
            learnable = [(remaining[0], float('inf'))]

        learnable.sort(key=lambda x: x[1])
        best_skill = learnable[0][0]

        path_order.append(best_skill)
        available_skills.add(best_skill)
        remaining.remove(best_skill)

    # Add any remaining skills that couldn't be ordered
    path_order.extend(remaining)

    return path_order


# ─── Milestone Generation ─────────────────────────────────────────────────────

def _skill_to_milestone(skill: str, position: int, intern_mastery: float = 0.0, basics_only: bool = False) -> dict:
    """Convert a skill node to a milestone object."""
    difficulty = _get_skill_difficulty(skill)
    # Estimated hours: harder skills take more time, partially mastered skills less
    base_hours = difficulty * 4.0
    adjusted_hours = base_hours * (1.0 - intern_mastery)
    
    title = f"Master {skill}"
    description = f"Learn and apply {skill} through hands-on tasks and projects."
    
    if basics_only:
        title = f"{skill} Fundamentals"
        description = f"Focus on the core concepts and absolute basics of {skill}."

    return {
        'position': position,
        'skill': skill,
        'title': title,
        'description': description,
        'difficulty': difficulty,
        'estimated_hours': round(max(adjusted_hours, 1.0), 1),
        'resources': _get_default_resources(skill),
        'prerequisites': PREREQUISITE_GRAPH.get(skill, []),
        'current_mastery': round(intern_mastery, 2),
        'mastery_target': 0.8,
        'status': 'COMPLETED' if intern_mastery >= 0.8 else 'UPCOMING',
    }


# ─── Public API ───────────────────────────────────────────────────────────────

def find_optimal_path(intern_id: int, target_role: str) -> list[dict]:
    """
    Generate a personalised learning path from the intern's current skills
    to the target role's requirements.
    Returns an ordered list of milestone dicts.
    """
    # 1. Get current skills
    intern_mastery = _get_intern_mastery(intern_id)

    # 2. Get target requirements
    mandatory_skills, preferred_skills = _get_role_skill_requirements(target_role)
    target_skills = mandatory_skills + [s for s in preferred_skills if s not in mandatory_skills]

    if not target_skills:
        # Fallback: use generic tech skills if role not found
        target_skills = ["Python", "SQL", "Git", "Django", "React", "Docker"]
        logger.warning(f"find_optimal_path: no skill requirements found for role '{target_role}', using defaults")

    # 3. Expand with prerequisites
    all_needed: list[str] = []
    for skill in target_skills:
        prereqs = _get_all_prerequisite_skills(skill)
        for p in prereqs:
            if p not in all_needed:
                all_needed.append(p)
        if skill not in all_needed:
            all_needed.append(skill)

    # 4. A* ordering
    ordered_skills = _astar(intern_mastery, target_skills, all_needed)

    # 5. Build milestones
    milestones = []
    for i, skill in enumerate(ordered_skills):
        mastery = intern_mastery.get(skill, 0.0)
        milestone = _skill_to_milestone(skill, i, mastery)
        milestones.append(milestone)

    logger.info(f"find_optimal_path: intern={intern_id}, role='{target_role}', {len(milestones)} milestones generated")
    return milestones


def recommend_next_milestone(intern_id: int) -> Optional[dict]:
    """
    Return the next milestone to complete for the intern's active learning path.
    """
    from apps.analytics.models import LearningPath
    path = LearningPath.objects.filter(intern_id=intern_id).order_by('-updated_at').first()
    if not path or not path.milestones:
        return None
    if path.current_position >= len(path.milestones):
        return None
    return path.milestones[path.current_position]


def update_progress(intern_id: int, skill_id: str, mastery: float) -> None:
    """
    Update intern's skill mastery in SkillProfile.
    If mastery >= 0.8, marks the milestone as completed and advances the path pointer.
    """
    from apps.analytics.models import SkillProfile, LearningPath

    # Upsert SkillProfile
    profile, created = SkillProfile.objects.get_or_create(
        intern_id=intern_id,
        skill_name=skill_id,
        defaults={'mastery_level': mastery}
    )
    if not created:
        profile.mastery_level = round(min(mastery, 1.0), 3)
        profile.save(update_fields=['mastery_level'])

    # Recalculate path if milestone is now mastered
    if mastery >= 0.8:
        try:
            path = LearningPath.objects.filter(intern_id=intern_id).order_by('-updated_at').first()
            if path and path.milestones:
                current = path.milestones[path.current_position] if path.current_position < len(path.milestones) else None
                if current and current.get('skill') == skill_id:
                    # Advance pointer
                    path.current_position = min(path.current_position + 1, len(path.milestones) - 1)
                    if skill_id not in path.completed_milestones:
                        path.completed_milestones.append(skill_id)
                    path.completion_percentage = round(
                        len(path.completed_milestones) / max(len(path.milestones), 1) * 100, 1
                    )
                    # Update milestone status in JSON
                    for m in path.milestones:
                        if m.get('skill') == skill_id:
                            m['status'] = 'COMPLETED'
                    path.save(update_fields=['current_position', 'completed_milestones', 'completion_percentage', 'milestones'])
                    logger.info(f"update_progress: intern={intern_id}, skill='{skill_id}' mastered→advanced path to pos {path.current_position}")
        except Exception as e:
            logger.warning(f"update_progress: path update failed: {e}")


def generate_custom_skill_path(intern_id: int, skill_list: list[str], title: str, basics_only: bool = False) -> dict:
    """
    Generate a new learning path based on a specific list of skills, then
    auto-generate LLM-powered tasks for every milestone so the manager only
    needs to review and approve.
    Returns serializable path data.
    """
    from apps.analytics.models import LearningPath
    from apps.accounts.models import User

    # 1. Get current skills
    intern_mastery = _get_intern_mastery(intern_id)

    # 2. Expand with prerequisites
    all_needed: list[str] = []
    for skill in skill_list:
        prereqs = _get_all_prerequisite_skills(skill)
        for p in prereqs:
            if p not in all_needed:
                all_needed.append(p)
        if skill not in all_needed:
            all_needed.append(skill)

    # 3. A* ordering
    ordered_skills = _astar(intern_mastery, skill_list, all_needed)

    # 4. Build milestones
    milestones = []
    for i, skill in enumerate(ordered_skills):
        mastery = intern_mastery.get(skill, 0.0)
        milestone = _skill_to_milestone(skill, i, mastery, basics_only=basics_only)
        milestones.append(milestone)

    full_title = f"{title} (Basics Focus)" if basics_only else title

    path_defaults = {
        'milestones': milestones,
        'current_position': 0,
        'completed_milestones': [],
        'completion_percentage': 0.0,
        'target_role_title': full_title,
    }

    # JobRole is None for custom paths
    learning_path, created = LearningPath.objects.update_or_create(
        intern_id=intern_id,
        job_role=None,
        target_role_title=full_title,
        defaults=path_defaults,
    )

    logger.info(f"generate_custom_skill_path: intern={intern_id}, title='{full_title}', {len(milestones)} milestones generated")

    # Auto-generate tasks for every milestone so manager can directly review
    try:
        intern = User.objects.get(id=intern_id)
        intern_name = intern.full_name or intern.email
    except Exception:
        intern_name = f'Intern #{intern_id}'

    goal_text = full_title
    _auto_generate_tasks_for_path(learning_path, intern_name=intern_name, goal_text=goal_text, basics_only=basics_only)

    # Refresh milestones from DB (tasks may have been embedded)
    learning_path.refresh_from_db()

    return {
        'path_id': learning_path.id,
        'intern_id': intern_id,
        'target_role': full_title,
        'milestones': learning_path.milestones,
        'total_milestones': len(learning_path.milestones),
        'current_position': learning_path.current_position,
        'completion_percentage': learning_path.completion_percentage,
        'created': created,
        'tasks_auto_generated': True,
    }


def _auto_generate_tasks_for_path(learning_path, intern_name: str, goal_text: str, basics_only: bool = False) -> None:
    """
    Automatically generate LLM-powered tasks for every milestone in a learning path.
    Each milestone gets a `task_details` dict with `status='PENDING'` so managers
    only need to review and approve them.
    This function mutates `learning_path.milestones` in-place and saves the path.
    """
    try:
        from apps.analytics.services.llm_learning_path_generator import get_learning_path_generator
        generator = get_learning_path_generator()
    except Exception as e:
        logger.error(f"_auto_generate_tasks_for_path: Could not load LLM generator: {e}")
        return

    milestones = learning_path.milestones
    changed = False

    for milestone in milestones:
        # Skip milestones that already have a task or are already completed
        if milestone.get('task_details') or milestone.get('status') == 'COMPLETED':
            continue

        skill = milestone.get('skill', '')
        if not skill:
            continue

        try:
            task_data = generator.generate_milestone_task(
                skill=skill,
                intern_name=intern_name,
                goal_text=goal_text,
                basics_only=basics_only,
            )

            # Do not overwrite on LLM error; fall through gracefully
            if 'error' not in task_data:
                milestone['task_details'] = {
                    'title': task_data.get('task_title', f'Explore {skill}'),
                    'description': task_data.get('task_description', f'Practice {skill} with a hands-on exercise.'),
                    'starter_script': task_data.get('starter_script', '# Start your implementation here'),
                    'estimated_hours': task_data.get('estimated_hours', milestone.get('estimated_hours', 2)),
                    'status': 'PENDING',
                }
                changed = True
                logger.info(f"_auto_generate_tasks_for_path: task generated for skill='{skill}'")
            else:
                # Use a minimal fallback so the manager can still see the milestone
                milestone['task_details'] = {
                    'title': f'Explore {skill}',
                    'description': f'Research and implement a basic project using {skill}.',
                    'starter_script': '# Start your implementation here',
                    'estimated_hours': milestone.get('estimated_hours', 2),
                    'status': 'PENDING',
                }
                changed = True
                logger.warning(f"_auto_generate_tasks_for_path: LLM error for '{skill}', used fallback task")
        except Exception as e:
            logger.error(f"_auto_generate_tasks_for_path: error for skill='{skill}': {e}")
            # Still create a fallback task so every milestone has something for the manager
            milestone['task_details'] = {
                'title': f'Explore {skill}',
                'description': f'Research and implement a basic project using {skill}.',
                'starter_script': '# Start your implementation here',
                'estimated_hours': milestone.get('estimated_hours', 2),
                'status': 'PENDING',
            }
            changed = True

    if changed:
        learning_path.save(update_fields=['milestones'])
        logger.info(f"_auto_generate_tasks_for_path: saved tasks for path id={learning_path.id}")


def save_milestone_task(intern_id: int, milestone_index: int, task_data: dict) -> bool:
    """
    Save AI-generated task/script to the milestone.
    """
    from apps.analytics.models import LearningPath
    try:
        # Get the most recently updated custom path for this intern
        path = LearningPath.objects.filter(intern_id=intern_id, job_role=None).latest('updated_at')
    except LearningPath.DoesNotExist:
        # Fallback to the latest path of any type
        path = LearningPath.objects.filter(intern_id=intern_id).latest('updated_at')
    except Exception:
        return False

    if 0 <= milestone_index < len(path.milestones):
        milestone = path.milestones[milestone_index]
        milestone['task_details'] = {
            'title': task_data.get('task_title'),
            'description': task_data.get('task_description'),
            'starter_script': task_data.get('starter_script'),
            'status': 'PENDING'
        }
        path.save()
        return True
    return False


def approve_milestone_task(intern_id: int, milestone_index: int) -> dict:
    """
    Approve the AI task and sync to TaskTracking.
    """
    from apps.analytics.models import LearningPath, TaskTracking
    try:
        path = LearningPath.objects.filter(intern_id=intern_id).order_by('-updated_at').first()
        if not path or milestone_index >= len(path.milestones):
            return {'error': 'Path or milestone not found.'}
            
        milestone = path.milestones[milestone_index]
        details = milestone.get('task_details')
        if not details:
            return {'error': 'No task details to approve.'}

        if details.get('status') == 'APPROVED':
            return {'message': 'Task already approved.'}

        # 1. Update status
        details['status'] = 'APPROVED'
        
        # 2. Update milestone description/title to be more specific
        milestone['title'] = details['title']
        milestone['description'] = details['description']
        
        # 3. Create TaskTracking record
        task_id = f"LP-{intern_id}-{milestone_index}-{uuid.uuid4().hex[:6]}"
        task = TaskTracking.objects.create(
            intern_id=intern_id,
            task_id=task_id,
            title=details['title'],
            description=f"{details['description']}\n\nStarter Script:\n```\n{details['starter_script']}\n```",
            status='ASSIGNED',
            priority='MEDIUM',
            due_date=timezone.now() + timezone.timedelta(days=3),
            estimated_hours=milestone.get('estimated_hours', 2.0)
        )
        
        path.save()
        return {
            'message': 'Task approved and assigned.',
            'task_id': task.task_id,
            'milestone': milestone
        }
    except Exception as e:
        logger.error(f"approve_milestone_task error: {e}")
        return {'error': str(e)}


def generate_and_save_path(intern_id: int, target_role: str) -> dict:
    """
    Generate a new learning path, persist it to the DB, and auto-generate
    LLM-powered tasks for every milestone so the manager only needs to review.
    Returns serializable path data.
    """
    from apps.analytics.models import LearningPath, JobRole
    from apps.accounts.models import User

    milestones = find_optimal_path(intern_id, target_role)

    # Try to get the JobRole FK
    job_role = None
    try:
        job_role = JobRole.objects.get(role_title__iexact=target_role)
    except JobRole.DoesNotExist:
        pass

    path_defaults = {
        'milestones': milestones,
        'current_position': 0,
        'completed_milestones': [],
        'completion_percentage': 0.0,
        'target_role_title': target_role,
    }

    learning_path, created = LearningPath.objects.update_or_create(
        intern_id=intern_id,
        job_role=job_role,
        defaults=path_defaults,
    )

    # Auto-generate tasks for every milestone so manager can directly review
    try:
        intern = User.objects.get(id=intern_id)
        intern_name = intern.full_name or intern.email
    except Exception:
        intern_name = f'Intern #{intern_id}'

    goal_text = f'Become a {target_role}'
    _auto_generate_tasks_for_path(learning_path, intern_name=intern_name, goal_text=goal_text)

    # Refresh milestones from DB (tasks may have been embedded)
    learning_path.refresh_from_db()

    return {
        'path_id': learning_path.id,
        'intern_id': intern_id,
        'target_role': target_role,
        'milestones': learning_path.milestones,
        'total_milestones': len(learning_path.milestones),
        'current_position': learning_path.current_position,
        'completion_percentage': learning_path.completion_percentage,
        'created': created,
        'tasks_auto_generated': True,
    }


def get_path_progress(intern_id: int) -> Optional[dict]:
    """
    Return the full path progress for the intern's most recent learning path.
    """
    from apps.analytics.models import LearningPath, SkillProfile

    path = LearningPath.objects.filter(intern_id=intern_id).order_by('-updated_at').first()
    if not path:
        return None

    # Refresh milestone statuses from live SkillProfile
    mastery_map = {sp.skill_name: sp.mastery_level for sp in SkillProfile.objects.filter(intern_id=intern_id)}
    milestones = path.milestones
    for m in milestones:
        skill = m.get('skill', '')
        m['current_mastery'] = round(mastery_map.get(skill, m.get('current_mastery', 0.0)), 2)
        if m['current_mastery'] >= 0.8:
            m['status'] = 'COMPLETED'
        elif m['current_mastery'] > 0:
            m['status'] = 'IN_PROGRESS'

    next_milestone = milestones[path.current_position] if path.current_position < len(milestones) else None

    return {
        'path_id': path.id,
        'intern_id': intern_id,
        'target_role': path.target_role_title,
        'total_milestones': len(milestones),
        'current_position': path.current_position,
        'completion_percentage': path.completion_percentage,
        'completed_milestones': path.completed_milestones,
        'next_milestone': next_milestone,
        'milestones': milestones,
        'updated_at': path.updated_at.isoformat(),
    }
