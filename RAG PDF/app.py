# app.py
import streamlit as st
import os
import tempfile

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

# --------------------------------------------------
# Session state init
# --------------------------------------------------
if "question" not in st.session_state:
    st.session_state.question = ""

if "answer" not in st.session_state:
    st.session_state.answer = ""

# --------------------------------------------------
# Streamlit config
# --------------------------------------------------
st.set_page_config(page_title="RAG PDF Reader (GitHub Models)", page_icon="📄")

st.title("📄 RAG PDF Reader – GitHub Models")
st.markdown("""
Upload a PDF once and ask **multiple questions** using a RAG pipeline.

**Embeddings:** Sentence Transformers  
**LLM:** GitHub Models (`gpt-4o-mini`)
""")

# --------------------------------------------------
# Sidebar: GitHub Token
# --------------------------------------------------
st.sidebar.header("Settings")
github_token = st.sidebar.text_input("GitHub Models Token", type="password")

if not github_token:
    st.sidebar.warning(
        "Enter your GitHub token (with Models access).\n\n"
        "Get one from https://github.com/settings/tokens"
    )
    st.stop()

# GitHub Models config
os.environ["OPENAI_API_KEY"] = github_token
os.environ["OPENAI_BASE_URL"] = "https://models.inference.ai.azure.com"

# --------------------------------------------------
# Models
# --------------------------------------------------
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
LLM_MODEL = "gpt-4o-mini"

# --------------------------------------------------
# Cached LLM (stable across reruns)
# --------------------------------------------------
@st.cache_resource
def load_llm():
    return ChatOpenAI(
        model=LLM_MODEL,
        temperature=0.1,
        max_tokens=512
    )

llm = load_llm()

# --------------------------------------------------
# Upload PDF
# --------------------------------------------------
uploaded_file = st.file_uploader("Upload a PDF file", type="pdf")

if uploaded_file:
    # Save PDF temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
        tmp_file.write(uploaded_file.getvalue())
        pdf_path = tmp_file.name

    # Load PDF
    with st.spinner("Loading PDF..."):
        loader = PyPDFLoader(pdf_path)
        documents = loader.load()

    # Split into chunks
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )
    chunks = splitter.split_documents(documents)

    # Create embeddings + FAISS
    with st.spinner("Creating embeddings and vector store..."):
        embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
        vector_store = FAISS.from_documents(chunks, embeddings)

    st.success("✅ PDF processed successfully!")
    os.unlink(pdf_path)

    retriever = vector_store.as_retriever(search_kwargs={"k": 4})

    # --------------------------------------------------
    # Question input
    # --------------------------------------------------
    st.text_input(
        "Ask a question about the PDF",
        key="question"
    )

    if st.session_state.question:
        # Prompt
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a helpful assistant. Answer strictly using the given context."),
            ("human", "Context:\n{context}\n\nQuestion:\n{question}")
        ])

        def format_docs(docs):
            return "\n\n".join(doc.page_content for doc in docs)

        # RAG chain
        rag_chain = (
            {"context": retriever | format_docs, "question": RunnablePassthrough()}
            | prompt
            | llm
            | StrOutputParser()
        )

        with st.spinner("Generating answer..."):
            st.session_state.answer = rag_chain.invoke(st.session_state.question)

    # --------------------------------------------------
    # Answer display
    # --------------------------------------------------
    if st.session_state.answer:
        st.subheader("🧠 Answer")
        st.write(st.session_state.answer)

        st.button(
            "🔄 Ask New Question",
            on_click=lambda: st.session_state.update(
                {"question": "", "answer": ""}
            )
        )

else:
    st.info("Upload a PDF to get started.")
