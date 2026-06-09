const {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    Header, Footer, AlignmentType, LevelFormat, HeadingLevel, BorderStyle,
    WidthType, ShadingType, PageBreak,
    TabStopType, TabStopPosition, SimpleField
} = require('docx');
const fs = require('fs');
const path = require('path');

const GREEN = "006600";
const RED = "b71c2b";
const WHITE = "FFFFFF";
const LIGHT_GREEN = "E8F5E9";
const LIGHT_GREY = "F5F5F5";
const DARK_TEXT = "1A1A1A";
const GREY_TEXT = "555555";
const MID_GREY = "CCCCCC";
const DARK_GREY = "333333";
const PALE_RED = "FCE4EC";

function pageProps() {
    return { page: { size: { width: 12240, height: 15840 }, margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } } };
}
function spacer(pts) { return new Paragraph({ spacing: { before: 0, after: 0 }, children: [new TextRun({ text: "", size: pts || 12 })] }); }
function h1(text) { return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 320, after: 120 }, children: [new TextRun({ text, font: "Arial", size: 36, bold: true, color: GREEN })] }); }
function h2(text) { return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 80 }, children: [new TextRun({ text, font: "Arial", size: 26, bold: true, color: GREEN })] }); }
function h3(text) { return new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 180, after: 60 }, children: [new TextRun({ text, font: "Arial", size: 22, bold: true, color: DARK_TEXT })] }); }
function body(text, opts = {}) { return new Paragraph({ spacing: { before: 60, after: 100 }, children: [new TextRun({ text, font: "Arial", size: 22, color: opts.color || DARK_TEXT, bold: opts.bold || false })] }); }
function bullet(text, level = 0, ref = "bullets") { return new Paragraph({ numbering: { reference: ref, level }, spacing: { before: 40, after: 40 }, children: [new TextRun({ text, font: "Arial", size: 22, color: DARK_TEXT })] }); }
function numbered(text, level = 0) { return bullet(text, level, "numbers"); }
function label(lbl, val) { return new Paragraph({ spacing: { before: 60, after: 60 }, children: [new TextRun({ text: lbl + ": ", font: "Arial", size: 22, bold: true, color: GREEN }), new TextRun({ text: val, font: "Arial", size: 22, color: DARK_TEXT })] }); }
function sectionDivider(title) { return new Paragraph({ spacing: { before: 280, after: 100 }, shading: { fill: GREEN, type: ShadingType.CLEAR }, children: [new TextRun({ text: "  " + title.toUpperCase() + "  ", font: "Arial", size: 22, bold: true, color: WHITE })] }); }
function highlight(text) { return new Paragraph({ spacing: { before: 100, after: 100 }, shading: { fill: LIGHT_GREEN, type: ShadingType.CLEAR }, children: [new TextRun({ text: "  " + text, font: "Arial", size: 24, bold: true, color: GREEN })] }); }
function coverBlock(main, sub) {
    return [
        new Paragraph({ spacing: { before: 0, after: 0 }, shading: { fill: GREEN, type: ShadingType.CLEAR }, children: [new TextRun({ text: main, font: "Arial", size: 40, bold: true, color: WHITE })] }),
        new Paragraph({ spacing: { before: 0, after: 0 }, shading: { fill: GREEN, type: ShadingType.CLEAR }, children: [new TextRun({ text: sub, font: "Arial", size: 30, color: "D0F0D0" })] }),
        new Paragraph({ spacing: { before: 0, after: 0 }, shading: { fill: RED, type: ShadingType.CLEAR }, children: [new TextRun({ text: " ", size: 6 })] }),
        spacer(16)
    ];
}

function brd() { const b = { style: BorderStyle.SINGLE, size: 1, color: MID_GREY }; return { top: b, bottom: b, left: b, right: b }; }
function cell(text, bg, textColor, bold = false, colspan = 1) {
    const c = new TableCell({ borders: brd(), shading: { fill: bg, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 160, right: 160 }, children: [new Paragraph({ children: [new TextRun({ text, font: "Arial", size: 20, bold, color: textColor })] })] });
    return c;
}
function docHeader(title) {
    return new Header({ children: [new Paragraph({ spacing: { before: 0, after: 80 }, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: GREEN, space: 1 } }, tabStops: [{ type: TabStopType.RIGHT, position: 9360 }], children: [new TextRun({ text: "CIVIC EDUCATION KENYA (CEKA)", font: "Arial", size: 18, bold: true, color: GREEN }), new TextRun({ text: "\t" + title, font: "Arial", size: 18, color: GREY_TEXT })] })] });
}
function docFooter() {
    return new Footer({ children: [new Paragraph({ spacing: { before: 80, after: 0 }, border: { top: { style: BorderStyle.SINGLE, size: 4, color: MID_GREY, space: 1 } }, tabStops: [{ type: TabStopType.CENTER, position: 4680 }, { type: TabStopType.RIGHT, position: 9360 }], children: [new TextRun({ text: "civiceducationkenya.com", font: "Arial", size: 16, color: GREY_TEXT }), new TextRun({ text: "\t", font: "Arial", size: 16 }), new TextRun({ text: "CONFIDENTIAL — INTERNAL USE", font: "Arial", size: 16, color: GREY_TEXT }), new TextRun({ text: "\tPage ", font: "Arial", size: 16, color: GREY_TEXT }), new SimpleField({ instruction: "PAGE" })] })] });
}
function docEnd(version, classification) {
    return new Paragraph({ spacing: { before: 200, after: 0 }, border: { top: { style: BorderStyle.SINGLE, size: 6, color: GREEN, space: 4 } }, children: [new TextRun({ text: `Document Version: ${version}  |  Classification: ${classification}  |  civiceducationkenya.com  |  2026`, font: "Arial", size: 18, color: GREY_TEXT })] });
}
function numbering() {
    return {
        config: [
            { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }, { level: 1, format: LevelFormat.BULLET, text: "◦", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1080, hanging: 360 } } } }] },
            { reference: "numbers", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }, { level: 1, format: LevelFormat.DECIMAL, text: "%2.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1080, hanging: 360 } } } }] }
        ]
    };
}
function styles() {
    return {
        default: { document: { run: { font: "Arial", size: 22, color: DARK_TEXT } } },
        paragraphStyles: [
            { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 36, bold: true, font: "Arial", color: GREEN }, paragraph: { spacing: { before: 320, after: 120 }, outlineLevel: 0 } },
            { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 26, bold: true, font: "Arial", color: GREEN }, paragraph: { spacing: { before: 240, after: 80 }, outlineLevel: 1 } },
            { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 22, bold: true, font: "Arial", color: DARK_TEXT }, paragraph: { spacing: { before: 180, after: 60 }, outlineLevel: 2 } }
        ]
    };
}

