from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "TECHNICAL_BRIEF.pdf"

NAVY = colors.HexColor("#102A43")
BLUE = colors.HexColor("#2D5F8B")
TEAL = colors.HexColor("#2B7A78")
INK = colors.HexColor("#26384A")
MUTED = colors.HexColor("#617286")
LINE = colors.HexColor("#DCE3EA")
PALE = colors.HexColor("#F4F7FA")
AMBER = colors.HexColor("#A96214")
WHITE = colors.white

font_dir = Path("/System/Library/Fonts")
regular = font_dir / "Helvetica.ttc"
if regular.exists():
    try:
        pdfmetrics.registerFont(TTFont("NightingaleSans", str(regular), subfontIndex=0))
        BODY_FONT = "NightingaleSans"
    except Exception:
        BODY_FONT = "Helvetica"
else:
    BODY_FONT = "Helvetica"

styles = getSampleStyleSheet()
TITLE = ParagraphStyle(
    "Title", parent=styles["Title"], fontName=BODY_FONT, fontSize=24, leading=28,
    textColor=NAVY, alignment=TA_LEFT, spaceAfter=5 * mm,
)
SUBTITLE = ParagraphStyle(
    "Subtitle", parent=styles["Normal"], fontName=BODY_FONT, fontSize=10.2, leading=14,
    textColor=MUTED, spaceAfter=5 * mm,
)
H1 = ParagraphStyle(
    "H1", parent=styles["Heading1"], fontName=BODY_FONT, fontSize=14, leading=17,
    textColor=NAVY, spaceBefore=3.5 * mm, spaceAfter=2 * mm,
)
H2 = ParagraphStyle(
    "H2", parent=styles["Heading2"], fontName=BODY_FONT, fontSize=10.4, leading=13,
    textColor=BLUE, spaceBefore=2.5 * mm, spaceAfter=1.4 * mm,
)
BODY = ParagraphStyle(
    "Body", parent=styles["BodyText"], fontName=BODY_FONT, fontSize=8.35, leading=11.1,
    textColor=INK, spaceAfter=2.1 * mm,
)
SMALL = ParagraphStyle(
    "Small", parent=BODY, fontSize=7.25, leading=9.2, textColor=MUTED, spaceAfter=1.2 * mm,
)
CALLOUT = ParagraphStyle(
    "Callout", parent=BODY, fontSize=9.1, leading=12.5, textColor=NAVY,
    leftIndent=4 * mm, rightIndent=4 * mm, borderColor=TEAL, borderWidth=1,
    borderPadding=3 * mm, backColor=colors.HexColor("#EDF7F6"), spaceBefore=3.5 * mm, spaceAfter=3 * mm,
)
CODE = ParagraphStyle(
    "Code", parent=BODY, fontName="Courier", fontSize=6.9, leading=9,
    textColor=NAVY, backColor=PALE, borderPadding=2.5 * mm, spaceBefore=1 * mm, spaceAfter=2.5 * mm,
)
LABEL = ParagraphStyle(
    "Label", parent=SMALL, fontSize=6.6, leading=8, textColor=WHITE, alignment=TA_CENTER,
)


def p(text, style=BODY):
    return Paragraph(text, style)


def bullet(text):
    return Paragraph(f"<bullet>&bull;</bullet>{text}", ParagraphStyle(
        "Bullet", parent=BODY, leftIndent=4 * mm, firstLineIndent=-2.5 * mm,
        bulletIndent=1.3 * mm, spaceAfter=1.1 * mm,
    ))


def section(title, *items):
    return KeepTogether([p(title, H1), *items])


