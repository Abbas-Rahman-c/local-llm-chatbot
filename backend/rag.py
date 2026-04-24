from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
import os

# This is where we'll save the FAISS vector store on disk
VECTORSTORE_PATH = "vectorstore"

# This loads the embedding model — it converts text into vectors
# all-MiniLM-L6-v2 is small, fast, and good enough for our use case
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

def process_pdf(file_path: str):
    """
    Takes a PDF file path, reads it, splits into chunks,
    converts to vectors and saves to FAISS
    """
    # Step 1: Load the PDF and extract text page by page
    loader = PyPDFLoader(file_path)
    documents = loader.load()

    # Step 2: Split into chunks
    # chunk_size=500 means each chunk is ~500 characters
    # chunk_overlap=50 means chunks share 50 chars with neighbors
    # overlap is important so we don't lose context at chunk boundaries
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50
    )
    chunks = splitter.split_documents(documents)

    # Step 3: Convert chunks to vectors and store in FAISS
    # If a vectorstore already exists, add to it
    # If not, create a new one
    if os.path.exists(VECTORSTORE_PATH):
        vectorstore = FAISS.load_local(
            VECTORSTORE_PATH,
            embeddings,
            allow_dangerous_deserialization=True
        )
        vectorstore.add_documents(chunks)
    else:
        vectorstore = FAISS.from_documents(chunks, embeddings)

    # Save to disk so it persists between server restarts
    vectorstore.save_local(VECTORSTORE_PATH)
    return len(chunks)

def search_vectorstore(query: str, k: int = 4):
    """
    Takes a query, finds the k most relevant chunks from the vectorstore
    k=4 means we grab the 4 most relevant chunks to use as context
    """
    if not os.path.exists(VECTORSTORE_PATH):
        return []

    vectorstore = FAISS.load_local(
        VECTORSTORE_PATH,
        embeddings,
        allow_dangerous_deserialization=True
    )

    # similarity_search finds chunks whose vectors are closest to the query vector
    results = vectorstore.similarity_search(query, k=k)
    return [doc.page_content for doc in results]