"""
AI Project Assistant Chatbot Service
====================================
Provides a project-specific AI chatbot to guide users through the 
AI Talent Intelligence Platform. Uses Hugging Face Router API.
"""
import logging
import requests
import json
import os
from typing import Dict, List, Any, Optional
from django.conf import settings

logger = logging.getLogger(__name__)

# GitHub Models Configuration
GITHUB_API_URL = "https://models.inference.ai.azure.com/chat/completions"
# Using gpt-4o-mini for high intelligence with low latency/cost on GitHub Models
GITHUB_MODEL = "gpt-4o-mini"

PROJECT_CONTEXT = """
You are the AI Project Assistant for the "AI Talent Intelligence Platform".
Your goal is to guide users (Interns, Managers, and Admins) through the platform's features and answer questions ONLY related to this specific project.

## PLATFORM OVERVIEW
The AI Talent Intelligence Platform is a comprehensive system designed to manage the end-to-end lifecycle of an internship.

## KEY FEATURES
1. RESUME INTELLIGENCE: Automated analysis of intern resumes to extract skills and suitability scores using custom ML models.
2. MISSION CONTROL DASHBOARDS: High-fidelity, glassmorphic analytics for both managers and interns.
3. RL TASK ASSIGNMENT: Uses Reinforcement Learning (Q-Learning) to recommend tasks based on an intern's state (skill level, momentum, and backlog).
4. PERFORMANCE MONITORING: Real-time tracking of:
   - Quality Output (1-5 star ratings)
   - Completion Rates
   - Growth Velocity (skill development progress)
   - Attendance & Engagement
5. DYNAMIC LEARNING PATHS: AI-generated milestones that guide interns toward a target job role.
6. DROPOUT RISK PREDICTION: Proactive identification of interns who might struggle or leave early.

## USER ROLES
- INTERN: Can view personal performance, update task status, mark attendance, and follow their learning path.
- MANAGER: Can assign tasks, evaluate submissions, view departmental analytics, and review AI suggestions.
- ADMIN: Complete system-wide oversight, user management, and configuration.

## STRICT GUIDELINES
- ONLY answer questions about the AI Talent Intelligence Platform, its features, roles, and technologies used (Django, React, Vite, RL, LLM).
- If a user asks a non-project related question, politely decline by saying: "I am specialized only in the AI Talent Intelligence Platform. I cannot assist with that request as it falls outside this project's scope."
- Do NOT provide general programming help (e.g., "how to write a loop in C++") unless it specifically pertains to the implementation of THIS platform.

## FORMATTING & TONE
- TONE: Professional, sophisticated, and "Mission Control" oriented. Use clear, executive-level language.
- MINIMALIST MARKDOWN: Avoid excessive bolding (**), italics, or decorative delimiters. 
- CLEAN STRUCTURE: Prefer concise paragraphs. If listing items, use simple bullet points (-) rather than numbered lists or bolded headers with colons.
- NO CLUTTER: Ensure the output is clean, scannable, and looks premium. Avoid technical jargon unless necessary.
"""

class ChatBotService:
    def __init__(self):
        self._api_key = None
    
    @property
    def api_key(self):
        if self._api_key is None:
            self._initialize_api_key()
        return self._api_key

    def _initialize_api_key(self):
        token = getattr(settings, "AI_TALENT_GITHUB_TOKEN", None)
        if not token:
            token = os.environ.get("AI_TALENT_GITHUB_TOKEN")
        
        if token:
            self._api_key = token.strip()
        else:
            logger.error("No GitHub token found for ChatBotService (AI_TALENT_GITHUB_TOKEN)")

    def get_response(self, user_message: str, chat_history: List[Dict[str, str]] = None) -> Dict[str, Any]:
        """Get a response from the AI assistant."""
        if not self.api_key:
            return {"error": "AI service not configured.", "response": "I'm currently offline. Please check back later."}

        # Build messages list
        messages = [{"role": "system", "content": PROJECT_CONTEXT}]
        
        # Add history (limit to last 5 exchanges to save tokens)
        if chat_history:
            messages.extend(chat_history[-10:])
            
        # Add current message
        messages.append({"role": "user", "content": user_message})

        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": GITHUB_MODEL,
                "messages": messages,
                "max_tokens": 1000,
                "temperature": 0.4
            }
            
            response = requests.post(GITHUB_API_URL, headers=headers, json=payload, timeout=30)
            
            if response.status_code != 200:
                logger.error(f"ChatBotService API error: {response.status_code} - {response.text}")
                return {
                    "error": f"API failed with {response.status_code}", 
                    "response": f"I'm reaching out to my intelligence core, but it's returning a {response.status_code} error. This usually means my access token needs checking."
                }
            
            result = response.json()
            if "choices" in result and len(result["choices"]) > 0:
                ai_text = result["choices"][0]["message"]["content"]
                return {"response": ai_text}
            
            return {"error": "No response", "response": "I couldn't process that. Could you rephrase?"}
            
        except Exception as e:
            logger.error(f"ChatBotService exception: {e}")
            return {"error": str(e), "response": "An error occurred while processing your request."}

def get_chatbot_service():
    return ChatBotService()
