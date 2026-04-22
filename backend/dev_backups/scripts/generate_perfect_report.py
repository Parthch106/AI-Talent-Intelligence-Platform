import os
import sys
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, ListItem, ListFlowable, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from reportlab.lib import colors
from reportlab.pdfgen import canvas

class ReportCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        canvas.Canvas.__init__(self, *args, **kwargs)
        self.pages = []

    def showPage(self):
        self.pages.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        page_count = len(self.pages)
        for page in self.pages:
            self.__dict__.update(page)
            self.draw_canvas(page_count)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_canvas(self, page_count):
        # Header
        self.saveState()
        self.setFont('Helvetica-Bold', 10)
        self.setStrokeColor(colors.purple)
        self.line(30, 760, 580, 760)
        self.drawString(30, 765, "AI TALENT INTELLIGENCE PLATFORM")
        self.setFont('Helvetica', 8)
        self.drawRightString(580, 765, "PRIVATE & CONFIDENTIAL")
        self.restoreState()

        # Footer
        self.saveState()
        self.setFont('Helvetica', 8)
        self.setStrokeColor(colors.grey)
        self.line(30, 50, 580, 50)
        footer_text = "Weekly Internship Performance Report - Generated on " + datetime.now().strftime("%d/%m/%Y")
        self.drawString(30, 40, footer_text)
        self.drawRightString(580, 40, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()

def generate_pdf(filename, intern_name, date_str, project_title, completed_tasks, in_progress_tasks, blocked_tasks):
    doc = SimpleDocTemplate(filename, pagesize=letter, topMargin=50, bottomMargin=60)
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'MainTitle',
        parent=styles['Heading1'],
        alignment=TA_LEFT,
        spaceAfter=15,
        fontSize=24,
        textColor=colors.HexColor('#4F46E5'),
        fontName='Helvetica-Bold'
    )
    
    section_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        spaceBefore=20,
        spaceAfter=12,
        fontSize=14,
        textColor=colors.HexColor('#7C3AED'),
        fontName='Helvetica-Bold',
        borderPadding=(0, 0, 2, 0),
        borderColor=colors.HexColor('#E5E7EB'),
        borderWidth=0.5
    )
    
    task_title_style = ParagraphStyle(
        'TaskTitle',
        parent=styles['BodyText'],
        fontName='Helvetica-Bold',
        fontSize=11,
        textColor=colors.black
    )
    
    task_desc_style = ParagraphStyle(
        'TaskDesc',
        parent=styles['BodyText'],
        fontName='Helvetica-Oblique',
        fontSize=9,
        textColor=colors.grey,
        leftIndent=20
    )
    
    story = []
    
    # Header Info Table
    data = [
        [Paragraph("WEEKLY PROGRESS REPORT", title_style), ""],
        [f"INTERN: {intern_name.upper()}", f"DATE: {date_str}"],
        [f"PROJECT: {project_title.upper()}", ""],
    ]
    t = Table(data, colWidths=[400, 150])
    t.setStyle(TableStyle([
        ('SPAN', (0, 0), (1, 0)),
        ('TEXTCOLOR', (0, 1), (1, 2), colors.grey),
        ('FONTSIZE', (0, 1), (1, 2), 9),
        ('FONTNAME', (0, 1), (1, 2), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (1, 0), 20),
    ]))
    story.append(t)
    story.append(Spacer(1, 20))
    
    # Tasks Completed
    story.append(Paragraph("I. ACCOMPLISHMENTS (COMPLETED TASKS)", section_style))
    if completed_tasks:
        list_items = []
        for task_title, task_desc in completed_tasks:
            p_title = Paragraph(task_title, task_title_style)
            p_desc = Paragraph(task_desc, task_desc_style)
            list_items.append(ListItem([p_title, p_desc]))
        story.append(ListFlowable(list_items, bulletType='1', spaceAfter=10))
    else:
        story.append(Paragraph("No tasks recorded as completed for this period.", styles['Italic']))
        
    # Tasks In Progress
    story.append(Paragraph("II. ONGOING DEVELOPMENT (IN PROGRESS)", section_style))
    if in_progress_tasks:
        list_items = []
        for task_title, task_desc in in_progress_tasks:
            p_title = Paragraph(task_title, task_title_style)
            p_desc = Paragraph(task_desc, task_desc_style)
            list_items.append(ListItem([p_title, p_desc]))
        story.append(ListFlowable(list_items, bulletType='1', spaceAfter=10))
    else:
        story.append(Paragraph("No ongoing tasks reported.", styles['Italic']))
        
    # Tasks Blocked
    story.append(Paragraph("III. IMPEDIMENTS & BLOCKERS", section_style))
    if blocked_tasks:
        list_items = []
        for task_title, task_desc in blocked_tasks:
            p_title = Paragraph(task_title, task_title_style)
            p_desc = Paragraph(task_desc, task_desc_style)
            list_items.append(ListItem([p_title, p_desc]))
        story.append(ListFlowable(list_items, bulletType='1', spaceAfter=10))
    else:
        story.append(Paragraph("None reported. Workflow proceeding as planned.", styles['Italic']))
        
    # Standard Sections
    for section_name, content in [
        ("IV. CHALLENGES ENCOUNTERED", "Synchronized complex PDF extractions with backend Django processing logic. Resolved regex inconsistencies for multi-line task descriptions."),
        ("V. KEY LEARNINGS", "Mastered ReportLab's Canvas-based pagination and advanced Platypus layout management for enterprise reports."),
        ("VI. STRATEGIC GOALS FOR NEXT PERIOD", "Implement the shared InternSelector across the monitoring dashboard to ensure unified state management.")
    ]:
        story.append(Paragraph(section_name, section_style))
        story.append(Paragraph(content, styles['BodyText']))
    
    # Rating Section
    story.append(Spacer(1, 30))
    rating_data = [
        ["SELF EVALUATION SCORE", "9.7 / 10.0"]
    ]
    rt = Table(rating_data, colWidths=[400, 150])
    rt.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (1, 0), colors.violet),
        ('TEXTCOLOR', (0, 0), (1, 0), colors.white),
        ('FONTNAME', (0, 0), (1, 0), 'Helvetica-Bold'),
        ('ALIGN', (1, 0), (1, 0), 'CENTER'),
        ('PADDING', (0, 0), (1, 0), 10),
    ]))
    story.append(rt)
    
    doc.build(story, canvasmaker=ReportCanvas)
    print(f"Successfully generated {filename}")

