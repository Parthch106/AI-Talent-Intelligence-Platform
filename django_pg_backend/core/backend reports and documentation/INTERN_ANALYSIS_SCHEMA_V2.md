AI Talent Intelligence Platform
Intern Analysis Database Schema (V2 – Transformer + Hybrid ML Ready)
Overview

This schema is designed for a Hybrid AI Resume Intelligence System supporting:

SentenceTransformer-based semantic modeling

Structured ML features (XGBoost / LightGBM)

Multi-output scoring (Suitability, Growth, Authenticity)

Role-aware matching

Model versioning & retraining pipeline

This version separates:

Raw resume data

Parsed text sections

Embeddings

Structured features

Model predictions

Hiring outcomes

Growth tracking

Architecture Flow (V2)
1. Resume Uploaded → Applications
2. Resume Parsing → Resume Sections
3. Embedding Generation → Resume Embeddings
4. Feature Engineering → Structured Features
5. Hybrid ML Inference → Model Predictions
6. Hiring Outcome Logged → Hiring Outcomes
7. Post-Hire Tracking → Growth Tracking
8. Periodic Retraining → Structured + Outcomes

1. Candidates Table

Stores basic candidate profile information.

CREATE TABLE candidates (
    candidate_id UUID PRIMARY KEY,
    full_name TEXT,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    location TEXT,
    linkedin_url TEXT,
    github_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

2. Job Roles Table

Stores role definitions and required skills.

CREATE TABLE job_roles (
    role_id UUID PRIMARY KEY,
    role_title TEXT NOT NULL,
    role_description TEXT,
    mandatory_skills TEXT[],
    preferred_skills TEXT[],
    role_embedding VECTOR,  -- Optional (pgvector)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

3. Applications Table

Links candidates to job roles.

CREATE TABLE applications (
    application_id UUID PRIMARY KEY,
    candidate_id UUID REFERENCES candidates(candidate_id) ON DELETE CASCADE,
    role_id UUID REFERENCES job_roles(role_id) ON DELETE CASCADE,
    resume_raw_text TEXT,
    application_status TEXT DEFAULT 'APPLIED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


Indexes:

CREATE INDEX idx_application_candidate ON applications(candidate_id);
CREATE INDEX idx_application_role ON applications(role_id);

4. Resume Sections Table (Parsed Text Store)

Stores structured resume sections for transformer-based modeling.

CREATE TABLE resume_sections (
    section_id UUID PRIMARY KEY,
    application_id UUID REFERENCES applications(application_id) ON DELETE CASCADE,

    professional_summary TEXT,
    technical_skills TEXT,
    tools_technologies TEXT,
    frameworks_libraries TEXT,
    databases TEXT,
    cloud_platforms TEXT,
    soft_skills TEXT,

    experience_titles TEXT,
    experience_descriptions TEXT,
    experience_duration_text TEXT,

    project_titles TEXT,
    project_descriptions TEXT,
    project_technologies TEXT,

    education_text TEXT,
    certifications TEXT,
    achievements TEXT,
    extracurriculars TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

5. Resume Embeddings Table (Vector Store)

Stores transformer embeddings for semantic similarity.

CREATE TABLE resume_embeddings (
    embedding_id UUID PRIMARY KEY,
    application_id UUID REFERENCES applications(application_id) ON DELETE CASCADE,

    summary_embedding VECTOR,
    experience_embedding VECTOR,
    project_embedding VECTOR,
    skills_embedding VECTOR,
    combined_embedding VECTOR,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


If pgvector is not available, store embeddings as JSONB or BYTEA.

6. Structured Features Table (Engineered ML Inputs)

Stores numerical features derived from resume analysis.

CREATE TABLE structured_features (
    feature_id UUID PRIMARY KEY,
    application_id UUID REFERENCES applications(application_id) ON DELETE CASCADE,

    -- Role Matching
    skill_match_ratio FLOAT CHECK (skill_match_ratio BETWEEN 0 AND 1),
    domain_similarity_score FLOAT CHECK (domain_similarity_score BETWEEN 0 AND 1),
    critical_skill_gap_count INT,

    -- Experience Strength
    experience_duration_months INT,
    internship_relevance_score FLOAT CHECK (internship_relevance_score BETWEEN 0 AND 1),
    project_complexity_score FLOAT CHECK (project_complexity_score BETWEEN 0 AND 1),

    -- Education
    degree_level_encoded INT CHECK (degree_level_encoded BETWEEN 1 AND 4),
    gpa_normalized FLOAT CHECK (gpa_normalized BETWEEN 0 AND 1),

    -- Resume Authenticity
    quantified_impact_presence BOOLEAN,
    writing_clarity_score FLOAT CHECK (writing_clarity_score BETWEEN 0 AND 1),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

7. Model Predictions Table (Multi-Output ML)

Stores inference results from hybrid models.

CREATE TABLE model_predictions (
    prediction_id UUID PRIMARY KEY,
    application_id UUID REFERENCES applications(application_id) ON DELETE CASCADE,

    suitability_score FLOAT CHECK (suitability_score BETWEEN 0 AND 1),
    technical_score FLOAT CHECK (technical_score BETWEEN 0 AND 1),
    growth_score FLOAT CHECK (growth_score BETWEEN 0 AND 1),
    authenticity_score FLOAT CHECK (authenticity_score BETWEEN 0 AND 1),
    semantic_match_score FLOAT CHECK (semantic_match_score BETWEEN 0 AND 1),

    decision TEXT CHECK (
        decision IN (
            'INTERVIEW_SHORTLIST',
            'TECHNICAL_ASSIGNMENT',
            'MANUAL_REVIEW',
            'REJECT'
        )
    ),

    model_type TEXT,
    model_version TEXT,
    confidence_score FLOAT CHECK (confidence_score BETWEEN 0 AND 1),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

8. Hiring Outcomes Table (Training Labels)

Stores real-world hiring decisions for retraining.

CREATE TABLE hiring_outcomes (
    outcome_id UUID PRIMARY KEY,
    application_id UUID REFERENCES applications(application_id) ON DELETE CASCADE,

    shortlisted BOOLEAN,
    technical_assignment_score FLOAT,
    hr_feedback_score FLOAT CHECK (hr_feedback_score BETWEEN 0 AND 1),
    hired BOOLEAN,
    offer_extended BOOLEAN,
    offer_accepted BOOLEAN,

    final_suitability_label BOOLEAN,

    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

9. Growth Tracking Table (Post-Hire Model)

Tracks intern performance after hiring.

CREATE TABLE growth_tracking (
    growth_id UUID PRIMARY KEY,
    candidate_id UUID REFERENCES candidates(candidate_id) ON DELETE CASCADE,

    months_since_joining INT,
    performance_rating FLOAT CHECK (performance_rating BETWEEN 0 AND 5),
    skill_growth_score FLOAT CHECK (skill_growth_score BETWEEN 0 AND 1),
    manager_feedback_score FLOAT CHECK (manager_feedback_score BETWEEN 0 AND 1),
    retention_status BOOLEAN,
    promotion_received BOOLEAN,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

10. Model Registry Table

Tracks model versions and performance.

CREATE TABLE model_registry (
    model_id UUID PRIMARY KEY,
    model_name TEXT,
    model_version TEXT,
    training_data_size INT,
    training_accuracy FLOAT,
    roc_auc FLOAT,
    f1_score FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

Key Improvements Over V1

Separate text and numeric features

Embedding support for transformer models

Hybrid ML architecture compatibility

Multi-output scoring support

Role-aware semantic matching

Clean retraining pipeline

Scalable to enterprise-level hiring system