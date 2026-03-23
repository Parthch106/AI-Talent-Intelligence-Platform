"""
RL Task Assigner Service
========================
Implements a Q-Learning / DQN-style RL agent that recommends the optimal
next task difficulty/type for an intern, based on their skill profile,
task history, and growth velocity.

State space:
  [avg_quality, completion_rate, growth_velocity, avg_difficulty_handled,
   days_in_internship, skill_count, skill_avg_mastery, engagement_score,
   dropout_risk_score]

Action space (5 actions):
  0 → EASY_TASK          (difficulty 1-2)
  1 → MODERATE_TASK      (difficulty 3)
  2 → HARD_TASK          (difficulty 4-5)
  3 → SKILL_GAP_TASK     (fill skill gaps)
  4 → COLLABORATION_TASK (team/soft skills)

Reward:
  R = 10*(completion) + 5*(quality_norm) + 3*(growth_delta) + 2*(engagement) - 1*(overdue_penalty)
"""

import logging
import random
import math
from datetime import timedelta
from django.utils import timezone

logger = logging.getLogger(__name__)

# ─── Reward Weights (from design doc) ────────────────────────────────────────
W_COMPLETION  = 10.0
W_QUALITY     = 5.0
W_GROWTH      = 3.0
W_ENGAGEMENT  = 2.0
W_OVERDUE     = 1.0

# ─── Q-Learning Hyperparameters ───────────────────────────────────────────────
ALPHA          = 0.1    # Learning rate
GAMMA          = 0.9    # Discount factor
EPSILON_START  = 0.8    # Exploration rate (start)
EPSILON_MIN    = 0.05   # Min exploration rate
EPSILON_DECAY  = 0.995  # Decay per episode

# Action definitions
ACTIONS = [
    'EASY_TASK',
    'MODERATE_TASK',
    'HARD_TASK',
    'SKILL_GAP_TASK',
    'COLLABORATION_TASK',
]

ACTION_DIFFICULTY_MAP = {
    'EASY_TASK': 1,
    'MODERATE_TASK': 3,
    'HARD_TASK': 5,
    'SKILL_GAP_TASK': 2,
    'COLLABORATION_TASK': 2,
}

# In-memory Q-table: { intern_id: { state_key: [q0..q4] } }
# In production replace with a persisted DQN (torch/keras) or Redis-backed table.
_Q_TABLE: dict = {}
_EPSILON: dict = {}  # per-intern exploration rate


def _get_epsilon(intern_id: int) -> float:
    return _EPSILON.get(intern_id, EPSILON_START)


def _decay_epsilon(intern_id: int):
    eps = _get_epsilon(intern_id)
    _EPSILON[intern_id] = max(EPSILON_MIN, eps * EPSILON_DECAY)


def _state_key(state_vector: list) -> str:
    """Discretise a continuous state vector into a hashable key."""
    # Bucket each float into deciles (0-9) for a 10-dim discrete state key
    buckets = []
    for v in state_vector:
        bucket = min(9, int(v * 10))
        buckets.append(str(bucket))
    return "|".join(buckets)


def _ensure_q_row(intern_id: int, key: str):
    if intern_id not in _Q_TABLE:
        _Q_TABLE[intern_id] = {}
    if key not in _Q_TABLE[intern_id]:
        # Initial optimistic Q-values
        _Q_TABLE[intern_id][key] = [1.0] * len(ACTIONS)


# ─── State Building ───────────────────────────────────────────────────────────

