import pandas as pd

file_path = r"e:\CSU Internship\AI-Talent-Intelligence-Platform\work\CSU Interns & Employee List.xlsx"
df = pd.read_excel(file_path)
# Save to csv for easier viewing if it's large
df.to_csv("scratch/excel_content.csv", index=False)
print("File saved to scratch/excel_content.csv")
