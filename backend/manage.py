#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys


def print_db_info():
    """Print the active database connection info."""
    try:
        from django.conf import settings
        db = settings.DATABASES.get('default', {})
        engine = db.get('ENGINE', 'unknown').split('.')[-1]  # e.g. 'postgresql'
        name   = db.get('NAME', 'unknown')
        host   = db.get('HOST', 'localhost')
        port   = db.get('PORT', '')
        port_str = f":{port}" if port else ""
        print("=" * 60)
        print(f"  DATABASE  : {name}")
        print(f"  ENGINE    : {engine}")
        print(f"  HOST      : {host}{port_str}")
        print("=" * 60)
    except Exception as e:
        print(f"[manage.py] Could not read DB config: {e}")


def main():
    """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc

    # Print DB info only for runserver / migrate / shell etc. (not --help)
    if len(sys.argv) > 1 and sys.argv[1] in ('runserver', 'migrate', 'shell', 'dbshell'):
        import django
        django.setup()
        print_db_info()

    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
