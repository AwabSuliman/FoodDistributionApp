from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "output" / "pdf"
OUTPUT_FILE = OUTPUT_DIR / "zakatul-fitr-distribution-feature-summary.pdf"

MOSQUE_NAME = "Masjid Al-Wasatiyah Wal-Itidaal"
APP_NAME = "Zakatul Fitr Distribution"

FEATURES = [
    (
        "Recipient intake",
        "Families submit contact details, address, household size, and delivery instructions for one Zakatul Fitr food box request.",
    ),
    (
        "Request tracking",
        "Recipients and admins can follow each request from submission through review, approval, driver assignment, and delivery.",
    ),
    (
        "Admin operations",
        "Admins review requests, monitor delivery counts, approve volunteer drivers, and view family-size reporting.",
    ),
    (
        "Driver workflow",
        "Approved volunteer drivers can see available deliveries, claim a delivery, and review recipient contact and address details.",
    ),
]


def make_styles():
    styles = getSampleStyleSheet()
    return {
        "mosque": ParagraphStyle(
            "Mosque",
            parent=styles["Normal"],
            alignment=TA_CENTER,
            fontName="Helvetica-Bold",
            fontSize=10,
            leading=13,
            textColor=colors.HexColor("#53645F"),
            spaceAfter=8,
        ),
        "title": ParagraphStyle(
            "Title",
            parent=styles["Title"],
            alignment=TA_CENTER,
            fontName="Helvetica-Bold",
            fontSize=24,
            leading=30,
            textColor=colors.HexColor("#111817"),
            spaceAfter=8,
        ),
        "subtitle": ParagraphStyle(
            "Subtitle",
            parent=styles["Normal"],
            alignment=TA_CENTER,
            fontName="Helvetica",
            fontSize=11,
            leading=16,
            textColor=colors.HexColor("#53645F"),
            spaceAfter=22,
        ),
        "section": ParagraphStyle(
            "Section",
            parent=styles["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=14,
            leading=18,
            textColor=colors.HexColor("#1F5D54"),
            spaceAfter=8,
        ),
        "body": ParagraphStyle(
            "Body",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=9.6,
            leading=13.5,
            textColor=colors.HexColor("#26312F"),
        ),
        "feature_title": ParagraphStyle(
            "FeatureTitle",
            parent=styles["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=9.6,
            leading=13.5,
            textColor=colors.HexColor("#17201F"),
        ),
        "feature_body": ParagraphStyle(
            "FeatureBody",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=9.1,
            leading=12.8,
            textColor=colors.HexColor("#53645F"),
        ),
        "footer": ParagraphStyle(
            "Footer",
            parent=styles["Normal"],
            alignment=TA_CENTER,
            fontName="Helvetica",
            fontSize=8,
            leading=11,
            textColor=colors.HexColor("#66736F"),
        ),
    }


def build_pdf():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    styles = make_styles()

    doc = SimpleDocTemplate(
        str(OUTPUT_FILE),
        pagesize=letter,
        rightMargin=0.72 * inch,
        leftMargin=0.72 * inch,
        topMargin=0.72 * inch,
        bottomMargin=0.62 * inch,
        title=f"{APP_NAME} Feature Summary",
        author=MOSQUE_NAME,
    )

    story = [
        Paragraph(MOSQUE_NAME, styles["mosque"]),
        Paragraph(APP_NAME, styles["title"]),
        Paragraph("App Feature Summary", styles["subtitle"]),
        Paragraph("Overview", styles["section"]),
        Paragraph(
            "This app organizes the Zakatul Fitr distribution workflow for recipients, mosque admins, and volunteer drivers. "
            "The goal is to keep request intake, review, driver coordination, and delivery status visible in one place.",
            styles["body"],
        ),
        Spacer(1, 0.22 * inch),
        Paragraph("Feature Summary", styles["section"]),
    ]

    table_data = [["#", "Feature", "What it covers"]]
    for index, (title, description) in enumerate(FEATURES, start=1):
        table_data.append(
            [
                Paragraph(f"{index:02}", styles["feature_title"]),
                Paragraph(title, styles["feature_title"]),
                Paragraph(description, styles["feature_body"]),
            ]
        )

    feature_table = Table(table_data, colWidths=[0.42 * inch, 1.45 * inch, 4.45 * inch], hAlign="LEFT")
    feature_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1F5D54")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 9),
                ("LEADING", (0, 0), (-1, 0), 11),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
                ("TOPPADDING", (0, 0), (-1, 0), 8),
                ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#F8FAF8")),
                ("GRID", (0, 0), (-1, -1), 0.6, colors.HexColor("#D8DED7")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 1), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 1), (-1, -1), 9),
            ]
        )
    )
    story.append(feature_table)
    story.extend(
        [
            Spacer(1, 0.28 * inch),
            Paragraph(
                "Main dashboards: Recipient, Admin, and Driver.",
                styles["footer"],
            ),
        ]
    )

    doc.build(story)


if __name__ == "__main__":
    build_pdf()
    print(OUTPUT_FILE)
