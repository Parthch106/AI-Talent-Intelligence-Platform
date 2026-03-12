import requests

token = "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"
headers = {"Authorization": f"Bearer {token}"}

# Testing against the GitHub Models endpoint
url = "https://models.inference.ai.azure.com/models"

try:
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        print("✅ Token is VALID and working with GitHub Models!")
    else:
        print(f"❌ Token is INVALID or doesn't have access. Status code: {response.status_code}")
        print(f"Response: {response.text}")
except Exception as e:
    print(f"An error occurred during verification: {e}")