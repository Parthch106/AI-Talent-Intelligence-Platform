"""
LLM Resume Parser — gpt-4o-mini via GitHub OpenAI API
======================================================

Replaces SimpleResumeParser with structured LLM extraction.

Key improvements over regex parser:
- Correctly isolates sections regardless of PDF formatting
- Never leaks contact info into projects/experience
- Deduplicates skills at extraction time
- Returns the same field names as ResumeSection model columns
  so it is a drop-in backend for _store_parsed_resume_sections()
"""

import json
import logging
import os
import re
from typing import Dict, Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Master extraction prompt (battle-tested, anti-hallucination)
# ---------------------------------------------------------------------------
RESUME_PARSE_SYSTEM_PROMPT = """You are an expert resume parser. Your ONLY job is to extract structured information from the provided resume text and return it as a single valid JSON object.

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

{
  "contact": {
    "name": string | null,
    "email": string | null,
    "phone": string | null,
    "linkedin": string | null,
    "github": string | null,
    "location": string | null
  },
  "professional_summary": string | null,
  "skills": {
    "programming_languages": [string],
    "frameworks_libraries": [string],
    "tools": [string],
    "databases": [string],
    "cloud_platforms": [string],
    "ml_ai": [string],
    "soft_skills": [string],
    "other": [string]
  },
  "experience": [
    {
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
    }
  ],
  "projects": [
    {
      "name": string,
      "description": string | null,
      "technologies": [string],
      "github_url": string | null,
      "impact": string | null
    }
  ],
  "education": [
    {
      "degree": string,
      "field_of_study": string | null,
      "institution": string,
      "start_year": integer | null,
      "end_year": integer | null,
      "gpa": float | null,
      "relevant_coursework": [string],
      "honors": string | null
    }
  ],
  "certifications": [
    {
      "name": string,
      "issuer": string | null,
      "date": string | null
    }
  ],
  "achievements": [string],
  "extracurriculars": [string],
  "parser_notes": string | null
}

## ANTI-HALLUCINATION CHECKLIST

Before writing each value, confirm:
- Is this information LITERALLY present in the resume?
- Did I accidentally copy contact info into projects or experience?
- Are there any PDF page numbers or headers I need to ignore?

If uncertain about any value, use null.
Use `parser_notes` to flag truncated text, OCR errors, or ambiguous sections."""


# ---------------------------------------------------------------------------
# Flat mapper — converts LLM JSON → ResumeSection column dict
# ---------------------------------------------------------------------------

def _flatten_skills(skills: Dict) -> Dict[str, str]:
    """Convert nested skills dict → flat comma-separated strings."""
    if not isinstance(skills, dict):
        return {}

    prog = skills.get("programming_languages") or []
    fw   = skills.get("frameworks_libraries") or []
    ml   = skills.get("ml_ai") or []
    tools = skills.get("tools") or []
    dbs   = skills.get("databases") or []
    cloud = skills.get("cloud_platforms") or []
    soft  = skills.get("soft_skills") or []

    # technical_skills = languages + frameworks + ML/AI (all "core" technical)
    technical = list(dict.fromkeys([s for s in (prog + fw + ml) if s]))

    return {
        "technical_skills":     ", ".join(technical),
        "frameworks_libraries": ", ".join(dict.fromkeys([s for s in fw if s])),
        "tools_technologies":   ", ".join(dict.fromkeys([s for s in tools if s])),
        "databases":            ", ".join(dict.fromkeys([s for s in dbs if s])),
        "cloud_platforms":      ", ".join(dict.fromkeys([s for s in cloud if s])),
        "soft_skills":          ", ".join(dict.fromkeys([s for s in soft if s])),
    }


def _format_experience(experience: list) -> Dict[str, str]:
    """Convert experience list → flat text fields."""
    if not experience:
        return {"experience_titles": "", "experience_descriptions": "", "experience_duration_text": ""}

    titles = []
    descs  = []
    durs   = []

    for exp in experience:
        if not isinstance(exp, dict):
            continue
        title = exp.get("title") or ""
        company = exp.get("company") or ""
        if title:
            label = f"{title} at {company}" if company else title
            titles.append(label)

        desc = exp.get("description") or ""
        achievements = exp.get("quantified_achievements") or []
        full_desc = desc
        if achievements:
            full_desc = (full_desc + " " + "; ".join(achievements)).strip()
        if full_desc:
            descs.append(full_desc)

        start = exp.get("start_date") or ""
        end   = "present" if exp.get("is_current") else (exp.get("end_date") or "")
        if start or end:
            durs.append(f"{start}–{end}".strip("–"))

    return {
        "experience_titles":       " | ".join(titles),
        "experience_descriptions": " ".join(descs),
        "experience_duration_text": " | ".join(durs),
    }


