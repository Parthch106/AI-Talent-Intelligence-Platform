🚀 AI Talent Intelligence Platform — v2.0 (Transformer-Based Architecture)
🧠 Overview (Updated)

This version replaces heavy manual feature engineering with:

Section-wise text embeddings

Semantic role matching

Hybrid ML scoring

Data-driven learning instead of rule weights

Target: Fresher / 0–1 year candidates
Primary Input: Parsed resume string sections

🔷 Updated System Architecture
PHASE 1 → Resume Parsing (String Sections)
PHASE 2 → Text Embedding Generation (SentenceTransformer)
PHASE 3 → Hybrid ML Model (Embeddings + Optional Structured Features)
PHASE 4 → Multi-Output Prediction
PHASE 5 → Decision Engine
PHASE 6 → Feedback Loop Retraining

🔹 PHASE 1: Resume Parsing (String-Based)

File:
resume_parsing_engine.py

Instead of generating 24 numeric features, we now extract:

Parsed Sections

professional_summary (TEXT)

technical_skills (TEXT)

frameworks_libraries (TEXT)

tools_technologies (TEXT)

experience_descriptions (TEXT)

project_descriptions (TEXT)

education_text (TEXT)

certifications (TEXT)

achievements (TEXT)

⚠ No numeric scoring at this stage.

This makes system flexible for any domain.

🔹 PHASE 2: Embedding Layer (NEW CORE ENGINE)

File:
embedding_engine.py

Model Used:

SentenceTransformer (all-MiniLM-L6-v2)

Embedding Strategy:

Instead of concatenating everything blindly:

E_summary      = Embed(professional_summary)
E_experience   = Embed(experience_descriptions)
E_projects     = Embed(project_descriptions)
E_skills       = Embed(technical_skills)
E_role         = Embed(role_description)

Weighted Combination:
Resume_Vector =
    0.30 * E_experience +
    0.30 * E_projects +
    0.20 * E_skills +
    0.10 * E_summary +
    0.10 * Education

Role Matching:
semantic_match_score =
    cosine_similarity(Resume_Vector, Role_Vector)


This replaces TF-IDF.

🔹 PHASE 3: ML Model Architecture (Updated)

File:
ml_models.py

1️⃣ Suitability Classifier (Primary Model)
Property	Value
Type	XGBoost Classifier
Input	Resume Embeddings + semantic_match_score
Output	Probability (0–1)
Metric	ROC-AUC target > 0.88

No hardcoded weights anymore.

Model learns from data.

2️⃣ Growth Potential Predictor

Now trained using:

experience_embedding

project_embedding

quantified impact phrases

Output: Growth score (0–1)

3️⃣ Authenticity Classifier

Instead of keyword stuffing rules:

Train classifier on:

skill vs experience embedding similarity

repetitive sentence patterns

unrealistic tech combinations

Output: Authenticity probability

4️⃣ Multi-Output Design

Final predictions:

suitability_score

growth_score

authenticity_score

semantic_match_score

confidence_score

🔹 PHASE 4: Data-Driven Decision Engine

Remove manual adjustment rules like:

+0.05 for skill match
-0.15 for authenticity


Instead:

Decision thresholds are learned from validation dataset.

New Threshold Logic
Probability	Decision
≥ 0.80	INTERVIEW_SHORTLIST
0.65–0.79	TECHNICAL_ASSIGNMENT
0.50–0.64	MANUAL_REVIEW
< 0.50	REJECT

Thresholds optimized via ROC curve.

🔹 PHASE 5: Database Update (Simplified)
resume_sections (String store)

Stores parsed strings.

resume_embeddings

Stores embedding vectors.

structured_features (Optional)

Used only if hybrid model is enabled.

model_predictions

Stores output probabilities.

🔹 PHASE 6: Retraining Loop (Improved)

Instead of retraining on synthetic labels:

Training data source:

resume_sections
+ embeddings
+ hiring_outcomes.final_suitability_label


This enables:

Continuous improvement

Drift detection

Real learning

🔹 Removed from v1.0

❌ TF-IDF
❌ Manual skill weight assignments
❌ Hardcoded score bonuses
❌ Over-engineered numeric features
❌ Hackathon count dependency
❌ Keyword stuffing ratio as primary signal

🔹 Bias Mitigation (Improved)

Now applied at embedding stage:

Remove name before embedding

Remove university name before scoring

Normalize experience length

Separate education influence from technical signal

This prevents:

Prestige bias

Gender bias

Institution bias

🔹 Updated Example Output
{
  "candidate_id": "123",
  "suitability_score": 0.83,
  "decision": "INTERVIEW_SHORTLIST",
  "semantic_match_score": 0.87,
  "growth_score": 0.79,
  "authenticity_score": 0.91,
  "confidence_score": 0.88,
  "top_strengths": [
    "Strong applied project experience",
    "High semantic alignment with backend role"
  ],
  "risk_flags": [],
  "model_version": "transformer_xgb_v2"
}