import pandas as pd

file_path = r"e:\CSU Internship\AI-Talent-Intelligence-Platform\work\CSU Interns & Employee List.xlsx"
xl = pd.ExcelFile(file_path)
print(f"Sheets: {xl.sheet_names}")

for sheet in xl.sheet_names:
    print(f"\n--- Sheet: {sheet} ---")
    df = pd.read_excel(file_path, sheet_name=sheet)
    print(df.head())
    print(f"Columns: {df.columns.tolist()}")
