# Intern Analysis Database Schema

## Overview
This document describes the new database schema for the AI Talent Intelligence Platform's intern analysis system. This architecture provides a complete ML pipeline with feature store, model versioning, and hiring outcomes tracking.

## Architecture Flow
```
1. Resume Uploaded → Applications Table
2. Feature Extraction → Resume Features Table
3. ML Inference → Model Predictions Table
4. Hiring Decision → Hiring Outcomes Table
5. Post-Hire Tracking → Growth Tracking Table
6. Periodic Retraining → Pull from Resume Features + Hiring Outcomes
```

---

## Core Application Tables

### 1. Candidates Table
Stores candidate information.

```sql
CREATE TABLE candidates (
    candidate_id UUID PRIMARY KEY,
    full_name TEXT,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Fields:**
- `candidate_id` (UUID, PK) - Unique identifier
- `full_name` (TEXT) - Candidate's full name
- `email` (TEXT, UNIQUE) - Email address
- `phone` (TEXT) - Contact number
- `created_at` (TIMESTAMP) - Record creation timestamp

---

### 2. Job Roles Table
Defines available job roles and their skill requirements.

```sql
CREATE TABLE job_roles (
    role_id UUID PRIMARY KEY,
    role_title TEXT NOT NULL,
    role_description TEXT,
    mandatory_skills TEXT[],
    preferred_skills TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Fields:**
- `role_id` (UUID, PK) - Unique identifier
- `role_title` (TEXT, NOT NULL) - Job title (e.g., FRONTEND_DEVELOPER, BACKEND_DEVELOPER)
- `role_description` (TEXT) - Role description
- `mandatory_skills` (TEXT[]) - Required skills for the role
- `preferred_skills` (TEXT[]) - Nice-to-have skills
- `created_at` (TIMESTAMP) - Record creation timestamp

---

### 3. Applications Table
Links candidates to job roles (Candidate × Role).

```sql
CREATE TABLE applications (
    application_id UUID PRIMARY KEY,
    candidate_id UUID REFERENCES candidates(candidate_id) ON DELETE CASCADE,
    role_id UUID REFERENCES job_roles(role_id) ON DELETE CASCADE,
    resume_text TEXT,
    application_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'APPLIED'
);
```

**Fields:**
- `application_id` (UUID, PK) - Unique identifier
- `candidate_id` (UUID, FK) - References candidates
- `role_id` (UUID, FK) - References job_roles
- `resume_text` (TEXT) - Raw resume text
- `application_date` (TIMESTAMP) - When applied
- `status` (TEXT) - Application status

**Indexes:**
```sql
CREATE INDEX idx_application_candidate ON applications(candidate_id);
CREATE INDEX idx_application_role ON applications(role_id);
```

---

## Resume Feature Store (ML Input Features)

### 4. Resume Features Table
The most important table - stores all ML input features for model training and inference.

```sql
CREATE TABLE resume_features (
    feature_id UUID PRIMARY KEY,
    application_id UUID REFERENCES applications(application_id) ON DELETE CASCADE,

    -- Skill & Role Matching
    skill_match_ratio FLOAT CHECK (skill_match_ratio BETWEEN 0 AND 1),
    mandatory_skill_coverage BOOLEAN,
    domain_similarity_score FLOAT CHECK (domain_similarity_score BETWEEN 0 AND 1),
    skill_depth_score FLOAT CHECK (skill_depth_score BETWEEN 0 AND 1),
    skill_project_consistency FLOAT CHECK (skill_project_consistency BETWEEN 0 AND 1),
    critical_skill_gap_count INT,

    -- Education
    degree_level_encoded INT CHECK (degree_level_encoded BETWEEN 1 AND 3),
    gpa_normalized FLOAT CHECK (gpa_normalized BETWEEN 0 AND 1),
    university_tier_score FLOAT CHECK (university_tier_score BETWEEN 0 AND 1),
    coursework_relevance_score FLOAT CHECK (coursework_relevance_score BETWEEN 0 AND 1),

    -- Experience
    experience_duration_months INT,
    internship_relevance_score FLOAT CHECK (internship_relevance_score BETWEEN 0 AND 1),
    open_source_score FLOAT CHECK (open_source_score BETWEEN 0 AND 1),
    hackathon_count INT,

    -- Projects
    project_count INT,
    project_complexity_score FLOAT CHECK (project_complexity_score BETWEEN 0 AND 1),
    quantified_impact_presence BOOLEAN,
    production_tools_usage_score FLOAT CHECK (production_tools_usage_score BETWEEN 0 AND 1),
    github_activity_score FLOAT CHECK (github_activity_score BETWEEN 0 AND 1),

    -- Resume Quality
    keyword_stuffing_ratio FLOAT CHECK (keyword_stuffing_ratio BETWEEN 0 AND 1),
    writing_clarity_score FLOAT CHECK (writing_clarity_score BETWEEN 0 AND 1),
    action_verb_density FLOAT CHECK (action_verb_density BETWEEN 0 AND 1),
    resume_consistency_score FLOAT CHECK (resume_consistency_score BETWEEN 0 AND 1),
    resume_length_normalized FLOAT CHECK (resume_length_normalized BETWEEN 0 AND 1),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Feature Categories:**

#### Skill & Role Matching
| Field | Type | Description |
|-------|------|-------------|
| `skill_match_ratio` | FLOAT | Ratio of matched skills to required skills (0-1) |
| `mandatory_skill_coverage` | BOOLEAN | Whether all mandatory skills are present |
| `domain_similarity_score` | FLOAT | Similarity between candidate's domain and job domain |
| `skill_depth_score` | FLOAT | Depth/level of each skill (0-1) |
| `skill_project_consistency` | FLOAT | Consistency between skills and projects (0-1) |
| `critical_skill_gap_count` | INT | Number of critical skills missing |

#### Education
| Field | Type | Description |
|-------|------|-------------|
| `degree_level_encoded` | INT | 1=High School, 2=Bachelor, 3=Masters+ |
| `gpa_normalized` | FLOAT | Normalized GPA score (0-1) |
| `university_tier_score` | FLOAT | University ranking score (0-1) |
| `coursework_relevance_score` | FLOAT | Relevance of coursework to role (0-1) |

#### Experience
| Field | Type | Description |
|-------|------|-------------|
| `experience_duration_months` | INT | Total experience in months |
| `internship_relevance_score` | FLOAT | Relevance of internship experience (0-1) |
| `open_source_score` | FLOAT | Open source contribution score (0-1) |
| `hackathon_count` | INT | Number of hackathons attended |

#### Projects
| Field | Type | Description |
|-------|------|-------------|
| `project_count` | INT | Number of projects |
| `project_complexity_score` | FLOAT | Complexity of projects (0-1) |
| `quantified_impact_presence` | BOOLEAN | Whether projects have quantifiable impact |
| `production_tools_usage_score` | FLOAT | Usage of production tools (0-1) |
| `github_activity_score` | FLOAT | GitHub activity level (0-1) |

#### Resume Quality
| Field | Type | Description |
|-------|------|-------------|
| `keyword_stuffing_ratio` | FLOAT | Ratio of keywords to content (0-1) |
| `writing_clarity_score` | FLOAT | Clarity of writing (0-1) |
| `action_verb_density` | FLOAT | Density of action verbs (0-1) |
| `resume_consistency_score` | FLOAT | Overall consistency (0-1) |
| `resume_length_normalized` | FLOAT | Normalized resume length (0-1) |

**Index:**
```sql
CREATE INDEX idx_features_application ON resume_features(application_id);
```

---

## Model Predictions Table

### 5. Model Predictions Table
Stores ML model outputs/predictions.

```sql
CREATE TABLE model_predictions (
    prediction_id UUID PRIMARY KEY,
    application_id UUID REFERENCES applications(application_id) ON DELETE CASCADE,

    suitability_score FLOAT CHECK (suitability_score BETWEEN 0 AND 1),
    technical_competency_score FLOAT CHECK (technical_competency_score BETWEEN 0 AND 1),
    growth_potential_score FLOAT CHECK (growth_potential_score BETWEEN 0 AND 1),
    resume_authenticity_score FLOAT CHECK (resume_authenticity_score BETWEEN 0 AND 1),
    communication_score FLOAT CHECK (communication_score BETWEEN 0 AND 1),
    leadership_score FLOAT CHECK (leadership_score BETWEEN 0 AND 1),

    decision TEXT CHECK (
        decision IN (
            'INTERVIEW_SHORTLIST',
            'TECHNICAL_ASSIGNMENT',
            'MANUAL_REVIEW',
            'REJECT'
        )
    ),

    model_version TEXT,
    confidence_score FLOAT CHECK (confidence_score BETWEEN 0 AND 1),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `prediction_id` | UUID | Unique identifier |
| `application_id` | UUID | FK to applications |
| `suitability_score` | FLOAT | Overall suitability (0-1) |
| `technical_competency_score` | FLOAT | Technical skills (0-1) |
| `growth_potential_score` | FLOAT | Growth potential (0-1) |
| `resume_authenticity_score` | FLOAT | Resume authenticity (0-1) |
| `communication_score` | FLOAT | Communication skills (0-1) |
| `leadership_score` | FLOAT | Leadership potential (0-1) |
| `decision` | TEXT | Final decision |
| `model_version` | TEXT | Version of model used |
| `confidence_score` | FLOAT | Model confidence (0-1) |
| `created_at` | TIMESTAMP | Prediction timestamp |

**Decisions:**
- `INTERVIEW_SHORTLIST` - Automatically shortlisted
- `TECHNICAL_ASSIGNMENT` - Send technical test
- `MANUAL_REVIEW` - Requires human review
- `REJECT` - Not suitable

**Index:**
```sql
CREATE INDEX idx_prediction_application ON model_predictions(application_id);
```

---

## Hiring Outcomes Table (Training Labels)

### 6. Hiring Outcomes Table
Used for model retraining - stores actual hiring outcomes.

```sql
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
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `outcome_id` | UUID | Unique identifier |
| `application_id` | UUID | FK to applications |
| `shortlisted` | BOOLEAN | Was candidate shortlisted |
| `technical_assignment_score` | FLOAT | Technical test score |
| `hr_feedback_score` | FLOAT | HR round feedback (0-1) |
| `hired` | BOOLEAN | Was candidate hired |
| `offer_extended` | BOOLENA | Was offer given |
| `offer_accepted` | BOOLEAN | Was offer accepted |
| `final_suitability_label` | BOOLEAN | Final label for training |
| `recorded_at` | TIMESTAMP | Recording timestamp |

**Index:**
```sql
CREATE INDEX idx_outcomes_application ON hiring_outcomes(application_id);
```

---

## Growth Tracking Table

### 7. Growth Tracking Table (Post-Hire Model)
Tracks intern performance after hiring.

```sql
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
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `growth_id` | UUID | Unique identifier |
| `candidate_id` | UUID | FK to candidates |
| `months_since_joining` | INT | Months employed |
| `performance_rating` | FLOAT | Performance (0-5) |
| `skill_growth_score` | FLOAT | Skill improvement (0-1) |
| `manager_feedback_score` | FLOAT | Manager rating (0-1) |
| `retention_status` | BOOLEAN | Still employed |
| `promotion_received` | BOOLEAN | Was promoted |
| `created_at` | TIMESTAMP | Recording timestamp |

---

## Resume Authenticity Review Table

### 8. Authenticity Reviews Table
Manual review results for resume authenticity.

```sql
CREATE TABLE authenticity_reviews (
    review_id UUID PRIMARY KEY,
    application_id UUID REFERENCES applications(application_id) ON DELETE CASCADE,

    skill_project_mismatch_ratio FLOAT CHECK (skill_project_mismatch_ratio BETWEEN 0 AND 1),
    excessive_skill_listing_flag BOOLEAN,
    duplicate_bullet_pattern_flag BOOLEAN,
    authenticity_label BOOLEAN,

    reviewed_by TEXT,
    reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `review_id` | UUID | Unique identifier |
| `application_id` | UUID | FK to applications |
| `skill_project_mismatch_ratio` | FLOAT | Mismatch ratio (0-1) |
| `excessive_skill_listing_flag` | BOOLEAN | Too many skills flag |
| `duplicate_bullet_pattern_flag` | BOOLEAN | Duplicate patterns flag |
| `authenticity_label` | BOOLEAN | Is resume authentic |
| `reviewed_by` | TEXT | Reviewer name |
| `reviewed_at` | TIMESTAMP | Review timestamp |

---

## Model Metadata Table

### 9. Model Registry Table
Version tracking and model performance metrics.

```sql
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
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `model_id` | UUID | Unique identifier |
| `model_name` | TEXT | Model name |
| `model_version` | TEXT | Version string |
| `training_data_size` | INT | Number of training samples |
| `training_accuracy` | FLOAT | Training accuracy |
| `roc_auc` | FLOAT | ROC-AUC score |
| `f1_score` | FLOAT | F1 score |
| `created_at` | TIMESTAMP | Creation timestamp |

---

## Summary Table

| Table | Purpose | Key Fields |
|-------|---------|-------------|
| `candidates` | Candidate info | candidate_id, full_name, email |
| `job_roles` | Role definitions | role_id, role_title, mandatory_skills |
| `applications` | Candidate × Role | application_id, candidate_id, role_id |
| `resume_features` | ML Features | feature_id, skill_match_ratio, etc. |
| `model_predictions` | ML Outputs | prediction_id, suitability_score, decision |
| `hiring_outcomes` | Training Labels | outcome_id, shortlisted, hired |
| `growth_tracking` | Post-hire tracking | growth_id, performance_rating |
| `authenticity_reviews` | Manual reviews | review_id, authenticity_label |
| `model_registry` | Model versioning | model_id, model_version, f1_score |

---

## Integration Notes

### Existing Tables to Remove
The following existing tables should be deleted:
1. `InternIntelligence` - Replaced by `model_predictions`
2. `ResumeFeature` - Replaced by `resume_features`
3. `RoleRequirement` - Replaced by `job_roles`
4. `AnalyticsSnapshot` - Can be deprecated

### Django Models
This schema will be implemented as Django models in the `analytics` app with:
- UUID primary keys using `UUIDField`
- Proper foreign key relationships
- Check constraints for score validation
- Indexes for query performance
