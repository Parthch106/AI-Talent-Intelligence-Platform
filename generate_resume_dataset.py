"""
High-Value IT Resume Dataset Generator
=======================================

This script generates realistic IT sector resumes that match the exact format
expected by:
1. LLM Resume Parser (llm_resume_parser.py)
2. Embedding Engine (embedding_engine.py) - bge-large-en-v1.5
3. Training Pipeline (train_models_v2.py)

The dataset includes:
- Multiple IT roles (ML Engineer, Data Analyst, Frontend Dev, Backend Dev, DevOps, Full Stack)
- Realistic skills, experiences, projects
- Proper labeling based on role requirements
- Balanced class distribution (50% positive, 50% negative)

Author: AI Talent Intelligence Platform
"""

import pandas as pd
import random
import uuid
from datetime import datetime, timedelta

# Set random seed for reproducibility
random.seed(42)

# =============================================================================
# ROLE DEFINITIONS - Required skills for each role
# =============================================================================

ROLE_REQUIREMENTS = {
    "ML Engineer": {
        "required_skills": ["Python", "TensorFlow", "PyTorch", "Scikit-learn", "Machine Learning"],
        "preferred_skills": ["AWS", "Docker", "Kubernetes", "SQL", "Computer Vision", "NLP"],
        "experience_years": 2,
        "weight": 1.0
    },
    "Data Analyst": {
        "required_skills": ["Python", "SQL", "Tableau", "Excel", "Data Visualization"],
        "preferred_skills": ["Power BI", "R", "Statistics", "pandas", "NumPy"],
        "experience_years": 1,
        "weight": 1.0
    },
    "Frontend Developer": {
        "required_skills": ["JavaScript", "React", "HTML", "CSS", "TypeScript"],
        "preferred_skills": ["Vue.js", "Angular", "Node.js", "Next.js", "Tailwind CSS"],
        "experience_years": 2,
        "weight": 1.0
    },
    "Backend Developer": {
        "required_skills": ["Python", "Django", "Flask", "SQL", "REST API"],
        "preferred_skills": ["Node.js", "PostgreSQL", "MongoDB", "Docker", "AWS"],
        "experience_years": 2,
        "weight": 1.0
    },
    "DevOps Engineer": {
        "required_skills": ["Docker", "Kubernetes", "AWS", "Jenkins", "CI/CD"],
        "preferred_skills": ["Terraform", "Ansible", "Linux", "Python", "Azure"],
        "experience_years": 3,
        "weight": 1.0
    },
    "Full Stack Developer": {
        "required_skills": ["JavaScript", "React", "Python", "Django", "SQL", "Node.js"],
        "preferred_skills": ["MongoDB", "PostgreSQL", "Docker", "AWS", "TypeScript"],
        "experience_years": 3,
        "weight": 1.0
    }
}

# =============================================================================
# SKILL BANKS - Realistic IT skills
# =============================================================================

SKILL_BANKS = {
    "programming_languages": [
        "Python", "JavaScript", "Java", "TypeScript", "C++", "C#", "Go", "Rust", 
        "Ruby", "PHP", "Swift", "Kotlin", "Scala", "R", "MATLAB"
    ],
    "frameworks_libraries": [
        "React", "Angular", "Vue.js", "Django", "Flask", "FastAPI", "Spring", 
        "Express.js", "Next.js", "Nuxt.js", "Tailwind CSS", "Bootstrap", 
        "TensorFlow", "PyTorch", "Scikit-learn", "Keras", "Pandas", "NumPy"
    ],
    "tools": [
        "Git", "Docker", "Kubernetes", "Jenkins", "JIRA", "VS Code", "IntelliJ",
        "Postman", "Figma", "Webpack", "Vite", "Terraform", "Ansible", "Prometheus"
    ],
    "databases": [
        "PostgreSQL", "MySQL", "MongoDB", "Redis", "SQLite", "Oracle", 
        "Microsoft SQL Server", "Elasticsearch", "Cassandra"
    ],
    "cloud_platforms": [
        "AWS", "Azure", "Google Cloud", "GCP", "Heroku", "DigitalOcean"
    ],
    "ml_ai": [
        "Machine Learning", "Deep Learning", "NLP", "Computer Vision", 
        "TensorFlow", "PyTorch", "Scikit-learn", "Keras", "OpenCV", 
        "LangChain", "LLMs", "GPT", "BERT", "Reinforcement Learning"
    ]
}

