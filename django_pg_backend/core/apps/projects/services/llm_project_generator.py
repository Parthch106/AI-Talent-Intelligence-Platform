"""
LLM-powered Project Generator for automatic project suggestions.
Uses Hugging Face router API to generate contextual project ideas for interns.
"""
import os
import json
import logging
import requests
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)

# Hugging Face Router Configuration
HF_API_URL = "https://router.huggingface.co/v1/chat/completions"
HF_MODEL = "meta-llama/Llama-3.2-1B-Instruct"

class LLMProjectGenerator:
    """
    Hugging Face-powered project generator.
    Generates contextual project ideas based on intern's department, skills, and experience level.
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
        """Initialize API key from environment."""
        from django.conf import settings
        self._api_key = getattr(settings, 'HF_TOKEN', os.environ.get("HF_TOKEN"))
        if not self._api_key:
            raise ValueError("No Hugging Face API key found. Set HF_TOKEN in .env")
        logger.info("LLMProjectGenerator: Using Hugging Face API")
    
    def generate_project_suggestions(
        self,
        department: str,
        experience_level: str = "BEGINNER",
        num_suggestions: int = 3,
        include_modules: bool = True,
        description: str = "",
        skills: str = ""
    ) -> Dict[str, Any]:
        """
        Generate project suggestions based on department and experience level.
        
        Args:
            department: Department name (e.g., "Web Development", "Data Science")
            experience_level: Intern's experience level (BEGINNER, INTERMEDIATE, ADVANCED)
            num_suggestions: Number of project suggestions to generate
            include_modules: Whether to include detailed module breakdown
            
        Returns:
            Dictionary containing project suggestions with modules
        """
        logger.info(f"LLMProjectGenerator: Generating project suggestions for {department} ({experience_level})")
        
        prompt = self._build_context_prompt(
            department=department,
            experience_level=experience_level,
            num_suggestions=num_suggestions,
            include_modules=include_modules,
            description=description,
            skills=skills
        )
        
        try:
            # Call Hugging Face router API
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": HF_MODEL,
                "messages": [
                    {"role": "user", "content": prompt}
                ],
                "max_tokens": 2000,
                "temperature": 0.4
            }
            
            response = requests.post(HF_API_URL, headers=headers, json=payload, timeout=60)
            
            if response.status_code != 200:
                logger.error(f"HF API error: {response.status_code} - {response.text}")
                logger.warning("LLM API failed, using fallback suggestions")
                return self._get_fallback_suggestions(department, experience_level, description, skills)
            
            result = response.json()
            
            if "choices" in result and len(result["choices"]) > 0:
                content = result["choices"][0]["message"]["content"]
            else:
                logger.error(f"Unexpected HF response format: {result}")
                logger.warning("Unexpected response format, using fallback suggestions")
                return self._get_fallback_suggestions(department, experience_level, description, skills)
            
            parsed_result = self._parse_llm_response(content)

            # If parsing failed, return fallback static suggestions
            if 'error' in parsed_result or not parsed_result.get('projects'):
                logger.warning("LLM failed to generate valid JSON, using fallback suggestions")
                return self._get_fallback_suggestions(department, experience_level, description, skills)

            logger.info(f"LLMProjectGenerator: Generated {len(parsed_result.get('projects', []))} project suggestions")
            return parsed_result
            
        except requests.exceptions.Timeout:
            logger.error("HF API timeout")
            logger.warning("LLM API timed out, using fallback suggestions")
            return self._get_fallback_suggestions(department, experience_level, description, skills)
        except Exception as e:
            logger.error(f"LLMProjectGenerator error: {e}")
            logger.warning("LLM generation failed, using fallback suggestions")
            return self._get_fallback_suggestions(department, experience_level, description, skills)
    
    def _build_context_prompt(
        self,
        department: str,
        experience_level: str,
        num_suggestions: int,
        include_modules: bool,
        description: str = "",
        skills: str = ""
    ) -> str:
        """Build a detailed prompt with department context."""
        
        # Map experience level to intern level
        level_mapping = {
            "BEGINNER": "beginner",
            "INTERMEDIATE": "intermediate",
            "ADVANCED": "advanced"
        }
        intern_level = level_mapping.get(experience_level, "beginner")
        
        prompt = f"""Generate {num_suggestions} project suggestion(s) for {department} interns.

