@echo off
cd /d "%~dp0"
python -m streamlit run "RAG PDF/resume_parser_app.py"
pause
