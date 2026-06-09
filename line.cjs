const {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
    VerticalAlign, PageBreak, LevelFormat, TableOfContents
} = require('docx');
const fs = require('fs');

// Brand colors
const GREEN = "006600";
const RED = "b71c2b";
const LIGHT_GREEN = "e8f5e9";
const LIGHT_RED = "fce4e4";
const LIGHT_AMBER = "fff8e1";
const LIGHT_GRAY = "f5f5f5";
const DARK_GRAY = "333333";
const MID_GRAY = "666666";
const BORDER_GRAY = "CCCCCC";

const border = { style: BorderStyle.SINGLE, size: 1, color: BORDER_GRAY };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

function h1(text) {
    return new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text, bold: true, size: 36, color: GREEN, font: "Arial" })],
        spacing: { before: 400, after: 200 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: GREEN, space: 4 } }
    });
}

function h2(text) {
    return new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text, bold: true, size: 28, color: DARK_GRAY, font: "Arial" })],
        spacing: { before: 320, after: 160 }
    });
}

function h3(text) {
    return new Paragraph({
        heading: HeadingLevel.HEADING_3,
        children: [new TextRun({ text, bold: true, size: 24, color: RED, font: "Arial" })],
        spacing: { before: 240, after: 120 }
    });
}

function body(text, opts = {}) {
    return new Paragraph({
        children: [new TextRun({ text, size: 22, font: "Arial", color: DARK_GRAY, ...opts })],
        spacing: { before: 80, after: 80 },
        alignment: AlignmentType.JUSTIFIED
    });
}

function bold(text) {
    return body(text, { bold: true });
}

function bullet(text, level = 0) {
    return new Paragraph({
        numbering: { reference: "bullets", level },
        children: [new TextRun({ text, size: 22, font: "Arial", color: DARK_GRAY })],
        spacing: { before: 60, after: 60 }
    });
}

function numbered(text, level = 0) {
    return new Paragraph({
        numbering: { reference: "numbers", level },
        children: [new TextRun({ text, size: 22, font: "Arial", color: DARK_GRAY })],
        spacing: { before: 60, after: 60 }
    });
}

function spacer() {
    return new Paragraph({ children: [new TextRun("")], spacing: { before: 80, after: 80 } });
}

function pageBreak() {
    return new Paragraph({ children: [new PageBreak()] });
}

function alertBox(title, text, color = LIGHT_AMBER, titleColor = RED) {
    return new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [9360],
        rows: [
            new TableRow({
                children: [new TableCell({
                    borders,
                    width: { size: 9360, type: WidthType.DXA },
                    shading: { fill: color, type: ShadingType.CLEAR },
                    margins: { top: 120, bottom: 120, left: 180, right: 180 },
                    children: [
                        new Paragraph({
                            children: [new TextRun({ text: title, bold: true, size: 22, color: titleColor, font: "Arial" })],
                            spacing: { before: 0, after: 80 }
                        }),
                        new Paragraph({
                            children: [new TextRun({ text, size: 20, color: DARK_GRAY, font: "Arial" })],
                            spacing: { before: 0, after: 0 },
                            alignment: AlignmentType.JUSTIFIED
                        })
                    ]
                })]
            })
        ]
    });
}

function twoColTable(rows, col1Width = 3000, col2Width = 6360) {
    return new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [col1Width, col2Width],
        rows: rows.map(([label, value]) => new TableRow({
            children: [
                new TableCell({
                    borders,
                    width: { size: col1Width, type: WidthType.DXA },
                    shading: { fill: LIGHT_GRAY, type: ShadingType.CLEAR },
                    margins: { top: 80, bottom: 80, left: 120, right: 120 },
                    children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20, font: "Arial", color: DARK_GRAY })] })]
                }),
                new TableCell({
                    borders,
                    width: { size: col2Width, type: WidthType.DXA },
                    margins: { top: 80, bottom: 80, left: 120, right: 120 },
                    children: [new Paragraph({ children: [new TextRun({ text: value, size: 20, font: "Arial", color: DARK_GRAY })] })]
                })
            ]
        }))
    });
}

function sectionDivider(label) {
    return new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [9360],
        rows: [new TableRow({
            children: [new TableCell({
                borders: noBorders,
                width: { size: 9360, type: WidthType.DXA },
                shading: { fill: GREEN, type: ShadingType.CLEAR },
                margins: { top: 120, bottom: 120, left: 240, right: 240 },
                children: [new Paragraph({
                    children: [new TextRun({ text: label, bold: true, size: 28, color: "FFFFFF", font: "Arial" })],
                    alignment: AlignmentType.CENTER
                })]
            })]
        })]
    });
}

const children = [];

// ============================================================
// COVER PAGE
// ============================================================
children.push(
    new Paragraph({ children: [new TextRun("")], spacing: { before: 1440, after: 0 } }),
    new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "CIVIC EDUCATION KENYA (CEKA)", bold: true, size: 52, color: GREEN, font: "Arial" })]
    }),
    new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "CRISIS & CONTINUITY MANUAL", bold: true, size: 44, color: RED, font: "Arial" })],
        spacing: { before: 160, after: 160 }
    }),
    new Paragraph({
        alignment: AlignmentType.CENTER,
        border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: GREEN, space: 8 } },
        children: [new TextRun({ text: "For Internal Use by Authorised CEKA Team Members Only", size: 22, color: MID_GRAY, font: "Arial", italics: true })],
        spacing: { before: 0, after: 320 }
    }),
    new Paragraph({ children: [new TextRun("")], spacing: { before: 240, after: 0 } }),
    new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [9360],
        rows: [new TableRow({
            children: [new TableCell({
                borders,
                width: { size: 9360, type: WidthType.DXA },
                shading: { fill: LIGHT_AMBER, type: ShadingType.CLEAR },
                margins: { top: 200, bottom: 200, left: 300, right: 300 },
                children: [
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: "IMPORTANT NOTICE", bold: true, size: 24, color: RED, font: "Arial" })],
                        spacing: { before: 0, after: 120 }
                    }),
                    new Paragraph({
                        alignment: AlignmentType.JUSTIFIED,
                        children: [new TextRun({ text: "This document contains sensitive operational protocols for Civic Education Kenya. It is intended exclusively for named authorised team members. Do not share digitally. Store securely. If this document is found by an unauthorised person, it contains no information that identifies any individual. All personal names have been replaced with role designations.", size: 20, font: "Arial", color: DARK_GRAY })],
                        spacing: { before: 0, after: 0 }
                    })
                ]
            })]
        })]
    }),
    new Paragraph({ children: [new TextRun("")], spacing: { before: 400, after: 0 } }),
    new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Version 1.0  |  June 2026  |  civiceducationkenya.com", size: 20, color: MID_GRAY, font: "Arial" })]
    }),
    pageBreak()
);

