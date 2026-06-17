import hashlib
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed

def generate_client_fingerprint(request):
    """
    Generate a SHA-256 fingerprint based on the client's User-Agent and IP Address.
    This prevents a token from being copied and used on a different machine or browser.
    """
    user_agent = request.META.get('HTTP_USER_AGENT', 'Unknown')
    
    # Get IP address, handling proxies
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR', 'Unknown')
        
    # Get Client Hints if available (helps distinguish Brave vs Chrome vs Edge)
    sec_ch_ua = request.META.get('HTTP_SEC_CH_UA', 'Unknown')
    
    raw_fingerprint = f"{user_agent}|{ip}|{sec_ch_ua}"
    return hashlib.sha256(raw_fingerprint.encode('utf-8')).hexdigest()

class FingerprintedJWTAuthentication(JWTAuthentication):
    """
    Custom JWT Authentication that validates the client fingerprint
    to prevent token copy-pasting across different browsers/devices.
    """
    def authenticate(self, request):
        header = self.get_header(request)
        if header is None:
            return None

        raw_token = self.get_raw_token(header)
        if raw_token is None:
            return None

        validated_token = self.get_validated_token(raw_token)
        
        # Verify the fingerprint
        expected_fingerprint = validated_token.get('client_fingerprint')
        if expected_fingerprint:
            current_fingerprint = generate_client_fingerprint(request)
            if current_fingerprint != expected_fingerprint:
                raise AuthenticationFailed('Token binding mismatch. This token cannot be used on this device/browser.')
                
        return self.get_user(validated_token), validated_token
