import pandas as pd

file_path = r"e:\CSU Internship\AI-Talent-Intelligence-Platform\work\CSU Interns & Employee List.xlsx"
df = pd.read_excel(file_path)
print(df.to_string())
