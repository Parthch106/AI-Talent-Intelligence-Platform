"""
LLM Resume Parser — LangChain + GitHub Models
==============================================

Replaces simple regex parser with LangChain-powered LLM extraction.
Uses the same approach as the RAG PDF app for consistency.

Key features:
- LangChain for LLM orchestration
- PyPDFLoader for PDF extraction (like RAG app)
- GitHub Models API (gpt-4o-mini)
- Structured JSON output for resume parsing

Author: AI Talent Intelligence Platform
"""

import json
import logging
import os
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

# =============================================================================
# Master extraction prompt (battle-tested, anti-hallucination)
# =============================================================================

RESUME_PARSE_SYSTEM_PROMPT = '''You are an expert resume parser. Your ONLY job is to extract structured information from the provided resume text and return it as a single valid JSON object.

## STRICT RULES — READ THESE CAREFULLY

1. NEVER hallucinate. Only extract information that is EXPLICITLY written in the resume text.
2. If a field has no information, use null (not empty string, not "N/A").
3. Do NOT copy contact information (email, phone, LinkedIn URL, address) into any field except the `contact` object.
4. Do NOT include section headers ("EXPERIENCE", "EDUCATION", "SKILLS" etc.) in field values.
5. Do NOT include page numbers, watermarks, or PDF artifacts (e.g., "3/5", "Page 1 of 2") in any field.
6. Normalize skill names to canonical form: "JS" → "JavaScript", "TF" → "TensorFlow", "ML" context → keep as "Machine Learning".
7. Deduplicate all skill lists. If a skill appears more than once, include it only once.
8. For dates, use ISO format "YYYY-MM" or just "YYYY". Use "present" for current roles.
9. Output ONLY the JSON object. No preamble, no explanation, no markdown code block fences.

## SECTION DETECTION RULES

Section headers appear in many formats:
- ALL CAPS: "WORK EXPERIENCE", "TECHNICAL SKILLS"
- Title Case: "Work Experience", "Technical Skills"
- Decorated: "== Skills ==", "--- Projects ---"
- Numbered: "3. Education", "3/5 EDUCATION"

Content appearing before any section header that reads like a paragraph = professional summary.
Content with email / phone / URLs = contact info only — never put it elsewhere.

## JSON SCHEMA — return exactly this structure

{{
  "contact": {{
    "name": string | null,
    "email": string | null,
    "phone": string | null,
    "linkedin": string | null,
    "github": string | null,
    "location": string | null
  }},
  "professional_summary": string | null,
  "skills": {{
    "programming_languages": [string],
    "frameworks_libraries": [string],
    "tools": [string],
    "databases": [string],
    "cloud_platforms": [string],
    "ml_ai": [string],
    "soft_skills": [string],
    "other": [string]
  }},
  "experience": [
    {{
      "title": string,
      "company": string,
      "location": string | null,
      "start_date": string | null,
      "end_date": string | null,
      "is_current": boolean,
      "is_internship": boolean,
      "description": string | null,
      "technologies_used": [string],
      "quantified_achievements": [string]
    }}
  ],
  "projects": [
    {{
      "name": string,
      "description": string | null,
      "technologies": [string],
      "github_url": string | null,
      "impact": string | null
    }}
  ],
  "education": [
    {{
      "degree": string,
      "field_of_study": string | null,
      "institution": string,
      "location": string | null,
      "start_date": string | null,
      "end_date": string | null,
      "gpa": string | null
    }}
  ],
  "certifications": [string],
  "achievements": [string]
}}
'''


# =============================================================================
# LangChain-based Resume Parser
# =============================================================================

