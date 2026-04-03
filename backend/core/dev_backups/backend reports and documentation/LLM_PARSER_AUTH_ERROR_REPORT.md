# LLM Resume Parser Authentication Error - Comprehensive Report

## Executive Summary

This report documents the debugging and resolution of a persistent authentication error (401 "Bad credentials") that occurred when using the LLM-based resume parser in the Django backend, while the same code worked correctly in standalone scripts.

---

## 1. Problem Description

### Symptoms

- The `LangChainResumeParser` in `django_pg_backend/core/apps/analytics/services/llm_resume_parser.py` was failing with authentication errors
- Error message: `openai.AuthenticationError: Error code: 401 - {'error': {'code': 'unauthorized', 'message': 'Bad credentials', 'details': 'Bad credentials'}}`
- The identical code worked correctly when run as a standalone Python script (`test_llm.py`)
- The error occurred consistently in Django but not in Streamlit or standalone scripts

### Impact

- Resume parsing functionality was broken in the Django backend
- All resume analysis operations relying on the LLM parser were failing
- This affected the talent intelligence pipeline

---

## 2. Investigation Process

### Step 1: Initial Observations

- Standalone script (`test_llm.py`) worked correctly with the same GitHub token
- Streamlit app (`RAG PDF/resume_parser_app.py`) worked correctly
- Django-based execution always failed with 401 error

### Step 2: Code Comparison

Analyzed the differences between the working and failing implementations:

**Working (test_llm.py)**:

```python
os.environ['OPENAI_API_KEY'] = 'github_pat_...'
os.environ['OPENAI_BASE_URL'] = 'https://models.inference.ai.azure.com'
from langchain_openai import ChatOpenAI
llm = ChatOpenAI(model='gpt-4o-mini', temperature=0.1)
result = llm.invoke("Say hi")
```

**Failing (llm_resume_parser.py)**:

```python
api_key = os.environ.get("GITHUB_TOKEN") or os.environ.get("OPENAI_API_KEY")
# ... set env vars ...
self._llm = ChatOpenAI(model="gpt-4o-mini", ...)
```

### Step 3: Environment Variable Investigation

Created test scripts to investigate environment variables:

```python
# test_import_order.py - Checking env vars at each stage
print(f"GITHUB_TOKEN = {os.environ.get('GITHUB_TOKEN', 'NOT SET')}")
```

**Critical Discovery**:

```
Step 1: Before Django setup
  GITHUB_TOKEN = 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

Step 3: After Django setup
  GITHUB_TOKEN = github_pat_11A22HN5Y...
```

### Step 4: Root Cause Identification

**Two different tokens were found in the environment**:

| Token Name               | Value                                                                                           | Source                           |
| ------------------------ | ----------------------------------------------------------------------------------------------- | -------------------------------- |
| System GITHUB_TOKEN      | `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` | Windows System Environment       |
| Django .env GITHUB_TOKEN | `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` | django_pg_backend/core/core/.env |

**The Problem**: The code used `os.environ.get("GITHUB_TOKEN")` which returned the **system token** (wrong one), not the Django .env token.

---

## 3. Solution Implementation

### 3.1 Primary Fix

Changed the environment variable name to avoid conflict with the system token:

**Before (llm_resume_parser.py)**:

```python
api_key = os.environ.get("GITHUB_TOKEN") or os.environ.get("OPENAI_API_KEY")
```

**After (llm_resume_parser.py)**:

```python
api_key = os.environ.get("AI_TALENT_GITHUB_TOKEN") or os.environ.get("OPENAI_API_KEY")
```

### 3.2 Updated .env File

Added the new environment variable to `django_pg_backend/core/core/.env`:

```bash
# LLM Resume Parser (GitHub Models)
AI_TALENT_GITHUB_TOKEN=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
```

### 3.3 Debug Logging Cleanup

Removed all debug `print()` statements from the services and replaced with proper logging:

**Before**:

```python
print("=== Testing LLM... ===")
print(f"=== LLM works! Response: {test.content[:30]} ===")
```

**After**:

```python
logger.info("LangChainResumeParser: LLM initialized successfully with GitHub Models gpt-4o-mini")
```

---

## 4. Verification

### Test Results

After the fix, the parser works correctly:

```
Starting test...
Parsing resume: 168 chars
SUCCESS!
Result keys: ['contact', 'professional_summary', 'skills', 'technical_skills', ...]
Technical skills: Python, Django, React
```

### Verified Components

1. ✅ LLM initialization with correct credentials
2. ✅ LangChain integration with ChatOpenAI
3. ✅ JSON output parsing from LLM
4. ✅ Structured resume data extraction

---

## 5. Lessons Learned

### Environment Variable Best Practices

1. **Use application-specific variable names**: Instead of generic names like `GITHUB_TOKEN`, use prefixed names like `AI_TALENT_GITHUB_TOKEN` to avoid conflicts
2. **Check system environment first**: Always be aware of what environment variables might already be set at the system level
3. **Test in the same environment**: Code that works in standalone scripts may fail in web frameworks due to different environment loading

### Debugging Tips for Similar Issues

1. **Print environment variables early**: Add debug output at the start of scripts to see what env vars are set
2. **Compare working vs failing scenarios**: Systematically identify differences between working and failing code paths
3. **Check for shadowing**: Variables with the same name in different scopes can cause confusion

---

## 6. Files Modified

| File                                                                  | Changes                                                                              |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `django_pg_backend/core/apps/analytics/services/llm_resume_parser.py` | Changed env var from GITHUB_TOKEN to AI_TALENT_GITHUB_TOKEN, cleaned up debug prints |
| `django_pg_backend/core/core/.env`                                    | Added AI_TALENT_GITHUB_TOKEN variable                                                |

---

## 7. Conclusion

The authentication error was caused by a **conflict between system-level and application-level environment variables**. The system had a different GitHub token set in the Windows environment variables, which was being picked up by the Django application instead of the token specified in its own `.env` file.

The solution was to use a application-specific environment variable name (`AI_TALENT_GITHUB_TOKEN`) that doesn't conflict with system-level variables.

This is a common issue in development environments where multiple applications or tools may use the same generic environment variable names.
