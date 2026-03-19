"""
LLM-powered Task Generator for automatic task suggestions.
Uses LangChain with GitHub Models to generate contextual tasks for interns.
"""
import os
import json
import logging
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)


class LLMTaskGenerator:
    """
    LangChain-powered task generator using GitHub Models.
    Generates contextual tasks based on intern's progress, completed tasks, and ongoing tasks.
    """
    
    MODEL_NAME = "gpt-4o-mini"
    
    def __init__(self):
        self._llm = None
    
    @property
    def llm(self):
        """Lazy-load the LLM using LangChain."""
        if self._llm is None:
            self._initialize_llm()
        return self._llm
    
    def _initialize_llm(self):
        """Initialize LangChain LLM with GitHub Models."""
        try:
            api_key = os.environ.get("AI_TALENT_GITHUB_TOKEN") or os.environ.get("OPENAI_API_KEY")
            
            if not api_key:
                raise ValueError("No API key found. Set AI_TALENT_GITHUB_TOKEN in .env")
            
            base_url = "https://models.inference.ai.azure.com"
            
            os.environ["OPENAI_API_KEY"] = api_key
            os.environ["OPENAI_BASE_URL"] = base_url
            
            logger.info("LLMTaskGenerator: Initializing with GitHub Models")
            
            from langchain_openai import ChatOpenAI
            
            self._llm = ChatOpenAI(
                model="gpt-4o-mini",
                temperature=0.3,
                max_tokens=2000,
                api_key=api_key,
                base_url=base_url
            )
            
            logger.info("LLMTaskGenerator: LLM initialized successfully")
            
        except ImportError as e:
            logger.error(f"LangChain not installed: {e}")
            raise RuntimeError(
                "LangChain not installed. Run: pip install langchain langchain-openai"
            )
    
    def generate_task_suggestions(
        self,
        intern_name: str,
        intern_skills: List[str],
        completed_tasks: List[Dict[str, Any]],
        ongoing_tasks: List[Dict[str, Any]],
        module_name: Optional[str] = None,
        module_description: Optional[str] = None,
        task_context: Optional[str] = None,
        num_suggestions: int = 3
    ) -> Dict[str, Any]:
        """
        Generate task suggestions based on intern's profile and progress.
        """
        logger.info(f"LLMTaskGenerator: Generating task suggestions for {intern_name}")
        
        prompt = self._build_context_prompt(
            intern_name=intern_name,
            intern_skills=intern_skills,
            completed_tasks=completed_tasks,
            ongoing_tasks=ongoing_tasks,
            module_name=module_name,
            module_description=module_description,
            task_context=task_context,
            num_suggestions=num_suggestions
        )
        
        try:
            response = self.llm.invoke(prompt)
            content = response.content if hasattr(response, 'content') else str(response)
            result = self._parse_llm_response(content)
            logger.info(f"LLMTaskGenerator: Generated {len(result.get('tasks', []))} task suggestions")
            return result
        except Exception as e:
            logger.error(f"LLMTaskGenerator error: {e}")
            return {"error": str(e), "tasks": []}
    
    def _build_context_prompt(
        self,
        intern_name: str,
        intern_skills: List[str],
        completed_tasks: List[Dict[str, Any]],
        ongoing_tasks: List[Dict[str, Any]],
        module_name: Optional[str],
        module_description: Optional[str],
        task_context: Optional[str],
        num_suggestions: int
    ) -> str:
        """Build a detailed prompt with intern context."""
        
        # Format completed tasks
        completed_text = ""
        if completed_tasks:
            for i, task in enumerate(completed_tasks[-5:], 1):
                completed_text += f"""
{i}. Task: {task.get('title', 'N/A')}
   Description: {task.get('description', 'N/A')}
   Status: {task.get('status', 'N/A')}
   Quality Rating: {task.get('quality_rating', 'N/A')}"""
        else:
            completed_text = "No completed tasks yet."
        
        # Format ongoing tasks
        ongoing_text = ""
        if ongoing_tasks:
            for i, task in enumerate(ongoing_tasks, 1):
                ongoing_text += f"""
{i}. Task: {task.get('title', 'N/A')}
   Description: {task.get('description', 'N/A')}
   Status: {task.get('status', 'N/A')}
   Due Date: {task.get('due_date', 'N/A')}"""
        else:
            ongoing_text = "No ongoing tasks."
        
        skills_text = ", ".join(intern_skills) if intern_skills else "No skills on record"
        
        prompt = f"""You are an AI assistant helping a manager assign tasks to interns.
Generate {num_suggestions} task suggestions for the following intern based on their profile, progress, and the specific module they are working on.

## Intern Profile
- Name: {intern_name}
- Current Skills: {skills_text}

## Project/Module Context
- Module Name: {module_name or 'N/A'}
- Module Description: {module_description or 'N/A'}
- Additional Task Context: {task_context or 'No specific task requirements provided.'}

## Completed Tasks
{completed_text}

## Ongoing Tasks
{ongoing_text}

## Task Requirements
Generate tasks that:
1. Align with the Module context provided
2. Build upon completed tasks to deepen skills
3. Are appropriate for the intern's current skill level
4. Provide clear, actionable output

For each task, provide:
- title: A clear, concise task title
- description: Detailed description of what the intern should do
- difficulty: difficulty level (1-5, where 1=beginner, 5=expert)
- estimated_hours: Estimated hours to complete
- skills_required: List of skills this task will help develop
- rationale: Brief explanation of why this task is appropriate for this module

Return your response as a JSON object in this format:
{{
  "tasks": [
    {{
      "title": "Task title",
      "description": "Task description",
      "difficulty": 3,
      "estimated_hours": 4,
      "skills_required": ["skill1", "skill2"],
      "rationale": "Why this task is appropriate"
    }}
  ],
  "summary": "Brief summary of the suggested tasks"
}}

Only return valid JSON, no additional text."""
        
        return prompt
    
    def _parse_llm_response(self, content: str) -> Dict[str, Any]:
        """Parse the LLM response to extract task suggestions."""
        try:
            # Try to find JSON in the response
            content = content.strip()
            if content.startswith("```json"):
                content = content[7:]
            if content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]
            
            content = content.strip()
            result = json.loads(content)
            
            # Validate the structure
            if "tasks" not in result:
                result["tasks"] = []
            
            return result
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response: {e}")
            # Try to extract any JSON-like content
            try:
                import re
                json_match = re.search(r'\{[\s\S]*\}', content)
                if json_match:
                    return json.loads(json_match.group())
            except:
                pass
            return {"error": "Failed to parse task suggestions", "tasks": []}
    
    def review_task(
        self,
        task_data: Dict[str, Any],
        intern_name: str,
        intern_skills: List[str]
    ) -> Dict[str, Any]:
        """
        Review a manager-modified task and provide feedback.
        Returns approval status and suggestions.
        """
        prompt = f"""You are an AI assistant reviewing a task before assignment.
        
Intern: {intern_name}
Skills: {", ".join(intern_skills)}

Task to review:
- Title: {task_data.get('title', 'N/A')}
- Description: {task_data.get('description', 'N/A')}
- Difficulty: {task_data.get('difficulty', 'N/A')}
- Estimated Hours: {task_data.get('estimated_hours', 'N/A')}
- Skills Required: {", ".join(task_data.get('skills_required', []))}

Is this task appropriate for this intern? Consider:
1. Difficulty match with skill level
2. Relevance to intern's skills and goals
3. Feasibility within estimated hours
4. Learning value

Return JSON:
{{
  "approved": true/false,
  "feedback": "Brief feedback on the task",
  "suggestions": ["suggestion1", "suggestion2"] or []
}}"""
        
        try:
            response = self.llm.invoke(prompt)
            content = response.content if hasattr(response, 'content') else str(response)
            return self._parse_llm_response(content)
        except Exception as e:
            logger.error(f"Error reviewing task: {e}")
            return {"approved": False, "feedback": str(e), "suggestions": []}


# Singleton instance
_task_generator = None

def get_task_generator() -> LLMTaskGenerator:
    """Get or create the task generator instance."""
    global _task_generator
    if _task_generator is None:
        _task_generator = LLMTaskGenerator()
    return _task_generator
