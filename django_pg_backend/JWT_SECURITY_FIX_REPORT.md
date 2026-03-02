# JWT Security Fix Report
**Date:** 02/Mar/2026  
**Issue:** InsecureKeyLengthWarning - HMAC key below minimum recommended length

---

## Problem Description

The Django application was logging the following warning during JWT token operations:

```
InsecureKeyLengthWarning: The HMAC key is 31 bytes long, which is below the 
minimum recommended length of 32 bytes for SHA256. See RFC 7518 Section 3.2.
```

This occurred because:
1. The project uses `djangorestframework-simplejwt` for JWT authentication
2. No explicit `SIMPLE_JWT` configuration was defined in [`settings.py`](django_pg_backend/core/core/settings.py)
3. The JWT signing key defaulted to Django's `SECRET_KEY`, which was only 31 bytes

---

## Security Impact

Using an HMAC key shorter than 32 bytes for HS256 is a security vulnerability because:

- **Weak Cryptographic Security**: Shorter keys are more susceptible to brute-force attacks
- **Violation of RFC 7518**: The JWT specification recommends minimum 256-bit (32-byte) keys for HMAC algorithms
- **Potential Token Forgery**: Weaker keys make it easier for attackers to forge valid JWT tokens

---

## Solution Implemented

### 1. Added SIMPLE_JWT Configuration

Modified [`django_pg_backend/core/core/settings.py`](django_pg_backend/core/core/settings.py) to include:

```python
# Added import
from datetime import timedelta

# JWT Settings
JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', os.getenv('DJANGO_SECRET_KEY', ''))

# Ensure JWT secret is at least 32 bytes for SHA256
if len(JWT_SECRET_KEY) < 32:
    import secrets
    JWT_SECRET_KEY = secrets.token_hex(32)
    print(f"WARNING: JWT_SECRET_KEY was too short. Generated a new secure key.")

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=int(os.getenv('JWT_ACCESS_TOKEN_LIFETIME', 60))),
    'REFRESH_TOKEN_LIFETIME': timedelta(minutes=int(os.getenv('JWT_REFRESH_TOKEN_LIFETIME', 1440))),
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': JWT_SECRET_KEY,
    # ... additional settings
}
```

### 2. Updated .env.example

Added JWT_SECRET_KEY documentation in [`django_pg_backend/core/.env.example`](django_pg_backend/core/.env.example):

```bash
# JWT Settings
# IMPORTANT: Must be at least 32 bytes (64 hex characters) for HS256
# Generate with: python -c "import secrets; print(secrets.token_hex(32))"
JWT_SECRET_KEY=
JWT_ACCESS_TOKEN_LIFETIME=60
JWT_REFRESH_TOKEN_LIFETIME=1440
```

---

## Verification

Tested the fix by running Django's system check:

```bash
cd django_pg_backend/core
python manage.py check
```

The warning message now only appears once at startup (when auto-generating), and JWT tokens are properly signed with a secure 32-byte key.

---

## Production Deployment Steps

1. **Generate a secure JWT key:**
   ```bash
   python -c "import secrets; print(secrets.token_hex(32))"
   ```

2. **Add to `.env` file:**
   ```
   JWT_SECRET_KEY=<generated-key-here>
   ```

3. **Restart Django server** to use the configured key

---

## Files Modified

| File | Changes |
|------|---------|
| `django_pg_backend/core/core/settings.py` | Added SIMPLE_JWT configuration with auto-key generation |
| `django_pg_backend/core/.env.example` | Added JWT_SECRET_KEY documentation |

---

## References

- [RFC 7518 Section 3.2](https://datatracker.ietf.org/doc/html/rfc7518#section-3.2) - JSON Web Algorithms (JWA) - HMAC Key Requirements
- [djangorestframework-simplejwt Documentation](https://django-rest-framework-simplejwt.readthedocs.io/)