// ============================================================
// QUICK RESPONSE INDEX
// ============================================================
children.push(
    sectionDivider("QUICK RESPONSE INDEX — START HERE IN A CRISIS"),
    spacer(),
    body("If something has gone wrong, find your situation below and go directly to the page indicated. Do not read the manual from beginning to end during a crisis. Go to your section."),
    spacer(),
    new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [5400, 2160, 1800],
        rows: [
            new TableRow({
                children: [
                    new TableCell({ borders, width: { size: 5400, type: WidthType.DXA }, shading: { fill: GREEN, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: "SITUATION", bold: true, size: 22, color: "FFFFFF", font: "Arial" })] })] }),
                    new TableCell({ borders, width: { size: 2160, type: WidthType.DXA }, shading: { fill: GREEN, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: "SEVERITY", bold: true, size: 22, color: "FFFFFF", font: "Arial" })] })] }),
                    new TableCell({ borders, width: { size: 1800, type: WidthType.DXA }, shading: { fill: GREEN, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: "GO TO", bold: true, size: 22, color: "FFFFFF", font: "Arial" })] })] })
                ]
            }),
            ...([
                ["I think I am being followed or physically surveilled", "CRITICAL", "Section 3A"],
                ["My phone or laptop may be compromised or tapped", "CRITICAL", "Section 3B"],
                ["I need to go dark immediately — devices off, comms silent", "CRITICAL", "Section 3C"],
                ["The Platform Lead is unreachable — no contact for 24+ hours", "CRITICAL", "Section 7"],
                ["The Platform Lead has been detained or is in danger", "CRITICAL", "Section 7"],
                ["Our Instagram account has been suspended or taken down", "HIGH", "Section 4A"],
                ["Our Instagram is being mass-reported by hostile actors", "HIGH", "Section 4A"],
                ["Our website civiceducationkenya.com is down or unreachable", "HIGH", "Section 5A"],
                ["We are under a coordinated DDoS or traffic attack", "HIGH", "Section 5B"],
                ["Our GitHub/codebase has received a takedown request", "HIGH", "Section 5C"],
                ["An account password has been compromised", "HIGH", "Section 4B"],
                ["Misinformation about CEKA is spreading rapidly", "MEDIUM", "Section 6B"],
                ["A team member suspects their communications are monitored", "MEDIUM", "Section 3B"],
                ["We need to publish content but the Platform Lead is offline", "MEDIUM", "Section 7"],
                ["Our Supabase database is down or in read-only mode", "MEDIUM", "Section 5D"],
                ["We have received a legal threat or government notice", "MEDIUM", "Section 6C"],
            ]).map(([sit, sev, go]) => new TableRow({
                children: [
                    new TableCell({ borders, width: { size: 5400, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: sit, size: 20, font: "Arial", color: DARK_GRAY })] })] }),
                    new TableCell({ borders, width: { size: 2160, type: WidthType.DXA }, shading: { fill: sev === "CRITICAL" ? LIGHT_RED : sev === "HIGH" ? LIGHT_AMBER : LIGHT_GREEN, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: sev, bold: true, size: 20, font: "Arial", color: sev === "CRITICAL" ? RED : sev === "HIGH" ? "8B4000" : GREEN })] })] }),
                    new TableCell({ borders, width: { size: 1800, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: go, bold: true, size: 20, font: "Arial", color: GREEN })] })] })
                ]
            }))
        ]
    }),
    spacer(),
    pageBreak()
);

// ============================================================
// SECTION 1 — WHO WE ARE
// ============================================================
children.push(
    h1("SECTION 1 — WHO WE ARE & WHY THIS MANUAL EXISTS"),
    h2("1.1 Our Mission"),
    body("Civic Education Kenya (CEKA) is an open-source civic technology platform dedicated to making Kenyan governance transparent, accessible, and accountable to every citizen. We track legislation, expose malpractice, publish civic data, and give citizens tools to engage their representatives directly."),
    body("We operate under a deliberate faceless, institutional identity. There is no single public face of CEKA. This is not a weakness — it is a structural protection. The work is bigger than any one person."),
    spacer(),
    h2("1.2 Why This Manual Exists"),
    body("CEKA's work creates adversaries. By holding power accountable, we may attract the attention of those who prefer opacity. This manual exists because:"),
    bullet("The platform must survive any threat to any individual team member."),
    bullet("In a crisis, there is no time to figure out what to do. This document removes that uncertainty."),
    bullet("Every team member deserves to know exactly what to do if the worst happens."),
    bullet("The citizens who depend on our civic data deserve continuity of service regardless of what happens to us."),
    spacer(),
    alertBox("CORE PRINCIPLE", "CEKA is an institution, not a person. If any team member is unreachable, compromised, or unable to continue, the institution continues. This manual is how that happens.", LIGHT_GREEN, GREEN),
    spacer(),
    h2("1.3 The Nature of Our Risks"),
    body("As a civic accountability platform operating in Kenya, the risks we face are real and documented. They include:"),
    bullet("Digital: account takedowns, coordinated mass-reporting, DDoS attacks, codebase removal requests, surveillance of online communications."),
    bullet("Physical: surveillance of team members, phone tapping, following, intimidation, and in extreme cases, detention."),
    bullet("Legal: government notices, defamation threats, or requests to remove content."),
    bullet("Institutional: impersonation accounts, misinformation campaigns, attempts to discredit CEKA's work."),
    body("None of these risks should paralyse us. This manual converts each risk into a protocol. A protocol is just a series of steps. Steps can be followed even under stress."),
    spacer(),
    pageBreak()
);