# =============================================================================
# EXPERIENCE TEMPLATES
# =============================================================================

EXPERIENCE_TITLES = {
    "ML Engineer": ["Machine Learning Engineer", "ML Engineer", "AI Engineer", "Data Scientist", "Research Engineer"],
    "Data Analyst": ["Data Analyst", "Business Analyst", "Data Scientist", "BI Developer"],
    "Frontend Developer": ["Frontend Developer", "UI Developer", "Web Developer", "React Developer"],
    "Backend Developer": ["Backend Developer", "API Developer", "Software Engineer", "Python Developer"],
    "DevOps Engineer": ["DevOps Engineer", "Site Reliability Engineer", "Cloud Engineer", "Infrastructure Engineer"],
    "Full Stack Developer": ["Full Stack Developer", "Software Developer", "Web Developer", "Full Stack Engineer"]
}

COMPANIES = [
    "Google", "Microsoft", "Amazon", "Meta", "Apple", "Netflix", "Adobe", "Salesforce",
    "IBM", "Oracle", "SAP", "Accenture", "Deloitte", "TCS", "Infosys", "Wipro",
    "StartUp AI", "DataFlow Inc", "CloudTech Solutions", "TechVentures", "InnovateCorp",
    "Digital Dynamics", "CodeCraft", "ByteWise", "DataPrime", "AIVision Labs"
]

# =============================================================================
# PROJECT TEMPLATES
# =============================================================================

ML_PROJECTS = [
    "Developed a recommendation system using collaborative filtering and matrix factorization achieving 85% accuracy",
    "Built an NLP-based sentiment analysis model for customer feedback classification using BERT and PyTorch",
    "Created a computer vision system for object detection using YOLO and OpenCV for real-time video analysis",
    "Implemented a fraud detection system using Random Forest and XGBoost with 95% precision",
    "Built a predictive maintenance model using time-series forecasting with LSTM networks",
    "Developed a chatbot using LangChain and OpenAI GPT API for customer support automation",
    "Created a natural language query interface for SQL databases using LLM fine-tuning",
    "Implemented an image classification system using transfer learning with ResNet and TensorFlow"
]

DATA_ANALYST_PROJECTS = [
    "Created interactive dashboards in Tableau for executive reporting and KPI tracking",
    "Built ETL pipelines using Python and pandas to process 1M+ daily records",
    "Performed exploratory data analysis revealing key business insights increasing revenue by 15%",
    "Developed automated reporting systems reducing manual work by 10 hours per week",
    "Conducted A/B testing analysis leading to 20% improvement in conversion rates"
]

FRONTEND_PROJECTS = [
    "Built a responsive e-commerce platform using React and Node.js with 99.9% uptime",
    "Developed a real-time chat application using WebSocket and React for customer support",
    "Created a portfolio website with Next.js and Tailwind CSS with 95+ Lighthouse score",
    "Implemented a drag-and-drop task management app using React and Redux",
    "Built a progressive web app with offline capabilities using Service Workers"
]

BACKEND_PROJECTS = [
    "Designed and implemented RESTful APIs serving 10K+ requests per second",
    "Built a microservices architecture using Docker and Kubernetes on AWS",
    "Developed an authentication system using JWT and OAuth 2.0 for secure access",
    "Created a file upload system with AWS S3 and CloudFront CDN integration",
    "Implemented a message queue system using RabbitMQ for async processing"
]

DEVOPS_PROJECTS = [
    "Set up CI/CD pipelines using Jenkins and GitHub Actions reducing deployment time by 70%",
    "Implemented infrastructure as code using Terraform and Ansible for AWS environment",
    "Built a Kubernetes cluster on AWS EKS with auto-scaling and load balancing",
    "Created monitoring and alerting system using Prometheus and Grafana",
    "Automated backup and disaster recovery procedures reducing RTO by 80%"
]

# =============================================================================
# EDUCATION TEMPLATES
# =============================================================================

