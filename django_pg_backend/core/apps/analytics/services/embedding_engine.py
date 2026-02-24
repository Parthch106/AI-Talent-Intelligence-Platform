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
    logger.info("SUCCESS: sentence_transformers imported successfully")
except ImportError as e:
    SENTENCE_TRANSFORMERS_AVAILABLE = False
    logger.warning(f"sentence-transformers not installed. Using fallback TF-IDF approach. Error: {e}")
except Exception as e:
    SENTENCE_TRANSFORMERS_AVAILABLE = False
    logger.error(f"Unexpected error importing sentence-transformers: {e}")

# Log the final state
logger.info(f"=== Module loaded: SENTENCE_TRANSFORMERS_AVAILABLE = {SENTENCE_TRANSFORMERS_AVAILABLE} ===")


# ============================================================================
# EMBEDDING CONFIGURATION
# ============================================================================

@dataclass
class EmbeddingConfig:
    """Configuration for embedding generation."""
    # Model configuration
    model_name: str = 'all-MiniLM-L6-v2'
    embedding_dim: int = 384
    
    # Section weights for resume vector combination
    weights: Dict[str, float] = None
    
    def __post_init__(self):
        if self.weights is None:
            self.weights = {
                'experience': 0.30,
                'projects': 0.30,
                'skills': 0.20,
                'summary': 0.10,
                'education': 0.10,
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
        logger.info(f"=== model property accessed === _is_initialized = {self._is_initialized}")
        if not self._is_initialized:
            logger.info("Calling _initialize_model() from property")
            self._initialize_model()
        return self._model
    
    def _initialize_model(self):
        """Initialize the SentenceTransformer model."""
        logger.info("=== _initialize_model called ===")
        logger.info(f"SENTENCE_TRANSFORMERS_AVAILABLE = {SENTENCE_TRANSFORMERS_AVAILABLE}")
        if SENTENCE_TRANSFORMERS_AVAILABLE:
            try:
                logger.info(f"Loading SentenceTransformer model: {self.config.model_name}")
                self._model = SentenceTransformer(self.config.model_name)
                self._is_initialized = True
                logger.info(f"SUCCESS: Loaded SentenceTransformer model: {self.config.model_name}")
            except Exception as e:
                logger.error(f"EXCEPTION: Failed to load SentenceTransformer: {e}")
                import traceback
                logger.error(traceback.format_exc())
                self._model = None
                self._is_initialized = False
        else:
            logger.warning("SENTENCE_TRANSFORMERS_AVAILABLE is False")
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
        logger.info(f"generate_section_embeddings: input sections = {list(resume_sections.keys())}")
        logger.info(f"generate_section_embeddings: model initialized = {self._is_initialized}")
        
        section_embeddings = {}
        
        # Map resume sections to embedding categories
        embedding_mapping = {
            'summary': [
                resume_sections.get('professional_summary', ''),
                resume_sections.get('achievements', '')
            ],
            'experience': [
                resume_sections.get('experience_descriptions', ''),
            ],
            'projects': [
                resume_sections.get('project_descriptions', ''),
            ],
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
        
        logger.info(f"generate_section_embeddings: INPUT resume_sections = {resume_sections}")
        logger.info(f"generate_section_embeddings: _is_initialized = {self._is_initialized}, _model = {self._model}")
        
        # Access the model property to trigger lazy initialization if needed
        _ = self.model
        
        if self._is_initialized and self._model is not None:
            # Use SentenceTransformer
            for section_name, texts in embedding_mapping.items():
                combined_text = ' '.join([t for t in texts if t])
                logger.info(f"generate_section_embeddings: section={section_name}, text_length={len(combined_text)}")
                if combined_text.strip():
                    try:
                        embedding = self._model.encode(combined_text)
                        section_embeddings[section_name] = embedding
                        logger.info(f"generate_section_embeddings: generated embedding for {section_name}, shape={embedding.shape}")
                    except Exception as e:
                        logger.error(f"Error generating embedding for {section_name}: {e}")
                        section_embeddings[section_name] = np.zeros(self.config.embedding_dim)
                else:
                    logger.warning(f"generate_section_embeddings: empty text for {section_name}, using zeros")
                    section_embeddings[section_name] = np.zeros(self.config.embedding_dim)
        else:
            # Fallback: return zero vectors (will use structured features if available)
            logger.warning("generate_section_embeddings: model not initialized, using fallback")
            for section_name in embedding_mapping.keys():
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
        logger.info(f"compute_resume_vector: section_embeddings keys = {list(section_embeddings.keys()) if section_embeddings else None}")
        logger.info(f"compute_resume_vector: embedding_dim = {self.config.embedding_dim}, weights = {self.config.weights}")
        
        weights = self.config.weights
        resume_vector = np.zeros(self.config.embedding_dim)
        
        for section_name, weight in weights.items():
            if section_name in section_embeddings:
                logger.info(f"compute_resume_vector: adding {section_name} with weight {weight}")
                resume_vector += weight * section_embeddings[section_name]
        
        # Normalize the vector
        norm = np.linalg.norm(resume_vector)
        logger.info(f"compute_resume_vector: norm before normalization = {norm}")
        
        if norm > 0:
            resume_vector = resume_vector / norm
            
        logger.info(f"compute_resume_vector: final vector norm = {np.linalg.norm(resume_vector)}")
        
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
        logger.info(f"compute_semantic_match: resume_vector is None = {resume_vector is None}, shape = {resume_vector.shape if hasattr(resume_vector, 'shape') else 'N/A'}")
        logger.info(f"compute_semantic_match: role_embedding is None = {role_embedding is None}, shape = {role_embedding.shape if hasattr(role_embedding, 'shape') else 'N/A'}")
        
        if resume_vector is None or role_embedding is None:
            return 0.0
        
        # Check if vectors are zeros
        resume_norm = np.linalg.norm(resume_vector)
        role_norm = np.linalg.norm(role_embedding)
        logger.info(f"compute_semantic_match: resume_norm = {resume_norm}, role_norm = {role_norm}")
        
        # Cosine similarity
        dot_product = np.dot(resume_vector, role_embedding)
        logger.info(f"compute_semantic_match: dot_product = {dot_product}")
        
        # Ensure bounded output
        result = float(np.clip(dot_product, 0.0, 1.0))
        logger.info(f"compute_semantic_match: final result = {result}")
        
        return result
    
    def generate_role_embedding(self, role_description: str) -> np.ndarray:
        """
        Generate embedding for job role description.
        
        Args:
            role_description: Description of the job role
            
        Returns:
            Role embedding vector
        """
        if self._is_initialized and self._model is not None and role_description:
            try:
                embedding = self._model.encode(role_description)
                # Normalize
                norm = np.linalg.norm(embedding)
                if norm > 0:
                    embedding = embedding / norm
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
        logger.info(f"process_resume: model initialized = {self._is_initialized}")
        logger.info(f"process_resume: resume_sections keys = {list(resume_sections.keys()) if resume_sections else None}")
        logger.info(f"process_resume: role_description = {role_description[:50] if role_description else None}")
        
        # Apply bias mitigation if enabled
        processed_sections = {}
        if apply_bias_mitigation:
            for section_name, text in resume_sections.items():
                processed_sections[section_name] = self.remove_sensitive_info(text)
        else:
            processed_sections = resume_sections
        
        logger.info(f"process_resume: processed_sections keys = {list(processed_sections.keys())}")
        
        # Generate section embeddings
        section_embeddings = self.generate_section_embeddings(processed_sections)
        logger.info(f"process_resume: section_embeddings keys = {list(section_embeddings.keys()) if section_embeddings else None}")
        
        # Compute resume vector
        resume_vector = self.compute_resume_vector(section_embeddings)
        logger.info(f"process_resume: resume_vector shape = {resume_vector.shape if hasattr(resume_vector, 'shape') else len(resume_vector) if resume_vector else None}")
        
        # Generate role embedding
        role_embedding = self.generate_role_embedding(role_description)
        logger.info(f"process_resume: role_embedding shape = {role_embedding.shape if hasattr(role_embedding, 'shape') else len(role_embedding) if role_embedding else None}")
        
        # Compute semantic match
        semantic_match_score = self.compute_semantic_match(resume_vector, role_embedding)
        logger.info(f"process_resume: semantic_match_score = {semantic_match_score}")
        
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
    """
    
    def __init__(self):
        from sklearn.feature_extraction.text import TfidfVectorizer
        self.vectorizer = TfidfVectorizer(max_features=384)
        self._is_fitted = False
    
    def fit(self, texts: List[str]):
        """Fit TF-IDF vectorizer on corpus."""
        self.vectorizer.fit(texts)
        self._is_fitted = True
    
    def transform(self, text: str) -> np.ndarray:
        """Transform text to TF-IDF vector."""
        if not self._is_fitted:
            return np.zeros(384)
        return self.vectorizer.transform([text]).toarray()[0]


# ============================================================================
# SINGLETON INSTANCE
# ============================================================================

embedding_engine = EmbeddingEngine()
