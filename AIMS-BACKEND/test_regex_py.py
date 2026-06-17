import re

content = """{
  "task_title": "Linux Basics",
  "task_description": "Do linux stuff",
  "estimated_hours": 4,
  "starter_script": "import os\n\nprint('hello')\n"
}"""

script_match = re.search(r'"starter_script"\s*:\s*"(.*?)"(?=\s*,\s*"[a-zA-Z0-9_]+"\s*:|\s*\})', content, re.DOTALL)

if script_match:
    print("MATCHED!")
    print(repr(script_match.group(1)))
else:
    print("FAILED")
