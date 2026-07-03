import os
import base64
import hashlib
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

DEFAULT_SECRET_KEY = "CSU_SECURE_PAYLOAD_KEY_2026_XYZ"

def _get_key_bytes() -> bytes:
    from django.conf import settings
    secret_key = getattr(settings, 'PAYLOAD_ENCRYPTION_KEY', os.getenv('PAYLOAD_ENCRYPTION_KEY', DEFAULT_SECRET_KEY))
    if not secret_key:
        secret_key = DEFAULT_SECRET_KEY
    return hashlib.sha256(secret_key.encode('utf-8')).digest()

def encrypt_payload(plaintext: str) -> str:
    if not plaintext:
        return plaintext
    
    key_bytes = _get_key_bytes()
    aesgcm = AESGCM(key_bytes)
    # Generate 12-byte nonce (IV)
    nonce = os.urandom(12)
    # Encrypt: output is Ciphertext + 16-byte Tag
    encrypted_data = aesgcm.encrypt(nonce, plaintext.encode('utf-8'), None)
    
    # Combined: [12-byte Nonce][Ciphertext][16-byte Tag]
    combined = nonce + encrypted_data
    return base64.b64encode(combined).decode('utf-8')

def decrypt_payload(ciphertext_b64: str) -> str:
    if not ciphertext_b64:
        return ciphertext_b64
    
    combined = base64.b64decode(ciphertext_b64)
    if len(combined) < 28:
        raise ValueError("Ciphertext too short (must contain 12-byte Nonce and 16-byte Tag).")
        
    nonce = combined[:12]
    encrypted_data = combined[12:] # Ciphertext + Tag
    
    key_bytes = _get_key_bytes()
    aesgcm = AESGCM(key_bytes)
    
    decrypted_data = aesgcm.decrypt(nonce, encrypted_data, None)
    return decrypted_data.decode('utf-8')
