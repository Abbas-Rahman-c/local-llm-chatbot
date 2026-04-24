from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import tempfile
import os
from rag import process_pdf, search_vectorstore
from typing import List, Dict


# Create the FastAPI app
app = FastAPI()

# Allow React (running on port 3000) to talk to FastAPI (running on port 8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# This defines the shape of data we expect from the frontend
# Pydantic automatically validates it — if 'message' is missing, FastAPI returns an error
class ChatRequest(BaseModel):
    message: str
    history: List[Dict[str, str]] = []  # default empty list

class ChatResponse(BaseModel):
    response: str

# This is our chat endpoint
# When React sends a POST to /chat, this function runs
@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    # Build conversation history into the prompt
    # We format it as a conversation so llama3.2 understands the context
    history_text = ""
    for msg in request.history:
        role = "User" if msg["role"] == "user" else "Assistant"
        history_text += f"{role}: {msg['content']}\n"
    
    # Add the current message
    full_prompt = f"{history_text}User: {request.message}\nAssistant:"

    async with httpx.AsyncClient(timeout=60.0) as client:
        ollama_response = await client.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "llama3.2",
                "prompt": full_prompt,
                "stream": False
            }
        )
    
    result = ollama_response.json().get("response", "No response")
    return ChatResponse(response=result)

# Health check endpoint — useful to confirm the server is running
@app.get("/health")
async def health():
    return {"status": "online"}
@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    """
    Receives a PDF file from the frontend,
    saves it temporarily, processes it into FAISS,
    then deletes the temp file
    """
    # Save uploaded file to a temporary location
    # We can't process it directly from memory — PyPDFLoader needs a file path
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        # Process the PDF into our vectorstore
        num_chunks = process_pdf(tmp_path)
        return {"message": f"PDF processed successfully", "chunks": num_chunks}
    finally:
        # Always delete the temp file even if processing fails
        os.unlink(tmp_path)


@app.post("/rag-chat")
async def rag_chat(request: ChatRequest):
    """
    Like /chat but with RAG — we first search the vectorstore
    for relevant chunks, inject them into the prompt,
    then send to Ollama
    """
    # Step 1: Find relevant chunks from uploaded PDFs
    relevant_chunks = search_vectorstore(request.message)

    if relevant_chunks:
        # Step 2: Build a prompt that includes the context
        context = "\n\n".join(relevant_chunks)
        prompt = f"""Use the following context to answer the question. 
If the answer is not in the context, say so honestly.

Context:
{context}

Question: {request.message}

Answer:"""
    else:
        # No documents uploaded yet — fall back to regular chat
        prompt = request.message

    # Step 3: Send to Ollama exactly like before
    async with httpx.AsyncClient(timeout=120.0) as client:
        ollama_response = await client.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "llama3.2",
                "prompt": prompt,
                "stream": False
            }
        )

    result = ollama_response.json().get("response", "No response")
    return ChatResponse(response=result)