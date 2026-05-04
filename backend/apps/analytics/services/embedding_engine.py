import numpy as np
import logging
import os
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass

logger = logging.getLogger(__name__)

# Try to import langchain_openai, fallback to simpler approach if not available
try:
    from langchain_openai import OpenAIEmbeddings
    API_EMBEDDINGS_AVAILABLE = True
    logger.info("langchain_openai imported — API embeddings available")
except ImportError as e:
    API_EMBEDDINGS_AVAILABLE = False
    logger.warning(f"langchain_openai not installed — falling back to TF-IDF. ({e})")
except Exception as e:
    API_EMBEDDINGS_AVAILABLE = False
    logger.error(f"Unexpected error importing langchain_openai: {e}")


# ============================================================================
# EMBEDDING CONFIGURATION
# ============================================================================

@dataclass
class EmbeddingConfig:
    """Configuration for embedding generation."""
    # API configuration
    # GitHub Models provides text-embedding-3-small (1536-dim)
    model_name: str = 'text-embedding-3-small'
    embedding_dim: int = 1536
    
    # Section weights for resume vector combination
    weights: Dict[str, float] = None
    
    def __post_init__(self):
            self.weights = {
                'experience': 0.30,
                'projects':   0.20,
                'skills':     0.25,
                'summary':    0.05,
                'education':  0.05,
                'global_context': 0.15,
            }


# Default configuration
DEFAULT_EMBEDDING_CONFIG = EmbeddingConfig()


# ============================================================================
# EMBEDDING ENGINE CLASS
# ============================================================================