// ============================================================
// SECTION 2 — PEOPLE & KEYS
// ============================================================
children.push(
    h1("SECTION 2 — THE PEOPLE & THE KEYS"),
    h2("2.1 Team Structure"),
    body("CEKA operates with a small, trusted inner team. Each member has a designated role in a crisis. Roles are defined by function, not seniority."),
    spacer(),
    twoColTable([
        ["Platform Lead", "Holds master access to all infrastructure. Responsible for all technical and strategic decisions. If unreachable, the Continuity Lead activates Section 7."],
        ["Continuity Lead (DK)", "First responder when the Platform Lead is unreachable. Holds secondary access to Instagram. Responsible for executing Section 7 if triggered. Does not need technical depth — follows documented steps."],
        ["Communications Member", "Responsible for public-facing content, social media scheduling, and audience communications during a crisis."],
        ["Legal Contact (External)", "Engaged when there is a legal threat, government notice, or formal takedown request. Not a full-time team member — contact details in Section 8."],
    ]),
    spacer(),
    h2("2.2 Access & Credentials"),
    alertBox("CRITICAL SECURITY NOTE", "This section contains placeholders. The actual credentials and access details must be stored in a secure, encrypted location — NOT in this document. This document only records what exists and where to find it. Recommended storage: a hardware-encrypted USB drive kept in a physically secure location known to the Continuity Lead.", LIGHT_RED, RED),
    spacer(),
    body("The following platforms hold active CEKA credentials. The Platform Lead holds master access to all. Secondary access is noted where it exists."),
    spacer(),
    new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2800, 2200, 2160, 2200],
        rows: [
            new TableRow({
                children: [
                    new TableCell({ borders, width: { size: 2800, type: WidthType.DXA }, shading: { fill: GREEN, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: "PLATFORM", bold: true, size: 20, color: "FFFFFF", font: "Arial" })] })] }),
                    new TableCell({ borders, width: { size: 2200, type: WidthType.DXA }, shading: { fill: GREEN, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: "PRIMARY ACCESS", bold: true, size: 20, color: "FFFFFF", font: "Arial" })] })] }),
                    new TableCell({ borders, width: { size: 2160, type: WidthType.DXA }, shading: { fill: GREEN, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: "SECONDARY ACCESS", bold: true, size: 20, color: "FFFFFF", font: "Arial" })] })] }),
                    new TableCell({ borders, width: { size: 2200, type: WidthType.DXA }, shading: { fill: GREEN, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: "CREDENTIAL LOCATION", bold: true, size: 20, color: "FFFFFF", font: "Arial" })] })] }),
                ]
            }),
            ...([
                ["civiceducationkenya.com", "Platform Lead", "None", "Encrypted USB"],
                ["Cloudflare", "Platform Lead", "None", "Encrypted USB"],
                ["Supabase (ceka-app-v5)", "Platform Lead", "None", "Encrypted USB"],
                ["Supabase (Nasaka IEBC)", "Platform Lead", "None", "Encrypted USB"],
                ["Vercel", "Platform Lead", "None", "Encrypted USB"],
                ["GitHub (saemscodes/CEKA)", "Platform Lead", "None", "Encrypted USB"],
                ["GitLab (civiceducationkenya)", "Platform Lead", "None", "Encrypted USB"],
                ["Codeberg (saemscodes/CEKA)", "Platform Lead", "None", "Encrypted USB"],
                ["Instagram (CEKA)", "Platform Lead", "Continuity Lead (DK)", "DK holds separately"],
                ["Facebook / Meta Business", "Platform Lead", "None", "Encrypted USB"],
                ["Twitter / X", "Platform Lead", "None", "Encrypted USB"],
                ["Brevo (Email)", "Platform Lead", "None", "Encrypted USB"],
                ["Substack", "Platform Lead", "None", "Encrypted USB"],
                ["Paystack", "Platform Lead", "None", "Encrypted USB"],
                ["Google Play Console", "Platform Lead", "None", "Encrypted USB"],
            ]).map(([p, pri, sec, loc]) => new TableRow({
                children: [
                    new TableCell({ borders, width: { size: 2800, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: p, size: 20, font: "Arial", color: DARK_GRAY })] })] }),
                    new TableCell({ borders, width: { size: 2200, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: pri, size: 20, font: "Arial", color: DARK_GRAY })] })] }),
                    new TableCell({ borders, width: { size: 2160, type: WidthType.DXA }, shading: { fill: sec !== "None" ? LIGHT_GREEN : "FFFFFF", type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: sec, size: 20, font: "Arial", color: sec !== "None" ? GREEN : MID_GRAY })] })] }),
                    new TableCell({ borders, width: { size: 2200, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: loc, size: 20, font: "Arial", color: DARK_GRAY })] })] }),
                ]
            }))
        ]
    }),
    spacer(),
    h2("2.3 The Encrypted USB — What It Is & Who Knows"),
    body("All critical credentials are stored on a hardware-encrypted USB drive. The following people know its location and how to access it:"),
    bullet("Platform Lead — holds the primary device."),
    bullet("Continuity Lead (DK) — knows the physical location and the access protocol."),
    body("The USB must never be stored with internet-connected devices. It must never be photographed. If it is lost or compromised, immediately change all credentials listed above."),
    spacer(),
    pageBreak()
);