Requirements:
- 2-4 weeks duration
- Practical {department} skills
- 2-3 modules max per project"""

        # Add optional context if provided
        if description or skills:
            prompt += f"\nContext: {description or ''} {skills or ''}".strip()

        prompt += """

Return ONLY valid JSON:
{
  "projects": [
    {
      "name": "Project Name",
      "description": "Brief description",
      "estimated_duration": 3,
      "difficulty": 2,
      "tech_stack": ["Tech1", "Tech2"],
      "learning_objectives": ["Learn X", "Learn Y"],
      "business_value": "Business value",
      "modules": [
        {
          "name": "Module Name",
          "description": "Brief description",
          "estimated_hours": 4
        }
      ]
    }
  ]
}"""
        
        return prompt
    
    def _parse_llm_response(self, content: str) -> Dict[str, Any]:
        """Parse the LLM response to extract project suggestions."""
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
                result = json.loads(content)
            except json.JSONDecodeError:
                # Try to extract JSON-like content using regex
                import re
                # Look for JSON object (more lenient pattern)
                json_match = re.search(r'\{.*\}', content, re.DOTALL)
                if json_match:
                    try:
                        result = json.loads(json_match.group())
                    except json.JSONDecodeError:
                        # Try to fix common JSON issues
                        json_str = json_match.group()
                        # Fix trailing commas
                        json_str = re.sub(r',\s*\}', '}', json_str)
                        json_str = re.sub(r',\s*\]', ']', json_str)
                        # Remove any extra text before/after braces
                        json_str = re.sub(r'.*(\{.*\}).*', r'\1', json_str, flags=re.DOTALL)
                        try:
                            result = json.loads(json_str)
                        except json.JSONDecodeError:
                            # Try to find and extract just the JSON part
                            start_idx = content.find('{')
                            end_idx = content.rfind('}') + 1
                            if start_idx != -1 and end_idx > start_idx:
                                try:
                                    result = json.loads(content[start_idx:end_idx])
                                except json.JSONDecodeError:
                                    raise ValueError("No valid JSON found in response")
                            else:
                                raise ValueError("No valid JSON found in response")
                else:
                    raise ValueError("No JSON found in response")

            # Validate the structure
            if "projects" not in result:
                result["projects"] = []

            # Ensure projects is a list
            if not isinstance(result.get("projects"), list):
                result["projects"] = []

            return result

        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"Failed to parse LLM response: {e}")
            logger.error(f"Response content: {content[:500]}...")
            return {"error": "Failed to parse project suggestions", "projects": []}
    
    def review_project(
        self,
        project_data: Dict[str, Any],
        department: str,
        experience_level: str
    ) -> Dict[str, Any]:
        """
        Review a manager-modified project and provide feedback.
        Returns approval status and suggestions.
        Uses Hugging Face router API.
        """
        prompt = f"""You are an AI assistant reviewing a project before assignment.

Department: {department}
Intern Experience Level: {experience_level}

Project to review:
- Name: {project_data.get('name', 'N/A')}
- Description: {project_data.get('description', 'N/A')}
- Estimated Duration: {project_data.get('estimated_duration', 'N/A')} weeks
- Difficulty: {project_data.get('difficulty', 'N/A')}
- Tech Stack: {', '.join(project_data.get('tech_stack', []))}
- Learning Objectives: {', '.join(project_data.get('learning_objectives', []))}

Is this project appropriate for this department and experience level? Consider:
1. Difficulty match with experience level
2. Relevance to department skills
3. Feasibility within estimated duration
4. Learning value
5. Practical application