DEGREES = [
    "Bachelor of Technology in Computer Science",
    "Bachelor of Engineering in Computer Science",
    "Bachelor of Science in Computer Science",
    "Master of Technology in Computer Science",
    "Master of Science in Data Science",
    "Master of Engineering in Software Engineering"
]

UNIVERSITIES = [
    "MIT", "Stanford University", "Carnegie Mellon University", "UC Berkeley",
    "University of Washington", "Georgia Tech", "University of Michigan",
    "Indian Institute of Technology Delhi", "IIT Bombay", "IIT Madras",
    "National Institute of Technology", "Birla Institute of Technology",
    "Amrita Vishwa Vidyapeetham", "VIT University", "Anna University"
]

# =============================================================================
# CERTIFICATIONS
# =============================================================================

CERTIFICATIONS = [
    "AWS Certified Solutions Architect",
    "AWS Certified Developer",
    "AWS Certified Machine Learning",
    "Google Cloud Professional Data Engineer",
    "Microsoft Azure Administrator",
    "Certified Kubernetes Administrator",
    "TensorFlow Developer Certificate",
    "Python Institute PCAP",
    "Scrum Master Certification",
    "Oracle Database Certification"
]

# =============================================================================
# GENERATOR FUNCTIONS
# =============================================================================

def generate_professional_summary(role: str, skills: list, years_experience: int, is_suitable: bool) -> str:
    """Generate professional summary based on role and suitability."""
    
    suitable_summaries = [
        f"Experienced {role} with {years_experience}+ years of hands-on experience in building scalable solutions. Proficient in {', '.join(skills[:5])}. Passionate about leveraging technology to solve complex business problems.",
        f"Results-driven {role} with a strong track record of delivering high-impact projects. Expertise in {', '.join(skills[:4])} and modern software development practices. Looking to contribute to innovative teams.",
        f"Detail-oriented {role} skilled in developing and deploying production-grade applications. Strong background in {', '.join(skills[:3])} with proven ability to collaborate effectively in agile environments.",
        f"Dynamic {role} with {years_experience}+ years of experience in the IT industry. Demonstrated expertise in {', '.join(skills[:4])}. Committed to continuous learning and professional growth.",
        f"Accomplished {role} with extensive experience in designing and implementing enterprise solutions. Proficient in {', '.join(skills[:5])}. Excellent problem-solving and communication skills."
    ]
    
    unsuitable_summaries = [
        f"Junior developer with basic knowledge of {skills[0]}. Looking to gain experience in {role} position.",
        f"Recent graduate seeking an entry-level position. Familiar with {', '.join(skills[:2])} through academic projects.",
        f"Career changer from non-technical background. Currently learning {', '.join(skills[:2])} through online courses.",
        f"IT enthusiast with interest in {role}. Limited commercial experience but eager to learn.",
        f"Freelancer with general programming knowledge. Working on personal projects using {skills[0]}."
    ]
    
    return random.choice(suitable_summaries) if is_suitable else random.choice(unsuitable_summaries)


def generate_technical_skills(role: str, is_suitable: bool) -> dict:
    """Generate technical skills based on role and suitability."""
    
    # Get role requirements
    req = ROLE_REQUIREMENTS[role]
    required = req["required_skills"]
    preferred = req["preferred_skills"]
    
    if is_suitable:
        # For suitable candidates: include most required skills + some preferred
        skills = required.copy()
        skills.extend(random.sample(preferred, min(4, len(preferred))))
        # Add some extra relevant skills
        skills.extend(random.sample(SKILL_BANKS["frameworks_libraries"], 2))
    else:
        # For unsuitable candidates: missing required skills, wrong skills
        skills = []
        # Only include 1-2 required skills
        skills.extend(random.sample(required, min(1, len(required))))
        # Add unrelated skills
        skills.extend(random.sample(SKILL_BANKS["frameworks_libraries"][:5], 2))
    
    # Remove duplicates
    skills = list(set(skills))
    random.shuffle(skills)
    
    return skills