// ============================================================
// SECTION 3 — PHYSICAL THREAT PROTOCOLS
// ============================================================
children.push(
    h1("SECTION 3 — PHYSICAL THREAT PROTOCOLS"),
    body("This section covers what to do when the threat is physical — surveillance, tailing, phone tapping, and intimidation. These are real and documented tactics used against civic actors in Kenya."),
    spacer(),
    h2("3A — I Think I Am Being Followed or Physically Surveilled"),
    alertBox("FIRST RULE", "Do not panic. Do not run. Do not confront. A panicked reaction confirms you have noticed. The goal is to calmly verify and exit.", LIGHT_AMBER, RED),
    spacer(),
    h3("Step 1: Verify — The Box Route Test"),
    body("Walk a deliberate four-sided route (around a block or building). If the same person appears at three corners, you are being followed. This is not paranoia — it is tradecraft."),
    spacer(),
    h3("Step 2: Move to a Populated, Observed Space"),
    body("Go to a busy public place with CCTV if possible — a shopping mall, hotel lobby, petrol station, or supermarket. Sit where your back is to a wall and you can see entrances."),
    spacer(),
    h3("Step 3: Devices Off Before You Move"),
    body("Before leaving any location where you suspect surveillance, power off your phone completely — not silent, not airplane mode. Full power off. If you have a laptop, close it and power off. A powered-off device cannot be used to track your movement in real time."),
    spacer(),
    h3("Step 4: Communicate via Signal Only"),
    body("Once you are in a safe location, use Signal (not WhatsApp, not SMS, not a phone call on your primary number) to contact the Continuity Lead. Use the pre-agreed check-in message: [TO BE AGREED AND INSERTED BY TEAM]. Keep the message brief. Do not describe your location digitally."),
    spacer(),
    h3("Step 5: Do Not Return Home Directly"),
    body("If you believe you are under active physical surveillance, do not lead surveillance to your home or the homes of other team members. Go to a neutral third location first and confirm you are no longer being followed before returning."),
    spacer(),
    h2("3B — My Phone or Laptop May Be Compromised or Tapped"),
    body("Signs of phone compromise include: battery draining unusually fast, device running hot when idle, unexpected data usage spikes, calls or messages you did not make, and unusual background noise during calls."),
    spacer(),
    h3("Immediate Steps — Phone"),
    numbered("Power off the device completely."),
    numbered("Do not turn it back on in your current location."),
    numbered("Remove the SIM card if possible."),
    numbered("Communicate using a different device — a trusted team member's phone, or a temporary SIM purchased with cash."),
    numbered("Do not log into any CEKA accounts from this device until it has been assessed."),
    spacer(),
    h3("Immediate Steps — Laptop"),
    numbered("Close all applications immediately."),
    numbered("Disconnect from all networks (WiFi and Ethernet)."),
    numbered("Do not run any new software or open any new files."),
    numbered("Use a separate, clean device for CEKA work until the laptop has been assessed."),
    spacer(),
    h3("The Faraday Bag Protocol"),
    body("A Faraday bag blocks all radio signals — cellular, WiFi, Bluetooth, and GPS. It is the most reliable way to prevent a compromised or targeted device from transmitting your location or data."),
    spacer(),
    alertBox("HOW TO MAKE AN EMERGENCY FARADAY BAG", "You need: two layers of heavy-duty aluminium foil (multiple layers), tape, and a zip-lock bag. Wrap the device in at least three complete layers of foil with no gaps. Place inside the zip-lock bag. Seal. The device can no longer transmit or receive any signal. This is a verified method — verified operationally by this team. Commercial Faraday bags (available on Amazon Kenya or Jumia) are more reliable for ongoing use.", LIGHT_GRAY, DARK_GRAY),
    spacer(),
    h3("Network Privacy — The 1.1.1.1 and VPN Protocol"),
    body("When operating under surveillance conditions or when you need to obscure your location and browsing:"),
    numbered("Set your DNS to 1.1.1.1 (Cloudflare) — this prevents your ISP from seeing which websites you visit. On Android: Settings > Network > Private DNS > enter one.one.one.one. On Windows: Network Settings > DNS > 1.1.1.1"),
    numbered("Enable a VPN on all devices before any CEKA-related work. Recommended: ProtonVPN (has a free tier, Swiss jurisdiction, audited). Mullvad VPN (no logs, anonymous). Both are trustworthy for activists."),
    numbered("Use location spoofing on your mobile device when necessary — set your apparent location to a different city or country before engaging with sensitive content or accounts."),
    numbered("Do not access CEKA platform admin panels from a device or network you do not fully control."),
    spacer(),
    h2("3C — I Need to Go Dark Immediately"),
    body("Going dark means ceasing all digital communications for a period of time to prevent tracking, interception, or further compromise. This is a last resort — use it when you believe you are under active, immediate threat."),
    spacer(),
    alertBox("THE GOING DARK CHECKLIST", "1. Power off all devices completely.\n2. Remove SIM cards from all phones.\n3. Place all devices in Faraday bag.\n4. Move to a safe physical location — do not announce where you are going digitally.\n5. Use a trusted person's device (not your own) to send ONE brief Signal message to the Continuity Lead: [PRE-AGREED SAFE WORD].\n6. Do not use any of your own accounts, email, or social media.\n7. Wait for the Continuity Lead to confirm receipt and next steps.\n8. The Continuity Lead activates Section 7.", LIGHT_RED, RED),
    spacer(),
    h3("Pre-Agreed Safe Words — Fill In Before an Emergency"),
    body("The team must agree on and memorise the following words BEFORE any crisis. Write them here after agreement:"),
    spacer(),
    twoColTable([
        ["I am safe but going dark", "[AGREE AND INSERT]"],
        ["I am in immediate physical danger", "[AGREE AND INSERT]"],
        ["I need legal help now", "[AGREE AND INSERT]"],
        ["Activate Section 7 — full continuity protocol", "[AGREE AND INSERT]"],
        ["False alarm — all clear", "[AGREE AND INSERT]"],
    ]),
    spacer(),
    pageBreak()
);

// ============================================================
// SECTION 4 — DIGITAL THREAT PROTOCOLS
// ============================================================
children.push(
    h1("SECTION 4 — DIGITAL THREAT PROTOCOLS"),
    spacer(),
    h2("4A — Our Instagram Account Has Been Suspended or Is Under Attack"),
    h3("Scenario 1: Coordinated Mass-Reporting by Hostile Actors"),
    body("This is the most likely social media threat during high-visibility campaigns like the June 25th Finance Bill anniversary. Hostile actors mass-report an account to trigger an automated suspension."),
    spacer(),
    numbered("Do not retaliate or post anything reactive. Reactive posts escalate the situation."),
    numbered("Document everything immediately — screenshot the notification, the account status, and the timing. Save to CEKA's encrypted storage."),
    numbered("File a formal appeal via: Instagram > Support > Something Isn't Working > Report a Problem. Be factual and institutional in tone."),
    numbered("Simultaneously, post from backup distribution channels (see Section 6A) to inform followers that the account is temporarily restricted and CEKA's work continues."),
    numbered("If Meta Verified is active: use the direct support chat for faster response."),
    numbered("Cite your Wikipedia/Wikidata presence and the Nation Media Group/Andariya citation as evidence of institutional legitimacy in the appeal."),
    numbered("If the account is not restored within 72 hours, escalate to the legal contact (Section 8) for a formal response."),
    spacer(),
    h3("Scenario 2: Account Suspended — Cannot Access"),
    numbered("Attempt account recovery via the registered email: civiceducationkenya@gmail.com"),
    numbered("Use Meta Business Suite if accessible — a secondary admin (to be set up before June 25) can continue posting."),
    numbered("Document the suspension with timestamps and screenshots."),
    numbered("File appeal — reference institutional identity, Wikipedia presence, and civic mission."),
    numbered("Activate backup publishing channels immediately."),
    spacer(),
    alertBox("BACKUP PUBLISHING CHANNELS — IN ORDER OF PRIORITY", "1. civiceducationkenya.com/pieces (owned platform — highest priority, no one can take it down)\n2. Twitter/X (@CEKAKenya or equivalent handle)\n3. Brevo email newsletter (134+ subscribers — already confirmed)\n4. Telegram channel (if active)\n5. Facebook page (if Meta has not suspended cross-platform)\n6. Substack (long-form content)", LIGHT_GREEN, GREEN),
    spacer(),
    h2("4B — An Account Password Has Been Compromised"),
    numbered("Change the password immediately from a clean, trusted device on a VPN."),
    numbered("Revoke all active sessions on that platform."),
    numbered("Enable or re-enable 2FA — use an authenticator app (Google Authenticator or Authy), never SMS."),
    numbered("Check connected third-party apps and revoke any that should not have access."),
    numbered("Update the credentials on the encrypted USB."),
    numbered("Inform the Continuity Lead that credentials have changed."),
    numbered("Review recent account activity for any unauthorised posts, data access, or setting changes."),
    spacer(),
    h2("4C — Signal & Secure Communications Protocol"),
    body("Signal is our primary secure communications channel. These rules apply at all times, not only in a crisis:"),
    bullet("All sensitive CEKA team communication happens on Signal. Not WhatsApp. Not Telegram. Not SMS."),
    bullet("Enable disappearing messages on all Signal conversations — set to 1 week for most threads, 24 hours for anything sensitive."),
    bullet("Never screenshot Signal conversations unless operationally necessary. If you do, delete the screenshot immediately after use."),
    bullet("Do not add anyone to the CEKA Signal group without explicit approval from the Platform Lead or Continuity Lead."),
    bullet("If you believe your Signal has been compromised, immediately message other team members from a different device to alert them."),
    bullet("The Signal group name and member list should not identify CEKA publicly."),
    spacer(),
    pageBreak()
);