def _format_projects(projects: list) -> Dict[str, str]:
    """Convert projects list → flat text fields."""
    if not projects:
        return {"project_titles": "", "project_descriptions": "", "project_technologies": ""}

    titles = []
    descs  = []
    techs  = []

    for proj in projects:
        if not isinstance(proj, dict):
            continue
        name = proj.get("name") or ""
        if name:
            titles.append(name)

        desc = proj.get("description") or ""
        impact = proj.get("impact") or ""
        full = (desc + " " + impact).strip() if impact else desc
        if full:
            descs.append(full)

        proj_techs = proj.get("technologies") or []
        techs.extend([t for t in proj_techs if t])

    return {
        "project_titles":       " | ".join(titles),
        "project_descriptions": " ".join(descs),
        "project_technologies": ", ".join(dict.fromkeys(techs)),
    }


def _format_education(education: list) -> str:
    """Convert education list → flat text."""
    if not education:
        return ""

    entries = []
    for edu in education:
        if not isinstance(edu, dict):
            continue
        degree    = edu.get("degree") or ""
        field     = edu.get("field_of_study") or ""
        inst      = edu.get("institution") or ""
        end_year  = edu.get("end_year") or ""
        gpa       = edu.get("gpa")
        honors    = edu.get("honors") or ""

        parts = []
        if degree and field:
            parts.append(f"{degree} in {field}")
        elif degree:
            parts.append(degree)
        if inst:
            parts.append(f"at {inst}")
        if end_year:
            parts.append(str(end_year))
        if gpa:
            parts.append(f"GPA: {gpa}")
        if honors:
            parts.append(honors)

        entries.append(" ".join(parts))

    return " | ".join(entries)


def _format_certifications(certifications: list) -> str:
    if not certifications:
        return ""
    certs = []
    for c in certifications:
        if not isinstance(c, dict):
            continue
        name   = c.get("name") or ""
        issuer = c.get("issuer") or ""
        date   = c.get("date") or ""
        parts  = [p for p in [name, issuer, date] if p]
        if parts:
            certs.append(", ".join(parts))
    return "\n".join(certs)
def llm_parsed_to_resume_section(parsed: Dict) -> Dict[str, Any]:
    """
    Convert raw LLM JSON output → dict matching ResumeSection model field names.
    This is the adapter between the LLM and the existing DB storage code.
    """
    skills_dict     = _flatten_skills(parsed.get("skills") or {})
    experience_dict = _format_experience(parsed.get("experience") or [])
    projects_dict   = _format_projects(parsed.get("projects") or [])

    result = {
        "professional_summary": parsed.get("professional_summary") or "",
        **skills_dict,
        **experience_dict,
        **projects_dict,
        "education_text":   _format_education(parsed.get("education") or []),
        "certifications":   _format_certifications(parsed.get("certifications") or []),
        "achievements":     "\n".join(parsed.get("achievements") or []),
        "extracurriculars": "\n".join(parsed.get("extracurriculars") or []),
        
        # PRESERVE STRUCTURED DATA for Phase 4 normalized storage
        "experience_list": parsed.get("experience") or [],
        "projects_list":   parsed.get("projects") or [],
        "education_list":  parsed.get("education") or [],
        "certifications_raw": parsed.get("certifications") or [],
        "raw_skills":      parsed.get("skills") or {},
    }

    # Legacy keys for feature engineering & simple storage
    tech  = result.get("technical_skills", "")
    tools = result.get("tools_technologies", "")
    result["skills"]   = [s.strip() for s in tech.split(",")  if s.strip()]
    result["tools"]    = [s.strip() for s in tools.split(",") if s.strip()]
    
    # We keep 'experience' as a string for backward compatibility in feature engineering,
    # but the new storage logic should use 'experience_list'.
    result["experience"]  = result.get("experience_descriptions", "")
    result["education"]   = result.get("education_text", "")
    result["projects"]    = [p.strip() for p in result.get("project_titles", "").split("|") if p.strip()]
    result["certifications_list"] = [c.strip() for c in result.get("certifications", "").split("\n") if c.strip()]

    return result


# ---------------------------------------------------------------------------
# Main parser class — drop-in replacement for SimpleResumeParser
# ---------------------------------------------------------------------------