// ════════════════════════════════════════════════════════════
// DOC 1: CONSTITUTION & MASTER IDENTITY
// ════════════════════════════════════════════════════════════
function buildConstitution() {
    return new Document({
        numbering: numbering(), styles: styles(), sections: [{
            properties: pageProps(), headers: { default: docHeader("Constitution & Master Identity Document") }, footers: { default: docFooter() }, children: [
                ...coverBlock("CIVIC EDUCATION KENYA (CEKA)", "Constitution & Master Identity Document"),

                // PREAMBLE
                new Paragraph({ spacing: { before: 180, after: 80 }, children: [new TextRun({ text: "PREAMBLE", font: "Arial", size: 24, bold: true, color: GREEN })] }),
                body("We, the founding team and community of Civic Education Kenya — hereinafter referred to as CEKA — establish this Constitution as the definitive governing document of the organization. This document defines who we are, what we stand for, and how we operate. It is binding on all team members, contributors, and partners, and serves as the authoritative reference for all organizational decisions, communications, and activities."),
                spacer(8),

                sectionDivider("Part I: Organizational Identity"),
                spacer(8),

                h1("1. Name and Nature"),
                body("The full name of the organization is Civic Education Kenya, operating under the acronym CEKA. CEKA stands for Civic Education Kenya App — and as such, referring to it as 'the CEKA App' is redundant and must be avoided in all formal and public communications. The correct forms are: CEKA, Civic Education Kenya, or the CEKA platform."),
                body("CEKA is a community-led, open-source civic-technology ecosystem built to drive political accountability, constitutional literacy, and voter engagement across Kenya. It operates simultaneously as an educational repository, a legislative tracker, and a grassroots mobilization tool, providing a structural solution to the civic knowledge gap by translating complex governance structures into actionable, everyday data for the public."),
                body("CEKA is not a political party, a government agency, a for-profit entity, a protest organization, or a partisan advocacy group. CEKA does not endorse candidates, parties, or political causes. CEKA is neutral civic infrastructure."),
                spacer(8),

                h1("2. Tagline"),
                highlight("Educate  •  Amplify  •  Empower"),
                body("These three words define the full arc of CEKA's work: we educate citizens on their rights and the structures of governance; we amplify their voices through tools and content that extend reach; we empower them to take real action in democratic processes. This tagline governs the tone and purpose of every product, campaign, and piece of content CEKA produces."),
                spacer(8),

                h1("3. Mission"),
                highlight("To strengthen democracy by making civic knowledge accessible and actionable for all generations."),
                body("This mission drives every product decision, content choice, partnership, and communication CEKA produces. It means: translating complex legislation into plain language, connecting citizens to civic processes, and providing tools that turn passive observers into active participants."),
                spacer(8),

                h1("4. Vision"),
                highlight("A Kenya where everyone knows their rights, participates in the political process, and holds leaders accountable."),
                body("In CEKA's envisioned Kenya, citizens of all ages and backgrounds are fully informed about governance and actively engaged in democracy. Kenyans are not passive observers but empowered participants who influence decisions that affect their lives — using clear information and practical tools."),
                spacer(8),

                h1("5. Organizational Philosophy"),
                body("CEKA operates as a faceless, leaderless, and tribeless initiative. No individual is elevated above the mission. No tribe, party, or community is centred above the collective. The movement belongs to all Kenyans. This philosophy is captured in the organizing principle: Aluta Continua — the struggle continues — meaning the work of civic empowerment is never finished, and the platform must remain perpetually responsive, open, and independent."),
                body("This posture protects CEKA from political capture, personality cult, and tribal fragmentation. It is a deliberate structural choice that makes the platform more trustworthy and more durable."),
                spacer(8),

                h1("6. Core Values"),
                body("The following six values underpin every aspect of CEKA's work:"),
                spacer(4),

                new Table({
                    width: { size: 9360, type: WidthType.DXA }, columnWidths: [1800, 7560], rows: [
                        new TableRow({ children: [cell("ACCESSIBILITY", GREEN, WHITE, true), cell("Civic information and tools must be open and user-friendly for every Kenyan, regardless of education level, geography, or digital literacy. Content is delivered in clear language across multiple formats.", LIGHT_GREEN, DARK_TEXT)] }),
                        new TableRow({ children: [cell("NEUTRALITY", GREEN, WHITE, true), cell("CEKA is strictly nonpartisan. It provides unbiased civic education without favoring any political group, party, candidate, or agenda. Facts are the only allegiance.", LIGHT_GREY, DARK_TEXT)] }),
                        new TableRow({ children: [cell("TRANSPARENCY", GREEN, WHITE, true), cell("CEKA models the transparency it advocates. The platform is open-source, its processes are documented, and its content is clearly sourced. Citizens can trust what CEKA provides.", LIGHT_GREEN, DARK_TEXT)] }),
                        new TableRow({ children: [cell("EMPOWERMENT", GREEN, WHITE, true), cell("Every feature and piece of content is designed to enable a citizen to understand a law, exercise a right, or take a civic action. CEKA bridges gaps in knowledge, access, and agency.", LIGHT_GREY, DARK_TEXT)] }),
                        new TableRow({ children: [cell("ENGAGEMENT", GREEN, WHITE, true), cell("CEKA builds civic community. It actively encourages dialogue, collaboration, and collective action among users, contributors, partners, and the broader Kenyan public.", LIGHT_GREEN, DARK_TEXT)] }),
                        new TableRow({ children: [cell("ACCOUNTABILITY", GREEN, WHITE, true), cell("CEKA teaches and models accountability. By showing Kenyans how to monitor government actions and submit feedback, CEKA supports the public as an oversight body.", LIGHT_GREY, DARK_TEXT)] })
                    ]
                }),
                spacer(16),

                sectionDivider("Part II: Governance"),
                spacer(8),

                h1("7. Governance Structure"),

                h2("7.1 Core Team"),
                body("The Core Team comprises the founders, lead developers, editorial leadership, and platform leads. The Core Team holds primary responsibility for strategic direction, technical architecture, platform integrity, and organizational representation."),

                h2("7.2 Advisory Council"),
                body("The Advisory Council consists of civic experts, technologists, and civil society representatives. It ensures credibility, provides sector-specific guidance, and advises the Core Team on matters of public interest, governance, and technology."),

                h2("7.3 Contributor Community"),
                body("The Contributor Community is the open network of developers, translators, educators, and civic professionals who contribute to CEKA's codebase, content library, and campaigns. Contributions are managed through public repositories and governed by the Contributor Guidelines."),
                spacer(8),

                h1("8. Decision-Making"),
                body("Major organizational decisions are made by the Core Team with input from the Advisory Council and Contributor Community. Decisions are documented and, where appropriate, disclosed publicly. CEKA upholds the principle of transparent governance internally as it advocates for it externally."),
                spacer(8),

                h1("9. Finance & Accountability"),
                body("CEKA is financed through a combination of grants, donations (Ko-fi, M-Pesa, and Bitcoin/Lightning Network contributions), and civic-aligned partnerships. Funding sources are disclosed publicly where possible. Expenditure is focused exclusively on platform infrastructure, content creation, team compensation, and outreach. CEKA does not generate profit and operates no commercial revenue streams."),
                spacer(16),

                sectionDivider("Part III: Visual & Brand Identity"),
                spacer(8),

                h1("10. Brand Identity"),

                h2("10.1 What CEKA Is"),
                bullet("A civic-technology ecosystem and digital education initiative"),
                bullet("An open-source community project inviting contributions from developers, educators, and citizens"),
                bullet("A trustworthy, neutral source of civic information that explains governance in everyday language"),
                bullet("A non-profit initiative serving the public interest without commercial or partisan motivation"),
                spacer(8),

                h2("10.2 What CEKA Is Not"),
                bullet("Not a political party or partisan organization"),
                bullet("Not an activism or protest movement (though it informs on rights)"),
                bullet("Not a government or quasi-governmental agency"),
                bullet("Not a for-profit or commercial enterprise"),
                bullet("Not an alternative news outlet"),
                spacer(8),

                h2("10.3 Brand Colors"),
                new Table({
                    width: { size: 9360, type: WidthType.DXA }, columnWidths: [2400, 3480, 3480], rows: [
                        new TableRow({ children: [cell("COLOR ROLE", DARK_GREY, WHITE, true), cell("HEX VALUE", DARK_GREY, WHITE, true), cell("USAGE", DARK_GREY, WHITE, true)] }),
                        new TableRow({ children: [cell("Primary — Kenya Green", GREEN, WHITE), cell("#056602 / #006600", LIGHT_GREEN, DARK_TEXT), cell("Headlines, section bars, primary CTAs, logo, table headers", LIGHT_GREY, DARK_TEXT)] }),
                        new TableRow({ children: [cell("Secondary — Kenya Red", RED, WHITE), cell("#BB0301 / #b71c2b", PALE_RED, DARK_TEXT), cell("Accent bars, alerts, emphasis, flag icon, urgency markers", LIGHT_GREY, DARK_TEXT)] }),
                        new TableRow({ children: [cell("Near-Black", DARK_GREY, WHITE), cell("#141414", LIGHT_GREY, DARK_TEXT), cell("Logo mark, body text on light backgrounds, lettering", LIGHT_GREY, DARK_TEXT)] }),
                        new TableRow({ children: [cell("White / Cream", "888888", WHITE), cell("#FFFFFF / #E8E8E8", LIGHT_GREY, DARK_TEXT), cell("Page backgrounds, card surfaces, reversed text, logo negative", LIGHT_GREY, DARK_TEXT)] })
                    ]
                }),
                spacer(12),

                h2("10.4 Logo Identity"),
                body("The CEKA logo is a pareidolia-based design that uses letter forms to suggest a human figure — a person with a raised fist — symbolizing civic agency and the struggle for a better Kenya. It was created and signed by Civic Education Kenya on November 22, 2024 at 9:50 AM, and exists in 17 variations of the original design. This document serves as the authoritative copyright and intellectual property claim for all versions of the design and its template."),
                spacer(4),

                new Table({
                    width: { size: 9360, type: WidthType.DXA }, columnWidths: [1600, 2160, 5600], rows: [
                        new TableRow({ children: [cell("COMPONENT", GREEN, WHITE, true), cell("COLOR / SIZE", GREEN, WHITE, true), cell("SYMBOLIC MEANING", GREEN, WHITE, true)] }),
                        new TableRow({ children: [cell("P1 — Upper Dot", LIGHT_GREEN, DARK_TEXT, true), cell("#141414, 40-unit diameter", LIGHT_GREY, DARK_TEXT), cell("Represents a raised fist. The whitespace below the dot invites the viewer to creatively complete the arm from the negative space — civic agency symbolized through pareidolia.", LIGHT_GREY, DARK_TEXT)] }),
                        new TableRow({ children: [cell("P2 — Detailed Circle", LIGHT_GREEN, DARK_TEXT, true), cell("#BB0301 (red), #056602 (green), #141414 (black), #FFFFFF (white); largest circle 144 units, inner white circle 88 units", LIGHT_GREY, DARK_TEXT), cell("The red section symbolizes the 'C' in Civic (Kenya flag red). The green section (an inverted 'E') stands for Education (Kenya flag green). The black arc symbolizes the 'D' — combining with the red 'C' to form 'Ed', shorthand for Education — and also forms the arm connecting to the raised fist. The white inner circle creates a face with open mouth: choosing to speak, not stay silent — a voice for the voiceless.", LIGHT_GREY, DARK_TEXT)] }),
                        new TableRow({ children: [cell("P3 — Lateral J", LIGHT_GREEN, DARK_TEXT, true), cell("#141414; lowest element above lettering", LIGHT_GREY, DARK_TEXT), cell("An optional element suggesting the shoulder and upper torso of the pareidolia figure. Can be removed without breaking the core message — but when included, completes the human silhouette implied by the full mark.", LIGHT_GREY, DARK_TEXT)] }),
                        new TableRow({ children: [cell("Lettering", LIGHT_GREEN, DARK_TEXT, true), cell("Font: Code Pro, Archivo Black; #141414 (#E8E8E8 reversed); 'CEKA' at 30 units, tagline at 9.9 units", LIGHT_GREY, DARK_TEXT), cell("'CEKA' sits within the whitespace of the lateral J. The full tagline 'civic education kenya app' runs beneath at a smaller scale. The design works in monochrome silhouette and remains legible at high zoom-out levels.", LIGHT_GREY, DARK_TEXT)] })
                    ]
                }),
                spacer(8),
                body("The logo transforms cleanly into black-and-white silhouette and maintains its recognizability at small sizes. Colour loss reduces differentiation between the red/green sections but the design retains aesthetic and structural integrity. The mark was designed in Canva at Instagram post (1:1) dimensions; use proportional ratios when scaling to other formats."),
                spacer(8),

                h2("10.5 Tone of Voice"),
                body("CEKA speaks to Kenyans with clarity, respect, and purpose. The voice is Neutral & Respectful, Empowering & Inclusive, Clear & Accessible, and Action-Oriented. It does not change based on platform. It may adapt in formality — more conversational on TikTok, more structured in reports — but the core character remains constant."),
                spacer(8),

                h2("10.6 Institutional Framing"),
                body("All CEKA public communications use the institutional 'we/us/our' framing. CEKA maintains a faceless, organization-first identity in all civic-facing content. Individual team members are not foregrounded in public communications unless explicitly approved by the Core Team."),
                spacer(16),

                sectionDivider("Part IV: Strategic Pillars"),
                spacer(8),

                h1("11. Strategic Pillars"),
                new Table({
                    width: { size: 9360, type: WidthType.DXA }, columnWidths: [2000, 7360], rows: [
                        new TableRow({ children: [cell("PILLAR", GREEN, WHITE, true), cell("DESCRIPTION", GREEN, WHITE, true)] }),
                        new TableRow({ children: [cell("Civic Education", LIGHT_GREEN, GREEN, true), cell("Quality educational content and interactive modules covering the Constitution, rights, governance, elections, devolution, and civic duties.", LIGHT_GREY, DARK_TEXT)] }),
                        new TableRow({ children: [cell("Legislative Transparency", LIGHT_GREEN, GREEN, true), cell("Real-time legislative monitoring via the Bill Tracker, summarized updates, public participation tools, and memorandum routing to Parliamentary committees.", LIGHT_GREY, DARK_TEXT)] }),
                        new TableRow({ children: [cell("Citizen Participation", LIGHT_GREEN, GREEN, true), cell("Tools that directly facilitate participation: public bill submissions, the NASAKA voter registration map, Recall254, and the Malpractice Report portal.", LIGHT_GREY, DARK_TEXT)] }),
                        new TableRow({ children: [cell("Community Engagement", LIGHT_GREEN, GREEN, true), cell("Building civic community via forums, social media, volunteer networks, and events. Engaging youth groups, civil society, and local leaders.", LIGHT_GREY, DARK_TEXT)] }),
                        new TableRow({ children: [cell("Fiscal Accountability", LIGHT_GREEN, GREEN, true), cell("People's Audit (public expenditure visualization), SHAmbles (healthcare sector accountability), and the Malpractice Report provide citizens with oversight tools.", LIGHT_GREY, DARK_TEXT)] }),
                        new TableRow({ children: [cell("Innovation & Impact", LIGHT_GREEN, GREEN, true), cell("Continuous innovation via AI summarization, multilingual content, mobile apps, open APIs, and open-source development. Scaling for broader national and regional impact.", LIGHT_GREY, DARK_TEXT)] })
                    ]
                }),
                spacer(16),

                sectionDivider("Part V: Amendments & Authority"),
                spacer(8),

                h1("12. Document Authority"),
                body("This Constitution supersedes all prior versions of CEKA's organizational, mission, or identity documents. In the event of a conflict between this document and any other internal document, this Constitution takes precedence."),

                h1("13. Amendments"),
                body("Amendments require a formal proposal from any Core Team member, review by the Advisory Council, and approval by a consensus of the Core Team. Approved amendments are logged with a version number, date, and summary of change."),
                spacer(12),

                docEnd("1.1", "Internal — Foundational")
            ]
        }]
    });
}