// ============================================================
// SECTION 5 — INFRASTRUCTURE EMERGENCY PROTOCOLS
// ============================================================
children.push(
    h1("SECTION 5 — INFRASTRUCTURE EMERGENCY PROTOCOLS"),
    body("This section is primarily for the Platform Lead but is documented here so the Continuity Lead understands the scope of what needs to be restored."),
    spacer(),
    h2("5A — The Website Is Down or Unreachable"),
    h3("Step 1: Identify the Layer"),
    twoColTable([
        ["Check civiceducationkenya.com", "If it loads on mobile data but not WiFi — it's a local ISP issue, not CEKA's problem."],
        ["Check civicedkenya.vercel.app", "If this loads but .com does not — the issue is Cloudflare DNS, not the application."],
        ["Check Vercel dashboard", "If deployment shows errors — the application itself has a problem."],
        ["Check Supabase status", "supabase.com/dashboard — if Supabase is down, the site will load but data won't."],
    ]),
    spacer(),
    h3("Step 2: Cloudflare Issue"),
    numbered("Login: dash.cloudflare.com"),
    numbered("Check DNS records are correct for civiceducationkenya.com"),
    numbered("Check if any security rule is blocking traffic"),
    numbered("If Under Attack Mode was left on accidentally — go to Security > Settings > Domain settings > Security Level > turn off I'm Under Attack"),
    spacer(),
    h3("Step 3: Vercel Issue"),
    numbered("Login: vercel.com/dashboard"),
    numbered("Check deployment status — redeploy if needed"),
    numbered("Check environment variables are intact"),
    spacer(),
    h2("5B — We Are Under a DDoS or Traffic Attack"),
    numbered("Go to: dash.cloudflare.com > civiceducationkenya.com > Security > Settings > Domain settings"),
    numbered("Find the Security Level card — click the pencil icon"),
    numbered("Toggle I'm Under Attack Mode to ON"),
    numbered("Click Apply Settings"),
    numbered("This adds a 5-second JavaScript challenge to all visitors — bots cannot pass it, humans can."),
    numbered("Monitor traffic in Cloudflare Analytics — if the attack subsides, turn Under Attack Mode off after 2 hours."),
    numbered("After the attack: document what happened, when it started, and the traffic volume. This is evidence."),
    spacer(),
    alertBox("BOOKMARK THIS URL NOW", "https://dash.cloudflare.com/32bdfa759705b0aef9c3ef7aa449e965/civiceducationkenya.com/security/settings\n\nSave it in your browser as CF ATTACK MODE. In a crisis you do not want to navigate menus.", LIGHT_AMBER, RED),
    spacer(),
    h2("5C — GitHub/Codebase Has Received a Takedown Request"),
    body("CEKA's codebase exists on three platforms simultaneously. A takedown on one does not kill the project."),
    twoColTable([
        ["Primary", "github.com/saemscodes/CEKA"],
        ["Mirror 1", "gitlab.com/civiceducationkenya/ceka"],
        ["Mirror 2", "codeberg.org/saemscodes/CEKA"],
    ]),
    spacer(),
    numbered("If GitHub receives a takedown notice: the code remains live on GitLab and Codeberg."),
    numbered("Update Vercel to deploy from GitLab instead: Vercel Dashboard > Project Settings > Git > change repository source."),
    numbered("Document the takedown notice — save the full text. This is a legal document and may be challengeable."),
    numbered("Engage the legal contact (Section 8) immediately if the takedown is government-originated."),
    numbered("Publish a public statement about the attempt to suppress civic tech infrastructure (see Section 6C)."),
    spacer(),
    h2("5D — Supabase Database Is Down or Read-Only"),
    body("Supabase Pro renews June 28. A lapsed payment during a campaign window puts the database in read-only mode."),
    numbered("Check Supabase billing: supabase.com/dashboard/org > Billing — confirm payment processed."),
    numbered("If payment failed: update the card and manually trigger payment."),
    numbered("If Supabase itself is having an outage: check status.supabase.com — this is not within our control."),
    numbered("If in read-only mode: the site will still display data but forms, submissions, and signups will not work. Post on social media that submissions are temporarily paused."),
    numbered("Activate the MaintenanceBanner in the CEKA admin settings if available."),
    spacer(),
    pageBreak()
);

