import sys
sys.path.append(r"e:\CSU Internship\AI_Talent_Intelligence_Platform_V_0.2.1.05.06.26\AIMS-BACKEND")
import django
import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()
from apps.analytics.services.llm_learning_path_generator import get_learning_path_generator
import re

content = """{
  "task_title": "Build a Simple Banking System using Python",
  "task_description": "1. Create a class named `BankAccount` with attributes `account_number`, `account_holder`, and `balance`.\\n2. Implement methods to deposit and withdraw money from the account.\\n3. Create a `main` function to test the `BankAccount` class by creating an instance, depositing and withdrawing money, and verifying the final balance.\\n4. Run the script to ensure it executes without errors.",
  "starter_script": "import os\\n\\nclass BankAccount:\\n    def __init__(self, account_number, account_holder, balance=0):\\n        self.account_number = account_number\\n        self.account_holder = account_holder\\n        self.balance = balance\\n\\n    def deposit(self, amount):\\n        self.balance += amount\\n\\n    def withdraw(self, amount):\\n        if amount > self.balance:\\n            print(\\"Insufficient balance.\\")\\n        else:\\n            self.balance -= amount\\n\\n    def __str__(self):\\n        return f\\"Account Number: {self.account_number}\\nAccount Holder: {self.account_holder}\\nBalance: {self.balance}\\"\\n\\ndef main():\\n    account = BankAccount(\\"12345\\", \\"John Doe\\")\\n    print(account)\\n    account.deposit(1000)\\n    account.withdraw(500)\\n    print(account)\\n\\nif __name__ == '__main__':\\n    main()",
  "estimated_hours": 4
}"""

script_match = re.search(r'"starter_script"\s*:\s*"(.*?)"(?=\s*,\s*"[a-zA-Z0-9_]+"\s*:|\s*\})', content, re.DOTALL)
if script_match:
    raw_script = script_match.group(1)
    # Safely escape backslashes, quotes, and raw newlines
    escaped_script = raw_script.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n').replace('\r', '')
    # Fix double-escaping if the LLM partially escaped things
    escaped_script = escaped_script.replace('\\\\n', '\\n').replace('\\\\"', '\\"')
    content = content[:script_match.start(1)] + escaped_script + content[script_match.end(1):]

print("Final content around char 877:")
print(repr(content[850:900]))
