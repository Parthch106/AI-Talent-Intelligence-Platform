"""
Feature Engineering Configuration
Contains constants for skill classification and scoring.
"""

# Skill categories for analysis
SKILL_CATEGORIES = {
    'programming_languages': [
        'python', 'java', 'javascript', 'typescript', 'c', 'c++', 'c#', 'go', 'rust',
        'ruby', 'php', 'swift', 'kotlin', 'scala', 'r', 'matlab', 'sql'
    ],
    'web_frameworks': [
        'django', 'flask', 'fastapi', 'spring', 'express', 'react', 'angular', 'vue',
        'next.js', 'nuxt.js', 'node.js', 'asp.net', 'laravel', 'rails'
    ],
    'data_science_ml': [
        'tensorflow', 'pytorch', 'keras', 'scikit-learn', 'pandas', 'numpy', 'matplotlib',
        'seaborn', 'nltk', 'spacy', 'opencv', 'jupyter', 'tableau', 'power bi',
        'machine learning', 'deep learning', 'data analysis', 'statistics'
    ],
    'cloud_devops': [
        'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'git', 'ci/cd',
        'terraform', 'ansible', 'linux', 'bash', 'shell', 'nginx', 'apache',
        'cloud', 'devops', 'microservices'
    ],
    'databases': [
        'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'sqlite', 'oracle',
        'sql server', 'cassandra', 'dynamodb', 'database'
    ],
    'tools_ides': [
        'git', 'github', 'gitlab', 'jira', 'confluence', 'slack', 'figma', 'postman',
        'swagger', 'insomnia', 'vs code', 'visual studio', 'intellij', 'eclipse',
        'docker', 'kubernetes'
    ]
}

# Leadership indicators in job titles
LEADERSHIP_KEYWORDS = [
    'lead', 'manager', 'director', 'head', 'chief', 'senior', 'principal',
    'mentor', 'team lead', 'supervisor', 'coordinator', 'owner'
]

# Technical vs non-technical indicators
TECHNICAL_KEYWORDS = [
    'programming', 'coding', 'development', 'engineering', 'software', 'hardware',
    'data', 'machine learning', 'ai', 'cloud', 'devops', 'database', 'security',
    'network', 'web', 'mobile', 'api', 'backend', 'frontend', 'fullstack'
]

# IDFs for skill weighting
SKILL_IDF_WEIGHTS = {
    'python': 1.0,
    'java': 0.9,
    'javascript': 0.85,
    'react': 0.9,
    'aws': 0.95,
    'docker': 0.95,
    'kubernetes': 0.95,
    'machine learning': 1.0,
    'deep learning': 1.0,
}

# Domain keywords mapping
DOMAIN_KEYWORDS = {
    'frontend': ['react', 'vue', 'angular', 'javascript', 'typescript', 'html', 'css', 'ui', 'ux'],
    'backend': ['django', 'flask', 'fastapi', 'node.js', 'express', 'api', 'rest', 'graphql', 'server'],
    'fullstack': ['react', 'django', 'flask', 'node.js', 'express', 'fullstack', 'full stack'],
    'data_science': ['pandas', 'numpy', 'matplotlib', 'seaborn', 'scikit-learn', 'data analysis', 'statistics'],
    'machine_learning': ['tensorflow', 'pytorch', 'keras', 'machine learning', 'deep learning', 'neural'],
    'devops': ['docker', 'kubernetes', 'jenkins', 'ci/cd', 'terraform', 'ansible', 'aws', 'azure', 'gcp'],
    'mobile': ['react native', 'flutter', 'ios', 'android', 'swift', 'kotlin', 'mobile'],
}

# Scoring Weights
OVERALL_SCORE_WEIGHTS = {
    'skill_diversity_score': 0.25,
    'experience_depth_score': 0.20,
    'experience_score': 0.20,
    'education_score': 0.15,
    'project_score': 0.10,
    'technical_ratio': 0.10,
}