// ════════════════════════════════════════════════════════════
// DOC 2: CONCEPT NOTE
// ════════════════════════════════════════════════════════════
function buildConceptNote() {
    return new Document({
        numbering: numbering(), styles: styles(), sections: [{
            properties: pageProps(), headers: { default: docHeader("Concept Note") }, footers: { default: docFooter() }, children: [
                ...coverBlock("CIVIC EDUCATION KENYA (CEKA)", "Concept Note"),

                label("Initiative", "Civic Education Kenya (CEKA)"),
                label("Website", "civiceducationkenya.com"),
                label("Type", "Open-Source Civic-Technology Ecosystem — Non-Profit"),
                label("Geography", "Kenya (National) | East Africa (Prospective)"),
                label("Tagline", "Educate • Amplify • Empower"),
                label("Document Date", "2026"),
                spacer(12),

                h1("Executive Summary"),
                body("Kenya faces a significant civic education deficit. Despite a progressive Constitution and a population with overwhelming youth representation, most citizens — particularly those aged 18–35 — remain disconnected from the political processes that shape their lives. Complex legislative language, fragmented information channels, and limited civic infrastructure have created a gap between government and citizen."),
                body("Civic Education Kenya (CEKA) is a community-led, open-source digital platform built to close that gap. CEKA makes civic knowledge accessible and actionable: it simplifies legislation, tracks Parliamentary bills in real time, enables public participation, maps electoral infrastructure, and connects citizens to fiscal accountability tools — all in one open platform. CEKA does not serve any political interest. It serves the Kenyan public."),
                spacer(8),

                h1("1. The Problem"),

                h2("1.1 Civic Knowledge Gap"),
                body("Kenya's young population — constituting roughly three-quarters of citizens aged 18–35 — remains largely disconnected from political processes due to insufficient civic literacy. Most Kenyans have never read the Constitution they are governed by. Legislative bills are published in dense legal language inaccessible to the general public. There is no permanent national digital platform dedicated to civic education."),

                h2("1.2 Limited Participation Infrastructure"),
                body("Citizens who wish to engage — to comment on a bill, petition their MP, report electoral malpractice, or verify their voter registration status — face fragmented, difficult-to-navigate systems. Public participation mechanisms exist constitutionally but are practically inaccessible without guidance."),

                h2("1.3 Fiscal Opacity"),
                body("Kenya's public finance data is published but largely inaccessible to ordinary citizens. Complex budget documents, debt schedules, and expenditure reports require expert interpretation. Citizens have no intuitive way to audit how public funds are used or to track wastage and leakages."),

                h2("1.4 Healthcare Accountability Gap"),
                body("The transition to the Social Health Authority (SHA/SHIF) created a documented trail of facility failures, patient rejections, and healthcare coverage disruptions. There was no centralized public record or tool for citizens to log, track, or cross-reference these systemic failures."),

                h2("1.5 Misinformation and Apathy"),
                body("The vacuum created by civic illiteracy is filled by misinformation and political manipulation. Apathy toward elections, misunderstanding of budget processes, and distrust of governance institutions are direct consequences of a civic education gap that no existing institution has systematically addressed."),
                spacer(8),

                h1("2. The Solution: CEKA"),
                body("CEKA addresses these gaps by creating a comprehensive digital civic infrastructure — one that translates government processes into understandable content, tracks legislation in real time, visualizes fiscal data, documents systemic failures, and equips citizens with tools to participate meaningfully across all dimensions of democratic life."),

                h2("2.1 What CEKA Does"),
                bullet("Translates complex legislative texts into plain-language summaries and explainers"),
                bullet("Tracks Parliamentary bills from introduction to assent with real-time updates and AI-generated citizen concerns"),
                bullet("Enables citizens to submit memoranda and public feedback on active legislation"),
                bullet("Provides an interactive voter registration center locator across Kenya's 47 counties"),
                bullet("Educates citizens about constitutional rights including the right to recall elected leaders"),
                bullet("Enables secure, anonymous reporting of state malpractice and electoral irregularities"),
                bullet("Visualizes Kenya's public finances, debt, and expenditure via Sankey diagrams and dashboards"),
                bullet("Documents healthcare sector failures under SHA/SHIF through a public accountability ledger"),
                bullet("Exposes civic data via an open API for developers and civic organizations"),
                bullet("Distributes civic news, alerts, and educational content via social media, email, and in-app notifications"),
                spacer(8),

                h2("2.2 How CEKA Is Different"),
                body("CEKA is not a news outlet, a government portal, or an NGO program. It is a permanent, independent civic infrastructure built on open-source technology and community ownership. Unlike point solutions that address a single gap, CEKA is an integrated ecosystem — education, legislation, participation, accountability, and fiscal transparency operate together under one platform. Its neutrality is structural: no political affiliations, no partisan funding, no editorial opinions."),
                spacer(8),

                h1("3. Complete Product Ecosystem"),
                body("The following are the verified, live and in-development tools operating under the CEKA umbrella:"),
                spacer(4),

                sectionDivider("Flagship Platform"),
                spacer(4),

                h2("3.1 CEKA Core Platform — civiceducationkenya.com"),
                body("The central hub for all civic education and engagement. Features interactive learning modules on the Constitution of Kenya 2010, Bill of Rights, government structures (Executive, Legislature, Judiciary), devolution, electoral processes, public participation, anti-corruption, gender equality, and youth leadership. Includes community forums, the Ask CEKA AI assistant, the Pieces editorial platform, a Resource Vault, and access to all other CEKA tools."),

                h2("3.2 Legislative Bill Tracker — civiceducationkenya.com"),
                body("A real-time monitoring dashboard tracking Parliamentary proceedings, bill statuses, and public participation deadlines. Includes AI-generated plain-language summaries, clause-level analysis (with Finance Bill 2026 seed data), a memorandum builder for formal submissions to Parliament, and a 23-category ministry-aligned taxonomy across 527+ bills. The tracker routes citizen submissions to the appropriate Parliamentary committee and displays countdown windows for participation deadlines."),

                h2("3.3 Ask CEKA AI — Integrated Across Platform"),
                body("An AI chatbot embedded throughout the CEKA platform providing natural-language responses to civic, constitutional, and governance queries. On bill pages, it surfaces 'Citizen Concerns (AI-identified)' — practical implications of proposed legislation framed from a citizen perspective. It explains constitutional articles, guides users through civic tools, and provides plain-language breakdowns of legal content in English and Swahili."),

                h2("3.4 Constitution RAG Chat — civiceducationkenya.com"),
                body("A Retrieval-Augmented Generation (RAG) interface built specifically over the full text of the Constitution of Kenya 2010. Citizens can query any constitutional article, clause, or concept directly and receive grounded, accurate responses sourced from the constitutional text itself — not general AI inference."),

                h2("3.5 Resource Vault — civiceducationkenya.com"),
                body("A comprehensive, searchable digital library of civic education materials, legal documents, government reports, and constitutional resources. Includes full-text search across all CEKA content with auto-complete, date filters, and topic navigation."),

                h2("3.6 Pieces — civiceducationkenya.com"),
                body("CEKA's editorial platform hosting long-form civic explainers, analytical pieces, and campaign content including the #LetsBreakDown series on roles of MPs, Senators, Women Representatives, and MCAs. Content is produced by the CEKA team and community contributors."),
                spacer(4),

                sectionDivider("Specialized Public Ledgers & Trackers"),
                spacer(4),

                h2("3.7 SHAmbles — civiceducationkenya.com/shambles"),
                body("A public accountability ledger documenting the systemic failures, healthcare coverage disruptions, and patient rejections caused by Kenya's transition to the Social Health Authority (SHA/SHIF). Functions as a public database with exportable case data, an accountability timeline, county and sector filters, and a whistleblower submission channel for citizens to log healthcare governance failures."),

                h2("3.8 People's Audit — civiceducationkenya.com/peoples-audit"),
                body("An economic analysis and fiscal oversight dashboard that uses Sankey diagrams and dynamic visualizations to chart Kenya's national debt, trace tax leakages, reveal state resource wastage, and break down public expenditure patterns for ordinary citizens. Data is dynamically loaded from official sources including the Controller of Budget and Auditor General reports. Includes API documentation and full dataset access links."),

                h2("3.9 Malpractice Report — report.civiceducationkenya.com"),
                body("A security-conscious, standalone monitoring application providing citizens with a secure and anonymous avenue to log and crowdsource instances of state malpractice, police brutality, electoral anomalies, and voter registration irregularities. Features include behavioral anti-spam scoring, Telegram-based admin notifications, an admin dashboard for managing submissions, and data encryption for whistleblower protection."),
                spacer(4),

                sectionDivider("Electoral Infrastructure"),
                spacer(4),

                h2("3.10 NASAKA IEBC — nasakaiebc.civiceducationkenya.com"),
                body("An interactive geolocated mapping service covering 24,000+ IEBC electoral offices, voter registration centers, and polling stations across all 47 counties and constituencies. Built with a multi-provider geocoding pipeline (versioned through v10+ with Titan AI cascade fallback). Features GPS-enabled location search, turn-by-turn navigation, community-verified data, operating hours, contact information, and multilingual support across 15 languages including Swahili and Sheng. The companion Android app is published on the Google Play Store. Location data is processed locally — no user data is collected or stored. Platform is independent of and not affiliated with the Government of Kenya or IEBC."),
                body("NASAKA reached over 1 million requests in a single month, triggering a server infrastructure upgrade — a direct measure of civic demand. The platform is listed on Wikidata (Q139784812)."),

                h2("3.11 NASAKA Developer API — nasakaiebc.civiceducationkenya.com/docs"),
                body("An open data engine exposing parsed IEBC datasets, mapping configurations, and geospatial data frameworks via documented API endpoints. Enables independent developers, civil society organizations, researchers, and other civic-tech actors to cleanly pull and repurpose verified Kenyan electoral data without building from scratch."),

                h2("3.12 Recall254 — civiceducationkenya.com"),
                body("A civic education and mobilization module built around the constitutional right to recall non-performing elected leaders under Article 104 of the Constitution of Kenya. Provides step-by-step guidance on eligibility criteria and petition processes, petition templates, legal text references, and an active recall campaign bulletin. Addresses a constitutionally guaranteed right most Kenyans are unaware they possess."),
                spacer(12),

                h1("4. Impact to Date"),
                new Table({
                    width: { size: 9360, type: WidthType.DXA }, columnWidths: [3600, 5760], rows: [
                        new TableRow({ children: [cell("IMPACT AREA", GREEN, WHITE, true), cell("RESULTS", GREEN, WHITE, true)] }),
                        new TableRow({ children: [cell("Instagram Reach", LIGHT_GREEN, DARK_TEXT, true), cell("11,000+ followers on @civiceducationke. Protest law campaign: 1M+ Kenyans reached. Finance Bill 2026 campaign: ~2.1M social media impressions (internal analytics).", LIGHT_GREY, DARK_TEXT)] }),
                        new TableRow({ children: [cell("TikTok Presence", LIGHT_GREEN, DARK_TEXT, true), cell("@civiceducationkenya: ~2,989 followers, 13,800+ likes. Youth-first short-form civic content aligned with Educate • Amplify • Empower.", LIGHT_GREY, DARK_TEXT)] }),
                        new TableRow({ children: [cell("X (Twitter)", LIGHT_GREEN, DARK_TEXT, true), cell("@CivicEdKenya: Active on bill updates, civic tools, and accountability commentary. Publicly corrected NTV Kenya misrepresentation of CEKA's civic tools as a government portal.", LIGHT_GREY, DARK_TEXT)] }),
                        new TableRow({ children: [cell("NASAKA Traffic", LIGHT_GREEN, DARK_TEXT, true), cell("1M+ monthly requests, triggering a server infrastructure upgrade. Google Play app published. Wikidata Q139784812 established.", LIGHT_GREY, DARK_TEXT)] }),
                        new TableRow({ children: [cell("Legislative Engagement", LIGHT_GREEN, DARK_TEXT, true), cell("Measurable surge in citizen memoranda to Parliament during Finance Bill 2026 review, directly facilitated by CEKA's memorandum builder.", LIGHT_GREY, DARK_TEXT)] }),
                        new TableRow({ children: [cell("Platform Scale", LIGHT_GREEN, DARK_TEXT, true), cell("23+ Supabase Edge Functions in production. Multi-provider Cloudflare/Vercel deployment. Full CI/CD via GitLab. Three-remote Git configuration across GitHub, GitLab, and Codeberg.", LIGHT_GREY, DARK_TEXT)] }),
                        new TableRow({ children: [cell("Community Reception", LIGHT_GREEN, DARK_TEXT, true), cell("Consistent positive feedback: 'Super easy to use', 'Amazing job', 'Asanteee sana for this initiative', 'This feels Govt-level' (LinkedIn). No major criticism. Strong volunteer interest.", LIGHT_GREY, DARK_TEXT)] })
                    ]
                }),
                spacer(12),

                h1("5. Target Beneficiaries"),
                bullet("Youth & Students (18–35) — Kenya's largest demographic, most underserved by traditional civic education"),
                bullet("Educators & Schools — Teachers using CEKA modules to enhance classroom civics curriculum"),
                bullet("Civil Society & NGOs — Organizations using CEKA's tools and data to inform their communities"),
                bullet("Rural and Remote Communities — Citizens in counties with limited access to civic information"),
                bullet("Voters & the General Public — Citizens navigating legislation, elections, and public participation"),
                bullet("Media & Journalists — Reporters using CEKA's simplified content as a basis for public-interest reporting"),
                bullet("Kenyan Diaspora — Citizens abroad seeking voter registration guidance and civic information"),
                bullet("Developers & Researchers — Civic-tech actors building on CEKA's open API and open-source codebase"),
                spacer(8),

                h1("6. Sustainability & Funding Model"),
                bullet("Public donations via Ko-fi, M-Pesa, and Bitcoin/Lightning Network contributions"),
                bullet("Civic grants from democracy-support organizations and electoral cycle funding programs"),
                bullet("Institutional partnerships with universities, media houses, and civil society organizations"),
                bullet("Community volunteer network of developers, translators, and civic educators"),
                bullet("HRF Bitcoin Development Fund eligibility: CEKA's open-source model, civic impact, and African context align with HRF BDF criteria. Application pathway active."),
                bullet("Long-term: African Union Civic Tech Fund (AUCTF), Code for Africa network grants, and institutional sponsors aligned with electoral cycles"),
                body("CEKA's infrastructure minimizes operational costs: open-source codebase, community-managed content, and cloud-native deployment on Supabase, Cloudflare, and Vercel. The platform is designed to scale without proportional cost increases."),
                spacer(8),

                h1("7. Civic Tech Positioning"),
                body("CEKA operates in a growing Kenyan civic tech ecosystem alongside established players. Its differentiation is breadth, integration, and accessibility:"),
                new Table({
                    width: { size: 9360, type: WidthType.DXA }, columnWidths: [2400, 3480, 3480], rows: [
                        new TableRow({ children: [cell("PLATFORM", GREEN, WHITE, true), cell("STRENGTH", GREEN, WHITE, true), cell("CEKA'S DIFFERENTIATION", GREEN, WHITE, true)] }),
                        new TableRow({ children: [cell("Mzalendo / Dokeza", LIGHT_GREEN, DARK_TEXT, true), cell("Institutional depth, MP scorecards, Parliament endorsement", LIGHT_GREY, DARK_TEXT), cell("CEKA adds youth accessibility, AI explainers, fiscal tools, electoral mapping, and a unified ecosystem", LIGHT_GREY, DARK_TEXT)] }),
                        new TableRow({ children: [cell("Official Parliament Tracker", LIGHT_GREEN, DARK_TEXT, true), cell("Authoritative primary data", LIGHT_GREY, DARK_TEXT), cell("CEKA translates that data into plain language with participation tools and community reach", LIGHT_GREY, DARK_TEXT)] }),
                        new TableRow({ children: [cell("Ushahidi", LIGHT_GREEN, DARK_TEXT, true), cell("Crisis mapping, crowdsourcing", LIGHT_GREY, DARK_TEXT), cell("CEKA focuses on civic education and legislative transparency as its permanent, non-crisis mandate", LIGHT_GREY, DARK_TEXT)] })
                    ]
                }),
                body("CEKA lists Mzalendo as a complementary partner on its Tools page. The ecosystem approach — rather than competitive displacement — is deliberate and reflects the maturity of the civic infrastructure vision."),
                spacer(8),

                h1("8. Roadmap"),

                h2("Short-Term (2026)"),
                bullet("Launch mobile CEKA App versions (Android/iOS) with full feature parity"),
                bullet("Expand bill tracker notifications and multi-channel alert infrastructure"),
                bullet("Full Swahili language implementation across core platform"),
                bullet("Grow email subscriber base and community engagement"),
                bullet("Apply to HRF Bitcoin Development Fund and AUCTF"),

                h2("Mid-Term (2027–2028)"),
                bullet("Scale platform adoption to all 47 counties with county governance tracking"),
                bullet("Offline app capabilities for low-connectivity areas"),
                bullet("Civic Champions volunteer network across all counties"),
                bullet("Formal school curriculum integration with Ministry of Education"),
                bullet("Host first national CEKA Civic Tech community event"),

                h2("Long-Term (2029–2030)"),
                bullet("AI civic assistant for real-time queries on laws and rights"),
                bullet("County data portals for localized governance tracking"),
                bullet("Financial sustainability through institutional and large-scale donor support"),

                h2("Beyond (2030+)"),
                bullet("Adapt CEKA's open-source model for at least 2–3 additional African countries"),
                bullet("Form the African Civic Tech Alliance using CEKA's codebase as regional backbone"),
                bullet("CEKA recognized as a continental civic infrastructure standard"),
                spacer(16),

                new Paragraph({ spacing: { before: 200, after: 0 }, border: { top: { style: BorderStyle.SINGLE, size: 6, color: GREEN, space: 4 } }, children: [new TextRun({ text: "For partnership, funding, or collaboration: civiceducationkenya.com  |  Document Version: 1.1  |  2026", font: "Arial", size: 18, color: GREY_TEXT })] })
            ]
        }]
    });
}

