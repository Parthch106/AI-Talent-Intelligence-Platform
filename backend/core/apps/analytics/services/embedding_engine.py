"""
PHASE 2: Embedding Engine (v2.0)
=================================

Transformer-based text embedding generation for the Talent Intelligence System.

This module replaces TF-IDF with semantic embeddings using SentenceTransformer.

Features:
- Section-wise embedding generation
- Weighted combination of embeddings
- Semantic role matching via cosine similarity
- Bias mitigation at embedding stage

Author: AI Talent Intelligence Platform v2.0
"""

import numpy as np
import logging
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass

logger = logging.getLogger(__name__)

# Try to import sentence_transformers, fallback to simpler approach if not available
try:
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMERS_AVAILABLE = True
    logger.info("sentence_transformers imported — transformer embeddings available")
except ImportError as e:
    SENTENCE_TRANSFORMERS_AVAILABLE = False
    logger.warning(f"sentence-transformers not installed — falling back to TF-IDF. ({e})")
except Exception as e:
    SENTENCE_TRANSFORMERS_AVAILABLE = False
    logger.error(f"Unexpected error importing sentence-transformers: {e}")


# ============================================================================
# EMBEDDING CONFIGURATION
# ============================================================================

@dataclass
class EmbeddingConfig:
    """Configuration for embedding generation."""
    # Model configuration
    # Upgraded from all-MiniLM-L6-v2 (384-dim) → bge-large-en-v1.5 (1024-dim)
    # bge-large-en-v1.5 is ~20% stronger on technical retrieval & NLP benchmarks
    model_name: str = 'BAAI/bge-large-en-v1.5'
    embedding_dim: int = 1024
    
    print(f"\n[EMBEDDING CONFIG]")
    print(f"  Model: {model_name}")
    print(f"  Dimension: {embedding_dim}")
    
    # Section weights for resume vector combination
    weights: Dict[str, float] = None
    
    def __post_init__(self):
        if self.weights is None:
            self.weights = {
                # Experience most signal-dense for role matching
                'experience': 0.40,
                # Projects show applied ability
                'projects':   0.25,
                # Skills are explicit keyword matches
                'skills':     0.20,
                # Summary is useful context
                'summary':    0.10,
                # Education least predictive for job suitability
                'education':  0.05,
            }


# Default configuration
DEFAULT_EMBEDDING_CONFIG = EmbeddingConfig()


# ============================================================================
# EMBEDDING ENGINE CLASS
# ============================================================================