class LLMResumeParser:
    """
    LLM-powered resume parser using gpt-4o-mini via GitHub OpenAI API.

    Usage:
        parser = LLMResumeParser()
        parsed = parser.parse(raw_text)   # same interface as SimpleResumeParser
    """

    # GitHub Models endpoint for OpenAI-compatible API
    GITHUB_API_BASE = "https://models.inference.ai.azure.com"
    MODEL           = "gpt-4o-mini"

    def __init__(self):
        self._client = None

    def _get_client(self):
        """Lazy-init OpenAI client pointed at GitHub Models endpoint."""
        if self._client is not None:
            return self._client

        api_key = os.environ.get("GITHUB_TOKEN") or os.environ.get("GITHUB_OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError(
                "GitHub OpenAI API key not found. "
                "Set GITHUB_TOKEN or GITHUB_OPENAI_API_KEY in your environment."
            )

        try:
            from openai import OpenAI
            self._client = OpenAI(
                base_url=self.GITHUB_API_BASE,
                api_key=api_key,
            )
            logger.info(f"LLMResumeParser: Initialized with model={self.MODEL}, base_url={self.GITHUB_API_BASE}")
        except ImportError:
            raise RuntimeError(
                "openai package not installed. Run: pip install openai"
            )

        return self._client

    def _call_llm(self, resume_text: str) -> Dict:
        """Call gpt-4o-mini and return parsed JSON dict."""
        client = self._get_client()

        # Trim to avoid token limits (gpt-4o-mini: 128k context)
        MAX_CHARS = 12_000
        if len(resume_text) > MAX_CHARS:
            logger.warning(f"LLMResumeParser: resume text truncated from {len(resume_text)} to {MAX_CHARS} chars")
            resume_text = resume_text[:MAX_CHARS]

        response = client.chat.completions.create(
            model=self.MODEL,
            response_format={"type": "json_object"},   # enforces valid JSON output
            temperature=0.0,                            # deterministic — critical for parsing
            messages=[
                {"role": "system", "content": RESUME_PARSE_SYSTEM_PROMPT},
                {"role": "user",   "content": f"<resume_text>\n{resume_text}\n</resume_text>"},
            ],
        )

        raw = response.choices[0].message.content
        logger.info(f"LLMResumeParser: received {len(raw)} chars from LLM")

        try:
            return json.loads(raw)
        except json.JSONDecodeError as e:
            logger.error(f"LLMResumeParser: JSON parse failed: {e} — raw: {raw[:300]}")
            # Try to extract JSON from response if wrapped in backticks
            match = re.search(r"\{.*\}", raw, re.DOTALL)
            if match:
                return json.loads(match.group(0))
            raise

    def parse(self, text: str) -> Dict[str, Any]:
        """
        Parse resume text. Returns dict with ResumeSection field names.
        Same interface as SimpleResumeParser.parse().
        """
        if not text or not text.strip():
            logger.warning("LLMResumeParser.parse: empty text received")
            return self._empty_result()

        logger.info(f"LLMResumeParser.parse: parsing {len(text)} chars of resume text")

        try:
            raw_parsed = self._call_llm(text)
            logger.info(f"LLMResumeParser.parse: LLM returned keys: {list(raw_parsed.keys())}")

            result = llm_parsed_to_resume_section(raw_parsed)

            logger.info(
                f"LLMResumeParser: parsed OK — "
                f"skills: {len(result.get('skills', []))} | "
                f"tech: '{result.get('technical_skills', '')[:60]}' | "
                f"projects: {len(result.get('projects', []))} | "
                f"edu: '{result.get('education_text', '')[:60]}'"
            )

            return result

        except Exception as e:
            logger.error(f"LLMResumeParser: LLM call failed, falling back to simple parser. Error: {e}")
            # Graceful fallback — never let a parse failure block the pipeline
            from .simple_resume_parser import simple_resume_parser
            logger.warning("LLMResumeParser: Using SimpleResumeParser as fallback")
            return simple_resume_parser.parse(text)

    def _empty_result(self) -> Dict[str, str]:
        return {
            "professional_summary": "",
            "technical_skills": "",
            "tools_technologies": "",
            "frameworks_libraries": "",
            "databases": "",
            "cloud_platforms": "",
            "soft_skills": "",
            "experience_titles": "",
            "experience_descriptions": "",
            "experience_duration_text": "",
            "project_titles": "",
            "project_descriptions": "",
            "project_technologies": "",
            "education_text": "",
            "certifications": "",
            "achievements": "",
            "extracurriculars": "",
            "skills": [],
            "tools": [],
            "experience": "",
            "education": "",
            "projects": [],
        }


# Singleton — matches pattern of simple_resume_parser
llm_resume_parser = LLMResumeParser()
