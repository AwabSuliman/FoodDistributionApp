from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    ListFlowable,
    ListItem,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "output" / "pdf"
OUTPUT_FILE = OUTPUT_DIR / "masjid-al-wasatiyah-wal-itidaal-food-assistance-prd.pdf"

MOSQUE_NAME = "MASJID AL-WASATIYAH WAL-ITIDAAL"
PRODUCT_NAME = f"{MOSQUE_NAME} Food Assistance"


def make_styles():
    styles = getSampleStyleSheet()

    return {
        "cover_title": ParagraphStyle(
            "CoverTitle",
            parent=styles["Title"],
            fontName="Helvetica-Bold",
            fontSize=26,
            leading=32,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#183A37"),
            spaceAfter=16,
        ),
        "cover_subtitle": ParagraphStyle(
            "CoverSubtitle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=12,
            leading=18,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#425653"),
            spaceAfter=6,
        ),
        "section": ParagraphStyle(
            "Section",
            parent=styles["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=15,
            leading=19,
            textColor=colors.HexColor("#183A37"),
            spaceBefore=16,
            spaceAfter=7,
            keepWithNext=True,
        ),
        "subsection": ParagraphStyle(
            "Subsection",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=11.5,
            leading=15,
            textColor=colors.HexColor("#244E49"),
            spaceBefore=10,
            spaceAfter=5,
            keepWithNext=True,
        ),
        "body": ParagraphStyle(
            "Body",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=9.3,
            leading=13.1,
            textColor=colors.HexColor("#202A29"),
            spaceAfter=6,
        ),
        "bullet": ParagraphStyle(
            "Bullet",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=9.1,
            leading=12.6,
            leftIndent=12,
            textColor=colors.HexColor("#202A29"),
        ),
        "small": ParagraphStyle(
            "Small",
            parent=styles["BodyText"],
            fontName="Helvetica",
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#60716E"),
        ),
        "callout": ParagraphStyle(
            "Callout",
            parent=styles["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=10,
            leading=14,
            textColor=colors.white,
            alignment=TA_LEFT,
        ),
    }


def header_footer(canvas, doc):
    canvas.saveState()
    width, height = letter
    canvas.setStrokeColor(colors.HexColor("#D7E2DF"))
    canvas.setLineWidth(0.7)
    canvas.line(doc.leftMargin, height - 0.55 * inch, width - doc.rightMargin, height - 0.55 * inch)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#60716E"))
    canvas.drawString(doc.leftMargin, height - 0.42 * inch, PRODUCT_NAME)
    canvas.drawRightString(width - doc.rightMargin, 0.38 * inch, f"Page {doc.page}")
    canvas.restoreState()


def para(text, style):
    return Paragraph(text, style)


def bullets(items, styles):
    return ListFlowable(
        [ListItem(Paragraph(item, styles["bullet"]), leftIndent=8) for item in items],
        bulletType="bullet",
        start="circle",
        leftIndent=14,
        bulletFontName="Helvetica",
        bulletFontSize=7,
        bulletColor=colors.HexColor("#2A6F67"),
        spaceBefore=1,
        spaceAfter=5,
    )


def numbered(items, styles):
    return ListFlowable(
        [ListItem(Paragraph(item, styles["bullet"]), leftIndent=12) for item in items],
        bulletType="1",
        leftIndent=16,
        bulletFontName="Helvetica",
        bulletFontSize=8,
        bulletColor=colors.HexColor("#2A6F67"),
        spaceBefore=1,
        spaceAfter=5,
    )


def section(title, styles):
    return Paragraph(title, styles["section"])


def subsection(title, styles):
    return Paragraph(title, styles["subsection"])


def build_story(styles):
    story = []

    story.append(Spacer(1, 1.35 * inch))
    story.append(para(PRODUCT_NAME, styles["cover_title"]))
    story.append(para("Product Requirements Document", styles["cover_subtitle"]))
    story.append(para("MVP for food box request review and volunteer delivery coordination", styles["cover_subtitle"]))
    story.append(Spacer(1, 0.18 * inch))
    story.append(para("Prepared for mosque operations planning", styles["small"]))
    story.append(PageBreak())

    story.append(section("Overview", styles))
    story.append(
        para(
            f"{PRODUCT_NAME} is a web app that helps the mosque manage zakah-related food box requests and volunteer deliveries. "
            "The goal is to replace the current manual paper slip process with a simple digital workflow where recipients submit requests, "
            "admins manually review and approve or deny every request, and volunteer drivers claim and complete deliveries.",
            styles["body"],
        )
    )
    story.append(
        para(
            "The MVP focuses only on prepared food box delivery. It does not manage zakah money, food inventory, route optimization, or auto-approval.",
            styles["body"],
        )
    )

    story.append(section("Problem", styles))
    story.append(
        para(
            "The current process uses paper slips and manual coordination. This makes it hard for mosque admins to track requests, "
            "know which requests are approved, prevent duplicate driver effort, and understand delivery status. Volunteers may rush "
            "toward the same delivery because there is no clear claim system.",
            styles["body"],
        )
    )

    story.append(section("Goals", styles))
    story.append(
        bullets(
            [
                "Eliminate paper slips for food assistance requests.",
                "Make request tracking easy for mosque admins.",
                "Let recipients submit requests and view status online.",
                "Let approved volunteer drivers see available deliveries and claim them.",
                "Prevent multiple drivers from claiming the same delivery.",
                "Keep the app simple enough for older admins and non-technical users.",
                "Protect recipient privacy while giving drivers enough delivery information.",
            ],
            styles,
        )
    )

    story.append(section("Primary Users", styles))
    story.append(
        bullets(
            [
                "<b>Recipients:</b> people requesting food assistance.",
                "<b>Volunteer drivers:</b> approved volunteers who pick up prepared food boxes from the mosque and deliver them.",
                "<b>Admins:</b> mosque staff or committee members who review requests, approve or deny requests, approve drivers, and track delivery progress. MVP expects about three admin users.",
            ],
            styles,
        )
    )

    story.append(section("MVP Scope", styles))
    story.append(subsection("Recipient Features", styles))
    story.append(
        bullets(
            [
                "Recipients can create an account using email and password.",
                "Recipients/families can submit one request per Ramadan distribution season.",
                "Recipients cannot submit another request during the same active Ramadan season. Repeat delivery attempts for a not-delivered order are handled by admins/drivers on the same request.",
                "Recipients can view request status in their account.",
                "Recipients cannot edit a submitted request; they must contact the mosque/admin to request changes.",
                "Recipients cannot see driver details.",
            ],
            styles,
        )
    )
    story.append(para("Recipient request form fields:", styles["body"]))
    story.append(
        bullets(
            [
                "Name",
                "Address",
                "Telephone/cellphone",
                "Email",
                "Number of household members",
                "Delivery instructions",
            ],
            styles,
        )
    )
    story.append(para("Recipient-visible statuses:", styles["body"]))
    story.append(
        bullets(
            [
                "Submitted",
                "Under review",
                "Approved",
                "Driver assigned",
                "Out for delivery",
                "Delivered",
                "Not delivered",
                "Denied",
            ],
            styles,
        )
    )

    story.append(subsection("Season Management", styles))
    story.append(
        bullets(
            [
                "The app is intended for Ramadan food distribution.",
                "Requests belong to a Ramadan distribution season, such as Ramadan 2026.",
                "Only one season should be active at a time.",
                "Admins can view the current active season on the dashboard.",
                "A recipient/family can only submit one request per active Ramadan season.",
                "Not-delivered repeat attempts stay attached to the same request and do not count as a new request.",
                "Past season history should remain available for admin reporting.",
            ],
            styles,
        )
    )

    story.append(subsection("Admin Features", styles))
    story.append(
        para(
            "Admins are manually created. There is no public admin signup. MVP should support about three admin users with the same permissions.",
            styles["body"],
        )
    )
    story.append(
        bullets(
            [
                "View all requests.",
                "Review pending requests.",
                "Edit request details before approval.",
                "Approve or deny requests.",
                "Set or adjust food box weight/size manually during approval.",
                "View approved requests waiting for drivers.",
                "View active deliveries.",
                "View not-delivered requests that need another delivery attempt.",
                "View delivered and denied requests.",
                "Approve or deny volunteer driver accounts.",
                "View assigned driver details.",
                "Manually assign a delivery to a driver if needed.",
                "View basic reporting/history.",
            ],
            styles,
        )
    )
    story.append(
        para(
            "The admin dashboard should be a simple operations board with equal visibility for pending requests, approved/unclaimed deliveries, "
            "active deliveries, not-delivered requests requiring repeat delivery, pending driver approvals, recent completed or denied requests, and basic reports/history.",
            styles["body"],
        )
    )
    story.append(
        para(
            "The admin UI must use plain English, large buttons, obvious actions, and minimal clutter.",
            styles["body"],
        )
    )

    story.append(subsection("Driver Features", styles))
    story.append(
        bullets(
            [
                "Drivers can sign up with email/password and provide contact information.",
                "Drivers require admin approval before they can access deliveries.",
                "Approved drivers can see available deliveries.",
                "Approved drivers can claim one or more deliveries.",
                "Drivers can see recipient name, phone number, full street address, household size, delivery instructions, and food box weight before claiming.",
                "Drivers can open the address in maps and call the recipient.",
                "Drivers can mark delivery as about to be picked up, picked up, out for delivery, and delivered.",
                "Drivers can mark a delivery as not delivered when they arrive but no one answers or the handoff cannot be completed.",
                "Drivers can unclaim/cancel if they cannot complete a delivery.",
            ],
            styles,
        )
    )
    story.append(
        para(
            "If a driver unclaims a delivery, it immediately returns to the available deliveries list and drivers are notified again through the app's notification mechanism. "
            "If a driver marks a delivery not delivered, the request returns to a repeat-delivery queue so another attempt can be made without creating a new recipient request.",
            styles["body"],
        )
    )

    story.append(section("Delivery Workflow", styles))
    story.append(
        numbered(
            [
                "Recipient creates an account or logs in.",
                "Recipient submits food assistance request for the active Ramadan season.",
                "Request status becomes submitted.",
                "Admin reviews request.",
                "Admin may edit request details before approval.",
                "Admin manually approves or denies the request.",
                "If denied, recipient sees denied.",
                "If approved, admin sets or adjusts food box weight.",
                "Approved request becomes available to drivers.",
                "Approved drivers are notified or can see it in available deliveries.",
                "Driver claims delivery.",
                "Request status becomes driver assigned.",
                "Driver picks up prepared food box from mosque.",
                "Driver marks out for delivery.",
                "Driver delivers food box.",
                "Driver marks delivered.",
                "If the driver cannot complete the handoff because no one answers, the driver marks not delivered and the request enters the repeat-delivery queue.",
            ],
            styles,
        )
    )
    story.append(
        para(
            "Once approved, the request should generally keep moving forward. MVP does not need an admin cancellation/reopen mechanism.",
            styles["body"],
        )
    )

    story.append(section("Notifications", styles))
    story.append(para("Exact email/SMS provider is TBD.", styles["body"]))
    story.append(
        para(
            "Conceptually, the system should support important milestone notifications, including SMS. Provider decisions and final cost controls are deferred.",
            styles["body"],
        )
    )
    story.append(para("Important recipient notification events:", styles["body"]))
    story.append(bullets(["Request submitted", "Request approved", "Request denied", "Out for delivery", "Delivered", "Not delivered / repeat delivery needed"], styles))
    story.append(para("Driver notification events:", styles["body"]))
    story.append(bullets(["New approved delivery is available", "Delivery becomes available again after a driver unclaims it", "Delivery needs another attempt after being marked not delivered"], styles))
    story.append(
        para(
            "SMS should be included in the product direction, but the final provider, exact message rules, and cost limits should be confirmed before implementation.",
            styles["body"],
        )
    )

    story.append(section("Reporting", styles))
    story.append(
        bullets(
            [
                "Total requests received",
                "Approved requests",
                "Denied requests",
                "Delivered requests",
                "Not-delivered requests",
                "Pending/active requests",
                "Approvals by family/household size",
                "Denials by family/household size",
                "Recipient request history",
                "Delivery history filtered by date",
                "Season-based history, such as Ramadan 2026 reports",
                "Basic export can be considered if easy, but is not critical",
            ],
            styles,
        )
    )
    story.append(para("No financial reporting is needed because zakah money is outside the app.", styles["body"]))

    story.append(section("Privacy and Security", styles))
    story.append(
        bullets(
            [
                "No public admin signup.",
                "Drivers require admin approval.",
                "Recipients cannot see driver details.",
                "Drivers can see recipient name, phone, address, delivery instructions, and food box weight before claiming.",
                "Admins can see all request and delivery details.",
                "Role-based access is required for recipient, driver, and admin experiences.",
                "Sensitive recipient information should only be visible to authorized users.",
            ],
            styles,
        )
    )

    story.append(section("Out of Scope", styles))
    story.append(
        bullets(
            [
                "Inventory/food stock tracking",
                "Zakah money/payment handling",
                "Route optimization",
                "Map batching",
                "Auto-approval/trusted spreadsheet matching",
                "Multi-mosque support",
                "Multilingual support",
                "Recipient self-edit after submission",
                "Delivery proof/photos/signatures",
                "Public admin signup",
                "Advanced admin roles/super admin separation",
            ],
            styles,
        )
    )

    story.append(section("Future Enhancements", styles))
    story.append(
        bullets(
            [
                "Trusted recipient list import",
                "Auto-approval based on phone/email match",
                "Phone verification",
                "Advanced SMS automation beyond basic delivery/request notifications",
                "Driver route batching",
                "Map view",
                "Multiple mosque support",
                "Multi-language support",
                "More granular admin permissions",
                "CSV export",
                "Delivery proof/photo if mosque later requests it",
            ],
            styles,
        )
    )

    story.append(section("Recommended Tech Stack", styles))
    story.append(
        bullets(
            [
                "Next.js web app",
                "Supabase/PostgreSQL database",
                "Supabase Auth or equivalent for email/password login",
                "Vercel hosting",
                "Email/SMS provider TBD later",
            ],
            styles,
        )
    )
    story.append(
        para(
            "The app should be a responsive web app. Recipients and drivers will likely use phones. Admins may use laptops or tablets, "
            "but admin screens should remain usable on mobile.",
            styles["body"],
        )
    )

    story.append(section("Success Metrics", styles))
    story.append(
        bullets(
            [
                "The mosque can stop using paper slips for food box requests.",
                "The system prevents duplicate requests from the same recipient/family within the active Ramadan season.",
                "Admins can easily track every request.",
                "Admins can track not-delivered requests that need another delivery attempt.",
                "Drivers can claim deliveries faster.",
                "Duplicate driver effort is reduced.",
                "Older admins can use the app without confusion.",
                "Recipients, drivers, and admins can complete their workflows reliably.",
                "The app has minimal bugs in core status transitions.",
            ],
            styles,
        )
    )

    story.append(section("Key Risks", styles))
    story.append(
        bullets(
            [
                "Older admins may struggle with complicated UI.",
                "Volunteers may be slow to adopt the app.",
                "Privacy/security mistakes could expose sensitive recipient information.",
                "SMS/email costs may become an issue without message limits and provider review.",
                "Bugs in status transitions could break trust in the system.",
            ],
            styles,
        )
    )

    story.append(section("Risk Mitigations", styles))
    story.append(
        bullets(
            [
                "Keep UI simple and operational.",
                "Use one obvious homepage with role-based entry points.",
                "Keep the MVP workflow narrow.",
                "Include SMS carefully, with provider and cost controls confirmed before implementation.",
                "Test request and delivery status transitions carefully.",
                "Make the app faster and clearer than the paper process.",
            ],
            styles,
        )
    )

    return story


def build_pdf():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    doc = BaseDocTemplate(
        str(OUTPUT_FILE),
        pagesize=letter,
        leftMargin=0.72 * inch,
        rightMargin=0.72 * inch,
        topMargin=0.78 * inch,
        bottomMargin=0.62 * inch,
        title=f"{PRODUCT_NAME} PRD",
        author="Codex",
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal")
    doc.addPageTemplates([PageTemplate(id="main", frames=[frame], onPage=header_footer)])
    doc.build(build_story(make_styles()))


if __name__ == "__main__":
    build_pdf()
    print(OUTPUT_FILE)
