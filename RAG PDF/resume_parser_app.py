"""
Resume Parser App - GitHub Models
==================================

A simple Streamlit app to parse resumes and extract structured JSON data.
Similar to app.py but specifically for resume parsing.

Usage:
    cd "RAG PDF"
    streamlit run resume_parser_app.py
"""

import streamlit as st
import os
import tempfile
import json

from langchain_community.document_loaders import PyPDFLoader
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser

# --------------------------------------------------
# Session state init
# --------------------------------------------------
if "parsed_resume" not in st.session_state:
    st.session_state.parsed_resume = None

if "error" not in st.session_state:
    st.session_state.error = None

# --------------------------------------------------
# Streamlit config
# --------------------------------------------------
st.set_page_config(page_title="Resume Parser (GitHub Models)", page_icon="📋")

st.title("📋 Resume Parser – GitHub Models")
st.markdown("""
Upload a **resume PDF** and get structured JSON output with extracted information.

**LLM:** GitHub Models (`gpt-4o-mini`)
""")

# --------------------------------------------------
# Sidebar: GitHub Token
# --------------------------------------------------
st.sidebar.header("Settings")
github_token = st.sidebar.text_input("GitHub Models Token", type="password")

if not github_token:
    st.sidebar.warning(
        "Enter your GitHub token (with Models access).\n\n"
        "Get one from https://github.com/settings/tokens\n"
        "Note: Use a CLASSIC token (starts with ghp_), not fine-grained."
    )
    st.stop()

# GitHub Models config
os.environ["OPENAI_API_KEY"] = github_token
os.environ["OPENAI_BASE_URL"] = "https://models.inference.ai.azure.com"

# --------------------------------------------------
# Models
# --------------------------------------------------
LLM_MODEL = "gpt-4o-mini"

# --------------------------------------------------
# Master Prompt for Resume Parsing
# --------------------------------------------------
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
}}"""

# --------------------------------------------------
# Cached LLM (stable across reruns)
# --------------------------------------------------
@st.cache_resource
def load_llm():
    return ChatOpenAI(
        model=LLM_MODEL,
        temperature=0.1,
        max_tokens=4096
    )

llm = load_llm()

# --------------------------------------------------
# Upload PDF
# --------------------------------------------------
uploaded_file = st.file_uploader("Upload a Resume PDF file", type="pdf")

if uploaded_file:
    # Save PDF temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
        tmp_file.write(uploaded_file.getvalue())
        pdf_path = tmp_file.name

    # Load PDF
    with st.spinner("Loading PDF..."):
        loader = PyPDFLoader(pdf_path)
        documents = loader.load()
        
    # Combine all pages into one text
    resume_text = "\n\n".join(doc.page_content for doc in documents)
    
    st.info(f"📄 Loaded {len(documents)} pages, {len(resume_text)} characters")
    
    # Parse button
    if st.button("🔍 Parse Resume"):
        try:
            with st.spinner("Parsing resume with LLM..."):
                # Create prompt
                prompt = ChatPromptTemplate.from_messages([
                    ("system", RESUME_PARSE_SYSTEM_PROMPT),
                    ("human", "Parse this resume:\n\n{resume_text}")
                ])
                
                # Create JSON output parser
                parser = JsonOutputParser()
                
                # Create chain
                chain = prompt | llm | parser
                
                # Invoke chain
                result = chain.invoke({"resume_text": resume_text})
                
                st.session_state.parsed_resume = result
                st.session_state.error = None
                
        except Exception as e:
            st.session_state.error = str(e)
            st.session_state.parsed_resume = None
        
        finally:
            # Cleanup temp file
            os.unlink(pdf_path)

    # --------------------------------------------------
    # Display results
    # --------------------------------------------------
    if st.session_state.error:
        st.error(f"❌ Error: {st.session_state.error}")
        st.info("💡 Tip: Make sure you're using a CLASSIC GitHub token (starts with ghp_), not a fine-grained token.")

    if st.session_state.parsed_resume:
        st.success("✅ Resume parsed successfully!")
        
        # Show JSON
        st.subheader("📋 Parsed Resume (JSON)")
        st.json(st.session_state.parsed_resume)
        
        # Show as formatted text
        st.subheader("📝 Formatted Output")
        
        resume = st.session_state.parsed_resume
        
        # Contact
        contact = resume.get("contact") or {}
        if contact:
            st.markdown("### 👤 Contact")
            col1, col2 = st.columns(2)
            with col1:
                st.write(f"**Name:** {contact.get('name', 'N/A')}")
                st.write(f"**Email:** {contact.get('email', 'N/A')}")
            with col2:
                st.write(f"**Phone:** {contact.get('phone', 'N/A')}")
                st.write(f"**Location:** {contact.get('location', 'N/A')}")
        
        # Professional Summary
        if resume.get("professional_summary"):
            st.markdown("### 📄 Professional Summary")
            st.write(resume["professional_summary"])
        
        # Skills
        skills = resume.get("skills") or {}
        if skills:
            st.markdown("### 🛠️ Skills")
            for category, skill_list in skills.items():
                if skill_list:
                    st.write(f"**{category.replace('_', ' ').title()}:** {', '.join(skill_list)}")
        
        # Experience
        experience = resume.get("experience") or []
        if experience:
            st.markdown("### 💼 Experience")
            for exp in experience:
                st.write(f"**{exp.get('title')}** at {exp.get('company')}")
                st.write(f"📅 {exp.get('start_date', '')} - {exp.get('end_date', 'Present')}")
                if exp.get("description"):
                    st.write(f"📝 {exp['description']}")
                if exp.get("technologies_used"):
                    st.write(f"🔧 Tech: {', '.join(exp['technologies_used'])}")
                st.write("---")
        
        # Projects
        projects = resume.get("projects") or []
        if projects:
            st.markdown("### 🚀 Projects")
            for proj in projects:
                st.write(f"**{proj.get('name')}**")
                if proj.get("description"):
                    st.write(f"📝 {proj['description']}")
                if proj.get("technologies"):
                    st.write(f"🔧 Tech: {', '.join(proj['technologies'])}")
                st.write("---")
        
        # Education
        education = resume.get("education") or []
        if education:
            st.markdown("### 🎓 Education")
            for edu in education:
                degree = edu.get("degree", "")
                field = edu.get("field_of_study") or ""
                institution = edu.get("institution", "")
                st.write(f"**{degree}** in {field} at {institution}")
                st.write("---")
        
        # Certifications
        certifications = resume.get("certifications") or []
        if certifications:
            st.markdown("### 🏆 Certifications")
            for cert in certifications:
                st.write(f"• {cert}")
        
        # Achievements
        achievements = resume.get("achievements") or []
        if achievements:
            st.markdown("### 🌟 Achievements")
            for achievement in achievements:
                st.write(f"• {achievement}")
        
        # Download button
        st.download_button(
            label="📥 Download JSON",
            data=json.dumps(st.session_state.parsed_resume, indent=2),
            file_name="parsed_resume.json",
            mime="application/json"
        )
        
        # Reset button
        st.button(
            "🔄 Parse Another Resume",
            on_click=lambda: st.session_state.update(
                {"parsed_resume": None, "error": None}
            )
        )

else:
    st.info("👆 Upload a PDF resume to get started!")
