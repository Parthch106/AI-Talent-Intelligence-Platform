import os
import json
import logging
from typing import Dict, List, Any, Optional
from apps.analytics.services.llm_task_generator import LLMTaskGenerator

logger = logging.getLogger(__name__)

class LLMLearningPathGenerator(LLMTaskGenerator):
    """
    Extends LLMTaskGenerator to provide learning path skill suggestions.
    """
    
    def suggest_skills_from_goal(
        self,
        intern_name: str,
        intern_skills: List[str],
        goal_text: str,
        available_skills: List[str],
        basics_only: bool = False
    ) -> Dict[str, Any]:
        """
        Suggest a set of skills for an intern based on their goal.
        """
        logger.info(f"LLMLearningPathGenerator: Suggesting skills for {intern_name} with goal: {goal_text} (basics_only={basics_only})")
        
        skills_text = ", ".join(intern_skills) if intern_skills else "No skills on record"
        available_text = ", ".join(available_skills)
        
        basics_instruction = ""
        if basics_only:
            basics_instruction = "\nIMPORTANT: The user wants to FOCUS ON BASICS. Select ONLY foundational, introductory skills (e.g. 'Python' instead of 'Django REST Framework')."

        prompt = f"""You are an AI learning path architect.
Identify 3-5 key skills from the 'Available Skills' list that an intern should focus on to achieve their specific goal.{basics_instruction}

## Intern Profile
- Name: {intern_name}
- Current Known Skills: {skills_text}

## Goal
{goal_text}

## Available Skills (Select from these ONLY)
{available_text}

## Requirements
1. The selection should be ambitious but achievable.
2. Order them logically (fundamentals first).
3. Provide a brief rationale for the entire path.

Return your response as a JSON object:
{{
  "suggested_skills": ["Skill1", "Skill2", "Skill3"],
  "rationale": "Why this path is optimal for the goal",
  "estimated_total_weeks": 4
}}

Only return valid JSON, no additional text."""

        try:
            content = self._invoke_llm(prompt)
            result = self._parse_llm_response(content)
            
            # Filter suggested skills to only include those in available_skills (case-insensitive)
            available_set = {s.lower() for s in available_skills}
            suggested = result.get("suggested_skills", [])
            filtered_suggested = []
            
            # Map back to original casing
            skill_map = {s.lower(): s for s in available_skills}
            
            for s in suggested:
                if s.lower() in available_set:
                    filtered_suggested.append(skill_map[s.lower()])
            
            result["suggested_skills"] = filtered_suggested
            return result
        except Exception as e:
            logger.error(f"LLMLearningPathGenerator error: {e}")
            return {"error": str(e), "suggested_skills": [], "rationale": "Error generating suggestions."}

    def generate_milestone_task(
        self,
        skill: str,
        intern_name: str,
        goal_text: str,
        basics_only: bool = False
    ) -> Dict[str, Any]:
        """
        Generate a specific practical task and starter script for a given skill.
        """
        logger.info(f"LLMLearningPathGenerator: Generating task for {skill} (intern: {intern_name}, basics={basics_only})")
        
        basics_instruction = ""
        if basics_only:
            basics_instruction = "\nIMPORTANT: FOCUS ON ABSOLUTE BASICS and foundational concepts. The task should be introductory."

        prompt = f"""You are a technical mentor.
Your objective is to create a practical, hands-on task STRICTLY focused on teaching the intern the specific skill: '{skill}'.
While their overall learning path is '{goal_text}', this specific task MUST be exclusively about '{skill}' and nothing else.{basics_instruction}

## Requirements
1. Provide a clear 'task_title' that prominently features the skill '{skill}'.
2. Provide a 'task_description' with step-by-step instructions specifically teaching '{skill}'.
3. Provide a 'starter_script' containing ACTUAL WORKING BOILERPLATE CODE using '{skill}'. Do NOT output a placeholder comment like "# Start your implementation here". Write at least 10-20 lines of real code (e.g. skeleton functions, imports, class definitions) that the intern can run.
4. Provide 'estimated_hours' (a realistic number).

CRITICAL INSTRUCTIONS FOR JSON FORMAT:
- You MUST output STRICTLY VALID JSON.
- DO NOT use Python-style multiline strings (with ''' or \"\"\").
- DO NOT use raw unescaped newlines inside strings. Use \\\\n for newlines inside strings.
- Keys and string values MUST use double quotes.

Return your response exactly in this format:
{{
  "task_title": "Build a simple X using Y",
  "task_description": "1. Do this... 2. Do that... 3. Verify by...",
  "starter_script": "import os\\\\n\\\\ndef main():\\\\n    # TODO: Implement the core logic here\\\\n    pass\\\\n\\\\nif __name__ == '__main__':\\\\n    main()",
  "estimated_hours": 2
}}

Only return valid JSON, no additional text."""

        try:
            content = self._invoke_llm(prompt)
            return self._parse_llm_response(content)
        except Exception as e:
            logger.error(f"LLMLearningPathGenerator.generate_milestone_task error: {e}")
            return {
                "error": str(e),
                "task_title": f"Explore {skill}",
                "task_description": f"Research and implement a basic project using {skill}.",
                "starter_script": "# No script generated.",
                "estimated_hours": 2
            }

# Singleton instance
_path_generator = None

def get_learning_path_generator() -> LLMLearningPathGenerator:
    """Get or create the learning path generator instance."""
    global _path_generator
    if _path_generator is None:
        _path_generator = LLMLearningPathGenerator()
    return _path_generator
