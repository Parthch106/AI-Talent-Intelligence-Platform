
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, Frame
from reportlab.lib.utils import ImageReader
import io
import base64
import qrcode
from datetime import date

def generate_certificate_reportlab(cert):
    """
    Fallback certificate generator using ReportLab (no GTK dependency).
    """
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=landscape(A4))
    width, height = landscape(A4)

    # 1. Background / Border
    p.setStrokeColor(colors.HexColor("#f1c40f")) # Gold
    p.setLineWidth(15)
    p.rect(10, 10, width - 20, height - 20)
    
    p.setStrokeColor(colors.HexColor("#d4af37"))
    p.setLineWidth(2)
    p.rect(25, 25, width - 50, height - 50)

    # 2. Company Name
    p.setFont("Helvetica-Bold", 28)
    p.setFillColor(colors.HexColor("#b8860b"))
    p.drawCentredString(width/2, height - 60, "AIMS TECHNOLOGIES")

    # 3. Title
    p.setFont("Helvetica", 42)
    p.setFillColor(colors.HexColor("#2c3e50"))
    p.drawCentredString(width/2, height - 120, "Certificate of Achievement")

    # 4. Subtitle
    p.setFont("Helvetica-Oblique", 18)
    p.drawCentredString(width/2, height - 160, "This is to certify that")

    # 5. Intern Name
    p.setFont("Helvetica-Bold", 36)
    p.drawCentredString(width/2, height - 210, cert.intern.full_name or cert.intern.email)
    p.setLineWidth(2)
    p.line(width/2 - 150, height - 215, width/2 + 150, height - 215)

    # 6. Description
    styles = getSampleStyleSheet()
    style = styles["Normal"]
    style.fontSize = 14
    style.leading = 18
    style.alignment = 1 # Center
    style.textColor = colors.HexColor("#34495e")
    
    desc = (
        f"has successfully demonstrated exceptional performance and met all established evaluation criteria for the "
        f"<b>{cert.get_cert_type_display()}</b>. "
        f"This recognition reflects a commitment to excellence, professional growth, and significant contributions to the platform's objectives."
    )
    f = Frame(50, 150, width - 100, 100, showBoundary=0)
    f.addFromList([Paragraph(desc, style)], p)

    # 7. Issue Date
    p.setFont("Helvetica", 12)
    p.setFillColor(colors.grey)
    p.drawCentredString(width/2, 130, f"Issued on {cert.issue_date.strftime('%B %d, %Y')}")

    # 8. Signatures
    p.setStrokeColor(colors.HexColor("#2c3e50"))
    p.setLineWidth(1)
    
    # Left Signature
    p.line(70, 70, 220, 70)
    p.setFont("Helvetica-Bold", 10)
    p.setFillColor(colors.black)
    p.drawCentredString(145, 55, "Head of Talent")
    p.setFont("Helvetica", 8)
    p.drawCentredString(145, 45, "AIMS Technologies")

    # Right Signature
    p.line(width - 220, 70, width - 70, 70)
    p.setFont("Helvetica-Bold", 10)
    p.drawCentredString(width - 145, 55, "Program Manager")
    p.setFont("Helvetica", 8)
    p.drawCentredString(width - 145, 45, "Career Progression Division")

    # 9. QR Code
    verify_url = f"http://localhost:5173/verify/{cert.unique_cert_id}/"
    qr = qrcode.QRCode(version=1, box_size=5, border=2)
    qr.add_data(verify_url)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white")
    
    qr_buffer = io.BytesIO()
    qr_img.save(qr_buffer, format='PNG')
    qr_buffer.seek(0)
    
    reader = ImageReader(qr_buffer)
    p.drawImage(reader, width/2 - 25, 40, width=50, height=50)
    p.setFont("Helvetica", 6)
    p.drawCentredString(width/2, 35, "Scan to verify authenticity")

    p.showPage()
    p.save()
    
    buffer.seek(0)
    return buffer.getvalue()