def mini_flow(labels, widths=None):
    widths = widths or [34 * mm] * len(labels)
    cells = []
    for index, label in enumerate(labels):
        cells.append(p(label, LABEL))
        if index < len(labels) - 1:
            cells.append(p("-&gt;", ParagraphStyle("Arrow", parent=LABEL, textColor=BLUE, fontSize=8)))
    col_widths = []
    for index, width in enumerate(widths):
        col_widths.append(width)
        if index < len(widths) - 1:
            col_widths.append(7 * mm)
    table = Table([cells], colWidths=col_widths, hAlign="LEFT")
    commands = [("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("LEFTPADDING", (0, 0), (-1, -1), 1), ("RIGHTPADDING", (0, 0), (-1, -1), 1)]
    for index in range(0, len(cells), 2):
        commands.extend([
            ("BACKGROUND", (index, 0), (index, 0), NAVY if index == 0 else TEAL),
            ("BOX", (index, 0), (index, 0), 0.5, NAVY),
            ("TOPPADDING", (index, 0), (index, 0), 4),
            ("BOTTOMPADDING", (index, 0), (index, 0), 4),
        ])
    table.setStyle(TableStyle(commands))
    return table


def metric_table():
    data = [
        [p("P50", LABEL), p("P95", LABEL), p("P99", LABEL), p("Failures", LABEL)],
        [p("207.60 ms", H2), p("268.50 ms", H2), p("322.75 ms", H2), p("0", H2)],
    ]
    table = Table(data, colWidths=[39 * mm] * 4, hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("BACKGROUND", (0, 1), (-1, 1), PALE),
        ("GRID", (0, 0), (-1, -1), 0.5, LINE),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return table


def footer(canvas, doc):
    canvas.saveState()
    width, _ = A4
    canvas.setStrokeColor(LINE)
    canvas.line(18 * mm, 13 * mm, width - 18 * mm, 13 * mm)
    canvas.setFont(BODY_FONT, 7)
    canvas.setFillColor(MUTED)
    canvas.drawString(18 * mm, 8.5 * mm, "Nightingale Care Note - Technical Brief")
    canvas.drawRightString(width - 18 * mm, 8.5 * mm, f"{doc.page} / 3")
    canvas.restoreState()


doc = BaseDocTemplate(
    str(OUTPUT), pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm,
    topMargin=16 * mm, bottomMargin=18 * mm, title="Nightingale Care Note - Technical Brief",
    author="Alan Chu", subject="Nightingale 72HR Build submission technical brief",
)
frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="main")
doc.addPageTemplates([PageTemplate(id="brief", frames=[frame], onPage=footer)])

story = [
    p("Nightingale Care Note", TITLE),
    p("Reducing time-to-understanding without reducing verification or clinician authority", SUBTITLE),
    p("LIVE DEMO&nbsp;&nbsp; nightingale-care-note.vercel.app", CALLOUT),
    section(
        "1. The problem and product thesis",
        p("The core problem is not lack of patient information. It is the time and cognitive cost required to determine what matters now. A clinician reconstructs a patient story from dated notes, tasks, patient input, and structured snapshots while a consultation is already under way."),
        p("AI can reduce that reading, but reduction creates a verification problem: what if the system surfaces the wrong thing? Nightingale makes reduction reversible, ranking explainable, provenance mandatory, and clinician judgment authoritative."),
        p("Glance directs attention. Provenance enables verification. Clinician confirmation establishes authority. Bounded feedback adapts workflow.", CALLOUT),
    ),
    section(
        "2. Ten-second Glance: risk is not importance",
        p("Sarah Tan's clinician workspace reduces eighteen months of synthetic history to exactly three priorities: dizziness after a medication change, worsening HbA1c, and a pending renal-function follow-up. Each item shows source/time, actions, and a component-derived explanation."),
        p("<b>Risk</b> is safety severity if an assertion is true. A deterministic floor keeps Critical or risk >= 0.9 items surfaced and non-dismissible. <b>Importance</b> is what deserves workflow attention now; ordinary items may be reordered by a bounded clinic/category multiplier."),
        p("base = 4*risk + 3*unresolved + 2*recency + 3*clinical_change<br/>       + 2.5*conflict + 1*confirmation<br/><br/>final = max(deterministic_safety_floor, base * clinic_multiplier)", CODE),
        p("Feedback signals: Pin +3, Accept +2, Source Open +1, Dismiss -2, Acknowledge 0. The persistent update uses:"),
        p("raw_delta = signal * 0.100 / max(4, prior_signal_count + 1)<br/>applied_delta = 0, or sign(raw_delta) * max(abs(raw_delta), 0.001)<br/>multiplier = clamp(previous + applied_delta, 0.80, 1.35)", CODE),
        p("Learning adapts workflow ordering, never clinical truth or deterministic safety risk.", CALLOUT),
    ),
    section(
        "3. Why this design stays trustworthy",
        bullet("Exactly three top priorities prevent a wall of alerts."),
        bullet("Safety-floor findings use Acknowledge rather than misleading Dismiss."),
        bullet("AI Suggested, Clinician Confirmed, Conflict Detected, Needs Review, Rejected, and Superseded are observable workflow states - not uncalibrated confidence percentages."),
        bullet("Historical disagreement remains visible; clinician correction becomes authoritative without rewriting the earlier AI memory."),
    ),
    PageBreak(),
    p("Evidence, abstention, and patient safety", TITLE),
    section(
        "4. Provenance and fail-closed evidence",
        p("Every highlight cites a care entry, immutable version, exact offsets, stored excerpt, and SHA-256 source hash. Before a normal claim is returned, the server verifies source/version existence, valid bounds, exact slice equality, and hash integrity. View evidence scrolls to the entry and marks the exact phrase."),
        p("No valid provenance means no normal surfaced AI claim.", CALLOUT),
        mini_flow(["AI claim", "Immutable version", "Exact source span", "Verified display"], [34 * mm, 36 * mm, 34 * mm, 35 * mm]),
        Spacer(1, 2 * mm),
    ),
    section(
        "5. Grounding, conflict, and abstention",
        p("The runtime separates extraction from display:"),
        mini_flow(["Raw source", "Structured assertion", "Critical-token gate", "Display or abstain"], [31 * mm, 38 * mm, 36 * mm, 38 * mm]),
        Spacer(1, 2 * mm),
        p("Grounding checks medication identity, numbers, dose, units, frequency, laboratory values, negation/polarity, allergen, reaction, and medication status. Missing spans, critical-token mismatch, or insufficient semantic support abstain. Supported contradictions become Needs Review."),
        p("Conflict detection is intentionally narrow and testable: allergy polarity, medication active/discontinued status, and medication dosage/frequency. It supports AI-human and human-human comparisons, preserves both assertions and sources, blocks patient release, and requires explicit clinical resolution. It is not generalized medical contradiction detection."),
    ),
    section(
        "6. Patient release is a separate boundary",
        p("Release state is internal, review_required, approved, or released. Patient access requires the owned patient, patient visibility, released state, a non-AI entry type, and a safe trust state. The application repeats this predicate while PostgreSQL Row-Level Security remains authoritative."),
        p("Patient-facing information crosses a release boundary enforced both in application logic and PostgreSQL RLS.", CALLOUT),
        bullet("Denied: another patient, internal records, AI Suggested, Conflict Detected, Needs Review, raw AI notes, internal comments, and historical internal revisions."),
        bullet("Allowed: explicitly released, patient-safe plain-language care information."),
    ),
    section(
        "7. Runtime safety pipeline",
        p("POST /api/scribe authenticates, authorizes clinic/role scope, redacts PHI, invokes the provider, validates schema, grounds critical tokens, detects typed conflicts, applies the risk floor, abstains when necessary, and persists only an internal/review draft with provenance and metadata-only audit."),
        p("The default and only implemented provider is <b>deterministic-clinical-v2</b>. No external LLM is called. This makes the evaluated path reproducible, testable, and demo-safe."),
        p("Redaction covers known/titled/CJK names, ID, phone, email, DOB, multiline address, and structured input while preserving medication, dose/frequency, laboratory values, and non-identifying dates. False negatives are privacy failures; false positives are clinical-accuracy failures.", SMALL),
    ),
    PageBreak(),
    p("Architecture, validation, and scope", TITLE),
    section(
        "8. Architecture and durable collaboration",
        mini_flow(["Browser", "Next.js / Vercel", "Auth + domain gates", "PostgreSQL + RLS"], [26 * mm, 38 * mm, 39 * mm, 40 * mm]),
        Spacer(1, 2 * mm),
        p("Supabase Auth establishes real synthetic demo identities. PostgreSQL RLS enforces role, clinic, patient, release, and author boundaries; browser-selected role text is not authority. The relational model covers clinics, profiles, patients, care entries, immutable versions, comments, tasks, highlights, provenance, AI metadata, feedback, clinic weights, redaction events, and audit logs."),
        p("Expected-version writes return deterministic 409 Conflict. Revert and clinical Undo create a compensating version rather than deleting history. Comments, resolution, task status, feedback, versions, and learning persist. Reply is mention-prefilled rather than a nested child thread; task reassignment exists at API/RLS level but is not exposed in the current UI."),
    ),
    section(
        "9. Performance and validation",
        p("The production benchmark signs in through /api/session, reuses the cookie, performs 15 warmups, then measures 100 authenticated /api/highlights calls. Every non-200 fails the run. Final audit, 28 Aug 2026:"),
        metric_table(),
        Spacer(1, 2 * mm),
        p("P95 meets the required <= 300 ms target. Validation also passed: npm audit 0 vulnerabilities; lint; typecheck; 23/23 focused safety tests; 17/17 live Supabase/RLS/persistence tests; and a full production webpack build."),
    ),
    section(
        "10. Patient experience and Voice Capture",
        p("Patient View is a separate plain-language surface for identity, what to know, what to do next, current/recent care, and the care team. It omits internal trust morphology, provenance, comments, revisions, and ranking. The family profile is a synthetic session-only consent prototype, not delegated hospital-account federation."),
        p("Voice Capture demonstrates ready, recording, paused, processing, and review states with current-patient fixtures. Clinician completion can send synthetic transcript text through the real safety pipeline and persist only a hidden QA-0001 internal draft."),
        p("Not implemented: microphone access, audio upload, speech-to-text, diarization, live LLM transcription, production ambient listening, noisy-audio processing, or multilingual STT.", CALLOUT),
    ),
    section(
        "11. Deliberate trade-offs",
        bullet("Deterministic provider and narrow extraction/conflict coverage instead of a broad unverified clinical NLP claim."),
        bullet("Section-level optimistic concurrency instead of CRDT complexity."),
        bullet("Entry-level comments instead of arbitrary selected-text comments."),
        bullet("No EHR/FHIR integration, real patient data, or generalized clinical decision engine."),
        bullet("Seeded AI doctor and AI patient-session entries; no seeded AI nurse-consult summary."),
        p("These boundaries keep the core trust path narrow enough to prove rather than broad enough to imply unsupported safety.", SMALL),
    ),
]

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
doc.build(story)
print(OUTPUT)