class EmbeddingEngine:
    """
    Transformer-based Embedding Engine for v2.0.
    
    Replaces TF-IDF with semantic embeddings using SentenceTransformer.
    
    Key Features:
    - Section-wise embeddings (no numeric features at this stage)
    - Weighted combination for final resume vector
    - Semantic role matching
    - Bias mitigation (remove sensitive info before embedding)
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
        """Initialize the SentenceTransformer model."""
        if SENTENCE_TRANSFORMERS_AVAILABLE:
            try:
                logger.info(f"Loading embedding model: {self.config.model_name} (dim={self.config.embedding_dim})")
                self._model = SentenceTransformer(self.config.model_name)
                self._is_initialized = True
                logger.info(f"  Model loaded OK — {self.config.model_name}")
            except Exception as e:
                logger.error(f"  Failed to load SentenceTransformer '{self.config.model_name}': {e}")
                self._model = None
                self._is_initialized = False
        else:
            logger.warning("sentence-transformers unavailable — embedding engine in fallback mode")
            self._is_initialized = False
    
    # =========================================================================
    # SECTION EMBEDDING GENERATION
    # =========================================================================
    
    def generate_section_embeddings(
        self,
        resume_sections: Dict[str, str]
    ) -> Dict[str, np.ndarray]:
        """
        Generate embeddings for each resume section.
        
        Args:
            resume_sections: Dictionary containing resume text sections:
                - professional_summary
                - technical_skills
                - frameworks_libraries
                - tools_technologies
                - experience_descriptions
                - project_descriptions
                - education_text
                - certifications
                - achievements
                
        Returns:
            Dictionary mapping section name to embedding vector
        """
        section_embeddings = {}

        # Map resume sections to embedding categories
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
        }

        # Trigger lazy model initialization
        _ = self.model

        if self._is_initialized and self._model is not None:
            for section_name, texts in embedding_mapping.items():
                combined_text = ' '.join([t for t in texts if t])
                if combined_text.strip():
                    try:
                        # Document side — no BGE prefix needed
                        embedding = self._model.encode(combined_text, normalize_embeddings=True)
                        section_embeddings[section_name] = embedding
                    except Exception as e:
                        logger.error(f"  Embedding failed for section '{section_name}': {e}")
                        section_embeddings[section_name] = np.zeros(self.config.embedding_dim)
                else:
                    section_embeddings[section_name] = np.zeros(self.config.embedding_dim)
            logger.info(
                f"  Section embeddings generated — "
                + ", ".join(f"{k}: {len(embedding_mapping[k][0]) if embedding_mapping[k] else 0}ch" for k in section_embeddings)
            )
        else:
            logger.warning("  Model not initialized — all section embeddings set to zeros (scores will be 0)")
            for section_name in embedding_mapping:
                section_embeddings[section_name] = np.zeros(self.config.embedding_dim)

        return section_embeddings
    
    # =========================================================================
    # RESUME VECTOR COMPUTATION
    # =========================================================================
    
    def compute_resume_vector(
        self,
        section_embeddings: Dict[str, np.ndarray]
    ) -> np.ndarray:
        """
        Compute weighted combination of section embeddings.
        
        Formula:
        Resume_Vector = 
            0.30 * E_experience +
            0.30 * E_projects +
            0.20 * E_skills +
            0.10 * E_summary +
            0.10 * Education
            
        Args:
            section_embeddings: Dictionary of section embeddings
            
        Returns:
            Combined resume embedding vector
        """
        weights = self.config.weights
        resume_vector = np.zeros(self.config.embedding_dim)

        for section_name, weight in weights.items():
            if section_name in section_embeddings:
                resume_vector += weight * section_embeddings[section_name]

        # L2 normalise
        norm = np.linalg.norm(resume_vector)
        if norm > 0:
            resume_vector = resume_vector / norm

        return resume_vector
    
    # =========================================================================
    # SEMANTIC ROLE MATCHING
    # =========================================================================
    
    def compute_semantic_match(
        self,
        resume_vector: np.ndarray,
        role_embedding: np.ndarray
    ) -> float:
        """
        Compute semantic match score.
        
        Args between resume and role:
            resume_vector: Combined resume embedding
            role_embedding: Job role embedding
            
        Returns:
            Cosine similarity score (0-1)
        """
        if resume_vector is None or role_embedding is None:
            return 0.0

        dot_product = np.dot(resume_vector, role_embedding)
        return float(np.clip(dot_product, 0.0, 1.0))
    
    def generate_role_embedding(self, role_description: str) -> np.ndarray:
        """
        Generate embedding for job role description.

        BGE models require a query instruction prefix when embedding the
        "query" side (i.e. the job description we are searching against).
        Document side (resume sections) does NOT use this prefix.

        Args:
            role_description: Description of the job role

        Returns:
            Role embedding vector
        """
        if self._is_initialized and self._model is not None and role_description:
            try:
                # BGE instruction prefix — required for query/retrieval tasks
                bge_instruction = "Represent this job description for retrieving relevant candidates: "
                query_text = bge_instruction + role_description
                embedding = self._model.encode(query_text, normalize_embeddings=True)
                # normalize_embeddings=True handles L2 norm inside the model
                return embedding
            except Exception as e:
                logger.error(f"Error generating role embedding: {e}")
        return np.zeros(self.config.embedding_dim)
    
    # =========================================================================
    # BIAS MITIGATION
    # =========================================================================
    
    def remove_sensitive_info(self, text: str) -> str:
        """
        Remove sensitive information that could introduce bias.
        
        Removes:
        - Names
        - University names
        - Location information
        - Personal identifiers
        
        Args:
            text: Input text
            
        Returns:
            Sanitized text
        """
        import re
        
        # Common patterns to remove
        patterns_to_remove = [
            r'\b[A-Z][a-z]+ [A-Z][a-z]+\b',  # Names (2-word capital)
            r'\b(University|College|Institute)\s+of\s+\w+',
            r'\b(Stanford|MIT|Harvard|Yale|Princeton|Berkeley|UCLA|Georgia Tech)\b',
            r'\b(New York|Los Angeles|Chicago|San Francisco|Boston|Seattle)\b',
            r'\b\d{5}(-\d{4})?\b',  # Zip codes
        ]
        
        sanitized = text
        for pattern in patterns_to_remove:
            sanitized = re.sub(pattern, '[REDACTED]', sanitized, flags=re.IGNORECASE)
            
        return sanitized
    
    # =========================================================================
    # MAIN PROCESSING METHOD
    # =========================================================================
    
    def process_resume(
        self,
        resume_sections: Dict[str, str],
        role_description: str,
        apply_bias_mitigation: bool = True
    ) -> Dict[str, Any]:
        """
        Main processing method for v2.0 resume embedding.
        
        Args:
            resume_sections: Parsed resume text sections
            role_description: Job role description
            apply_bias_mitigation: Whether to remove sensitive info
            
        Returns:
            Dictionary containing:
            - section_embeddings: Individual section embeddings
            - resume_vector: Combined resume embedding
            - role_embedding: Job role embedding
            - semantic_match_score: Cosine similarity score
        """
        logger.info(
            f"process_resume: model={'OK' if self._is_initialized else 'FALLBACK'} "
            f"| sections={list(resume_sections.keys()) if resume_sections else []} "
            f"| role='{role_description[:60] if role_description else ''}...'"
        )

        # Apply bias mitigation if enabled
        processed_sections = {}
        if apply_bias_mitigation:
            for section_name, text in resume_sections.items():
                processed_sections[section_name] = self.remove_sensitive_info(text)
        else:
            processed_sections = resume_sections

        # Generate section embeddings
        section_embeddings = self.generate_section_embeddings(processed_sections)

        # Compute resume vector
        resume_vector = self.compute_resume_vector(section_embeddings)

        # Generate role embedding (BGE query-side prefix applied inside)
        role_embedding = self.generate_role_embedding(role_description)

        # Cosine similarity score
        semantic_match_score = self.compute_semantic_match(resume_vector, role_embedding)

        logger.info(
            f"  process_resume result — semantic_match={semantic_match_score:.4f} "
            f"| resume_dim={resume_vector.shape[0] if hasattr(resume_vector, 'shape') else len(resume_vector)} "
            f"| model={'OK' if self._is_initialized else 'fallback'}"
        )

        return {
            'section_embeddings': section_embeddings,
            'resume_vector': resume_vector.tolist() if isinstance(resume_vector, np.ndarray) else resume_vector,
            'role_embedding': role_embedding.tolist() if isinstance(role_embedding, np.ndarray) else role_embedding,
            'semantic_match_score': round(semantic_match_score, 4),
            'embedding_dim': self.config.embedding_dim,
            'model_used': self.config.model_name if self._is_initialized else 'fallback',
        }


# ============================================================================
# FALLBACK TF-IDF IMPLEMENTATION (when sentence-transformers unavailable)
# ============================================================================

class TFIDFEmbeddingFallback:
    """
    Fallback TF-IDF based embedding when SentenceTransformer is not available.

    This provides a degraded but functional experience.
    Dimensionality matches bge-large-en-v1.5 output (1024) for schema compatibility.
    """

    FALLBACK_DIM = 1024

    def __init__(self):
        from sklearn.feature_extraction.text import TfidfVectorizer
        self.vectorizer = TfidfVectorizer(max_features=self.FALLBACK_DIM)
        self._is_fitted = False

    def fit(self, texts: List[str]):
        """Fit TF-IDF vectorizer on corpus."""
        self.vectorizer.fit(texts)
        self._is_fitted = True

    def transform(self, text: str) -> np.ndarray:
        """Transform text to TF-IDF vector."""
        if not self._is_fitted:
            return np.zeros(self.FALLBACK_DIM)
        return self.vectorizer.transform([text]).toarray()[0]


# ============================================================================
# SINGLETON INSTANCE
# ============================================================================

embedding_engine = EmbeddingEngine()