class LangChainResumeParser:
    """
    LangChain-powered resume parser using GitHub Models.
    Uses the same approach as the RAG PDF app.
    """
    
    MODEL_NAME = "gpt-4o-mini"
    
    def __init__(self):
        self._llm = None
        self._chain = None
    
    @property
    def llm(self):
        """Lazy-load the LLM using LangChain."""
        if self._llm is None:
            self._initialize_llm()
        return self._llm
    
    def _initialize_llm(self):
        """Initialize LangChain LLM with GitHub Models."""
        try:
            # IMPORTANT: Use a specific env var name to avoid picking up wrong system token
            # The correct token is stored in django .env as AI_TALENT_GITHUB_TOKEN
            # System might have a different GITHUB_TOKEN set which causes 401 errors
            api_key = os.environ.get("AI_TALENT_GITHUB_TOKEN") or os.environ.get("OPENAI_API_KEY")
            
            # Fallback to hardcoded correct token for testing
            if not api_key:
                api_key = "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"
            
            base_url = "https://models.inference.ai.azure.com"
            
            # SET ENV VARS before importing ChatOpenAI
            os.environ["OPENAI_API_KEY"] = api_key
            os.environ["OPENAI_BASE_URL"] = base_url
            
            logger.info(f"LangChainResumeParser: Initializing with GitHub Models (model=gpt-4o-mini)")
            
            from langchain_openai import ChatOpenAI
            
            # Use gpt-4o-mini via GitHub Models - pass credentials directly
            self._llm = ChatOpenAI(
                model="gpt-4o-mini",
                temperature=0.1,
                max_tokens=4096,
                api_key=api_key,
                base_url=base_url
            )
            
            logger.info("LangChainResumeParser: LLM initialized successfully with GitHub Models gpt-4o-mini")
            
        except ImportError as e:
            logger.error(f"LangChain not installed: {e}")
            raise RuntimeError(
                "LangChain not installed. Run: pip install langchain langchain-openai"
            )
    
    def parse(self, resume_text: str) -> Dict[str, Any]:
        """
        Parse resume text using LangChain LLM.
        Returns dict matching ResumeSection model field names.
        """
        logger.info("LangChainResumeParser.parse: STARTED")
        
        if not resume_text or not resume_text.strip():
            logger.warning("LangChainResumeParser.parse: empty text received")
            return self._empty_result()
        
        logger.info(f"LangChainResumeParser.parse: parsing {len(resume_text)} chars of resume text")
        
        try:
            from langchain_core.prompts import ChatPromptTemplate
            from langchain_core.output_parsers import JsonOutputParser
            
            # Create prompt
            prompt = ChatPromptTemplate.from_messages([
                ("system", RESUME_PARSE_SYSTEM_PROMPT),
                ("human", "Parse this resume:\n\n{resume_text}")
            ])
            
            # Create JSON output parser
            parser = JsonOutputParser()
            
            # Create chain
            chain = prompt | self.llm | parser
            
            # Invoke chain
            result = chain.invoke({"resume_text": resume_text})
            
            logger.info(f"LangChainResumeParser.parse: LLM returned keys: {list(result.keys())}")
            
            # Convert to resume section format
            parsed = llm_parsed_to_resume_section(result)
            
            logger.info(
                f"LangChainResumeParser: parsed OK — "
                f"skills: {len(parsed.get('skills', []))} | "
                f"tech: '{parsed.get('technical_skills', '')[:60]}' | "
                f"projects: {len(parsed.get('projects', []))} | "
                f"edu: '{parsed.get('education_text', '')[:60]}'"
            )
            
            return parsed
            
        except Exception as e:
            logger.error(f"LangChainResumeParser: LLM call failed, falling back. Error: {e}")
            # Graceful fallback
            from .simple_resume_parser import simple_resume_parser
            logger.warning("LangChainResumeParser: Using SimpleResumeParser as fallback")
            return simple_resume_parser.parse(resume_text)
    
    def _empty_result(self) -> Dict[str, str]:
        return {
            "professional_summary": "",
            "technical_skills": "",
            "tools_technologies": "",
            "frameworks_libraries": "",
            "databases": "",
            "cloud_platforms": "",
            "soft_skills": "",
            "experience": "",
            "experience_titles": "",
            "experience_descriptions": "",
            "experience_duration_text": "",
            "projects": "",
            "project_titles": "",
            "project_descriptions": "",
            "project_technologies": "",
            "education": "",
            "education_text": "",
            "certifications": "",
            "achievements": "",
            "skills": [],
            "experience_list": [],
            "projects_list": [],
            "education_list": [],
        }