def get_state(intern_id: int) -> list:
    """
    Build a normalised 9-dimensional state vector for the RL agent.
    All values are in [0, 1].
    """
    from apps.analytics.models import (
        TaskTracking, PerformanceMetrics, SkillProfile, MonthlyEvaluationReport
    )
    from apps.accounts.models import User
    from django.db.models import Avg, Count, Q

    state = [0.5] * 10  # Default mid-values if insufficient data

    try:
        intern = User.objects.get(id=intern_id)
        tasks = TaskTracking.objects.filter(intern_id=intern_id)
        total_tasks = tasks.count()
        completed_tasks = tasks.filter(status='COMPLETED')

        # 0 – avg quality score (0-1 from 0-5 scale)
        avg_quality = completed_tasks.aggregate(Avg('quality_rating'))['quality_rating__avg']
        state[0] = round((avg_quality or 0.0) / 5.0, 3)

        # 1 – task completion rate
        state[1] = round(completed_tasks.count() / max(total_tasks, 1), 3)

        # 2 – growth velocity (from latest monthly eval)
        latest_eval = MonthlyEvaluationReport.objects.filter(intern_id=intern_id).order_by('-evaluation_month').first()
        if latest_eval:
            state[2] = round(min(latest_eval.skill_development_progress / 100.0, 1.0), 3)

        # 3 – avg difficulty of completed tasks (normalised to 1-5 → 0-1)
        if completed_tasks.exists():
            # TaskTracking doesn't store difficulty, approximate from estimated_hours
            avg_hours = completed_tasks.aggregate(Avg('estimated_hours'))['estimated_hours__avg'] or 0
            state[3] = round(min(avg_hours / 20.0, 1.0), 3)  # cap at 20h → difficulty 1.0

        # 4 – days in internship (normalised to 180 days = 1.0)
        if intern.date_joined:
            days = (timezone.now() - intern.date_joined).days
            state[4] = round(min(days / 180.0, 1.0), 3)

        # 5 – number of known skills (normalised to 20 skills = 1.0)
        skill_count = SkillProfile.objects.filter(intern_id=intern_id).count()
        state[5] = round(min(skill_count / 20.0, 1.0), 3)

        # 6 – average skill mastery
        avg_mastery = SkillProfile.objects.filter(intern_id=intern_id).aggregate(Avg('mastery_level'))['mastery_level__avg']
        state[6] = round(avg_mastery or 0.0, 3)

        # 7 – engagement score (from latest performance metrics, 0-100 → 0-1)
        latest_perf = PerformanceMetrics.objects.filter(intern_id=intern_id).order_by('-period_start').first()
        if latest_perf:
            state[7] = round(min(latest_perf.engagement_score / 100.0, 1.0), 3)

        # 8 – dropout risk score (inverted: 0=risky, 1=safe)
        if latest_perf:
            state[8] = round(1.0 - min(latest_perf.dropout_risk_score / 100.0, 1.0), 3)

        # 9 - Overdue task ratio (count of overdue / count of assigned/in_progress)
        active_tasks = tasks.filter(status__in=['ASSIGNED', 'IN_PROGRESS', 'REWORK'])
        if active_tasks.exists():
            overdue_count = active_tasks.filter(due_date__lt=timezone.now()).count()
            state[9] = round(min(overdue_count / active_tasks.count(), 1.0), 3)
        else:
            state[9] = 0.0

    except Exception as e:
        logger.warning(f"RLTaskAssigner.get_state: error for intern {intern_id}: {e}")

    return state


# ─── Action Selection ─────────────────────────────────────────────────────────

def select_action(intern_id: int, state: list) -> str:
    """
    Epsilon-greedy action selection from Q-table.
    Returns an action name from ACTIONS list.
    """
    key = _state_key(state)
    _ensure_q_row(intern_id, key)

    epsilon = _get_epsilon(intern_id)
    if random.random() < epsilon:
        # Explore
        action_idx = random.randrange(len(ACTIONS))
    else:
        # Exploit – pick best Q-value
        q_values = _Q_TABLE[intern_id][key]
        action_idx = q_values.index(max(q_values))

    return ACTIONS[action_idx]


# ─── Reward Calculation ───────────────────────────────────────────────────────