// ════════════════════════════════════════════════════════════
// DOC 3: PRODUCT BIBLE
// ════════════════════════════════════════════════════════════
function buildProductBible() {
    return new Document({
        numbering: numbering(), styles: styles(), sections: [{
            properties: pageProps(), headers: { default: docHeader("Product Bible") }, footers: { default: docFooter() }, children: [
                ...coverBlock("CIVIC EDUCATION KENYA (CEKA)", "Product Bible"),

                body("This Product Bible defines every product in the CEKA ecosystem — purpose, user flows, capabilities, technical details, success metrics, and development roadmap. It is the authoritative reference for all product decisions, technical scoping, and feature prioritization."),
                spacer(8),

                sectionDivider("Platform Architecture"),
                spacer(8),

                h1("Technical Foundation"),
                body("All CEKA products share a unified technical backbone: Supabase (23+ Edge Functions, Row-Level Security, real-time subscriptions), React/TypeScript/Vite frontend, Cloudflare DNS/Workers/R2 infrastructure, Vercel deployment, and Capacitor for Android. The codebase is fully open-source at github.com/saemscodes/CEKA."),
                body("The platform's core design principle is layered civic engagement: each product corresponds to a stage in the civic journey from awareness through accountability. All tools are interlinked — NASAKA maps voter registration, the Bill Tracker monitors legislation, People's Audit exposes the fiscal picture, and Recall254 enables accountability when leaders fail."),
                spacer(8),

                new Table({
                    width: { size: 9360, type: WidthType.DXA }, columnWidths: [2600, 2000, 4760], rows: [
                        new TableRow({ children: [cell("PRODUCT", GREEN, WHITE, true), cell("CIVIC STAGE", GREEN, WHITE, true), cell("PRIMARY FUNCTION", GREEN, WHITE, true)] }),
                        new TableRow({ children: [cell("CEKA Core Platform", LIGHT_GREEN, DARK_TEXT, true), cell("Education", LIGHT_GREY, DARK_TEXT), cell("Hub: modules, dashboard, AI assistant, forums", LIGHT_GREY, DARK_TEXT)] }),
                        new TableRow({ children: [cell("Bill Tracker", LIGHT_GREEN, DARK_TEXT, true), cell("Transparency", LIGHT_GREY, DARK_TEXT), cell("Real-time legislative monitoring, AI summaries, memoranda", LIGHT_GREY, DARK_TEXT)] }),
                        new TableRow({ children: [cell("Ask CEKA AI / RAG Chat", LIGHT_GREEN, DARK_TEXT, true), cell("Education", LIGHT_GREY, DARK_TEXT), cell("Natural language civic queries, constitutional RAG", LIGHT_GREY, DARK_TEXT)] }),
                        new TableRow({ children: [cell("People's Audit", LIGHT_GREEN, DARK_TEXT, true), cell("Accountability", LIGHT_GREY, DARK_TEXT), cell("Public finance visualization via Sankey dashboards", LIGHT_GREY, DARK_TEXT)] }),
                        new TableRow({ children: [cell("SHAmbles", LIGHT_GREEN, DARK_TEXT, true), cell("Accountability", LIGHT_GREY, DARK_TEXT), cell("Healthcare sector failure ledger under SHA/SHIF", LIGHT_GREY, DARK_TEXT)] }),
                        new TableRow({ children: [cell("Malpractice Report", LIGHT_GREEN, DARK_TEXT, true), cell("Accountability", LIGHT_GREY, DARK_TEXT), cell("Secure anonymous malpractice and electoral anomaly reporting", LIGHT_GREY, DARK_TEXT)] }),
                        new TableRow({ children: [cell("NASAKA IEBC", LIGHT_GREEN, DARK_TEXT, true), cell("Participation", LIGHT_GREY, DARK_TEXT), cell("Voter registration and polling center locator", LIGHT_GREY, DARK_TEXT)] }),
                        new TableRow({ children: [cell("NASAKA Developer API", LIGHT_GREEN, DARK_TEXT, true), cell("Infrastructure", LIGHT_GREY, DARK_TEXT), cell("Open data endpoints for civic-tech developers", LIGHT_GREY, DARK_TEXT)] }),
                        new TableRow({ children: [cell("Recall254", LIGHT_GREEN, DARK_TEXT, true), cell("Accountability", LIGHT_GREY, DARK_TEXT), cell("Leader recall rights education and petition guidance", LIGHT_GREY, DARK_TEXT)] }),
                        new TableRow({ children: [cell("Community Portal", LIGHT_GREEN, DARK_TEXT, true), cell("Engagement", LIGHT_GREY, DARK_TEXT), cell("Peer civic dialogue, forums, collaboration", LIGHT_GREY, DARK_TEXT)] }),
                        new TableRow({ children: [cell("Civic News & Alerts", LIGHT_GREEN, DARK_TEXT, true), cell("Awareness", LIGHT_GREY, DARK_TEXT), cell("Curated civic news, legislative alerts, newsletter", LIGHT_GREY, DARK_TEXT)] }),
                        new TableRow({ children: [cell("Resource Vault / Pieces", LIGHT_GREEN, DARK_TEXT, true), cell("Education", LIGHT_GREY, DARK_TEXT), cell("Searchable content library and editorial platform", LIGHT_GREY, DARK_TEXT)] })
                    ]
                }),
                spacer(16),

                sectionDivider("Product 1: CEKA Core Platform"),
                spacer(8),
                h2("Purpose"), body("Central hub for all civic education and engagement tools. Hosts the full range of learning modules, bill tracking, participation tools, news, and community features. The primary entry point for citizens engaging with the CEKA ecosystem."),
                h2("User Flow"),
                numbered("User accesses via web browser or Android app"),
                numbered("Optional account creation — anonymous participation supported for sensitive civic actions"),
                numbered("Navigation across: Learn, Track, Participate, News, Community"),
                numbered("Personalized dashboard: followed bills, saved content, learning progress"),
                numbered("Push notifications for new bills, submission deadlines, and civic events"),
                h2("Key Capabilities"),
                bullet("Interactive learning modules: Constitution, rights, governance, elections, devolution"), bullet("User progress tracking across civic education content"), bullet("Personalized dashboards"), bullet("English/Swahili language toggle"), bullet("Account settings: granular notification preferences, optional TOTP MFA"), bullet("Three-layer weighted search across all platform content"), bullet("Gamification: Flames points economy with Swahili-named tiers (Mwananchi through Mwalimu), badge awards, and perks catalogue"),
                h2("Technical Stack"),
                bullet("Frontend: React / TypeScript / Vite"), bullet("Backend: Supabase (23+ Edge Functions, RLS)"), bullet("Mobile: Capacitor Android"), bullet("Infrastructure: Cloudflare DNS/Workers/R2, Vercel"), bullet("Auth: Supabase Auth with centralized context (OTP rate limiting: three-layer protection post bot-attack hardening)"),
                h2("Success Metrics"), bullet("Monthly active users"), bullet("Civic modules completed per user"), bullet("Average session duration"), bullet("Push notification open rate"), bullet("Return user rate"), bullet("Flames points issued per month"),
                spacer(12),

                sectionDivider("Product 2: Legislative Bill Tracker"),
                spacer(8),
                h2("Purpose"), body("Kenya's most citizen-accessible legislative tracker. Allows citizens to follow Parliamentary bills in real time, understand their implications, and take action via memorandum submissions. Differentiator is AI-powered plain language, clause-level analysis, and direct participation routing."),
                h2("User Flow"),
                numbered("User browses active bills by ministry category or search"), numbered("Taps a bill to view overview, AI plain-language summary, clause analysis, and timeline"), numbered("User follows a bill to receive push notifications on votes, amendments, and deadlines"), numbered("User accesses the memorandum builder for formal submissions routed to Parliamentary committees"), numbered("WhatsApp sharing of bill summary and submission link"),
                h2("Key Capabilities"),
                bullet("AI-powered plain-language summarization of legal text"), bullet("AI-identified Citizen Concerns per bill"), bullet("Clause-level bill analysis with Finance Bill 2026 seed data"), bullet("Real-time bill status and Parliamentary timeline tracking"), bullet("Keyword search within bills and across the 527+ bill library"), bullet("23-category ministry-aligned bill taxonomy"), bullet("Sponsor extraction from bill PDFs"), bullet("Memorandum builder: server-side deduplication, MP routing by constituency"), bullet("Version comparison between bill drafts and amendments"), bullet("Public participation deadline countdown"),
                h2("Competitive Differentiation"), body("Compared to Mzalendo/Dokeza (institutional depth, Parliament endorsement) and the official Parliament tracker (raw data authority), CEKA's tracker leads on accessibility, AI integration, youth-facing content design, and its integration with broader civic tools. CEKA and Mzalendo are positioned as complementary rather than competing."),
                h2("Success Metrics"), bullet("Bills followed per user"), bullet("Memoranda submissions facilitated per legislative session"), bullet("Bill summary reads and shares"), bullet("User engagement spikes during active Parliamentary sessions"),
                spacer(12),

                sectionDivider("Product 3: Ask CEKA AI & Constitution RAG Chat"),
                spacer(8),
                h2("Purpose"), body("Two integrated AI tools: Ask CEKA AI provides general civic Q&A across the platform; the Constitution RAG Chat provides grounded, constitutional-text-anchored responses via Retrieval-Augmented Generation over the full Constitution of Kenya 2010."),
                h2("Key Capabilities"),
                bullet("Natural language civic queries in English and Swahili"), bullet("Constitutional article and clause explanation in plain language"), bullet("AI-generated Citizen Concerns on bill pages"), bullet("Guidance on civic tools: Recall254, NASAKA, public participation workflows"), bullet("RAG Chat: responses grounded directly in Constitution of Kenya 2010 text — not general AI inference"), bullet("Edge Function delivery with stale-date injection and disclaimer controls"),
                h2("Success Metrics"), bullet("Queries per session"), bullet("User satisfaction on bill page AI concerns"), bullet("RAG response accuracy rate"),
                spacer(12),

                sectionDivider("Product 4: People's Audit"),
                spacer(8),
                h2("Purpose"), body("A citizen-facing economic oversight dashboard making Kenya's public finances understandable to any mwananchi. Uses Sankey diagrams and dynamic visualizations to chart national debt, trace tax leakages, reveal state resource wastage, and break down public expenditure."),
                h2("URL"), body("civiceducationkenya.com/peoples-audit"),
                h2("Data Sources"), bullet("Controller of Budget reports"), bullet("Auditor General reports"), bullet("Kenya National Bureau of Statistics (KNBS)"), bullet("Official Treasury publications"),
                h2("Key Capabilities"),
                bullet("Sankey diagram visualizing national budget flows and sector allocations"), bullet("Debt tracker: total public debt, projections, and trend visualization"), bullet("Tax leakage analysis and wastage mapping"), bullet("Dynamically loaded data via Render hosting"), bullet("API documentation link and full dataset access for researchers"), bullet("Mobile-responsive design"),
                h2("Success Metrics"), bullet("Dashboard sessions"), bullet("Dataset downloads and API queries"), bullet("Media citations of People's Audit data"),
                spacer(12),

                sectionDivider("Product 5: SHAmbles"),
                spacer(8),
                h2("Purpose"), body("A public accountability ledger dedicated to documenting the systemic failures of Kenya's Social Health Authority (SHA/SHIF) transition: healthcare coverage disruptions, patient rejections, facility failures, and funding gaps. Functions as a public database and whistleblower submission channel."),
                h2("URL"), body("civiceducationkenya.com/shambles"),
                h2("Key Capabilities"),
                bullet("Public logging portal for SHA/SHIF-related failures indexed by county and health facility"), bullet("Exportable case data and accountability timeline"), bullet("County and sector filter views"), bullet("Whistleblower submission channel for anonymous healthcare failure reports"), bullet("Integration with CEKA's broader accountability ecosystem"),
                h2("Success Metrics"), bullet("Cases logged per month"), bullet("County coverage completeness"), bullet("Media and CSO citations"),
                spacer(12),

                sectionDivider("Product 6: Malpractice Report"),
                spacer(8),
                h2("Purpose"), body("A secure, standalone reporting application for citizens to anonymously log and crowdsource state malpractice, police brutality, electoral anomalies, and voter registration irregularities."),
                h2("URL"), body("report.civiceducationkenya.com"),
                h2("Key Capabilities"),
                bullet("Secure anonymous submission portal"), bullet("Behavioral anti-spam scoring to block bot submissions"), bullet("Telegram-based admin notification system"), bullet("Admin dashboard for submission management and case review"), bullet("County-focused tracking and categorization"), bullet("Data encryption for whistleblower protection"), bullet("Cloudflare Pages deployment with Supabase backend"),
                h2("Success Metrics"), bullet("Verified reports submitted per month"), bullet("Geographic distribution across counties"), bullet("False positive rate on spam scoring"),
                spacer(12),

                sectionDivider("Product 7: NASAKA IEBC"),
                spacer(8),
                h2("Purpose"), body("An interactive geolocated mapping service enabling citizens to locate IEBC voter registration centers, electoral offices, and polling stations across Kenya's 47 counties. A primary tool for reducing friction in electoral participation."),
                h2("URLs"), body("nasakaiebc.civiceducationkenya.com | Google Play Store (Nasaka IEBC) | Wikidata Q139784812"),
                h2("Independence Statement"), body("An independent civic platform. Not affiliated with or endorsed by the Government of Kenya or IEBC. Sources official IEBC documents supplemented by community-verified contributions."),
                h2("Key Capabilities"),
                bullet("Interactive map: 24,000+ IEBC centers across all 47 counties"), bullet("Multi-provider geocoding pipeline (v10+, Titan AI cascade fallback)"), bullet("GPS-enabled location search and turn-by-turn navigation"), bullet("Community-verified data with user contribution pipeline"), bullet("Operating hours, contact information, and landmark details per center"), bullet("Multilingual support: 15 languages including Swahili and Sheng"), bullet("Offline mode support"), bullet("Privacy-first: location data processed locally, no personal data collected or stored"), bullet("Voter registration deadline alerts"),
                h2("Traffic & Adoption"), body("Peak traffic: 1M+ monthly requests requiring server infrastructure upgrade. Consistently high engagement during voter registration drives. Described by LinkedIn users as feeling 'Govt-level' reliable."),
                h2("Success Metrics"), bullet("Monthly requests"), bullet("Play Store downloads and active installs"), bullet("County coverage completeness"), bullet("Community-verified updates per month"),
                spacer(12),

                sectionDivider("Product 8: NASAKA Developer API"),
                spacer(8),
                h2("Purpose"), body("An open data infrastructure layer exposing CEKA's verified electoral datasets, geospatial configurations, and data frameworks to developers, researchers, and civic organizations."),
                h2("URL"), body("nasakaiebc.civiceducationkenya.com/docs"),
                h2("Key Capabilities"),
                bullet("Documented REST API endpoints for electoral center data"), bullet("Parsed IEBC datasets in developer-ready formats"), bullet("Mapping configuration data and boundary datasets"), bullet("Reusable for independent civic-tech projects without starting from scratch"), bullet("Aligned with open-source and open-data principles"),
                h2("Success Metrics"), bullet("API queries per month"), bullet("Downstream civic-tech projects built on the API"), bullet("Documentation page visits"),
                spacer(12),

                sectionDivider("Product 9: Recall254"),
                spacer(8),
                h2("Purpose"), body("Civic education and mobilization around the constitutional right to recall non-performing elected leaders (Article 104, Constitution of Kenya). Most Kenyans are unaware this right exists; Recall254 exists to change that."),
                h2("Key Capabilities"),
                bullet("Interactive recall eligibility checker by representative"), bullet("Step-by-step petition guidance aligned to constitutional requirements"), bullet("Petition templates and legal text references"), bullet("Active recall campaign bulletin"), bullet("Links to constitutional provisions and legal resources"),
                h2("Success Metrics"), bullet("Recall eligibility checks completed"), bullet("Resource downloads"), bullet("Active petition campaigns tracked"),
                spacer(12),

                sectionDivider("Product 10: Community Portal & Civic News"),
                spacer(8),
                h2("Community Portal — Purpose"), body("Peer-to-peer civic dialogue hub. Citizens ask questions, discuss legislation, share resources, and collaborate on civic initiatives."),
                h2("Key Capabilities"),
                bullet("Topic tagging across civic categories (Elections, Budget, Rights, Local Government)"), bullet("User reputation and contribution scoring"), bullet("Content moderation tools"), bullet("Integration with CEKA's bill and content library"), bullet("Volunteer contributor onboarding infrastructure"),
                h2("Civic News & Alerts — Purpose"), body("Curated civic news, legislative briefs, and actionable deadlines ensuring citizens do not miss critical participation windows."),
                h2("Key Capabilities"),
                bullet("Sovereign mailing infrastructure: multi-provider Brevo/Resend fleet with dynamic API key rotation"), bullet("Seven branded HTML email templates (Kenya Green/Red brand palette)"), bullet("Push notification delivery via CEKA App"), bullet("Social media content pipeline across Instagram, TikTok, and X"), bullet("Automated legislative update aggregation"),
                spacer(12),

                sectionDivider("Future Product Roadmap"),
                spacer(8),
                h1("Next-Generation Products"),
                h2("Translation Bot"), body("Automated translation pipeline for legislative summaries into Dholuo, Kikuyu, Kamba. Architecture designed across five tiers: Google Sheets zero-infrastructure through full Supabase-native pipeline with Telegram bot, Cloudflare Workers AI pre-drafts, and community glossary enforcement."),
                h2("County Civic Monitors"), body("Localized tools for each of Kenya's 47 counties to track county government performance, budgets, and local legislative proceedings, feeding into the national CEKA platform."),
                h2("Civic Mini-Player"), body("A persistent cross-site civic updates widget — a floating lightweight civic newsticker for embedded use in partner websites and media outlets. Modelled on a music player UI for cross-page continuity."),
                h2("Offline Education Kits"), body("Downloadable PDF and video packages for civic workshops in areas with limited internet connectivity, for use by community leaders, schools, and civil society."),
                h2("AI Civic Assistant (Advanced)"), body("Conversational AI capable of answering citizen questions about Kenyan laws and rights, drawing from CEKA's legislative database and Constitution content in English and Swahili."),
                spacer(16),
                docEnd("1.1", "Internal — Product")
            ]
        }]
    });
}