class EmbeddingEngine:
    """
    API-based Embedding Engine for v2.0 (Optimized for Storage).
    
    Replaces local SentenceTransformer with API-based OpenAIEmbeddings.
    Saves ~2GB of disk space by removing torch and local model weights.
    """
    
    def __init__(self, config: Optional[EmbeddingConfig] = None):
        self.config = config or DEFAULT_EMBEDDING_CONFIG
        self._model = None
        self._is_initialized = False
    
    # =========================================================================
    # MODEL INITIALIZATION
    # =========================================================================
    
    @property
    def model(self):
        """Lazy load the model."""
        if not self._is_initialized:
            self._initialize_model()
        return self._model
    
    def _initialize_model(self):
        """Initialize the OpenAIEmbeddings model via GitHub Models."""
        if API_EMBEDDINGS_AVAILABLE:
            try:
                # Get token from environment
                api_key = os.environ.get("AI_TALENT_GITHUB_TOKEN") or os.environ.get("GITHUB_TOKEN")
                base_url = "https://models.inference.ai.azure.com"
                
                if not api_key:
                    logger.error("  Missing API key (AI_TALENT_GITHUB_TOKEN) for embeddings.")
                    self._is_initialized = False
                    return

                logger.info(f"Initializing API embedding model: {self.config.model_name}")
                self._model = OpenAIEmbeddings(
                    model=self.config.model_name,
                    openai_api_key=api_key,
                    openai_api_base=base_url,
                    check_embedding_ctx_length=False # GitHub Models might have different limits
                )
                self._is_initialized = True
                logger.info(f"  API Model initialized OK — {self.config.model_name}")
            except Exception as e:
                logger.error(f"  Failed to initialize API Embeddings: {e}")
                self._model = None
                self._is_initialized = False
        else:
            logger.warning("langchain_openai unavailable — embedding engine in fallback mode")
            self._is_initialized = False
    
    # =========================================================================
    # SECTION EMBEDDING GENERATION
    # =========================================================================
    
    def generate_section_embeddings(
        self,
        resume_sections: Dict[str, str]
    ) -> Dict[str, np.ndarray]:
        """Generate embeddings for each resume section using API."""
        section_embeddings = {}

        embedding_mapping = {
            'summary': [
                resume_sections.get('professional_summary', ''),
                resume_sections.get('achievements', '')
            ],
            'experience': [resume_sections.get('experience_descriptions', '')],
            'projects': [resume_sections.get('project_descriptions', '')],
            'skills': [
                resume_sections.get('technical_skills', ''),
                resume_sections.get('frameworks_libraries', ''),
                resume_sections.get('tools_technologies', ''),
            ],
            'education': [
                resume_sections.get('education_text', ''),
                resume_sections.get('certifications', ''),
            ],
            'global_context': [resume_sections.get('global_context', '')],
        }

        # Trigger lazy model initialization
        _ = self.model

        if self._is_initialized and self._model is not None:
            for section_name, texts in embedding_mapping.items():
                combined_text = ' '.join([t for t in texts if t]).strip()
                if combined_text:
                    try:
                        # Batching is handled by LangChain if needed
                        embedding = self._model.embed_query(combined_text)
                        section_embeddings[section_name] = np.array(embedding)
                    except Exception as e:
                        logger.error(f"  API Embedding failed for section '{section_name}': {e}")
                        section_embeddings[section_name] = np.zeros(self.config.embedding_dim)
                else:
                    section_embeddings[section_name] = np.zeros(self.config.embedding_dim)
        else:
            logger.warning("  API Model not initialized — using zero vectors")
            for section_name in embedding_mapping:
                section_embeddings[section_name] = np.zeros(self.config.embedding_dim)

        return section_embeddings
    
    def compute_resume_vector(
        self,
        section_embeddings: Dict[str, np.ndarray]
    ) -> np.ndarray:
        """Compute weighted combination of section embeddings with re-normalization."""
        weights = self.config.weights
        resume_vector = np.zeros(self.config.embedding_dim)
        
        # Calculate sum of weights for available sections to re-normalize
        available_weight_sum = sum(weights.get(name, 0) for name in section_embeddings.keys())
        
        if available_weight_sum == 0:
            return resume_vector
            
        for section_name, embedding in section_embeddings.items():
            if section_name in weights:
                # Re-normalize weight so available sections sum to 1.0
                norm_weight = weights[section_name] / available_weight_sum
                resume_vector += norm_weight * embedding

        # L2 normalise
        norm = np.linalg.norm(resume_vector)
        if norm > 0:
            resume_vector = resume_vector / norm

        return resume_vector
    
    def compute_semantic_match(
        self,
        resume_vector: np.ndarray,
        role_embedding: np.ndarray
    ) -> float:
        """Compute semantic match score (cosine similarity)."""
        if resume_vector is None or role_embedding is None:
            return 0.0

        # Ensure both are normalized for dot product to equal cosine similarity
        norm_r = np.linalg.norm(resume_vector)
        norm_role = np.linalg.norm(role_embedding)
        
        if norm_r == 0 or norm_role == 0:
            return 0.0
            
        # Compute raw cosine similarity
        similarity = np.dot(resume_vector, role_embedding) / (norm_r * norm_role)
        
        # Scale and clip (OpenAI embeddings often have high cosine similarity floor)
        # v2.0 Discriminating: center at 0.35, slope at 12
        if similarity > 0.10:
            scaled_similarity = 1 / (1 + np.exp(-12 * (similarity - 0.35)))
        else:
            scaled_similarity = 0.0
            
        return float(np.clip(scaled_similarity, 0.0, 1.0))
    
    def generate_role_embedding(self, role_description: str) -> np.ndarray:
        """Generate embedding for job role description via API."""
        # Trigger lazy model initialization
        _ = self.model
        
        if self._is_initialized and self._model is not None and role_description:
            try:
                embedding = self._model.embed_query(role_description)
                return np.array(embedding)
            except Exception as e:
                logger.error(f"Error generating API role embedding: {e}")
        return np.zeros(self.config.embedding_dim)
    
    def remove_sensitive_info(self, text: str) -> str:
        """Remove sensitive information to mitigate bias."""
        import re
        patterns_to_remove = [
            r'\b[A-Z][a-z]+ [A-Z][a-z]+\b',
            r'\b(University|College|Institute)\s+of\s+\w+',
            r'\b(Stanford|MIT|Harvard|Yale|Princeton|Berkeley|UCLA|Georgia Tech)\b',
            r'\b(New York|Los Angeles|Chicago|San Francisco|Boston|Seattle)\b',
            r'\b\d{5}(-\d{4})?\b',
        ]
        sanitized = text
        for pattern in patterns_to_remove:
            sanitized = re.sub(pattern, '[REDACTED]', sanitized, flags=re.IGNORECASE)
        return sanitized
    
    def process_resume(
        self,
        resume_sections: Dict[str, str],
        role_description: str,
        apply_bias_mitigation: bool = True
    ) -> Dict[str, Any]:
        """Main processing method for resume embedding via API."""
        
        # Apply bias mitigation
        processed_sections = {}
        if apply_bias_mitigation:
            for section_name, text in resume_sections.items():
                processed_sections[section_name] = self.remove_sensitive_info(text)
        else:
            processed_sections = resume_sections

        # Generate embeddings
        section_embeddings = self.generate_section_embeddings(processed_sections)
        resume_vector = self.compute_resume_vector(section_embeddings)
        role_embedding = self.generate_role_embedding(role_description)
        semantic_match_score = self.compute_semantic_match(resume_vector, role_embedding)

        return {
            'section_embeddings': {k: v.tolist() for k, v in section_embeddings.items()},
            'resume_vector': resume_vector.tolist() if isinstance(resume_vector, np.ndarray) else resume_vector,
            'role_embedding': role_embedding.tolist() if isinstance(role_embedding, np.ndarray) else role_embedding,
            'semantic_match_score': round(semantic_match_score, 4),
            'embedding_dim': self.config.embedding_dim,
            'model_used': f"API:{self.config.model_name}" if self._is_initialized else 'fallback',
        }


# ============================================================================
# FALLBACK TF-IDF IMPLEMENTATION
# ============================================================================

class TFIDFEmbeddingFallback:
    """Fallback TF-IDF based embedding."""
    FALLBACK_DIM = 1536 # Match text-embedding-3-small

    def __init__(self):
        try:
            from sklearn.feature_extraction.text import TfidfVectorizer
            self.vectorizer = TfidfVectorizer(max_features=self.FALLBACK_DIM)
            self._is_fitted = False
        except ImportError:
            self._is_fitted = False

    def fit(self, texts: List[str]):
        if hasattr(self, 'vectorizer'):
            self.vectorizer.fit(texts)
            self._is_fitted = True

    def transform(self, text: str) -> np.ndarray:
        if not self._is_fitted or not hasattr(self, 'vectorizer'):
            return np.zeros(self.FALLBACK_DIM)
        return self.vectorizer.transform([text]).toarray()[0]


# singleton
embedding_engine = EmbeddingEngine()