def calculate_reward(task) -> tuple[float, dict]:
    """
    Calculate reward for a completed/evaluated task.
    Returns (total_reward, breakdown_dict)
    """
    breakdown = {
        'completion': 0.0,
        'quality': 0.0,
        'growth': 0.0,
        'engagement': 0.0,
        'overdue_penalty': 0.0,
    }

    # Completion signal
    if task.status in ['COMPLETED', 'REVIEWED']:
        breakdown['completion'] = W_COMPLETION
    elif task.status == 'SUBMITTED':
        breakdown['completion'] = W_COMPLETION * 0.7  # partial

    # Quality signal (0-5 → 0-1 normalised)
    if task.quality_rating is not None:
        quality_norm = task.quality_rating / 5.0
        breakdown['quality'] = W_QUALITY * quality_norm

    # Growth delta: if no rework, bonus; if rework, penalty
    if not task.rework_required and task.status == 'COMPLETED':
        breakdown['growth'] = W_GROWTH
    elif task.rework_required:
        breakdown['growth'] = -W_GROWTH * 0.3

    # Engagement: add engagement reward if completed early
    if task.due_date and task.completed_at:
        time_remaining = (task.due_date - task.completed_at).total_seconds()
        if time_remaining > 0:
            # Completed before deadline
            breakdown['engagement'] = W_ENGAGEMENT
        # Overdue penalty
        if time_remaining < 0:
            hours_overdue = abs(time_remaining) / 3600.0
            breakdown['overdue_penalty'] = -W_OVERDUE * min(hours_overdue / 24.0, 5.0)

    total = sum(breakdown.values())
    return round(total, 3), breakdown


# ─── Policy Update ────────────────────────────────────────────────────────────

def update_policy(intern_id: int, state: list, action: str, reward: float, next_state: list):
    """
    Q-Learning update:  Q(s,a) ← Q(s,a) + α * [R + γ·max Q(s',a') - Q(s,a)]
    Also persists experience to RLExperienceBuffer.
    """
    key = _state_key(state)
    next_key = _state_key(next_state)
    _ensure_q_row(intern_id, key)
    _ensure_q_row(intern_id, next_key)

    action_idx = ACTIONS.index(action)
    current_q  = _Q_TABLE[intern_id][key][action_idx]
    max_next_q = max(_Q_TABLE[intern_id][next_key])

    # Bellman equation
    new_q = current_q + ALPHA * (reward + GAMMA * max_next_q - current_q)
    _Q_TABLE[intern_id][key][action_idx] = round(new_q, 4)

    _decay_epsilon(intern_id)

    # Persist to DB for analytics / future replay
    try:
        from apps.analytics.models import RLExperienceBuffer
        RLExperienceBuffer.objects.create(
            intern_id=intern_id,
            state=state,
            action=action,
            reward=reward,
            next_state=next_state,
            done=False,
        )
    except Exception as e:
        logger.warning(f"RLTaskAssigner.update_policy: DB persist failed: {e}")


# ─── Main Public API ──────────────────────────────────────────────────────────

def get_optimal_difficulty(intern_id: int) -> int:
    """
    Return the recommended task difficulty (1-5) without executing a full recommendation.
    Uses greedy policy (no exploration).
    """
    state = get_state(intern_id)
    key = _state_key(state)
    _ensure_q_row(intern_id, key)

    q_values = _Q_TABLE[intern_id][key]
    best_action_idx = q_values.index(max(q_values))
    best_action = ACTIONS[best_action_idx]
    return ACTION_DIFFICULTY_MAP.get(best_action, 3)