def llm_parsed_to_resume_section(parsed: Dict) -> Dict[str, Any]:
    """
    Convert raw LLM JSON output → dict matching ResumeSection model field names.
    This is the adapter between the LLM and the existing DB storage code.
    """
    if not parsed:
        return {}
    
    result = {}  # Initialize result dictionary
    
    # -----------------------------------------------------------------
    # CONTACT → contact (store as JSON string)
    # -----------------------------------------------------------------
    contact = parsed.get("contact") or {}
    result["contact"] = json.dumps({
        "name": contact.get("name"),
        "email": contact.get("email"),
        "phone": contact.get("phone"),
        "linkedin": contact.get("linkedin"),
        "github": contact.get("github"),
        "location": contact.get("location"),
    })
    
    # -----------------------------------------------------------------
    # SUMMARY → professional_summary
    # -----------------------------------------------------------------
    result["professional_summary"] = parsed.get("professional_summary") or ""
    
    # -----------------------------------------------------------------
    # SKILLS → technical_skills (flatten categories)
    # -----------------------------------------------------------------
    skills = parsed.get("skills") or {}
    all_skills = []
    
    # Helper function to ensure list
    def safe_list(value):
        if value is None:
            return []
        if isinstance(value, str):
            return [value] if value else []
        if isinstance(value, list):
            return value
        return []
    
    for category in [
        "programming_languages", "frameworks_libraries", "tools",
        "databases", "cloud_platforms", "ml_ai", "soft_skills", "other"
    ]:
        cat_skills = safe_list(skills.get(category))
        all_skills.extend(cat_skills)
    
    result["skills"] = all_skills
    
    # Safely join skills (ensure all are lists)
    prog_langs = safe_list(skills.get("programming_languages"))
    frameworks = safe_list(skills.get("frameworks_libraries"))
    ml_ai = safe_list(skills.get("ml_ai"))
    tools = safe_list(skills.get("tools"))
    databases = safe_list(skills.get("databases"))
    cloud = safe_list(skills.get("cloud_platforms"))
    soft = safe_list(skills.get("soft_skills"))
    
    result["technical_skills"] = ", ".join(prog_langs + frameworks + ml_ai)
    result["tools_technologies"] = ", ".join(tools)
    result["frameworks_libraries"] = ", ".join(frameworks)
    result["databases"] = ", ".join(databases)
    result["cloud_platforms"] = ", ".join(cloud)
    result["soft_skills"] = ", ".join(soft)
    
    # -----------------------------------------------------------------
    # EXPERIENCE → experience + experience_list
    # -----------------------------------------------------------------
    experience_list = parsed.get("experience") or []
    result["experience_list"] = experience_list
    
    # Flatten for legacy fields
    exp_titles = []
    exp_descs = []
    exp_durations = []
    
    for exp in experience_list:
        title = exp.get("title", "")
        company = exp.get("company", "")
        location = exp.get("location") or ""
        
        exp_titles.append(f"{title} at {company}")
        
        desc = exp.get("description") or ""
        if exp.get("technologies_used"):
            techs = safe_list(exp.get("technologies_used"))
            desc += f" | Tech: {', '.join(techs)}"
        if exp.get("quantified_achievements"):
            achievements = safe_list(exp.get("quantified_achievements"))
            desc += f" | Achievements: {', '.join(achievements)}"
        exp_descs.append(desc)
        
        start = exp.get("start_date") or ""
        end = exp.get("end_date") or ("Present" if exp.get("is_current") else "")
        exp_durations.append(f"{start} - {end}")
    
    result["experience"] = "; ".join(exp_descs)
    result["experience_titles"] = ", ".join(exp_titles)
    result["experience_descriptions"] = " ".join(exp_descs)
    result["experience_duration_text"] = ", ".join(exp_durations)
    
    # -----------------------------------------------------------------
    # PROJECTS → projects + projects_list
    # -----------------------------------------------------------------
    projects_list = parsed.get("projects") or []
    result["projects_list"] = projects_list
    
    proj_names = []
    proj_descs = []
    proj_techs = []
    
    for proj in projects_list:
        name = proj.get("name", "")
        proj_names.append(name)
        
        desc = proj.get("description") or ""
        if proj.get("impact"):
            desc += f" | Impact: {proj['impact']}"
        proj_descs.append(desc)
        
        proj_techs.append(", ".join(safe_list(proj.get("technologies"))))
    
    result["projects"] = "; ".join(proj_descs)
    result["project_titles"] = ", ".join(proj_names)
    result["project_descriptions"] = " ".join(proj_descs)
    result["project_technologies"] = ", ".join(proj_techs)
    
    # -----------------------------------------------------------------
    # EDUCATION → education + education_list
    # -----------------------------------------------------------------
    education_list = parsed.get("education") or []
    result["education_list"] = education_list
    
    edu_texts = []
    for edu in education_list:
        degree = edu.get("degree", "")
        field = edu.get("field_of_study") or ""
        institution = edu.get("institution", "")
        year = edu.get("end_date") or ""
        
        if field:
            edu_texts.append(f"{degree} in {field} at {institution} {year}")
        else:
            edu_texts.append(f"{degree} at {institution} {year}")
    
    result["education"] = "; ".join(edu_texts)
    result["education_text"] = " | ".join(edu_texts)
    
    # -----------------------------------------------------------------
    # CERTIFICATIONS & ACHIEVEMENTS
    # -----------------------------------------------------------------
    result["certifications"] = ", ".join(safe_list(parsed.get("certifications")))
    result["achievements"] = ", ".join(safe_list(parsed.get("achievements")))
    
    return result


# Singleton instance
langchain_resume_parser = LangChainResumeParser()

# Alias for backward compatibility
llm_resume_parser = langchain_resume_parser