Return JSON:
{{
  "approved": true/false,
  "feedback": "Brief feedback on the project",
  "suggestions": ["suggestion1", "suggestion2"] or []
}}"""
        
        try:
            # Call Hugging Face router API
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": HF_MODEL,
                "messages": [
                    {"role": "user", "content": prompt}
                ],
                "max_tokens": 1000,
                "temperature": 0.3
            }
            
            response = requests.post(HF_API_URL, headers=headers, json=payload, timeout=60)
            
            if response.status_code != 200:
                logger.error(f"HF API error in review_project: {response.status_code}")
                return {"approved": False, "feedback": f"API error: {response.status_code}", "suggestions": []}
            
            result = response.json()
            
            if "choices" in result and len(result["choices"]) > 0:
                content = result["choices"][0]["message"]["content"]
                return self._parse_llm_response(content)
            else:
                return {"approved": False, "feedback": "Unexpected response format", "suggestions": []}
                
        except Exception as e:
            logger.error(f"Error reviewing project: {e}")
            return {"approved": False, "feedback": str(e), "suggestions": []}

    def _get_fallback_suggestions(self, department: str, experience_level: str, description: str = "", skills: str = "") -> Dict[str, Any]:
        """Provide fallback project suggestions when LLM fails."""
        logger.info(f"Using fallback suggestions for {department}")

        # Base suggestions by department
        suggestions = {
            "Web Development": {
                "name": "Personal Portfolio Website",
                "description": "Create a responsive personal portfolio website showcasing projects and skills",
                "tech_stack": ["HTML", "CSS", "JavaScript", "React"],
                "learning_objectives": ["Learn responsive design", "Master CSS frameworks", "Implement React components"],
                "business_value": "Builds personal brand and demonstrates web development skills",
                "modules": [
                    {"name": "Setup & Design", "description": "Project setup and UI design", "estimated_hours": 8},
                    {"name": "Frontend Development", "description": "Implement responsive frontend", "estimated_hours": 12},
                    {"name": "Deployment", "description": "Deploy to hosting platform", "estimated_hours": 4}
                ]
            },
            "Data Science": {
                "name": "Data Analysis Dashboard",
                "description": "Build a dashboard for analyzing and visualizing datasets",
                "tech_stack": ["Python", "Pandas", "Matplotlib", "Streamlit"],
                "learning_objectives": ["Learn data manipulation", "Master visualization techniques", "Build interactive dashboards"],
                "business_value": "Develops data analysis and presentation skills",
                "modules": [
                    {"name": "Data Processing", "description": "Clean and process datasets", "estimated_hours": 10},
                    {"name": "Visualization", "description": "Create charts and graphs", "estimated_hours": 8},
                    {"name": "Dashboard", "description": "Build interactive dashboard", "estimated_hours": 6}
                ]
            }
        }

        # Default fallback
        default_suggestion = {
            "name": "Task Management App",
            "description": "Build a simple task management application",
            "tech_stack": ["HTML", "CSS", "JavaScript"],
            "learning_objectives": ["Learn web development basics", "Practice JavaScript programming"],
            "business_value": "Develops fundamental programming and project management skills",
            "modules": [
                {"name": "UI Design", "description": "Design the user interface", "estimated_hours": 6},
                {"name": "Core Functionality", "description": "Implement task management features", "estimated_hours": 10},
                {"name": "Testing", "description": "Test and refine the application", "estimated_hours": 4}
            ]
        }

        suggestion = suggestions.get(department, default_suggestion)

        return {
            "projects": [{
                "name": suggestion["name"],
                "description": suggestion["description"],
                "estimated_duration": 3,
                "difficulty": 2,
                "tech_stack": suggestion["tech_stack"],
                "learning_objectives": suggestion["learning_objectives"],
                "business_value": suggestion["business_value"],
                "modules": suggestion["modules"]
            }],
            "summary": f"Fallback suggestion for {department} department"
        }


# Singleton instance
_project_generator = None

def get_project_generator() -> LLMProjectGenerator:
    """Get or create the project generator instance."""
    global _project_generator
    if _project_generator is None:
        _project_generator = LLMProjectGenerator()
    return _project_generator