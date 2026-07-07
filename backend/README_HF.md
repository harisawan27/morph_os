# Hugging Face Spaces Deployment

Morph OS backend is designed to run in a Hugging Face Space using the blank Docker template.

## Setup Steps

1. **Create a Space**: Go to [Hugging Face Spaces](https://huggingface.co/spaces) and click **Create new Space**. Select **Docker** as the SDK and choose the **Blank** template.
2. **Add Environment Secrets**: In your Space's Settings tab, add the following variables under **Repository Secrets**:
   - `GEMINI_API_KEY`: Your Gemini API key from Google AI Studio.
   - `DATABASE_URL`: Connection string for PostgreSQL (with pgvector).
   - `ALLOWED_ORIGINS`: The URL of your Vercel frontend.
3. **Repository Structure**: Hugging Face expects the `Dockerfile` at the root of the Git repository it clones. Since our project has both frontend and backend subdirectories, you have two options:
   - **Monorepo deploy (Blank Space)**: Use the main Dockerfile in the project root which builds the backend and references the workspace.
   - **Dedicated Git repository**: Make a separate repository containing only the `backend/` files at the root, push that to HF, and use the default blank template.

The Space automatically exposes port `7860` as required.