def generate_frameworks(role: str, is_suitable: bool) -> list:
    """Generate frameworks and libraries based on role."""
    
    role_frameworks = {
        "ML Engineer": ["TensorFlow", "PyTorch", "Scikit-learn", "Keras", "Pandas", "LangChain"],
        "Data Analyst": ["pandas", "NumPy", "Matplotlib", "Seaborn", "Tableau", "Power BI"],
        "Frontend Developer": ["React", "Vue.js", "Angular", "Next.js", "Tailwind CSS", "Redux"],
        "Backend Developer": ["Django", "Flask", "FastAPI", "Express.js", "Spring", "Node.js"],
        "DevOps": ["Docker", "Kubernetes", "Jenkins", "Terraform", "Ansible", "Prometheus"],
        "Full Stack Developer": ["React", "Django", "Node.js", "Express", "Vue.js", "Flask"]
    }
    
    frameworks = role_frameworks.get(role, [])
    
    if is_suitable:
        result = random.sample(frameworks, min(5, len(frameworks)))
    else:
        # Wrong frameworks for the role
        all_frameworks = [f for f_list in role_frameworks.values() for f in f_list]
        result = random.sample([f for f in all_frameworks if f not in frameworks], min(2, len(all_frameworks)))
    
    return result


def generate_tools(role: str, is_suitable: bool) -> list:
    """Generate tools based on role."""
    
    if is_suitable:
        tools = ["Git", "Docker", "VS Code", "JIRA", "Linux"]
        if role in ["DevOps Engineer", "Full Stack Developer"]:
            tools.extend(["Kubernetes", "AWS", "Jenkins"])
    else:
        tools = ["Git", "VS Code"]  # Minimal tools
    
    return list(set(tools))


def generate_experience(role: str, years_experience: int, is_suitable: bool) -> str:
    """Generate work experience descriptions."""
    
    titles = EXPERIENCE_TITLES.get(role, ["Software Engineer"])
    
    if is_suitable:
        num_positions = min(years_experience, 3)
    else:
        num_positions = 1 if years_experience < 1 else 2
    
    experiences = []
    for i in range(num_positions):
        company = random.choice(COMPANIES)
        title = random.choice(titles)
        
        if is_suitable:
            if role == "ML Engineer":
                desc = random.choice(ML_PROJECTS)
            elif role == "Data Analyst":
                desc = random.choice(DATA_ANALYST_PROJECTS)
            elif role == "Frontend Developer":
                desc = random.choice(FRONTEND_PROJECTS)
            elif role == "Backend Developer":
                desc = random.choice(BACKEND_PROJECTS)
            else:
                desc = random.choice(DEVOPS_PROJECTS)
        else:
            desc = f"Assisted with basic coding tasks and learned {random.choice(SKILL_BANKS['programming_languages'][:5])}"
        
        experiences.append(f"{title} at {company}: {desc}")
    
    return " | ".join(experiences)


def generate_projects(role: str, is_suitable: bool) -> str:
    """Generate project descriptions."""
    
    project_templates = {
        "ML Engineer": ML_PROJECTS,
        "Data Analyst": DATA_ANALYST_PROJECTS,
        "Frontend Developer": FRONTEND_PROJECTS,
        "Backend Developer": BACKEND_PROJECTS,
        "DevOps Engineer": DEVOPS_PROJECTS,
        "Full Stack Developer": FRONTEND_PROJECTS + BACKEND_PROJECTS
    }
    
    projects = project_templates.get(role, ML_PROJECTS)
    
    if is_suitable:
        num_projects = 3
    else:
        num_projects = 1
    
    selected = random.sample(projects, min(num_projects, len(projects)))
    return " | ".join(selected)


def generate_education(is_suitable: bool) -> str:
    """Generate education details."""
    
    degree = random.choice(DEGREES)
    university = random.choice(UNIVERSITIES)
    
    if is_suitable:
        details = f"{degree}, {university}, GPA: {random.choice(['3.5', '3.7', '3.8', '3.9', '4.0'])}"
    else:
        details = f"{degree}, {university}"
    
    return details


def generate_certifications(is_suitable: bool) -> str:
    """Generate certifications."""
    
    if is_suitable:
        num_certs = random.randint(1, 3)
        selected = random.sample(CERTIFICATIONS, num_certs)
        return ", ".join(selected)
    else:
        return ""  # No certifications for unsuitable candidates