// ════════════════════════════════════════════════════════════
// DOC 4: 10-YEAR STRATEGIC BLUEPRINT
// ════════════════════════════════════════════════════════════
function buildStrategicBlueprint() {
    return new Document({
        numbering: numbering(), styles: styles(), sections: [{
            properties: pageProps(), headers: { default: docHeader("10-Year Strategic Blueprint") }, footers: { default: docFooter() }, children: [
                ...coverBlock("CIVIC EDUCATION KENYA (CEKA)", "10-Year Strategic Blueprint  |  2024 – 2035"),

                body("This Strategic Blueprint defines CEKA's organizational goals, growth targets, and development phases across a 10-year horizon. It guides annual priorities, funding strategy, partnership development, and product evolution."),
                spacer(8),

                h1("Strategic Foundation"),
                h2("Mission"), highlight("To strengthen democracy by making civic knowledge accessible and actionable for all generations."),
                h2("Vision"), highlight("A Kenya where everyone knows their rights, participates in the political process, and holds leaders accountable."),
                h2("Philosophy"), body("Faceless, leaderless, tribeless. Aluta Continua."),
                spacer(8),

                h1("Goal Framework by Time Horizon"),

                h2("1-Year Goals (2026)"),
                bullet("Finalize and stabilize core platform: Bill Tracker, learning modules, Community Portal, Civic News, People's Audit, SHAmbles"), bullet("Achieve significant active user base growth across web and Android"), bullet("Formal partnerships with at least 5 civil society organizations and universities"), bullet("Secure initial grant or institutional funding through 2027"), bullet("Full Swahili language implementation across core platform"), bullet("Grow email subscriber base past 500 with sustained open rate above 40%"), bullet("Apply to HRF Bitcoin Development Fund and AUCTF"), bullet("Establish CEKA's Wikipedia article and formal media/academic citation trail"),
                spacer(6),

                h2("3-Year Goals (2027–2028)"),
                bullet("Nationwide awareness of CEKA as Kenya's primary civic education and legislative tracking resource"), bullet("Active usage representing all 47 counties"), bullet("CEKA civic content integrated into at least 3 formal school curricula programs"), bullet("Dholuo and Kikuyu content in active development alongside full Swahili platform"), bullet("1 million Kenyans reached through CEKA-produced civic campaigns and content"), bullet("Recognized institutional resource in Kenyan media and civil society"), bullet("Financial sustainability via diversified grant and donation income"), bullet("iOS app launched with significant combined Android/iOS install base"),
                spacer(6),

                h2("5-Year Goals (2028–2030)"),
                bullet("CEKA referenced by Parliament, media, and schools as standard civic infrastructure"), bullet("Thousands of citizen memoranda facilitated per Parliamentary session"), bullet("Hundreds of verified volunteer contributors — translators, educators, developers"), bullet("County-level governance tracking live across all 47 counties"), bullet("AI civic assistant in active use — English and Swahili"), bullet("Measurable improvement in civic engagement metrics in CEKA-active communities"), bullet("People's Audit data cited regularly in Parliamentary and media reporting"),
                spacer(6),

                h2("10-Year Goals (2030–2035)"),
                bullet("CEKA is foundational civic infrastructure in Kenya — as essential and trusted as a public library"), bullet("Platform adapted and deployed in at least 2 additional African countries"), bullet("African Civic Tech Alliance formed with CEKA's codebase as regional backbone"), bullet("CEKA recognized internationally as a template for community-led civic technology"), bullet("Self-sustaining financial model achieved"), bullet("CEKA's open-source methodology published as a deployable blueprint for democracy-strengthening initiatives globally"),
                spacer(16),

                sectionDivider("Phase-by-Phase Development Plan"),
                spacer(8),

                h1("Phase 1: Core Platform & Foundation — 2024–2026"),
                new Paragraph({ spacing: { before: 60, after: 80 }, children: [new TextRun({ text: "Goal: Build and stabilize CEKA's civic infrastructure.", font: "Arial", size: 22, color: GREY_TEXT })] }),
                numbered("Launch CEKA App and website: Bill Tracker, learning modules, Community Portal, People's Audit, SHAmbles, Malpractice Report"), numbered("Achieve substantial national campaign reach — Finance Bill 2026 full coverage"), numbered("Establish organizational governance: formalize team, advisory council, contributor model"), numbered("Secure initial funding; develop brand and communications standards"), numbered("Lay groundwork for multilingual support: English/Swahili foundation"), numbered("Publish NASAKA IEBC on Play Store and drive voter registration adoption"), numbered("Implement platform security hardening: OTP rate limiting, Cloudflare, multi-remote Git"),
                h3("Phase 1 Outcome"), body("CEKA is a recognized, trusted source for civic information. Foundational infrastructure — technical, organizational, financial — is stable and ready for national scaling."),
                spacer(12),

                h1("Phase 2: National Civic Infrastructure — 2026–2028"),
                new Paragraph({ spacing: { before: 60, after: 80 }, children: [new TextRun({ text: "Goal: Integrate CEKA into Kenya's civic ecosystem.", font: "Arial", size: 22, color: GREY_TEXT })] }),
                numbered("Expand formal partnerships with government agencies, education institutions, and mainstream media"), numbered("Integrate CEKA content into school curricula via MOE partnerships"), numbered("Roll out county-level features: local governance tracking, county budget explainers"), numbered("Full platform maturity: offline access, advanced search, complete Swahili"), numbered("Host national Civic Tech conference or hackathon"), numbered("Establish CEKA as the default legislative tracker for Kenyan media and civil society"), numbered("Join CTIN and contribute to the African Civic Tech Atlas"),
                h3("Phase 2 Outcome"), body("CEKA is Kenya's default civic education and legislative monitoring resource. Institutional recognition from government, education, and media sectors. Mature contributor ecosystem at national scale."),
                spacer(12),

                h1("Phase 3: Civic Participation Network — 2028–2031"),
                new Paragraph({ spacing: { before: 60, after: 80 }, children: [new TextRun({ text: "Goal: Deepen citizen engagement and build a national civic community.", font: "Arial", size: 22, color: GREY_TEXT })] }),
                numbered("Build Civic Champions network — trained volunteers in every county"), numbered("Foster localized content creation: county governance data, additional local language support"), numbered("Integrate with civic data sources: Controller of Budget, county assembly portals, IEBC open data"), numbered("Launch AI Civic Assistant for real-time citizen queries on laws and rights"), numbered("Establish county data portals as national platform extension"), numbered("Secure membership in Code for Africa network and AUCTF ecosystem"),
                h3("Phase 3 Outcome"), body("A distributed civic participation ecosystem. CEKA empowers communities to engage at local and national levels. Kenya's civic engagement metrics show measurable improvement."),
                spacer(12),

                h1("Phase 4: African Civic Infrastructure — 2031–2035"),
                new Paragraph({ spacing: { before: 60, after: 80 }, children: [new TextRun({ text: "Goal: Scale CEKA's model beyond Kenya.", font: "Arial", size: 22, color: GREY_TEXT })] }),
                numbered("Adapt and deploy the CEKA platform for at least 2–3 additional African countries, beginning with East Africa pilots"), numbered("Form the African Civic Tech Alliance — coalition using CEKA's open-source codebase as shared backbone"), numbered("Establish CEKA as an international template for community-led civic technology"), numbered("Develop sustainable revenue streams: civic tech consultancy, platform licensing for international civic organizations, social enterprise spin-offs"), numbered("Publish CEKA's full methodology as an open-source civic infrastructure playbook for other nations"),
                h3("Phase 4 Outcome"), body("CEKA evolves into a continental civic infrastructure brand. Financially self-sustaining. CEKA stands as definitive proof that community-led civic technology can deliver democratic impact at scale."),
                spacer(16),

                sectionDivider("African Civic Tech Ecosystem & Alliances"),
                spacer(8),

                h1("Relevant Networks & Funding Mechanisms"),
                body("CEKA's regional growth strategy aligns with the following established African civic tech networks and funding mechanisms:"),
                spacer(4),

                new Table({
                    width: { size: 9360, type: WidthType.DXA }, columnWidths: [2600, 6760], rows: [
                        new TableRow({ children: [cell("NETWORK / FUND", GREEN, WHITE, true), cell("RELEVANCE TO CEKA", GREEN, WHITE, true)] }),
                        new TableRow({ children: [cell("CTIN — Civic Tech Innovation Network", LIGHT_GREEN, DARK_TEXT, true), cell("Leading Community of Practice for civic tech in Africa. Hosts the African Civic Tech Atlas and the annual Civic Tech Innovation Forum. Primary network for CEKA visibility, knowledge sharing, and pan-African collaboration.", LIGHT_GREY, DARK_TEXT)] }),
                        new TableRow({ children: [cell("Code for Africa (CfA)", LIGHT_GREEN, DARK_TEXT, true), cell("Continent's largest civic tech and data journalism network (20+ countries). Open data infrastructure (openAFRICA, sourceAFRICA) and cross-border scaling expertise directly applicable to CEKA's electoral and fiscal data tools.", LIGHT_GREY, DARK_TEXT)] }),
                        new TableRow({ children: [cell("AfricTivistes", LIGHT_GREEN, DARK_TEXT, true), cell("Pan-African web activists and digital democracy network. Supports the African Union Civic Tech Fund (AUCTF) and runs election/governance programs across sub-Saharan Africa.", LIGHT_GREY, DARK_TEXT)] }),
                        new TableRow({ children: [cell("African Union Civic Tech Fund (AUCTF)", LIGHT_GREEN, DARK_TEXT, true), cell("Grants of €15,000 per selected organization, multiple rounds per year. Selects 15 organizations from 400+ applicants. CEKA's open-source model, measurable civic impact, and African focus align directly with selection criteria.", LIGHT_GREY, DARK_TEXT)] }),
                        new TableRow({ children: [cell("Charter Project Africa", LIGHT_GREEN, DARK_TEXT, true), cell("Maps and supports civic tech organizations working on elections, inequality, and participation. Aligns with CEKA's NASAKA, Bill Tracker, and Malpractice Report tools.", LIGHT_GREY, DARK_TEXT)] }),
                        new TableRow({ children: [cell("HRF Bitcoin Development Fund", LIGHT_GREEN, DARK_TEXT, true), cell("Grants BTC to open-source projects advancing financial freedom, censorship resistance, and human rights. CEKA's open-source civic infrastructure, African focus, and community-led model align with BDF criteria. Multiple African projects funded (Bitika, Bitcoin DADA, Bitsacco). Apply at hrf.org/bdfapply.", LIGHT_GREY, DARK_TEXT)] })
                    ]
                }),
                spacer(12),

                sectionDivider("Funding & Financial Sovereignty Strategy"),
                spacer(8),

                h1("Diversified Funding Framework"),
                body("CEKA's funding strategy prioritizes sovereignty — avoiding over-reliance on any single donor, government, or platform that could compromise independence."),
                spacer(4),

                h2("Current Mechanisms"),
                bullet("Ko-fi and M-Pesa public donations — community-backed direct support"), bullet("Volunteer labor pool reducing operational costs"), bullet("Open-source codebase on Cloudflare/Supabase/Vercel minimizing infrastructure costs"),

                h2("Grant Targets"),
                bullet("HRF Bitcoin Development Fund — open-source civic infrastructure, Africa focus, censorship resistance alignment"), bullet("African Union Civic Tech Fund — €15K grants, multiple rounds/year"), bullet("Democracy-support organizations aligned with electoral cycles"), bullet("Digital Defenders Partnership (DDP) — infrastructure security and incident response funding (application submitted)"),

                h2("Bitcoin & Lightning Network Integration"),
                body("Accepting Bitcoin donations via Lightning Network provides censorship-resistant, low-fee, globally accessible funding aligned with CEKA's independence ethos."),
                bullet("Integrate BTCPay Server or Strike Lightning payment for donations"), bullet("Publish a public Bitcoin donation address with on-chain transparent tracking"), bullet("Hold a portion of the community treasury in self-custodied BTC multisig for operational resilience"), bullet("Develop a 'Bitcoin for Civic Freedom' explainer series as both educational content and funding narrative"), bullet("Phased approach: donations first → education content → full treasury integration → regional scaling"),

                h2("Long-Term Sustainability"),
                bullet("Institutional sponsors and large-scale donors aligned with democratic strengthening goals"), bullet("Civic tech consultancy: offer CEKA's methodology and platform stack to other African civic organizations"), bullet("Platform licensing: CEKA's open-source model as a paid-support service for civic actors in other countries"), bullet("Social enterprise spin-offs generating revenue while preserving civic mission"),
                spacer(12),

                sectionDivider("KPI Framework"),
                spacer(8),

                h1("Key Performance Indicators"),
                new Table({
                    width: { size: 9360, type: WidthType.DXA }, columnWidths: [2200, 3580, 3580], rows: [
                        new TableRow({ children: [cell("PILLAR", GREEN, WHITE, true), cell("KEY METRICS", GREEN, WHITE, true), cell("REPORTING FREQUENCY", GREEN, WHITE, true)] }),
                        new TableRow({ children: [cell("Reach", LIGHT_GREEN, DARK_TEXT, true), cell("Unique users, social impressions, geographic coverage, newsletter subscribers, social followers (Instagram, TikTok, X)", LIGHT_GREY, DARK_TEXT), cell("Monthly / Quarterly", LIGHT_GREY, DARK_TEXT)] }),
                        new TableRow({ children: [cell("Engagement", LIGHT_GREEN, DARK_TEXT, true), cell("Session time, modules completed, bills followed, forum posts, return user rate, Flames points issued", LIGHT_GREY, DARK_TEXT), cell("Monthly / Quarterly", LIGHT_GREY, DARK_TEXT)] }),
                        new TableRow({ children: [cell("Civic Outcomes", LIGHT_GREEN, DARK_TEXT, true), cell("Bills tracked, memoranda submitted, registration queries, recall checks, API calls, malpractice reports logged, People's Audit sessions", LIGHT_GREY, DARK_TEXT), cell("Per Campaign / Annually", LIGHT_GREY, DARK_TEXT)] }),
                        new TableRow({ children: [cell("Organization", LIGHT_GREEN, DARK_TEXT, true), cell("Contributor growth, funding secured, partnerships active, platform uptime, security incidents, grant applications submitted", LIGHT_GREY, DARK_TEXT), cell("Quarterly / Annually", LIGHT_GREY, DARK_TEXT)] })
                    ]
                }),
                spacer(16),
                docEnd("1.1", "Internal — Strategic  |  Review Cycle: Annual")
            ]
        }]
    });
}

