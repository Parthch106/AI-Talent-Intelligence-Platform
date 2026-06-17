"""
LLM-powered Task Generator for automatic task suggestions.
Uses Hugging Face router API to generate contextual tasks for interns.
"""
import os
import json
import logging
import requests
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)

# Hugging Face Router Configuration
HF_API_URL = "https://router.huggingface.co/v1/chat/completions"
HF_MODEL = "meta-llama/Llama-3.1-8B-Instruct"



class LLMTaskGenerator:
    """
    Hugging Face-powered task generator.
    Generates contextual tasks based on intern's progress, completed tasks, and ongoing tasks.
    """
    
    def __init__(self):
        self._api_key = None
    
    @property
    def api_key(self):
        """Lazy-load the API key."""
        if self._api_key is None:
            self._initialize_api_key()
        return self._api_key
    
    def _initialize_api_key(self):
        """Initialize API key from settings or environment."""
        from django.conf import settings
        
        # Try to get from Django settings first, then environment
        token = getattr(settings, "HF_TOKEN", None)
        if not token:
            token = os.environ.get("HF_TOKEN")
        
        if token:
            self._api_key = token.strip()
            # Log a masked version for verification without exposing the full secret
            masked_token = f"{self._api_key[:4]}...{self._api_key[-4:]}" if len(self._api_key) > 8 else "***"
            logger.info(f"LLMTaskGenerator: Initialized with token {masked_token}")
        else:
            raise ValueError("No Hugging Face API key found. Set HF_TOKEN in .env or settings.py")
    
    def generate_task_suggestions(
        self,
        intern_name: str,
        intern_skills: List[str],
        completed_tasks: List[Dict[str, Any]],
        ongoing_tasks: List[Dict[str, Any]],
        project_name: Optional[str] = None,
        project_description: Optional[str] = None,
        module_name: Optional[str] = None,
        module_description: Optional[str] = None,
        task_context: Optional[str] = None,
        num_suggestions: int = 3,
        optimal_difficulty: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Generate task suggestions based on intern's profile and progress.
        Uses Hugging Face router API.
        """
        logger.info(f"LLMTaskGenerator: Generating task suggestions for {intern_name}")
        
        prompt = self._build_context_prompt(
            intern_name=intern_name,
            intern_skills=intern_skills,
            completed_tasks=completed_tasks,
            ongoing_tasks=ongoing_tasks,
            project_name=project_name,
            project_description=project_description,
            module_name=module_name,
            module_description=module_description,
            task_context=task_context,
            num_suggestions=num_suggestions,
            optimal_difficulty=optimal_difficulty
        )
        
        try:
            content = self._invoke_llm(prompt)
            parsed_result = self._parse_llm_response(content)
            
            if not isinstance(parsed_result, dict) or 'pathways' not in parsed_result:
                return {"error": "Invalid format: missing 'pathways' array", "pathways": []}

            # If parsing failed, return fallback static suggestions
            if 'error' in parsed_result or not parsed_result.get('pathways'):
                logger.warning("LLM failed to generate valid JSON, using fallback suggestions")
                return self._get_fallback_task_suggestions(intern_name, intern_skills, module_name, num_suggestions)

            logger.info(f"LLMTaskGenerator: Generated {len(parsed_result.get('pathways', []))} task pathways")
            return parsed_result
            
        except requests.exceptions.Timeout:
            logger.error("HF API timeout")
            return {"error": "Request timed out", "tasks": []}
        except Exception as e:
            logger.error(f"LLMTaskGenerator error: {e}")
            return {"error": str(e), "tasks": []}
    
    def _build_context_prompt(
        self,
        intern_name: str,
        intern_skills: List[str],
        completed_tasks: List[Dict[str, Any]],
        ongoing_tasks: List[Dict[str, Any]],
        project_name: Optional[str],
        project_description: Optional[str],
        module_name: Optional[str],
        module_description: Optional[str],
        task_context: Optional[str],
        num_suggestions: int,
        optimal_difficulty: Optional[int]
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
Generate 3 distinct Task Pathways (Learning Paths) for the following intern based on their profile, progress, and the specific module they are working on. Each pathway should represent a different strategic approach to the problem and must contain exactly 4 to 5 sequential tasks.

## Intern Profile
- Name: {intern_name}
- Current Skills: {skills_text}

## Project/Module Context
- Project Name: {project_name or 'N/A'}
- Project Description: {project_description or 'N/A'}
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
3. Are exactly targeted to the intern's current skill level. {f'**CRITICAL: You MUST generate tasks ONLY with difficulty level {optimal_difficulty}.**' if optimal_difficulty else ''}
4. Provide clear, actionable output

For each task, provide:
- title: A clear, concise task title
- description: Detailed description of what the intern should do
- difficulty: difficulty level {f'(MUST be exactly {optimal_difficulty})' if optimal_difficulty else '(1-5, where 1=beginner, 5=expert)'}
- estimated_hours: Estimated hours to complete
- skills_required: List of skills this task will help develop
- rationale: Brief explanation of why this task is appropriate for this module

Return your response as a JSON object in this exactly matching format:
{{
  "pathways": [
    {{
      "name": "Pathway Name (e.g., Data Pipeline Focus)",
      "description": "Brief explanation of this approach",
      "tasks": [
        {{
          "title": "Task title",
          "description": "Task description",
          "difficulty": 3,
          "estimated_hours": 4,
          "skills_required": ["skill1", "skill2"],
          "rationale": "Why this task is appropriate"
        }}
      ]
    }}
  ],
  "summary": "Brief summary of the suggested pathways"
}}

Only return valid JSON, no additional text."""
        
        return prompt
    
    def _parse_llm_response(self, content: str) -> Dict[str, Any]:
        """Parse the LLM response to extract task suggestions."""
        try:
            # Try to find JSON in the response
            content = content.strip()
            
            # Handle markdown code blocks
            if content.startswith("```json"):
                content = content[7:]
            elif content.startswith("```"):
                content = content[3:]
            
            # Find the end of code block if present
            if "```" in content:
                content = content[:content.find("```")]
            
            content = content.strip()
            
            # Try to find JSON object in the content
            try:
                # First try to parse as-is. If the LLM followed instructions, this will succeed.
                result = json.loads(content)
            except json.JSONDecodeError as e:
                # Fallback 1: LLMs (especially Llama 3) often fail to escape raw newlines in strings.
                # We use a regex to find all double-quoted strings and escape newlines within them.
                import re
                def escape_newlines(match):
                    s = match.group(0)
                    return s.replace('\n', '\\n').replace('\r', '')
                
                content_fixed = re.sub(r'"(?:\\.|[^"\\])*"', escape_newlines, content)
                try:
                    result = json.loads(content_fixed)
                except json.JSONDecodeError:
                    # Fallback 2: Try to extract JSON-like content using regex or ast
                    import ast
                
                # Look for dict-like structure in the fixed content
                dict_match = re.search(r'\{[\s\S]*\}', content_fixed if 'content_fixed' in locals() else content)
                if dict_match:
                    dict_str = dict_match.group()
                    try:
                        # First try strict JSON on the matched block
                        result = json.loads(dict_str)
                    except json.JSONDecodeError:
                        try:
                            # Fallback: Many LLMs output Python dictionaries with ''' or """, which is invalid JSON
                            # but valid Python. Use ast.literal_eval to safely parse it.
                            result = ast.literal_eval(dict_str)
                        except Exception as e:
                            logger.error(f"ast.literal_eval failed: {e}")
                            raise ValueError("No valid JSON or Python dict found in response")
                else:
                    raise ValueError("No JSON found in response")
            
            # Validate the structure
            if "pathways" not in result:
                result["pathways"] = []
            
            return result
            
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"Failed to parse LLM response: {e}")
            return {"error": "Failed to parse task suggestions", "pathways": []}
    
    def review_task(
        self,
        task_data: Dict[str, Any],
        intern_name: str,
        intern_skills: List[str]
    ) -> Dict[str, Any]:
        """
        Review a manager-modified task and provide feedback.
        Returns approval status and suggestions.
        Uses Hugging Face router API.
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
            content = self._invoke_llm(prompt, max_tokens=1000)
            if not content or ("error" in content.lower() and len(content) < 50):
                return {"approved": False, "feedback": content or "API error", "suggestions": []}
            
            parsed_result = self._parse_llm_response(content)

            # If parsing failed, return basic approval
            if 'error' in parsed_result:
                logger.warning("LLM failed to generate valid review JSON, using basic approval")
                return {
                    "approved": True,
                    "feedback": "Task appears appropriate for the intern's skill level",
                    "suggestions": []
                }

            return parsed_result
                
        except Exception as e:
            logger.error(f"Error reviewing task: {e}")
            return {"approved": False, "feedback": str(e), "suggestions": []}

    def _invoke_llm(self, prompt: str, max_tokens: int = 2000, temperature: float = 0.3) -> str:
        """
        Generic method to call the Hugging Face router API.
        Returns the text content of the response.
        """
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": HF_MODEL,
                "messages": [
                    {"role": "user", "content": prompt}
                ],
                "max_tokens": max_tokens,
                "temperature": temperature
            }
            
            response = requests.post(HF_API_URL, headers=headers, json=payload, timeout=60)
            
            if response.status_code != 200:
                logger.error(f"HF API error: {response.status_code} - {response.text}")
                return f"Error: API returned {response.status_code}"
            
            result = response.json()
            
            if "choices" in result and len(result["choices"]) > 0:
                return result["choices"][0]["message"]["content"]
            else:
                logger.error(f"Unexpected HF response format: {result}")
                return "Error: Unexpected response format"
                
        except Exception as e:
            logger.error(f"LLM invocation error: {e}")
            return f"Error: {str(e)}"

    def _get_fallback_task_suggestions(self, intern_name: str, intern_skills: List[str], module_name: Optional[str], num_suggestions: int) -> Dict[str, Any]:
        """Provide fallback task suggestions when LLM fails."""
        logger.info(f"Using fallback task suggestions for {intern_name}")

        # Determine skill level from provided skills
        skill_level = "beginner"
        if any(skill.lower() in ['react', 'node.js', 'python', 'django', 'flask'] for skill in intern_skills):
            skill_level = "intermediate"

        # Base task suggestions
        base_tasks = {
            "beginner": [
                {
                    "title": "Create a Responsive Landing Page",
                    "description": "Build a responsive landing page using HTML, CSS, and JavaScript with modern design principles",
                    "difficulty": 2,
                    "estimated_hours": 8,
                    "skills_required": ["HTML", "CSS", "JavaScript", "Responsive Design"],
                    "rationale": "Fundamental web development skills essential for any frontend developer"
                },
                {
                    "title": "Implement Form Validation",
                    "description": "Add client-side and server-side validation to user registration and login forms",
                    "difficulty": 2,
                    "estimated_hours": 6,
                    "skills_required": ["JavaScript", "Form Handling", "User Experience"],
                    "rationale": "Critical for user data integrity and application security"
                },
                {
                    "title": "Database Design and Setup",
                    "description": "Design database schema and set up initial database structure for the application",
                    "difficulty": 2,
                    "estimated_hours": 5,
                    "skills_required": ["Database Design", "SQL", "Data Modeling"],
                    "rationale": "Foundation for data persistence and application functionality"
                }
            ],
            "intermediate": [
                {
                    "title": "Implement User Authentication System",
                    "description": "Build a complete authentication system with login, registration, password reset, and session management",
                    "difficulty": 3,
                    "estimated_hours": 12,
                    "skills_required": ["Authentication", "Security", "Session Management"],
                    "rationale": "Essential security feature for any web application"
                },
                {
                    "title": "API Development and Integration",
                    "description": "Create RESTful APIs and integrate them with the frontend application",
                    "difficulty": 3,
                    "estimated_hours": 10,
                    "skills_required": ["REST API", "Backend Development", "API Integration"],
                    "rationale": "Modern web applications require robust API architecture"
                },
                {
                    "title": "Performance Optimization",
                    "description": "Optimize application performance through code splitting, lazy loading, and caching strategies",
                    "difficulty": 4,
                    "estimated_hours": 8,
                    "skills_required": ["Performance", "Optimization", "Web Vitals"],
                    "rationale": "Performance is crucial for user experience and SEO"
                }
            ]
        }

        tasks = base_tasks.get(skill_level, base_tasks["beginner"])

        # Structure as pathways
        pathways = [
            {
                "name": "Standard Development Path",
                "description": "A structured sequence to build foundational skills in this domain.",
                "tasks": tasks
            }
        ]

        # Customize based on module if provided
        if module_name and module_name.lower() == "authentication":
            pathways[0]["tasks"] = [task for task in tasks if "authentication" in task["title"].lower()]
        elif module_name and "api" in module_name.lower():
            pathways[0]["tasks"] = [task for task in tasks if "api" in task["title"].lower()]

        return {
            "pathways": pathways,
            "summary": f"Fallback task pathways for {intern_name} ({skill_level} level)"
        }


# Singleton instance
_task_generator = None

def get_task_generator() -> LLMTaskGenerator:
    """Get or create the task generator instance."""
    global _task_generator
    if _task_generator is None:
        _task_generator = LLMTaskGenerator()
    return _task_generator
