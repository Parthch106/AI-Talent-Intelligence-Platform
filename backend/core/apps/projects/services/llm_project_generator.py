"""
LLM-powered Project Generator for automatic project suggestions.
Uses Hugging Face router API to generate contextual project ideas for interns.
"""
import os
import json
import logging
import requests
import random
import uuid
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
            logger.info(f"LLMProjectGenerator: Initialized with token {masked_token}")
        else:
            raise ValueError("No Hugging Face API key found. Set HF_TOKEN in .env or settings.py")
    
    def generate_project_suggestions(
        self,
        department: str,
        experience_level: str = "BEGINNER",
        num_suggestions: int = 3,
        include_modules: bool = True,
        description: str = "",
        skills: str = "",
        duration: str = "3 months"
    ) -> Dict[str, Any]:
        """
        Generate project suggestions based on department and experience level.
        
        Args:
            department: Department name (e.g., "Web Development", "Data Science")
            experience_level: Intern's experience level (BEGINNER, INTERMEDIATE, ADVANCED)
            num_suggestions: Number of project suggestions to generate
            include_modules: Whether to include detailed module breakdown
            description: Optional detailed project description
            skills: Optional comma-separated skills
            duration: Target project duration (default: 3 months)
            
        Returns:
            Dictionary containing project suggestions with modules
        """
        logger.info(f"LLMProjectGenerator: Generating project suggestions for {department} ({experience_level}) for {duration}")
        
        random_seed = str(uuid.uuid4())[:8]

        prompt = self._build_context_prompt(
            department=department,
            experience_level=experience_level,
            num_suggestions=num_suggestions,
            include_modules=include_modules,
            description=description,
            skills=skills,
            duration=duration,
            random_seed=random_seed
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
                "temperature": 0.7
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
        skills: str = "",
        duration: str = "3 months",
        random_seed: str = ""
    ) -> str:
        """Build the prompt for the LLM."""
        
        # Map experience level to intern level
        level_mapping = {
            "BEGINNER": "beginner",
            "INTERMEDIATE": "intermediate",
            "ADVANCED": "advanced"
        }
        intern_level = level_mapping.get(experience_level, "beginner")
        # Calculate actual weeks from duration string
        weeks = 4  # default 1 month
        if "month" in duration.lower():
            try:
                months = int(''.join(filter(str.isdigit, duration.split("month")[0])))
                weeks = months * 4
            except:
                weeks = 12
        elif "week" in duration.lower():
            try:
                weeks = int(''.join(filter(str.isdigit, duration)))
            except:
                weeks = 4

        # Determine module count based on duration
        if weeks <= 4:
            module_count = 2
        elif weeks <= 8:
            module_count = 3
        else:
            module_count = 4

        prompt = f"""You are a Senior Software Architect. Generate {num_suggestions} substantive, product-focused project suggestion(s) for {department} interns.
Randomness Seed: {random_seed}

Target Duration: {duration} ({weeks} weeks)
Difficulty: Moderate Engineering Complexity (Score: 3/5)

Engineering Guidelines:
- The project output MUST be a concrete product.
- Modules should be logical components of the product lifecycle.
- Provide exactly {module_count} engineering modules for a {weeks}-week project.
- BE ULTRA-CONCISE: Each description must be UNDER 10 words.
- Set "estimated_duration" to {weeks} in the JSON.
- Use simple JSON keys.

Intern Level: {experience_level} in {department}.
"""

        # Add optional context if provided
        if description or skills:
            prompt += f"Specific Context: {description or ''} {skills or ''}\n"

        prompt += f"""
Return ONLY a valid JSON object:
{{
  "projects": [
    {{
      "name": "Project Name Here",
      "description": "One sentence product description.",
      "estimated_duration": {weeks},
      "difficulty": 3,
      "tech_stack": ["Tech1", "Tech2", "Tech3"],
      "learning_objectives": ["Objective 1", "Objective 2"],
      "business_value": "One sentence business value.",
      "modules": [
        {{"name": "Module Name", "description": "Under 10 words.", "estimated_hours": 20}}
      ]
    }}
  ]
}}"""

        
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
                            # Final attempt: repair and try again
                            repaired = self._repair_json(json_str)
                            result = json.loads(repaired)
                        except:
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
            # Last ditch effort: simple repair
            try:
                repaired = self._repair_json(content)
                return json.loads(repaired)
            except:
                logger.error(f"Failed to parse LLM response: {e}")
                logger.error(f"Response content: {content[:1000]}...")
                return {"error": "Failed to parse project suggestions", "projects": []}

    def _repair_json(self, json_str: str) -> str:
        """Attempt to repair common JSON truncation issues."""
        json_str = json_str.strip()
        
        # If it doesn't even start with {, we can't fix it
        if not json_str.startswith('{'):
            return json_str
            
        stack = []
        mapping = {'{': '}', '[': ']'}
        
        for char in json_str:
            if char in mapping:
                stack.append(char)
            elif char in mapping.values():
                if stack and mapping[stack[-1]] == char:
                    stack.pop()
        
        # Close open items in reverse order
        while stack:
            opening = stack.pop()
            json_str += mapping[opening]
            
        return json_str
    
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

        # Expanded fallback library for variety
        library = {
            "Web Development": [
                {
                    "name": "Internal Asset Management System",
                    "description": "A dashboard for tracking hardware and software licenses across teams.",
                    "tech_stack": ["React", "Node.js", "PostgreSQL"],
                },
                {
                    "name": "Customer Support Portal",
                    "description": "A ticketing and knowledge base system for client interactions.",
                    "tech_stack": ["Next.js", "TailwindCSS", "Supabase"],
                },
                {
                    "name": "Team Collaboration Tool",
                    "description": "A real-time workspace with shared tasks and documentation.",
                    "tech_stack": ["React", "Firebase", "Socket.io"],
                }
            ],
            "Data Science": [
                {
                    "name": "Predictive Maintenance Engine",
                    "description": "Analyze sensor data to predict equipment failure before it happens.",
                    "tech_stack": ["Python", "Pandas", "Scikit-Learn"],
                },
                {
                    "name": "Sentiment Analysis Dashboard",
                    "description": "Process social media feeds to measure brand perception in real-time.",
                    "tech_stack": ["Python", "NLTK", "Power BI"],
                },
                {
                    "name": "Supply Chain Optimizer",
                    "description": "Optimize logistics routes and inventory levels using historical data.",
                    "tech_stack": ["Python", "NumPy", "Gurobi"],
                }
            ]
        }

        default_library = [
            {
                "name": f"Comprehensive {department} Solution",
                "description": f"An end-to-end {department} product tailored for enterprise needs.",
                "tech_stack": ["Python", "React", "Cloud Services"],
            }
        ]

        options = library.get(department, default_library)
        selected = random.choice(options)

        return {
            "projects": [{
                "name": selected["name"],
                "description": selected["description"],
                "estimated_duration": 12,
                "difficulty": 3,
                "tech_stack": selected["tech_stack"],
                "learning_objectives": ["System Architecture", "Deployment Pipeline", "Core Logic Design"],
                "business_value": "Accelerates internal workflows and improves data visibility.",
                "modules": [
                    {"name": "Architecture & Data Modeling", "description": "Defining relational schemas.", "estimated_hours": 24},
                    {"name": "Core API & Service Layer", "description": "Implementing backend services.", "estimated_hours": 32},
                    {"name": "Core UI & Business Logic", "description": "Building components and workflows.", "estimated_hours": 48},
                    {"name": "Testing & Deployment", "description": "System verification and cloud setup.", "estimated_hours": 24}
                ]
            }],
            "summary": f"Randomized {department} fallback"
        }


# Singleton instance
_project_generator = None

def get_project_generator() -> LLMProjectGenerator:
    """Get or create the project generator instance."""
    global _project_generator
    if _project_generator is None:
        _project_generator = LLMProjectGenerator()
    return _project_generator