def determine_suitability(role: str, skills: list, frameworks: list, tools: list) -> int:
    """Determine if candidate is suitable based on skills matching role requirements."""
    
    req = ROLE_REQUIREMENTS[role]
    required_skills = req["required_skills"]
    
    # Count matching skills
    all_skills = skills + frameworks + tools
    matches = sum(1 for skill in required_skills if any(skill in s for s in all_skills))
    
    # Suitability threshold
    if matches >= 3:
        return 1
    elif matches >= 2 and len(all_skills) >= 5:
        return 1
    else:
        return 0


def generate_resume(role: str, is_suitable: bool = None) -> dict:
    """Generate a single resume."""
    
    # Determine years of experience
    if is_suitable is None:
        is_suitable = random.random() > 0.5
    
    years_experience = random.randint(1, 6) if is_suitable else random.randint(0, 2)
    
    # Generate all fields
    skills = generate_technical_skills(role, is_suitable)
    frameworks = generate_frameworks(role, is_suitable)
    tools = generate_tools(role, is_suitable)
    summary = generate_professional_summary(role, skills + frameworks, years_experience, is_suitable)
    experience = generate_experience(role, years_experience, is_suitable)
    projects = generate_projects(role, is_suitable)
    education = generate_education(is_suitable)
    certifications = generate_certifications(is_suitable)
    
    # Re-determine suitability based on actual skills - FORCE EXACT LABEL
    # Use the is_suitable flag that was passed in, don't recalculate
    return {
        "candidate_id": str(uuid.uuid4()),
        "applied_role": role,
        "professional_summary": summary,
        "technical_skills": ", ".join(skills),
        "frameworks_libraries": ", ".join(frameworks),
        "tools_technologies": ", ".join(tools),
        "experience_descriptions": experience,
        "project_descriptions": projects,
        "education_text": education,
        "certifications": certifications,
        "suitability_label": 1 if is_suitable else 0
    }


def generate_dataset(num_samples: int = 10000, balance_ratio: float = 0.5) -> pd.DataFrame:
    """
    Generate a balanced dataset of IT resumes.
    
    Args:
        num_samples: Total number of resumes to generate
        balance_ratio: Ratio of positive (suitable) samples (0.5 = 50% positive)
    
    Returns:
        DataFrame with generated resumes
    """
    
    roles = list(ROLE_REQUIREMENTS.keys())
    resumes = []
    
    # Calculate samples per role
    samples_per_role = num_samples // len(roles)
    
    # Calculate positive/negative split
    positive_count = int(num_samples * balance_ratio)
    negative_count = num_samples - positive_count
    
    print(f"Generating {num_samples} resumes...")
    print(f"  - Positive (suitable): {positive_count}")
    print(f"  - Negative (unsuitable): {negative_count}")
    print(f"  - Roles: {roles}")
    
    for role in roles:
        print(f"\nGenerating {samples_per_role} resumes for {role}...")
        
        # Generate positive samples for this role
        positive_per_role = positive_count // len(roles)
        for _ in range(positive_per_role):
            resume = generate_resume(role, is_suitable=True)
            resumes.append(resume)
        
        # Generate negative samples for this role
        negative_per_role = negative_count // len(roles)
        for _ in range(negative_per_role):
            resume = generate_resume(role, is_suitable=False)
            resumes.append(resume)
    
    # Shuffle the dataset
    random.shuffle(resumes)
    
    df = pd.DataFrame(resumes)
    
    print(f"\n=== Dataset Summary ===")
    print(f"Total samples: {len(df)}")
    print(f"\nLabel distribution:")
    print(df['suitability_label'].value_counts())
    print(f"\nRole distribution:")
    print(df['applied_role'].value_counts())
    
    return df


# =============================================================================
# MAIN EXECUTION
# =============================================================================

if __name__ == "__main__":
    # Generate 10,000 balanced samples
    print("=" * 60)
    print("IT RESUME DATASET GENERATOR")
    print("=" * 60)
    
    df = generate_dataset(num_samples=10000, balance_ratio=0.5)
    
    # Save to CSV
    output_path = "django_pg_backend/core/docs/it_resume_dataset_10000_v2.csv"
    df.to_csv(output_path, index=False)
    
    print(f"\n✓ Dataset saved to: {output_path}")
    print(f"✓ Columns: {list(df.columns)}")
    
    # Display sample
    print("\n=== Sample Resume ===")
    print(df.iloc[0].to_dict())