// ============================================================
// SECTION 6 — COMMUNICATIONS UNDER CRISIS
// ============================================================
children.push(
    h1("SECTION 6 — COMMUNICATIONS UNDER CRISIS"),
    spacer(),
    h2("6A — Who Speaks for CEKA"),
    body("CEKA speaks as an institution. No individual team member speaks as themselves in any public CEKA communication. This is both a safety measure and a brand consistency measure."),
    bullet("All public statements use we/us/our. Never I."),
    bullet("No team member's personal name, photo, or social media handle is associated with CEKA's public identity."),
    bullet("The Communications Member handles all public-facing content. In a crisis, they do not improvise — they use the templates in Section 6B and 6C."),
    bullet("If a journalist contacts CEKA directly asking for a spokesperson, the response is: 'Civic Education Kenya communicates through our official channels at civiceducationkenya.com and @[handle].' Full stop."),
    spacer(),
    h2("6B — Misinformation About CEKA Is Spreading"),
    body("Do not engage with every false claim. Engaging amplifies. The strategy is:"),
    numbered("Post one clear, calm, factual correction on our owned platform first (civiceducationkenya.com/pieces or Brevo email)."),
    numbered("Share that post across all social channels."),
    numbered("Do not link to the misinformation. Do not screenshot it into your correction. Describe it factually without giving it traffic."),
    numbered("If the misinformation is coming from a verified or high-follower account, document it (screenshot with timestamp) and assess whether a formal report or legal response is warranted."),
    spacer(),
    alertBox("TEMPLATE — MISINFORMATION RESPONSE", "We have seen false claims circulating about [brief description without linking to the source]. Our position is clear and documented: [factual statement]. All our work is open-source and publicly accessible at civiceducationkenya.com. We do not engage with bad-faith misrepresentations of our civic mission — we continue our work.", LIGHT_GRAY, DARK_GRAY),
    spacer(),
    h2("6C — We Have Received a Legal Threat or Government Notice"),
    numbered("Do not respond publicly until the legal contact has reviewed the notice."),
    numbered("Do not delete any content in response to a threat before legal review — deletion can be construed as admission."),
    numbered("Forward the notice immediately to the legal contact (details in Section 8)."),
    numbered("Document the notice: who sent it, when it was received, through what channel."),
    numbered("If the threat is to shut down or block civiceducationkenya.com: the site has three codebase mirrors and a Cloudflare failover. It cannot be taken down by targeting a single platform."),
    numbered("If the situation escalates to public attention: consider a factual public statement about the attempt to suppress civic information. Frame it around the public interest — what civic data would be lost if CEKA were silenced."),
    spacer(),
    alertBox("TEMPLATE — RESPONSE TO LEGAL THREAT (AFTER LEGAL REVIEW)", "Civic Education Kenya has received a legal notice regarding [description]. We are cooperating with the process of legal review. Our mission is to ensure every Kenyan has access to accurate, transparent information about their government. We stand behind the accuracy of our published work and will continue to serve the public interest within the law.", LIGHT_AMBER, RED),
    spacer(),
    h2("6D — Dead Man's Switch Content"),
    body("Scheduled content that continues publishing even if the Platform Lead is offline. This prevents CEKA's channels from going suddenly silent in a way that signals something is wrong."),
    body("The Communications Member should always have a minimum of 7 days of scheduled content queued on the Civic Calendar (civiceducationkenya.com/calendar). In the 2 weeks before June 25, this buffer must be extended to 14 days."),
    body("Content scheduled in advance does not require Platform Lead approval once the editorial direction is agreed. The Communications Member has standing authority to publish from the pre-approved queue."),
    spacer(),
    pageBreak()
);

// ============================================================
// SECTION 7 — IF THE PLATFORM LEAD IS UNREACHABLE
// ============================================================
children.push(
    h1("SECTION 7 — IF THE PLATFORM LEAD IS UNREACHABLE"),
    alertBox("THIS SECTION IS FOR THE CONTINUITY LEAD (DK)", "If you are reading this section, the Platform Lead has been unreachable for more than 24 hours, or has activated the going-dark protocol (Section 3C), or there is reason to believe they are in danger. You are now responsible for keeping CEKA operational. Follow these steps in order.", LIGHT_RED, RED),
    spacer(),
    h2("7.1 — The First Hour"),
    numbered("Attempt contact via Signal first. Use the pre-agreed check-in message from Section 3C."),
    numbered("If no response after 30 minutes, attempt contact via one other trusted private channel that does not expose either party."),
    numbered("Do not post anything publicly about the Platform Lead's status. Do not tell followers the Platform Lead is missing. Maintain institutional voice."),
    numbered("Notify the other inner team members via Signal that you are activating the continuity protocol."),
    numbered("Do not contact law enforcement, media, or external parties in the first hour. Assess first."),
    spacer(),
    h2("7.2 — The First 24 Hours"),
    numbered("Keep CEKA's channels active. Use the pre-scheduled content queue (Section 6D). Do not let channels go silent."),
    numbered("Do not make any irreversible infrastructure changes — no domain transfers, no account deletions, no public statements about leadership."),
    numbered("Access Instagram using your secondary admin credentials to maintain content scheduling."),
    numbered("Contact the legal contact (Section 8) — inform them of the situation. They need to know."),
    numbered("Document everything: when you last had contact, what you know, what steps you have taken. This documentation matters legally."),
    spacer(),
    h2("7.3 — Beyond 24 Hours"),
    body("If the Platform Lead remains unreachable beyond 24 hours and there is reason to believe this is a result of detention or targeting:"),
    numbered("Engage the legal contact formally for advice on the next steps."),
    numbered("Contact Access Now Digital Security Helpline (Section 8) — they have experience supporting organisations in exactly this situation."),
    numbered("Consider whether to make a public statement about the situation. This is a decision that requires legal and strategic input — do not make it alone. The general principle: publicising a detention or disappearance can provide protection (harder to act covertly once it is public) but can also escalate. The legal contact and external allies should advise."),
    numbered("Brief the most trusted external journalist contact (to be added to Section 8 by the Platform Lead) — not for immediate publication, but so there is a record with an independent, credible witness."),
    numbered("Continue CEKA's mission. The platform stays live. Content continues. The civic work does not stop."),
    spacer(),
    alertBox("THE INSTITUTIONAL PRINCIPLE IN PRACTICE", "If the Platform Lead is gone, CEKA is not gone. The platform is distributed across three code repositories, two Supabase projects, Cloudflare, and Vercel. The content is backed up. The subscribers are in Brevo. The followers are on multiple platforms. The work continues because the institution is bigger than any one person. That was always the design.", LIGHT_GREEN, GREEN),
    spacer(),
    h2("7.4 — What NOT to Do"),
    bullet("Do not transfer, sell, or give away any CEKA platform credentials or accounts to anyone outside the inner team."),
    bullet("Do not make public statements claiming to represent the Platform Lead personally."),
    bullet("Do not agree to any government requests regarding CEKA without legal review."),
    bullet("Do not shut down the platform or take content offline without legal guidance."),
    bullet("Do not engage with hostile actors who may be trying to use the situation to gain information or access."),
    spacer(),
    pageBreak()
);