// ════════════════════════════════════════════════════════════
// DOC 5: BRAND & NARRATIVE GUIDE
// ════════════════════════════════════════════════════════════
function buildBrandGuide() {
    return new Document({
        numbering: numbering(), styles: styles(), sections: [{
            properties: pageProps(), headers: { default: docHeader("Brand & Narrative Guide") }, footers: { default: docFooter() }, children: [
                ...coverBlock("CIVIC EDUCATION KENYA (CEKA)", "Brand & Narrative Guide"),

                body("This guide defines CEKA's brand identity, voice, narrative framework, logo, social channels, and communication standards. It is the authoritative reference for all external communications, content creation, campaign messaging, and partner-facing materials. Every piece of content produced under the CEKA name must align with these standards."),
                spacer(8),

                sectionDivider("Part I: Brand Identity"),
                spacer(8),

                h1("1. Correct Name Usage"),
                body("CEKA stands for Civic Education Kenya App. Referring to it as 'the CEKA App' is therefore redundant and must never appear in formal or public communications. Correct usages: CEKA, Civic Education Kenya, the CEKA platform, civiceducationkenya.com. Incorrect: the CEKA App, CEKA's App."),
                spacer(8),

                h1("2. Who We Are"),
                body("CEKA is an open-source civic-technology ecosystem built to drive political accountability, constitutional literacy, and voter engagement across Kenya. We are community-led, faceless, leaderless, and tribeless. Our work exists at the intersection of civic education, legislative transparency, public participation, and fiscal accountability."),
                body("We do not belong to any political party, government, corporation, or activist coalition. We belong to the Kenyan public. Our organizing spirit: Aluta Continua — the struggle continues."),
                spacer(8),

                h1("3. Brand Positioning"),
                new Table({
                    width: { size: 9360, type: WidthType.DXA }, columnWidths: [4680, 4680], rows: [
                        new TableRow({ children: [cell("CEKA IS", GREEN, WHITE, true), cell("CEKA IS NOT", RED, WHITE, true)] }),
                        new TableRow({ children: [cell("An open-source civic-technology ecosystem", LIGHT_GREEN, DARK_TEXT), cell("A political party or partisan vehicle", PALE_RED, DARK_TEXT)] }),
                        new TableRow({ children: [cell("A trusted, neutral source of civic information", LIGHT_GREEN, DARK_TEXT), cell("An activism or protest organization", PALE_RED, DARK_TEXT)] }),
                        new TableRow({ children: [cell("A non-profit initiative serving the public", LIGHT_GREEN, DARK_TEXT), cell("A government or quasi-governmental agency", PALE_RED, DARK_TEXT)] }),
                        new TableRow({ children: [cell("A platform empowering citizens with knowledge and tools", LIGHT_GREEN, DARK_TEXT), cell("A for-profit or commercial enterprise", PALE_RED, DARK_TEXT)] }),
                        new TableRow({ children: [cell("A community-owned, permanently independent platform", LIGHT_GREEN, DARK_TEXT), cell("An alternative news outlet or opinion platform", PALE_RED, DARK_TEXT)] })
                    ]
                }),
                spacer(12),

                h1("4. Visual Identity"),

                h2("4.1 Brand Colors"),
                body("CEKA's palette is derived from the Kenyan flag. These colors are non-negotiable."),
                new Table({
                    width: { size: 9360, type: WidthType.DXA }, columnWidths: [2000, 1800, 2760, 2800], rows: [
                        new TableRow({ children: [cell("COLOR NAME", DARK_GREY, WHITE, true), cell("HEX", DARK_GREY, WHITE, true), cell("PRIMARY USE", DARK_GREY, WHITE, true), cell("NEVER USE FOR", DARK_GREY, WHITE, true)] }),
                        new TableRow({ children: [cell("Kenya Green", GREEN, WHITE), cell("#056602", LIGHT_GREEN, DARK_TEXT), cell("Headlines, CTAs, section headers, logo, table headers", LIGHT_GREY, DARK_TEXT), cell("Error states, warnings, destructive actions", LIGHT_GREY, DARK_TEXT)] }),
                        new TableRow({ children: [cell("Kenya Red", RED, WHITE), cell("#BB0301", PALE_RED, DARK_TEXT), cell("Accent bars, urgency alerts, flag identity, emphasis", LIGHT_GREY, DARK_TEXT), cell("Primary actions, success states, body text", LIGHT_GREY, DARK_TEXT)] }),
                        new TableRow({ children: [cell("Near-Black", DARK_GREY, WHITE), cell("#141414", LIGHT_GREY, DARK_TEXT), cell("Logo mark, body text, lettering, dark-mode elements", LIGHT_GREY, DARK_TEXT), cell("Backgrounds on large surfaces", LIGHT_GREY, DARK_TEXT)] }),
                        new TableRow({ children: [cell("White / Cream", "888888", WHITE), cell("#FFFFFF / #E8E8E8", LIGHT_GREY, DARK_TEXT), cell("Page backgrounds, reversed text, logo negative", LIGHT_GREY, DARK_TEXT), cell("Text on colored backgrounds without contrast check", LIGHT_GREY, DARK_TEXT)] })
                    ]
                }),
                spacer(12),

                h2("4.2 Logo Identity"),
                body("The CEKA logo is a pareidolia design — the letter forms suggest a human figure raising a fist, symbolizing civic agency and Kenya's democratic struggle. The design is signed by Civic Education Kenya, November 22, 2024 at 9:50 AM. 17 variations of the original design exist. This document and the CEKA platform together constitute the intellectual property and copyright claim for all design variations."),
                spacer(4),

                new Table({
                    width: { size: 9360, type: WidthType.DXA }, columnWidths: [1600, 7760], rows: [
                        new TableRow({ children: [cell("ELEMENT", GREEN, WHITE, true), cell("DESCRIPTION & SIGNIFICANCE", GREEN, WHITE, true)] }),
                        new TableRow({ children: [cell("P1 — Dot (upper)", LIGHT_GREEN, DARK_TEXT, true), cell("A solid circle (#141414, 40 units). Sits 12 units above the main circle, aligned to its right circumference. Represents a raised fist — the whitespace below invites the viewer to complete the arm. Symbolizes civic struggle and collective agency.", LIGHT_GREY, DARK_TEXT)] }),
                        new TableRow({ children: [cell("P2 — Circle (detailed)", LIGHT_GREEN, DARK_TEXT, true), cell("The primary mark. Three arcs within two concentric circles. Red section (#BB0301): full circle, leftmost — the 'C' in Civic. Green section (#056602): inverted 'E' semicircle bordering red — Education. Black arc (#141414): the 'D' that completes 'Ed', and the arm raising the fist above. White inner circle (#FFFFFF): the open-mouthed face — choosing to speak, not stay silent. A voice for the voiceless.", LIGHT_GREY, DARK_TEXT)] }),
                        new TableRow({ children: [cell("P3 — Lateral J (optional)", LIGHT_GREEN, DARK_TEXT, true), cell("A sideways J (#141414) at the base of the mark, above the lettering. Suggests the shoulder/upper torso of the pareidolia figure. Optional — removing it preserves the primary message. When included, completes the civic person silhouette.", LIGHT_GREY, DARK_TEXT)] }),
                        new TableRow({ children: [cell("Lettering", LIGHT_GREEN, DARK_TEXT, true), cell("Fonts: Code Pro and Archivo Black. 'CEKA' (30 units, #141414/#E8E8E8 reversed) sits in the whitespace of the J. Full tagline 'civic education kenya app' (9.9 units) runs beneath. Monochrome silhouette version retains full readability and recognizability.", LIGHT_GREY, DARK_TEXT)] })
                    ]
                }),
                spacer(8),

                body("Usage rules: Maintain original proportions at all sizes. Both full-color and monochrome silhouette versions are official. The mark remains legible at high zoom-out levels. When using at Instagram post (1:1) size, apply original Canva dimensions; use proportional ratios for all other formats."),
                spacer(8),

                h2("4.3 Typography"),
                body("Primary typeface: Arial (universally supported across digital and print). Code Pro and Archivo Black are reserved for the CEKA wordmark. Headlines: bold weight. Body text: regular weight at 11–12pt print / 16–18px digital."),

                h2("4.4 Institutional Framing"),
                body("CEKA speaks as 'we/us/our' in all public communications. No individual is featured in civic-facing content unless explicitly approved by the Core Team. This is structural — not stylistic. It protects the neutrality and longevity of the platform."),
                spacer(16),

                sectionDivider("Part II: Voice & Tone"),
                spacer(8),

                h1("5. CEKA's Voice"),
                new Table({
                    width: { size: 9360, type: WidthType.DXA }, columnWidths: [2400, 3480, 3480], rows: [
                        new TableRow({ children: [cell("VOICE ATTRIBUTE", GREEN, WHITE, true), cell("WHAT IT MEANS", GREEN, WHITE, true), cell("WHAT TO AVOID", GREEN, WHITE, true)] }),
                        new TableRow({ children: [cell("Neutral & Respectful", LIGHT_GREEN, DARK_TEXT, true), cell("Fact-based, unbiased. No political or emotional loading.", LIGHT_GREY, DARK_TEXT), cell("Partisan framing, inflammatory language, taking sides", LIGHT_GREY, DARK_TEXT)] }),
                        new TableRow({ children: [cell("Empowering & Inclusive", LIGHT_GREEN, DARK_TEXT, true), cell("Speaks to citizens as capable, rights-bearing individuals. Never condescending.", LIGHT_GREY, DARK_TEXT), cell("Jargon, paternalism, assumptions about literacy level", LIGHT_GREY, DARK_TEXT)] }),
                        new TableRow({ children: [cell("Clear & Accessible", LIGHT_GREEN, DARK_TEXT, true), cell("Plain language. No legalese. Complex ideas explained simply.", LIGHT_GREY, DARK_TEXT), cell("Technical language, unexplained acronyms, excessive footnotes", LIGHT_GREY, DARK_TEXT)] }),
                        new TableRow({ children: [cell("Action-Oriented", LIGHT_GREEN, DARK_TEXT, true), cell("Always moves citizens toward a concrete next step: learn, track, submit, share.", LIGHT_GREY, DARK_TEXT), cell("Passive CTAs. Ending content without a clear 'what to do next'.", LIGHT_GREY, DARK_TEXT)] })
                    ]
                }),
                spacer(12),

                sectionDivider("Part III: Narrative Framework"),
                spacer(8),

                h1("6. The CEKA Narrative Arc"),
                body("All CEKA communications follow a four-stage narrative arc: Awareness → Understanding → Participation → Accountability."),
                new Table({
                    width: { size: 9360, type: WidthType.DXA }, columnWidths: [1200, 2000, 6160], rows: [
                        new TableRow({ children: [cell("STAGE", GREEN, WHITE, true), cell("NAME", GREEN, WHITE, true), cell("DESCRIPTION & EXAMPLE COPY", GREEN, WHITE, true)] }),
                        new TableRow({ children: [cell("01", GREEN, WHITE, true), cell("AWARENESS", LIGHT_GREEN, GREEN, true), cell("Surface the knowledge gap or civic right the citizen may not know. \"Did you know you have a constitutional right to recall your MP if they fail to perform?\"", LIGHT_GREY, DARK_TEXT)] }),
                        new TableRow({ children: [cell("02", GREEN, WHITE, true), cell("UNDERSTANDING", LIGHT_GREEN, GREEN, true), cell("Simplify the issue — the bill, the right, the process — into plain language. \"Here is what the Finance Bill 2026 actually changes for ordinary Kenyans.\"", LIGHT_GREY, DARK_TEXT)] }),
                        new TableRow({ children: [cell("03", GREEN, WHITE, true), cell("PARTICIPATION", LIGHT_GREEN, GREEN, true), cell("Provide a clear, concrete action using CEKA's tools. \"Submit your feedback on this bill through CEKA before the committee deadline on [date].\"", LIGHT_GREY, DARK_TEXT)] }),
                        new TableRow({ children: [cell("04", GREEN, WHITE, true), cell("ACCOUNTABILITY", LIGHT_GREEN, GREEN, true), cell("Close the loop. Show the impact. \"Parliament received thousands of submissions. Here is what changed in the final bill as a result.\"", LIGHT_GREY, DARK_TEXT)] })
                    ]
                }),
                spacer(12),

                h1("7. Key Messages by Audience"),

                h2("7.1 Youth & Students"),
                highlight("Your voice matters. Democracy works when you participate. CEKA makes it easy."),
                bullet("Emphasize accessibility and simplicity"), bullet("Highlight the direct impact of their generation on national outcomes"), bullet("Use participatory, interactive formats: quizzes, short-form video, explainers"), bullet("TikTok and Instagram are primary channels for this audience"),
                spacer(6),

                h2("7.2 Civil Society & NGOs"),
                highlight("CEKA is civic infrastructure you can build on. Use our tools, content, and data to amplify your work."),
                bullet("Emphasize open-source availability and partnership potential"), bullet("Highlight technical depth: Bill Tracker, open API, memorandum routing, People's Audit data"), bullet("Position CEKA as a force multiplier for existing civic programs"), bullet("Mzalendo is a complementary partner — not a competitor — in this ecosystem"),
                spacer(6),

                h2("7.3 Media & Journalists"),
                highlight("CEKA simplifies what Parliament does. Use our content as a verified starting point for public-interest reporting."),
                bullet("Emphasize accuracy, speed, and neutrality"), bullet("Highlight the Bill Tracker's real-time monitoring and AI citizen concerns"), bullet("People's Audit data is citation-ready for budget and fiscal reporting"), bullet("CEKA publicly corrected NTV Kenya's misrepresentation of CEKA tools — accuracy is non-negotiable"),
                spacer(6),

                h2("7.4 Donors & Funding Partners"),
                highlight("CEKA is not a project. It is permanent civic infrastructure. Your support keeps it open, independent, and growing."),
                bullet("Lead with impact: 1M+ reach on key campaigns, Finance Bill 2026 2.1M impressions, NASAKA 1M+ monthly requests"), bullet("Show cost-to-impact ratio and specific use of funds"), bullet("Emphasize sustainability strategy: open-source, community-powered, diversified income"), bullet("Bitcoin/Lightning donation pathway demonstrates financial sovereignty aligned with independence values"),
                spacer(16),

                sectionDivider("Part IV: Social Media Channels"),
                spacer(8),

                h1("8. Platform Strategy"),
                new Table({
                    width: { size: 9360, type: WidthType.DXA }, columnWidths: [2400, 1800, 5160], rows: [
                        new TableRow({ children: [cell("PLATFORM", GREEN, WHITE, true), cell("HANDLE", GREEN, WHITE, true), cell("CONTENT STRATEGY & ROLE", GREEN, WHITE, true)] }),
                        new TableRow({ children: [cell("Instagram", LIGHT_GREEN, DARK_TEXT, true), cell("@civiceducationke", LIGHT_GREY, DARK_TEXT), cell("Primary civic education hub. 11,000+ followers. Home of #LetsBreakDown series, tool launches, campaign graphics, and bill explainers. High shareability. Primary driver of traffic to civiceducationkenya.com.", LIGHT_GREY, DARK_TEXT)] }),
                        new TableRow({ children: [cell("TikTok", LIGHT_GREEN, DARK_TEXT, true), cell("@civiceducationkenya", LIGHT_GREY, DARK_TEXT), cell("Youth-first short-form civic content. ~2,989 followers, 13,800+ likes. Quick explainers on bills, rights, and CEKA tools. Aligns with Gen Z civic awakening. Drives younger demographic to platform.", LIGHT_GREY, DARK_TEXT)] }),
                        new TableRow({ children: [cell("X / Twitter", LIGHT_GREEN, DARK_TEXT, true), cell("@CivicEdKenya", LIGHT_GREY, DARK_TEXT), cell("Real-time civic commentary, bill updates, tool announcements, and accountability. Actively corrects media misrepresentation. Engages civic and policy community.", LIGHT_GREY, DARK_TEXT)] }),
                        new TableRow({ children: [cell("Website / App", LIGHT_GREEN, DARK_TEXT, true), cell("civiceducationkenya.com", LIGHT_GREY, DARK_TEXT), cell("Destination for all tools, deep content, bill tracking, community, and AI features. All social content routes users here.", LIGHT_GREY, DARK_TEXT)] })
                    ]
                }),
                spacer(8),
                body("All social content follows the four-stage narrative arc. Every post has a stated action or destination. Platform tone adapts — more conversational on TikTok and Instagram, more factual on X — while voice remains constant. The faceless, 'we/us/our' framing applies across all platforms."),
                spacer(12),

                sectionDivider("Part V: Content Standards"),
                spacer(8),

                h1("9. Content Standards"),

                h2("9.1 Accuracy"),
                body("Every factual claim must be sourced from the Constitution of Kenya, Parliamentary records, IEBC official data, or a reputable institution. CEKA does not publish unverified claims. Corrections are published promptly and transparently. AI-assisted content is disclosed to users."),

                h2("9.2 Neutrality"),
                body("CEKA does not editorialize. Content on legislation, government policy, or political processes presents facts and legal text only. CEKA never advocates for or against any political party, candidate, policy position, or protest movement. Accountability tools (Malpractice Report, SHAmbles, People's Audit) are fact-based and structural — they document and expose, they do not campaign."),

                h2("9.3 Accessibility"),
                body("Content must be understandable to a Kenyan citizen with secondary school education as the baseline. Legal terms must be defined on first use. Dense legislative text must always be accompanied by a plain-language summary. Visual content should accompany complex data wherever possible."),

                h2("9.4 Community Feedback Standards"),
                body("CEKA takes public feedback seriously. Documented community responses include: 'Super easy to use', 'Amazing job', 'Asanteee sana for this initiative', 'This feels Govt-level'. These are not testimonials for marketing — they are accountability data points showing CEKA is meeting its accessibility mandate. All critical feedback is responded to promptly and acted upon where technically feasible."),
                spacer(16),

                docEnd("1.1", "Internal — Brand")
            ]
        }]
    });
}

// ════════════════════════════════════════════════════════════
// BUILD ALL
// ════════════════════════════════════════════════════════════
async function buildAll() {
    const docs = [
        { fn: buildConstitution, name: "CEKA_Constitution_Master_Identity.docx" },
        { fn: buildConceptNote, name: "CEKA_Concept_Note.docx" },
        { fn: buildProductBible, name: "CEKA_Product_Bible.docx" },
        { fn: buildStrategicBlueprint, name: "CEKA_10Year_Strategic_Blueprint.docx" },
        { fn: buildBrandGuide, name: "CEKA_Brand_Narrative_Guide.docx" }
    ];
    for (const d of docs) {
        const buffer = await Packer.toBuffer(d.fn());
        const outDir = path.join(__dirname, "outputs");
        fs.mkdirSync(outDir, { recursive: true });
        fs.writeFileSync(path.join(outDir, d.name), buffer);
        console.log("✓", d.name);
    }
}
buildAll().catch(e => { console.error(e); process.exit(1); });