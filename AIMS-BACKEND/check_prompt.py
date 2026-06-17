import sys
sys.path.append(r"e:\CSU Internship\AI_Talent_Intelligence_Platform_V_0.2.1.05.06.26\AIMS-BACKEND")
from apps.analytics.services.llm_learning_path_generator import get_learning_path_generator

gen = get_learning_path_generator()
prompt = f"""You are a technical mentor.
Create a practical, hands-on task for an intern to master the skill: 'React'.
The task should help them towards their goal: 'Learn web dev'.

## Requirements
1. Provide a clear 'task_title'.
2. Provide a 'task_description' with step-by-step instructions.
3. Provide a 'starter_script' containing ACTUAL WORKING BOILERPLATE CODE. Do NOT output a placeholder comment like "# Start your implementation here". Write at least 10-20 lines of real code (e.g. skeleton functions, imports, class definitions) that the intern can run.
4. Provide 'estimated_hours' (a realistic number).

CRITICAL INSTRUCTIONS FOR JSON FORMAT:
- You MUST output STRICTLY VALID JSON.
- DO NOT use Python-style multiline strings (with ''' or \"\"\").
- DO NOT use raw unescaped newlines inside strings. Use \\\\n for newlines inside strings.
- Keys and string values MUST use double quotes.

Return your response exactly in this format:
{{
  "task_title": "Build a simple X using Y",
  "task_description": "1. Do this... 2. Do that... 3. Verify by...",
  "starter_script": "import os\\\\n\\\\ndef main():\\\\n    # TODO: Implement the core logic here\\\\n    pass\\\\n\\\\nif __name__ == '__main__':\\\\n    main()",
  "estimated_hours": 2
}}

Only return valid JSON, no additional text."""
print(repr(prompt))