def assign_task_recommendation_greedy(intern_id: int) -> dict:
    """
    Full RL pipeline using greedy policy (no exploration).
    Returns consistent top 3 task recommendations based on the intern's current state.
    This is used when we want deterministic, consistent results (e.g., for displaying
    top recommendations that don't change on refresh).
    """
    state = get_state(intern_id)
    key = _state_key(state)
    _ensure_q_row(intern_id, key)

    # Use greedy policy - select best action based on Q-values (no exploration)
    q_values = _Q_TABLE[intern_id][key]
    
    # If all Q-values are 0 (new intern with no history), use default moderate task
    if max(q_values) == 0:
        best_action_idx = 1  # Default to MODERATE_TASK
    else:
        best_action_idx = q_values.index(max(q_values))
    
    action = ACTIONS[best_action_idx]
    difficulty = ACTION_DIFFICULTY_MAP.get(action, 3)

    # Get all action types sorted by Q-value to return top 3 diverse recommendations
    action_scores = [(ACTIONS[i], q_values[i], ACTION_DIFFICULTY_MAP.get(ACTIONS[i], 3)) for i in range(len(ACTIONS))]
    action_scores.sort(key=lambda x: x[1], reverse=True)

    # Find matching templates from DB - get top 3 from different action types
    recommended_templates = []
    try:
        from apps.analytics.models import TaskTemplate
        
        # First try: Get templates for top actions with flexible matching
        for act, _, diff in action_scores[:3]:
            # Try exact match first
            templates = TaskTemplate.objects.filter(
                difficulty=diff,
                action_type=act,
                is_active=True
            )[:1]
            if not templates:
                # Fallback: get any templates with similar difficulty
                templates = TaskTemplate.objects.filter(
                    difficulty__gte=diff-1,
                    difficulty__lte=diff+1,
                    is_active=True
                )[:1]
            for t in templates:
                recommended_templates.append({
                    'id': t.id,
                    'title': t.title,
                    'difficulty': t.difficulty,
                    'estimated_hours': t.estimated_hours,
                    'skills': t.skills_required,
                    'learning_value': t.learning_value,
                    'action_type': t.action_type,
                })
        
        # Fallback: If still no templates found, get any active templates
        if not recommended_templates:
            templates = TaskTemplate.objects.filter(is_active=True)[:3]
            recommended_templates = [
                {
                    'id': t.id,
                    'title': t.title,
                    'difficulty': t.difficulty,
                    'estimated_hours': t.estimated_hours,
                    'skills': t.skills_required,
                    'learning_value': t.learning_value,
                    'action_type': t.action_type,
                }
                for t in templates
            ]
            
        # Last resort: If STILL no templates, create dummy templates for demo
        if not recommended_templates:
            recommended_templates = [
                {'id': 1, 'title': 'Build RESTful APIs', 'difficulty': 3, 'estimated_hours': 3, 'skills': ['Python', 'API'], 'learning_value': 0.8, 'action_type': 'MODERATE_TASK'},
                {'id': 2, 'title': 'Database Schema Design', 'difficulty': 3, 'estimated_hours': 2, 'skills': ['SQL', 'Database'], 'learning_value': 0.75, 'action_type': 'MODERATE_TASK'},
                {'id': 3, 'title': 'Code Review Practice', 'difficulty': 2, 'estimated_hours': 1, 'skills': ['Communication', 'Quality'], 'learning_value': 0.7, 'action_type': 'EASY_TASK'},
            ]
    except Exception as e:
        logger.warning(f"Could not fetch task templates: {e}")
        # Fallback to dummy templates on error
        recommended_templates = [
            {'id': 1, 'title': 'Build RESTful APIs', 'difficulty': 3, 'estimated_hours': 3, 'skills': ['Python', 'API'], 'learning_value': 0.8, 'action_type': 'MODERATE_TASK'},
            {'id': 2, 'title': 'Database Schema Design', 'difficulty': 3, 'estimated_hours': 2, 'skills': ['SQL', 'Database'], 'learning_value': 0.75, 'action_type': 'MODERATE_TASK'},
            {'id': 3, 'title': 'Code Review Practice', 'difficulty': 2, 'estimated_hours': 1, 'skills': ['Communication', 'Quality'], 'learning_value': 0.7, 'action_type': 'EASY_TASK'},
        ]

    # Limit to top 3 overall
    recommended_templates = recommended_templates[:3]

    return {
        'intern_id': intern_id,
        'state_vector': state,
        'action': action,
        'recommended_difficulty': difficulty,
        'exploration_rate': 0.0,  # Always 0 for greedy policy
        'q_values': q_values,
        'recommended_templates': recommended_templates,
        'rationale': _generate_rationale(action, state),
        'is_greedy': True,  # Indicates this uses greedy policy for consistency
    }


