import os
import sys
from huggingface_hub import HfApi

repo_id = "harisawan07/morph-os"
print(f"Deploying to Hugging Face Space: {repo_id}...")

try:
    api = HfApi()
    # HfApi automatically performs OIDC token exchange under the hood
    # when HF_OIDC_RESOURCE is configured in the environment.
    api.upload_folder(
        folder_path=".",
        repo_id=repo_id,
        repo_type="space",
        ignore_patterns=[
            ".git/*",
            "node_modules/*",
            "frontend/node_modules/*",
            "backend/venv/*",
            ".claude/*",
            "*.pyc",
            "__pycache__/*",
        ],
    )
    print("Deployment completed successfully!")
except Exception as e:
    print(f"Deployment failed: {e}", file=sys.stderr)
    sys.exit(1)
