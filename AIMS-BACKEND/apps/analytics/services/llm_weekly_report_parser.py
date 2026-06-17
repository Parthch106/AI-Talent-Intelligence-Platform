"""
LLM Weekly Report Parser — LangChain + GitHub Models
======================================================

Extracts structured progress data from weekly intern reports.
Uses LangChain and GPT-4o-mini via GitHub Models.

Author: AI Talent Intelligence Platform
"""

import json
import logging
import os
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

# =============================================================================
# Weekly Report Extraction Prompt
# =============================================================================

WEEKLY_REPORT_PARSE_SYSTEM_PROMPT = '''You are an expert internship report parser. Your ONLY job is to extract structured information from the provided weekly report text and return it as a single valid JSON object.

## STRICT RULES — READ THESE CAREFULLY

1. NEVER hallucinate. Only extract information that is EXPLICITLY written in the text.
2. If a field has no information, use null (not empty string, not "N/A").
3. Normalize the date to DD/MM/YYYY format. If multiple dates are found, use the report date.
4. For tasks, extract them as lists of strings. Remove any bullet points or numbering from the string itself.
5. Do NOT include section headers in field values.
6. Do NOT include page numbers or PDF artifacts.
7. Output ONLY the JSON object. No preamble, no explanation, no markdown code block fences.
8. NEVER include a "self_rating" or "rating" field. It has been DEPRECATED.

## JSON SCHEMA — return exactly this structure

{{
  "intern_name": string | null,
  "project_title": string | null,
  "date": string | null,
  "tasks_completed": [string],
  "tasks_in_progress": [string],
  "tasks_blocked": [string],
  "accomplishments": string | null,
  "challenges": string | null,
  "learnings": string | null,
  "next_week_goals": string | null
}}
'''

# =============================================================================
# LangChain-based Weekly Report Parser
# =============================================================================

class LangChainWeeklyReportParser:
    """
    LangChain-powered weekly report parser using GitHub Models.
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
            base_url = "https://models.inference.ai.azure.com"
            
            # Ensure environment variables are set for the provider
            os.environ["OPENAI_API_KEY"] = api_key
            os.environ["OPENAI_BASE_URL"] = base_url
            
            from langchain_openai import ChatOpenAI
            
            self._llm = ChatOpenAI(
                model=self.MODEL_NAME,
                temperature=0.1,
                max_tokens=2048,
                api_key=api_key,
                base_url=base_url
            )
            
            logger.info(f"LangChainWeeklyReportParser: LLM initialized successfully with {self.MODEL_NAME}")
            
        except Exception as e:
            logger.error(f"LangChainWeeklyReportParser: Failed to initialize LLM: {e}")
            raise RuntimeError(f"LLM initialization failed: {e}")
    
    def parse(self, report_text: str) -> Dict[str, Any]:
        """
        Parse weekly report text using LangChain LLM.
        """
        logger.info("LangChainWeeklyReportParser.parse: STARTED")
        
        if not report_text or not report_text.strip():
            logger.warning("LangChainWeeklyReportParser.parse: empty text received")
            return self._empty_result()
        
        try:
            from langchain_core.prompts import ChatPromptTemplate
            from langchain_core.output_parsers import JsonOutputParser
            
            # Create prompt
            prompt = ChatPromptTemplate.from_messages([
                ("system", WEEKLY_REPORT_PARSE_SYSTEM_PROMPT),
                ("human", "Parse this weekly report:\n\n{report_text}")
            ])
            
            # Create JSON output parser
            json_parser = JsonOutputParser()
            
            # Create chain
            chain = prompt | self.llm | json_parser
            
            # Invoke chain
            result = chain.invoke({"report_text": report_text})
            
            logger.info(f"LangChainWeeklyReportParser.parse: LLM returned keys: {list(result.keys())}")
            
            # Format results for the backend service
            return self._format_result(result, report_text)
            
        except Exception as e:
            logger.error(f"LangChainWeeklyReportParser: LLM call failed. Error: {e}")
            # The calling service should handle the fallback
            raise e

    def _format_result(self, result: Dict, raw_text: str) -> Dict[str, Any]:
        """Format the LLM JSON output to match the backend expectations."""
        
        # Ensure all required keys exist (even if None)
        formatted = {
            'intern_name': result.get('intern_name'),
            'project_title': result.get('project_title'),
            'date': result.get('date'),
            'tasks_completed_count': len(result.get('tasks_completed', []) or []),
            'tasks_in_progress_count': len(result.get('tasks_in_progress', []) or []),
            'tasks_blocked_count': len(result.get('tasks_blocked', []) or []),
            'accomplishments': result.get('accomplishments') or "\n".join(result.get('tasks_completed', []) or []),
            'challenges': result.get('challenges') or "",
            'learnings': result.get('learnings') or "",
            'next_week_goals': result.get('next_week_goals') or "",
            'raw_text': raw_text[:2000] if len(raw_text) > 2000 else raw_text,
        }
        
        # Additional fields for compatibility
        formatted['tasks_completed'] = formatted['tasks_completed_count']
        formatted['tasks_in_progress'] = formatted['tasks_in_progress_count']
        formatted['tasks_blocked'] = formatted['tasks_blocked_count']
        
        # Handle date extraction for week start/end parity
        from datetime import datetime
        if formatted['date']:
            try:
                # Assuming DD/MM/YYYY from prompt rules
                parsed_date = datetime.strptime(formatted['date'], '%d/%m/%Y')
                formatted['week_start_date'] = parsed_date.strftime('%Y-%m-%d')
                formatted['week_end_date'] = parsed_date.strftime('%Y-%m-%d')
            except Exception:
                formatted['week_start_date'] = None
                formatted['week_end_date'] = None
        else:
            formatted['week_start_date'] = None
            formatted['week_end_date'] = None
            
        return formatted

    def _empty_result(self) -> Dict[str, Any]:
        """Return empty result structure."""
        return {
            'week_start_date': None,
            'week_end_date': None,
            'intern_name': None,
            'project_title': None,
            'date': None,
            'tasks_completed': 0,
            'tasks_completed_count': 0,
            'tasks_in_progress': 0,
            'tasks_in_progress_count': 0,
            'tasks_blocked': 0,
            'tasks_blocked_count': 0,
            'accomplishments': '',
            'challenges': '',
            'learnings': '',
            'next_week_goals': '',
            'raw_text': '',
        }

# Singleton instance
llm_weekly_report_parser = LangChainWeeklyReportParser()
