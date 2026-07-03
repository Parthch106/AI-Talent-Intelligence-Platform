import json
from django.utils.deprecation import MiddlewareMixin
from django.http import HttpResponseBadRequest
from core.utils.payload_encryption import encrypt_payload, decrypt_payload

class PayloadEncryptionMiddleware(MiddlewareMixin):
    def _should_skip_path(self, path):
        return path.startswith('/admin/') or path.startswith('/media/') or path.startswith('/static/')

    def process_request(self, request):
        if self._should_skip_path(request.path):
            return None
            
        is_encrypted = request.headers.get('X-Encrypted') == 'true'
        if is_encrypted and request.body:
            try:
                body_str = request.body.decode('utf-8')
                data = json.loads(body_str)
                encrypted_data = data.get('encryptedData')
                if encrypted_data:
                    decrypted_json_str = decrypt_payload(encrypted_data)
                    # Replace request body
                    request._body = decrypted_json_str.encode('utf-8')
                    request.META['CONTENT_LENGTH'] = str(len(request._body))
                    request.META['CONTENT_TYPE'] = 'application/json'
            except Exception as e:
                print(f"[PAYLOAD DECRYPTION ERROR] {str(e)}")
                return HttpResponseBadRequest(
                    json.dumps({"error": "Invalid encrypted payload"}), 
                    content_type="application/json"
                )
        return None

    def process_response(self, request, response):
        if self._should_skip_path(request.path):
            return response
            
        client_accepts_encryption = request.headers.get('X-Accept-Encrypted') == 'true'
        if client_accepts_encryption:
            # Only encrypt successful JSON responses
            content_type = response.headers.get('Content-Type', '')
            is_success_json = (
                200 <= response.status_code < 300 and 
                content_type.startswith('application/json')
            )
            
            if is_success_json and not getattr(response, 'streaming', False):
                try:
                    plain_content = response.content.decode('utf-8')
                    encrypted_content = encrypt_payload(plain_content)
                    encrypted_wrapper = json.dumps({"encryptedData": encrypted_content})
                    
                    response.content = encrypted_wrapper.encode('utf-8')
                    response['X-Encrypted'] = 'true'
                    response['Content-Type'] = 'application/json'
                    response['Content-Length'] = str(len(response.content))
                    
                    if 'Content-Encoding' in response:
                        del response['Content-Encoding']
                except Exception as e:
                    print(f"[PAYLOAD ENCRYPTION ERROR] {str(e)}")
        return response
