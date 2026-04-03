import os
import shutil
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

# Target directory for backups
BACKUP_DIR = 'dev_backups'

# List of folders to move
FOLDERS_TO_MOVE = [
    'test scripts',
    'backend reports and documentation',
    'weeklyreports',
    'node_modules',
    'scripts',
]

# List of specific files to move
FILES_TO_MOVE = [
    'test_ai_project_suggestions.py',
    'test_hf_integration.py',
    'test_hf_services.py',
    'test_hf_token.py',
    'test_llm_task_gen.py',
    'test_task_generator_fallback.py',
    'system_integration_test.py',
    'verify_performance_fix.py',
    'verify_skills.py',
    'check_data.py',
    'check_db_state.py',
    'check_task_dates.py',
    'check_task_status.py',
    'seed_intern_skills.py',
    '.env.example',
    'package.json',
    'package-lock.json',
]

def cleanup():
    """Moves development/test files to a backup directory."""
    
    # 1. Create backup directory if it doesn't exist
    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR)
        logging.info(f"Created backup directory: {BACKUP_DIR}")

    # 2. Move Folders
    for folder in FOLDERS_TO_MOVE:
        if os.path.exists(folder) and os.path.isdir(folder):
            dest = os.path.join(BACKUP_DIR, folder)
            try:
                # If destination exists, remove it first to avoid conflicts
                if os.path.exists(dest):
                    shutil.rmtree(dest)
                shutil.move(folder, dest)
                logging.info(f"Moved folder: {folder} -> {dest}")
            except Exception as e:
                logging.error(f"Failed to move folder {folder}: {e}")
        else:
            logging.debug(f"Folder not found, skipping: {folder}")

    # 3. Move Files
    for file in FILES_TO_MOVE:
        if os.path.exists(file) and os.path.isfile(file):
            dest = os.path.join(BACKUP_DIR, file)
            try:
                shutil.move(file, dest)
                logging.info(f"Moved file: {file} -> {dest}")
            except Exception as e:
                logging.error(f"Failed to move file {file}: {e}")
        else:
            logging.debug(f"File not found, skipping: {file}")

    logging.info("\nCleanup complete. All development files are now in 'dev_backups/'.")
    logging.info("IMPORTANT: Do not touch 'apps/', 'core/', 'manage.py', or 'requirements.txt'.")

if __name__ == "__main__":
    # Confirm before running
    print("--- AI Talent Intelligence Platform Cleanup Tool ---")
    print(f"This will move development and test files into the '{BACKUP_DIR}' folder.")
    confirm = input("Proceed? (y/n): ")
    if confirm.lower() == 'y':
        cleanup()
    else:
        print("Cleanup cancelled.")