if __name__ == "__main__":
    completed = [
        ("Data Modeling and Migration", "Implemented complex JSONB schemas for analytics persistence."),
        ("System Architecture and Algorithms", "Designed the RL Q-Table state-action mapping algorithm."),
        ("API Implementation and Documentation", "Developed RESTful endpoints using Django Rest Framework."),
        ("Frontend Component Development", "Built reusable glassmorphic UI components with TailwindCSS."),
        ("Initial Backend Setup with Django", "Configured PostgreSQL and Redis for production readiness."),
        ("Intelligence Analytics Computation", "Developed background processing workers for real-time scoring."),
        ("Middleware Security Implementation", "Secured API routes with custom JWT verification filters."),
        ("User Role Management System", "Implemented RBAC for Admins, Managers, and Interns."),
        ("Dynamic Filtering Monitoring Dashboard", "Created context-aware filters for cross-page navigation."),
        ("Hugging Face Router Integration", "Synchronized LLM task suggestions with the local RL agent."),
        ("RL Task Suggestion Engine", "Implemented the selection policy for personalized learning paths."),
        ("Q-Table Database Persistence", "Optimized database queries for high-frequency model updates."),
        ("Performance Metric Calculation Service", "Designed the logic for weighted engagement and quality scores."),
        ("SVG Intelligence Map Generator", "Created dynamic SVG visualizations for resident skill mapping."),
        ("Attendance Verification Logic", "Implemented geofencing-ready check-in/out logic."),
        ("Automated Task Assignment Logic", "Designed self-optimizing feedback loops for task difficulty."),
        ("Mission Control Design System", "Unified the UI/UX across all monitoring interfaces.")
    ]
    
    in_progress = [
        ("Data Augmentation Patterns", "Developing synthetic data generators for training robustness.")
    ]
    
    blocked = [
        ("Anomaly Detection for Hiring", "On hold awaiting specialized HR dataset access.")
    ]
    
    generate_pdf(
        "Parth_Chauhan_Weekly_Report.pdf",
        "Parth Chauhan",
        datetime.now().strftime("%d/%m/%Y"),
        "AI Talent Intelligence Platform",
        completed,
        in_progress,
        blocked
    )
