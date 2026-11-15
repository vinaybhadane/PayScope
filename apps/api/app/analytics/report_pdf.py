"""Paginated subscription report built entirely from reviewed workspace records."""
from io import BytesIO
from html import escape
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, LongTable, TableStyle
from app.models.workspace_intelligence import WorkspaceIntelligence


def build_report_pdf(state: WorkspaceIntelligence) -> bytes:
    buffer = BytesIO()
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='ReportBody', parent=styles['BodyText'], fontSize=10, leading=15, spaceAfter=9))
    body = styles['ReportBody']
    p = lambda value: Paragraph(escape(str(value)), body)
    story = [Paragraph('PayScope | Subscription report', styles['Title']), Spacer(1, 5*mm),
             p(f'Generated: {state.generated_at.isoformat() if state.generated_at else "Pending"}'),
             p(f'AI review: {state.model} | Uploaded debit records: {state.report.get("transaction_count", 0)}'),
             p(state.report.get('overview', ''))]
    rows = [[p('Subscription'), p('Observed amount'), p('Cadence'), p('Estimated next payment')]]
    for sub in state.report.get('subscriptions', []):
        rows.append([p(sub['name']), p(f'{sub["currency"]} {sub["amount"]}'), p(sub['cadence']), p(sub.get('next_expected_date') or 'Unknown')])
    table = LongTable(rows, colWidths=[53*mm, 39*mm, 31*mm, 47*mm], repeatRows=1, hAlign='LEFT')
    table.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#E6FAFA')), ('VALIGN',(0,0),(-1,-1),'TOP'), ('GRID',(0,0),(-1,-1),.4,colors.HexColor('#99CCCC')), ('LEFTPADDING',(0,0),(-1,-1),8), ('RIGHTPADDING',(0,0),(-1,-1),8), ('TOPPADDING',(0,0),(-1,-1),7), ('BOTTOMPADDING',(0,0),(-1,-1),7)]))
    story.extend([table, Spacer(1, 7*mm)])
    for title, field in [('Spending analysis', 'spending_analysis'), ('Savings scenarios', 'savings_analysis')]:
        story.extend([Paragraph(title, styles['Heading2']), p(state.report.get(field, ''))])
    for sub in state.report.get('subscriptions', []):
        story.extend([Paragraph(escape(sub['name']), styles['Heading3']), p(sub['explanation'])])
        for insight in sub.get('insights', []): story.append(p(f'{insight["title"]}: {insight["summary"]}'))
        if sub.get('savings_recommendation'): story.append(p(sub['savings_recommendation']))
    story.extend([Paragraph('Evidence and limitations', styles['Heading2']), p('Amounts are taken from uploaded records. Recurrence, future payment dates and savings scenarios are estimates. AI review does not verify usage or cancel services.')])
    story.extend(p(item) for item in state.report.get('limitations', []))
    def footer(canvas, document):
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(colors.HexColor('#586579'))
        canvas.drawString(20*mm, 12*mm, 'PayScope | Private subscription report')
        canvas.drawRightString(190*mm, 12*mm, str(document.page))
    SimpleDocTemplate(buffer, pagesize=(210*mm,297*mm), leftMargin=20*mm, rightMargin=20*mm,
                      topMargin=18*mm, bottomMargin=22*mm, title='PayScope subscription report').build(story, onFirstPage=footer, onLaterPages=footer)
    return buffer.getvalue()