def assign_task_recommendation(intern_id: int) -> dict:
    """
    Full RL pipeline:
      1. Build state vector
      2. Select action (epsilon-greedy)
      3. Return recommendation dict
    """
    state = get_state(intern_id)
    action = select_action(intern_id, state)
    difficulty = ACTION_DIFFICULTY_MAP.get(action, 3)
    epsilon = _get_epsilon(intern_id)

    # Find matching templates from DB
    recommended_templates = []
    try:
        from apps.analytics.models import TaskTemplate
        templates = TaskTemplate.objects.filter(
            difficulty=difficulty,
            action_type=action,
            is_active=True
        )[:3]
        recommended_templates = [
            {
                'id': t.id,
                'title': t.title,
                'difficulty': t.difficulty,
                'estimated_hours': t.estimated_hours,
                'skills': t.skills_required,
                'learning_value': t.learning_value,
            }
            for t in templates
        ]
    except Exception:
        pass

    return {
        'intern_id': intern_id,
        'state_vector': state,
        'action': action,
        'recommended_difficulty': difficulty,
        'exploration_rate': round(epsilon, 3),
        'q_values': _Q_TABLE.get(intern_id, {}).get(_state_key(state), [0] * 5),
        'recommended_templates': recommended_templates,
        'rationale': _generate_rationale(action, state),
        'overdue_count': tasks.filter(status__in=['ASSIGNED', 'IN_PROGRESS', 'REWORK'], due_date__lt=timezone.now()).count() if 'tasks' in locals() else 0
    }


def _generate_rationale(action: str, state: list) -> str:
    """Generate a human-readable explanation for the recommendation."""
    quality, completion_rate, growth_velocity, difficulty_handled, days, \
        skill_count, avg_mastery, engagement, risk_inverted, overdue_ratio = state

    risk = 1.0 - risk_inverted

    # Prioritize overdue mention if significant
    if overdue_ratio > 0.2:
        return (
            f"Prioritizing backlog management. {overdue_ratio:.0%} of active tasks are overdue. "
            f"Recommended {action.lower().replace('_', ' ')} to regain momentum."
        )

    if action == 'EASY_TASK':
        return (
            f"Recommending an easy task. completion_rate={completion_rate:.0%}, "
            f"avg_mastery={avg_mastery:.0%}. Build confidence before increasing difficulty."
        )
    elif action == 'MODERATE_TASK':
        return (
            f"Recommending moderate difficulty. Growth velocity={growth_velocity:.0%}, "
            f"quality={quality:.0%}. Balanced challenge is optimal."
        )
    elif action == 'HARD_TASK':
        return (
            f"Recommending a stretch goal. High mastery={avg_mastery:.0%} and "
            f"quality={quality:.0%}. Intern is ready for more challenge."
        )
    elif action == 'SKILL_GAP_TASK':
        return (
            f"Recommending skill-gap task. skill_count={skill_count:.0%}, "
            f"mastery={avg_mastery:.0%}. Address weak areas before advancing."
        )
    elif action == 'COLLABORATION_TASK':
        return (
            f"Recommending collaboration task. engagement={engagement:.0%}, "
            f"dropout_risk={risk:.0%}. Team activity improves engagement."
        )
    return "Recommendation based on intern's current performance profile."


def record_task_outcome(intern_id: int, task_id: int):
    """
    Called after a task is completed/evaluated.
    Computes reward, updates Q-table, persists experience.
    """
    from apps.analytics.models import TaskTracking

    try:
        task = TaskTracking.objects.get(id=task_id, intern_id=intern_id)
    except TaskTracking.DoesNotExist:
        logger.warning(f"record_task_outcome: task {task_id} not found for intern {intern_id}")
        return

    # State before the task
    prev_state = get_state(intern_id)

    reward, breakdown = calculate_reward(task)

    # Get action from task difficulty approximation
    estimated_difficulty = min(5, max(1, round(task.estimated_hours / 4)))
    rev_map = {1: 'EASY_TASK', 2: 'EASY_TASK', 3: 'MODERATE_TASK', 4: 'HARD_TASK', 5: 'HARD_TASK'}
    action = rev_map.get(estimated_difficulty, 'MODERATE_TASK')

    # Next state (same as current after completion)
    next_state = get_state(intern_id)

    update_policy(intern_id, prev_state, action, reward, next_state)

    # Update reward breakdown in the experience buffer
    try:
        from apps.analytics.models import RLExperienceBuffer
        latest = RLExperienceBuffer.objects.filter(intern_id=intern_id).order_by('-timestamp').first()
        if latest:
            latest.task_ref_id = task_id
            latest.reward_breakdown = breakdown
            latest.save(update_fields=['task_ref_id', 'reward_breakdown'])
    except Exception as e:
        logger.warning(f"record_task_outcome: breakdown save failed: {e}")

    logger.info(f"RL update for intern {intern_id}: action={action}, reward={reward}")
