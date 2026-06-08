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
The AI Talent Intelligence Platform is a sophisticated ecosystem for managing the end-to-end lifecycle of an internship, from initial resume screening to full-time conversion (PPO).

## KEY FEATURES
- V2 CAREER PROGRESSION: A robust state machine managing intern status through 10 distinct stages, including Phase 1 (Standard) and Phase 2 (Stipend-based) internships.
- RESUME INTELLIGENCE: Automated analysis using V2 ML pipelines (XGBoost/LangChain) to extract skills and suitability scores.
- MISSION CONTROL DASHBOARDS: High-fidelity analytics with glassmorphic design for real-time monitoring of departmental and individual performance.
- CERTIFICATION ENGINE: Automated generation and verification of internship completion certificates with unique IDs and QR code validation.
- STIPEND MANAGEMENT: Comprehensive tracking and approval workflow for monthly stipends during Phase 2 internships.
- FULL-TIME CONVERSION (PPO): AI-driven conversion scores and automated offer generation, including personalized onboarding plans and salary recommendations.
- RL TASK ASSIGNMENT: Reinforcement Learning (Q-Learning) engine that recommends tasks based on skill level, momentum, and backlog.
- MONITORING & ANALYTICS: Real-time tracking of Quality Output, Completion Rates, Growth Velocity, and Attendance via Heatmaps.

## CAREER PROGRESSION STAGES
Interns progress through: APPLIED -> OFFERED -> ACTIVE_INTERN (Phase 1) -> PHASE_1_COMPLETE -> STIPEND_INTERN (Phase 2) -> PHASE_2_COMPLETE -> PPO_OFFERED -> FULL_TIME.

## USER ROLES
- INTERN: Manage tasks, track performance, follow learning paths, view stipends, and respond to Full-Time Offers.
- MANAGER: Assign tasks, evaluate output, approve stipends, review conversion scores, and manage departmental interns.
- ADMIN: Complete system oversight, criteria configuration, certificate management, and platform-wide analytics.

## STRICT GUIDELINES
- ONLY answer questions about the AI Talent Intelligence Platform, its features, roles, and technical stack (Django, React, Vite, PostgreSQL, Redis, Celery, LangChain, XGBoost, Groq, and OpenAI).
- If a user asks a non-project related question, politely decline: "I am specialized only in the AI Talent Intelligence Platform. I cannot assist with that request as it falls outside this project's scope."
- Avoid general coding help unless it pertains to the platform's specific implementation.

## FORMATTING & TONE
- TONE: Professional, sophisticated, and "Mission Control" oriented. Use clear, executive-level language.
- CLEAN STRUCTURE: Use concise paragraphs and simple bullet points (-). Avoid excessive bolding or decorative elements.
- PREMIUM AESTHETIC: Ensure output is clean, scannable, and feels premium.
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
