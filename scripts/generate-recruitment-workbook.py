from pathlib import Path

import xlsxwriter


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "marketing" / "handiwave-kaduna-recruitment-funnel.xlsx"


def main():
    workbook = xlsxwriter.Workbook(OUTPUT)
    workbook.set_properties({
        "title": "Handiwave Kaduna Professional Recruitment Funnel",
        "subject": "Barnawa-Narayi founding professional pilot",
        "company": "Handiwave",
    })

    green = "#16A34A"
    dark_green = "#064E3B"
    mint = "#DCFCE7"
    charcoal = "#0F172A"
    slate = "#64748B"
    light = "#F8FAFC"
    border = "#DCEFE4"
    amber = "#F59E0B"
    red = "#EF4444"

    title = workbook.add_format({
        "bold": True, "font_color": "#FFFFFF", "font_size": 20,
        "bg_color": dark_green, "align": "left", "valign": "vcenter",
    })
    section = workbook.add_format({
        "bold": True, "font_color": dark_green, "font_size": 12,
        "bg_color": mint, "border": 1, "border_color": border,
    })
    header = workbook.add_format({
        "bold": True, "font_color": "#FFFFFF", "bg_color": green,
        "border": 1, "border_color": "#15803D", "text_wrap": True,
        "valign": "vcenter",
    })
    label = workbook.add_format({"bold": True, "font_color": slate})
    metric = workbook.add_format({
        "bold": True, "font_color": charcoal, "font_size": 18,
        "bg_color": light, "border": 1, "border_color": border,
        "align": "center", "valign": "vcenter",
    })
    percentage = workbook.add_format({
        "bold": True, "font_color": charcoal, "font_size": 18,
        "bg_color": light, "border": 1, "border_color": border,
        "align": "center", "valign": "vcenter", "num_format": "0%",
    })
    note = workbook.add_format({"font_color": slate, "text_wrap": True, "valign": "top"})
    body = workbook.add_format({"font_color": charcoal, "valign": "top"})
    date_format = workbook.add_format({"num_format": "dd mmm yyyy"})

    instructions = workbook.add_worksheet("Start Here")
    instructions.hide_gridlines(2)
    instructions.set_column("A:A", 3)
    instructions.set_column("B:B", 24)
    instructions.set_column("C:C", 82)
    instructions.set_row(1, 34)
    instructions.merge_range("B2:C2", "HANDIWAVE KADUNA RECRUITMENT FUNNEL", title)
    instructions.write("B4", "Pilot area", section)
    instructions.write("C4", "Barnawa–Narayi corridor, Kaduna South", body)
    instructions.write("B5", "Tracked flyer link", section)
    instructions.write("C5", "https://handiwave.com.ng/go/kaduna", body)
    instructions.write("B7", "How to use", section)
    usage = [
        "Add one applicant per row in Recruitment Funnel. Do not duplicate a person when their stage changes.",
        "Update Current Stage and Next Action after every contact. Dashboard totals update automatically.",
        "Use Verification Log for evidence outcomes; store sensitive documents only in an approved restricted system, not in this workbook.",
        "Use a unique Source Code on every flyer batch, recruiter, association, or shop partner.",
        "Activate a professional only after all required checks pass and the phone demonstration is completed.",
    ]
    for row, item in enumerate(usage, start=7):
        instructions.write(row, 1, f"{row - 6}.", label)
        instructions.write(row, 2, item, note)
    instructions.write("B14", "Privacy rule", section)
    instructions.write("C14", "Track outcomes and document references here. Do not embed ID images, selfies, bank details, or private customer photos in this workbook.", note)

    funnel = workbook.add_worksheet("Recruitment Funnel")
    funnel.freeze_panes(1, 4)
    funnel.autofilter(0, 0, 500, 23)
    columns = [
        "Applicant ID", "Date Added", "Full Name", "Phone", "Email", "Primary Trade",
        "Other Trade", "Base Location", "Can Serve Barnawa–Narayi?", "Source Type",
        "Source Code", "Recruiter", "Current Stage", "Last Contact", "Next Action",
        "Next Action Date", "Consent Recorded?", "Identity", "References", "Work Samples",
        "Skill Check", "Phone Demo", "Activation Date", "Notes",
    ]
    for column_index, value in enumerate(columns):
        funnel.write(0, column_index, value, header)
    widths = [14, 13, 24, 17, 25, 20, 18, 22, 18, 18, 18, 18, 20, 13, 28, 16, 18, 15, 15, 16, 15, 15, 16, 36]
    for index, width in enumerate(widths):
        funnel.set_column(index, index, width)
    funnel.set_row(0, 38)
    funnel.set_column(1, 1, 13, date_format)
    funnel.set_column(13, 13, 13, date_format)
    funnel.set_column(15, 15, 16, date_format)
    funnel.set_column(22, 22, 16, date_format)
    funnel.data_validation("F2:F501", {"validate": "list", "source": "=TradeList"})
    funnel.data_validation("I2:I501", {"validate": "list", "source": "=YesNoList"})
    funnel.data_validation("J2:J501", {"validate": "list", "source": "=SourceList"})
    funnel.data_validation("M2:M501", {"validate": "list", "source": "=StageList"})
    funnel.data_validation("Q2:Q501", {"validate": "list", "source": "=YesNoList"})
    for column in ("R", "S", "T", "U", "V"):
        funnel.data_validation(f"{column}2:{column}501", {"validate": "list", "source": "=CheckList"})
    funnel.conditional_format("M2:M501", {"type": "text", "criteria": "containing", "value": "Activated", "format": workbook.add_format({"bg_color": mint, "font_color": dark_green})})
    funnel.conditional_format("M2:M501", {"type": "text", "criteria": "containing", "value": "Not approved", "format": workbook.add_format({"bg_color": "#FEE2E2", "font_color": red})})
    funnel.conditional_format("P2:P501", {
        "type": "formula",
        "criteria": '=AND($P2<TODAY(),$P2<>"",$M2<>"Activated")',
        "format": workbook.add_format({"bg_color": "#FEF3C7", "font_color": "#92400E"}),
    })

    dashboard = workbook.add_worksheet("Dashboard")
    dashboard.hide_gridlines(2)
    dashboard.set_column("A:A", 3)
    dashboard.set_column("B:G", 18)
    dashboard.set_row(1, 34)
    dashboard.merge_range("B2:G2", "KADUNA FOUNDING PROFESSIONALS DASHBOARD", title)
    dashboard.write("B4", "Pilot", label)
    dashboard.merge_range("C4:G4", "Barnawa–Narayi corridor | Target: 20 approved and active professionals", body)
    dashboard.write("B6", "Applicants", label)
    dashboard.write_formula("B7", '=COUNTIF(\'Recruitment Funnel\'!C2:C501,"?*")', metric)
    dashboard.write("C6", "Contacted", label)
    dashboard.write_formula("C7", '=SUM(COUNTIF(\'Recruitment Funnel\'!M2:M501,{"Contacted","Interested","Application started","Application complete","Verification scheduled","Verification in progress","Training complete","Activated","Not approved","Withdrawn"}))', metric)
    dashboard.write("D6", "Applications complete", label)
    dashboard.write_formula("D7", '=SUM(COUNTIF(\'Recruitment Funnel\'!M2:M501,{"Application complete","Verification scheduled","Verification in progress","Training complete","Activated"}))', metric)
    dashboard.write("E6", "Verified", label)
    dashboard.write_formula("E7", '=SUM(COUNTIF(\'Recruitment Funnel\'!M2:M501,{"Training complete","Activated"}))', metric)
    dashboard.write("F6", "Activated", label)
    dashboard.write_formula("F7", '=COUNTIF(\'Recruitment Funnel\'!M2:M501,"Activated")', metric)
    dashboard.write("G6", "Activation rate", label)
    dashboard.write_formula("G7", '=IFERROR(F7/B7,0)', percentage)
    dashboard.write("B10", "Stage", header)
    dashboard.write("C10", "Count", header)
    stages = [
        "Lead added", "Contacted", "Interested", "Application started", "Application complete",
        "Verification scheduled", "Verification in progress", "Training complete", "Activated",
        "Not approved", "Withdrawn",
    ]
    for row, stage in enumerate(stages, start=10):
        dashboard.write(row, 1, stage, body)
        dashboard.write_formula(row, 2, f'=COUNTIF(\'Recruitment Funnel\'!M2:M501,B{row + 1})', body)
    dashboard.write("E10", "Decision checks", header)
    dashboard.write("F10", "Result", header)
    checks = [
        ("Activated target", '=F7&" / 20"'),
        ("Consent missing", '=COUNTIFS(\'Recruitment Funnel\'!C2:C501,"?*",\'Recruitment Funnel\'!Q2:Q501,"<>Yes")'),
        ("Overdue next actions", '=COUNTIFS(\'Recruitment Funnel\'!P2:P501,"<"&TODAY(),\'Recruitment Funnel\'!P2:P501,"<>" )'),
        ("Outside service cell", '=COUNTIF(\'Recruitment Funnel\'!I2:I501,"No")'),
    ]
    for row, (check, formula) in enumerate(checks, start=10):
        dashboard.write(row, 4, check, body)
        dashboard.write_formula(row, 5, formula, body)
    chart = workbook.add_chart({"type": "column"})
    chart.add_series({
        "name": "Applicants",
        "categories": "=Dashboard!$B$11:$B$19",
        "values": "=Dashboard!$C$11:$C$19",
        "fill": {"color": green},
        "border": {"none": True},
    })
    chart.set_title({"name": "Recruitment funnel by stage"})
    chart.set_legend({"none": True})
    chart.set_y_axis({"major_gridlines": {"visible": False}, "min": 0})
    chart.set_chartarea({"border": {"none": True}})
    chart.set_plotarea({"border": {"none": True}})
    dashboard.insert_chart("E16", chart, {"x_scale": 1.15, "y_scale": 1.05})

    verification = workbook.add_worksheet("Verification Log")
    verification.freeze_panes(1, 3)
    verification_columns = [
        "Applicant ID", "Full Name", "Check Type", "Outcome", "Checked Date", "Reviewer",
        "Evidence Reference", "Expiry / Recheck Date", "Reason / Notes",
    ]
    for column_index, value in enumerate(verification_columns):
        verification.write(0, column_index, value, header)
    verification.set_column("A:A", 15)
    verification.set_column("B:B", 24)
    verification.set_column("C:C", 24)
    verification.set_column("D:D", 18)
    verification.set_column("E:E", 15, date_format)
    verification.set_column("F:F", 20)
    verification.set_column("G:G", 28)
    verification.set_column("H:H", 20, date_format)
    verification.set_column("I:I", 44)
    verification.data_validation("C2:C1001", {"validate": "list", "source": "=VerificationTypeList"})
    verification.data_validation("D2:D1001", {"validate": "list", "source": "=CheckList"})

    sources = workbook.add_worksheet("Source Performance")
    sources.freeze_panes(1, 0)
    source_columns = ["Source Code", "Source Type", "Partner / Recruiter", "Flyers / Contacts", "Applicants", "Activated", "Activation Rate", "Notes"]
    for column_index, value in enumerate(source_columns):
        sources.write(0, column_index, value, header)
    sources.set_column("A:C", 22)
    sources.set_column("D:G", 16)
    sources.set_column("H:H", 40)
    for row in range(1, 101):
        excel_row = row + 1
        sources.write_formula(row, 4, f'=IF(A{excel_row}="","",COUNTIF(\'Recruitment Funnel\'!K:K,A{excel_row}))')
        sources.write_formula(row, 5, f'=IF(A{excel_row}="","",COUNTIFS(\'Recruitment Funnel\'!K:K,A{excel_row},\'Recruitment Funnel\'!M:M,"Activated"))')
        sources.write_formula(row, 6, f'=IFERROR(F{excel_row}/E{excel_row},0)', workbook.add_format({"num_format": "0%"}))

    lists = workbook.add_worksheet("Lists")
    lookup_values = {
        "A": ("StageList", stages),
        "B": ("TradeList", ["Electrician", "Solar / inverter", "Plumber", "AC / refrigeration", "Generator technician", "Cleaner", "Carpenter", "General handyman", "Other"]),
        "C": ("YesNoList", ["Yes", "No"]),
        "D": ("CheckList", ["Pending", "Passed", "Needs review", "Failed", "Not applicable"]),
        "E": ("SourceList", ["Flyer QR", "Recruiter", "Old Panteka", "Trade shop", "Association", "Training centre", "Professional referral", "Community group", "Walk-in", "Other"]),
        "F": ("VerificationTypeList", ["Phone", "Email", "Identity document", "Live selfie", "Operating address", "Customer reference 1", "Customer reference 2", "Work samples", "Bank-name match", "Technical reference", "Practical check", "Conduct briefing", "Phone demonstration"]),
    }
    for column, (name, values) in lookup_values.items():
        lists.write(f"{column}1", name, header)
        for row, value in enumerate(values, start=2):
            lists.write(f"{column}{row}", value)
        workbook.define_name(name, f"=Lists!${column}$2:${column}${len(values) + 1}")
    lists.hide()

    workbook.close()
    print(OUTPUT)


if __name__ == "__main__":
    main()