// ============================================================
// SECTION 8 — EXTERNAL RESOURCES & CONTACTS
// ============================================================
children.push(
    h1("SECTION 8 — EXTERNAL RESOURCES & CONTACTS"),
    h2("8.1 Emergency Digital Security Support"),
    spacer(),
    twoColTable([
        ["Access Now Digital Security Helpline", "accessnow.org/help — Free, confidential, 24/7 digital security support for civil society. Available in multiple languages. They have responded to situations exactly like ours. Use this first."],
        ["Front Line Defenders", "frontlinedefenders.org — Emergency support for human rights defenders at physical risk. Grants, relocation support, security training."],
        ["Digital Defenders Partnership", "digitaldefenders.org — Emergency funding and support for digital attacks on civil society."],
        ["Committee to Protect Journalists (CPJ)", "cpj.org/emergency-response — If CEKA is treated as press/journalism. Emergency response for journalist detention and digital attacks."],
        ["EFF Surveillance Self-Defence", "ssd.eff.org — Comprehensive guides on secure communication, device security, and threat modelling for activists."],
    ]),
    spacer(),
    h2("8.2 Legal Contacts"),
    alertBox("FILL IN BEFORE JUNE 25", "The Platform Lead must add the specific legal contact details here before the June 25 commemoration. This section is intentionally left with placeholders.", LIGHT_AMBER, RED),
    spacer(),
    twoColTable([
        ["Primary Legal Contact", "[Name] — [Phone on Signal] — [Email] — Specialisation: digital rights / media law"],
        ["Secondary Legal Contact", "[Name] — [Phone] — [Email]"],
        ["NGO Legal Aid Organisation", "[Organisation name] — [Contact] — Available for civic tech / free speech cases"],
    ]),
    spacer(),
    h2("8.3 Press & Amplification Contacts"),
    body("In the event CEKA faces suppression, having pre-established relationships with journalists who understand our work provides protection. A suppression attempt that is immediately known by credible journalists is harder to sustain covertly."),
    twoColTable([
        ["Primary Press Contact", "[Journalist name] — [Publication] — [Signal contact] — Pre-briefed on CEKA's work"],
        ["Secondary Press Contact", "[Journalist name] — [Publication] — [Contact]"],
        ["Nation Media Group / Andariya", "This publication has already covered CEKA/related work — this citation establishes our notability and can be referenced in any appeal or legal response."],
        ["International Press", "[To be added by Platform Lead — any international journalist or publication already familiar with Kenya civic tech]"],
    ]),
    spacer(),
    h2("8.4 Platform Support Contacts"),
    twoColTable([
        ["Meta / Instagram Support", "business.facebook.com/help — Use Meta Business Suite for faster response than consumer support"],
        ["Cloudflare Support", "dash.cloudflare.com — Use the support portal — Pro plan includes ticket support"],
        ["Supabase Support", "supabase.com/dashboard — Support tab in dashboard"],
        ["GitHub Trust & Safety", "github.com/contact/report-content — For responding to DMCA or takedown notices"],
        ["GitLab Support", "gitlab.com/help — Mirror contact if GitHub is unavailable"],
        ["Vercel Support", "vercel.com/support"],
    ]),
    spacer(),
    h2("8.5 Kenya-Specific Resources"),
    twoColTable([
        ["Kenya National Commission on Human Rights (KNCHR)", "knchr.org — Constitutional body for human rights violations including unlawful detention"],
        ["Kenya ICT Action Network (KICTANet)", "kictanet.or.ke — Civil society network for digital rights in Kenya"],
        ["Article 19 Eastern Africa", "article19.org — Freedom of expression organisation with Kenya presence"],
        ["Katiba Institute", "katibainstitute.org — Constitutional law organisation, relevant for civic space protection"],
    ]),
    spacer(),
    pageBreak()
);

