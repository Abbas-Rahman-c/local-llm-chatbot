# Local LLM Chatbot

A full-stack AI chatbot that runs completely on your local machine. No OpenAI API, no cloud, no cost.

## Features

- 💬 **Chat** — Conversational AI with memory using llama3.2
- 📄 **Research (RAG)** — Upload any PDF and ask questions about it
- ⚡ **Fast** — GPU-accelerated inference via Ollama
- 🔒 **Private** — Everything runs locally, no data leaves your machine

## Tech Stack

**Backend**
- FastAPI — REST API
- Ollama — Local LLM inference (llama3.2)
- FAISS — Vector similarity search
- LangChain — RAG pipeline
- Sentence Transformers — Text embeddings

**Frontend**
- React + Vite
- Tailwind CSS
- Axios

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- [Ollama](https://ollama.com) installed with llama3.2 pulled

```bash
ollama pull llama3.2
```

### Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Usage

1. Open `http://localhost:5173`
2. **Chat tab** — Start chatting with llama3.2
3. **Research tab** — Upload a PDF and ask questions about it

## Project Structure