// ============================================================
// APPENDIX
// ============================================================
children.push(
    sectionDivider("APPENDIX"),
    spacer(),
    h2("Appendix A — 2FA Setup on All Critical Platforms"),
    body("Two-factor authentication (2FA) must be enabled on every platform listed in Section 2.2. Use an authenticator app (Google Authenticator or Authy) — never SMS. SMS 2FA can be intercepted via SIM swap attacks."),
    bullet("Cloudflare: Account > My Profile > Authentication > Two-Factor Authentication"),
    bullet("GitHub: Settings > Password and authentication > Two-factor authentication"),
    bullet("Supabase: Account settings > Security"),
    bullet("Vercel: Account settings > Security > Two-Factor Authentication"),
    bullet("Instagram/Facebook: Settings > Security > Two-Factor Authentication"),
    bullet("Google (for Gmail/Play Console): myaccount.google.com > Security > 2-Step Verification"),
    spacer(),
    h2("Appendix B — Recommended Security Tools"),
    spacer(),
    new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2400, 2400, 4560],
        rows: [
            new TableRow({
                children: [
                    new TableCell({ borders, width: { size: 2400, type: WidthType.DXA }, shading: { fill: GREEN, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: "TOOL", bold: true, size: 20, color: "FFFFFF", font: "Arial" })] })] }),
                    new TableCell({ borders, width: { size: 2400, type: WidthType.DXA }, shading: { fill: GREEN, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: "PURPOSE", bold: true, size: 20, color: "FFFFFF", font: "Arial" })] })] }),
                    new TableCell({ borders, width: { size: 4560, type: WidthType.DXA }, shading: { fill: GREEN, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: "NOTES", bold: true, size: 20, color: "FFFFFF", font: "Arial" })] })] }),
                ]
            }),
            ...([
                ["Signal", "Encrypted messaging", "Primary team communication. Free. Available on Android/iOS/Desktop."],
                ["ProtonVPN", "VPN / location protection", "Free tier available. Swiss jurisdiction. No logs policy. Download: protonvpn.com"],
                ["Mullvad VPN", "VPN / location protection", "No account needed. Anonymous. Pay by cash if needed. mullvad.net"],
                ["1.1.1.1 (Cloudflare)", "Private DNS", "Prevents ISP from seeing your browsing. Free. Set as DNS on all devices."],
                ["Tor Browser", "Anonymous browsing", "Use when maximum anonymity is needed. Slower but most secure. torproject.org"],
                ["Faraday Bag (commercial)", "Device signal blocking", "Available on Jumia Kenya. Blocks all cellular, WiFi, Bluetooth, GPS signals."],
                ["Authy / Google Authenticator", "2FA codes", "Use for all platform 2FA. Do not use SMS 2FA."],
                ["Bitwarden", "Password manager", "Open source, end-to-end encrypted. Free tier. Store all credentials here in addition to the USB."],
                ["Have I Been Pwned", "Breach monitoring", "haveibeenpwned.com — Check if any team email has been in a data breach."],
                ["Archive.org Wayback Machine", "Content archival", "web.archive.org — Archive all CEKA civic content and the Andariya citation permanently."],
            ]).map(([tool, purpose, notes]) => new TableRow({
                children: [
                    new TableCell({ borders, width: { size: 2400, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: tool, bold: true, size: 20, font: "Arial", color: DARK_GRAY })] })] }),
                    new TableCell({ borders, width: { size: 2400, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: purpose, size: 20, font: "Arial", color: DARK_GRAY })] })] }),
                    new TableCell({ borders, width: { size: 4560, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: notes, size: 20, font: "Arial", color: DARK_GRAY })] })] }),
                ]
            }))
        ]
    }),
    spacer(),
    h2("Appendix C — Pre-Crisis Checklist (Complete Before June 25)"),
    body("Every item below must be confirmed before June 25, 2026. Assign each to a team member and mark as done."),
    spacer(),
    new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [600, 6360, 1200, 1200],
        rows: [
            new TableRow({
                children: [
                    new TableCell({ borders, width: { size: 600, type: WidthType.DXA }, shading: { fill: GREEN, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: "#", bold: true, size: 20, color: "FFFFFF", font: "Arial" })] })] }),
                    new TableCell({ borders, width: { size: 6360, type: WidthType.DXA }, shading: { fill: GREEN, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: "TASK", bold: true, size: 20, color: "FFFFFF", font: "Arial" })] })] }),
                    new TableCell({ borders, width: { size: 1200, type: WidthType.DXA }, shading: { fill: GREEN, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: "ASSIGNED", bold: true, size: 20, color: "FFFFFF", font: "Arial" })] })] }),
                    new TableCell({ borders, width: { size: 1200, type: WidthType.DXA }, shading: { fill: GREEN, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: "DONE", bold: true, size: 20, color: "FFFFFF", font: "Arial" })] })] }),
                ]
            }),
            ...([
                ["Instagram data export downloaded and stored", "Platform Lead", "☐"],
                ["GitLab mirror configured and tested (3-remote push)", "Platform Lead", "✓"],
                ["Codeberg mirror configured and SSH key registered", "Platform Lead", "✓"],
                ["Cloudflare Bot Fight Mode confirmed ON", "Platform Lead", "✓"],
                ["Cloudflare Under Attack Mode location bookmarked", "Platform Lead", "✓"],
                ["Cloudflare Hotlink Protection enabled", "Platform Lead", "☐"],
                ["Cloudflare Email Obfuscation enabled", "Platform Lead", "☐"],
                ["Supabase backup verified and test restore completed", "Platform Lead", "☐"],
                ["Supabase payment card confirmed valid for June 28", "Platform Lead", "☐"],
                ["Supabase RLS audit completed on sensitive tables", "Platform Lead", "☐"],
                ["Secondary Meta Business Suite admin added", "Platform Lead", "☐"],
                ["Meta Verified 1-month trial activated", "Platform Lead", "☐"],
                ["All critical platform 2FA confirmed as authenticator app (not SMS)", "Platform Lead", "☐"],
                ["Encrypted USB created with all credentials and tested", "Platform Lead", "☐"],
                ["DK has physical USB location confirmed", "Platform Lead + DK", "☐"],
                ["Safe words agreed and memorised by all team members", "All team", "☐"],
                ["Legal contact briefed on June 25 risk window", "Platform Lead", "☐"],
                ["Press contact briefed on CEKA's work and risk window", "Platform Lead", "☐"],
                ["14 days of content scheduled in Civic Calendar", "Communications", "☐"],
                ["Andariya/Nation Media article archived on Wayback Machine", "Platform Lead", "☐"],
                ["This manual printed and stored securely by DK", "DK", "☐"],
                ["This manual distributed to all inner team members", "Platform Lead", "☐"],
            ]).map(([task, assigned, done], i) => new TableRow({
                children: [
                    new TableCell({ borders, width: { size: 600, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: String(i + 1), size: 20, font: "Arial", color: DARK_GRAY })] })] }),
                    new TableCell({ borders, width: { size: 6360, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: task, size: 20, font: "Arial", color: DARK_GRAY })] })] }),
                    new TableCell({ borders, width: { size: 1200, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: assigned, size: 18, font: "Arial", color: MID_GRAY })] })] }),
                    new TableCell({ borders, width: { size: 1200, type: WidthType.DXA }, shading: { fill: done === "✓" ? LIGHT_GREEN : "FFFFFF", type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: done, bold: true, size: 22, font: "Arial", color: done === "✓" ? GREEN : RED })] })] }),
                ]
            }))
        ]
    }),
    spacer(),
    spacer(),
    new Paragraph({
        alignment: AlignmentType.CENTER,
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: GREEN, space: 8 } },
        children: [new TextRun({ text: "Civic Education Kenya — civiceducationkenya.com — Built in the open, for every Kenyan.", size: 18, color: MID_GRAY, font: "Arial", italics: true })],
        spacing: { before: 240, after: 0 }
    })
);

// Build document
const doc = new Document({
    numbering: {
        config: [
            {
                reference: "bullets",
                levels: [
                    { level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
                    { level: 1, format: LevelFormat.BULLET, text: "\u25E6", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1080, hanging: 360 } } } }
                ]
            },
            {
                reference: "numbers",
                levels: [
                    { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }
                ]
            }
        ]
    },
    styles: {
        default: { document: { run: { font: "Arial", size: 22 } } },
        paragraphStyles: [
            {
                id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
                run: { size: 36, bold: true, font: "Arial", color: GREEN },
                paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 }
            },
            {
                id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
                run: { size: 28, bold: true, font: "Arial", color: DARK_GRAY },
                paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 1 }
            },
            {
                id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
                run: { size: 24, bold: true, font: "Arial", color: RED },
                paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 2 }
            },
        ]
    },
    sections: [{
        properties: {
            page: {
                size: { width: 12240, height: 15840 },
                margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
            }
        },
        children
    }]
});

Packer.toBuffer(doc).then(buffer => {
    fs.writeFileSync('D:\\CEKA\\ceka v010\\CEKA\\CEKA_Crisis_Continuity_Manual.docx', buffer);
    console.log('Done');
});