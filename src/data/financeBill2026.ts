export interface FinanceBillClause {
  id: string;
  clauseId: string;
  title: string;
  concern: string;
  position: string;
  category: 'DELETE' | 'AMEND' | 'ACCEPT';
}

export const FINANCE_BILL_2026_CLAUSES: FinanceBillClause[] = [
  {
    id: 'clause-29',
    clauseId: 'Clause 29',
    title: "Amendment of Section 42 of VAT Act (Definition of 'Person')",
    concern: "Replaces 'registered person' with 'person' across VAT Act invoicing obligations, broadening compliance requirements to the informal sector. Small traders, kiosks, and mama mbogas would face the same invoicing burden as formal businesses, with no exemption threshold.",
    position: "I call for this clause to be deleted in its entirety.",
    category: 'DELETE'
  },
  {
    id: 'clauses-31-32',
    clauseId: 'Clauses 31 & 32',
    title: "VAT Schedule Amendments: Removal of Exemptions and Zero-Rating",
    concern: "Deletes VAT exemptions on aircraft parts, tourism facility construction goods, affordable housing construction goods, and denatured ethanol. Also removes zero-rating on pharmaceutical inputs, animal feed inputs, sugarcane transport, locally assembled phones, motorcycles, electric bicycles, solar/lithium batteries, electric buses, and bioethanol stoves. Prices of these goods will rise as VAT costs are embedded in consumer prices.",
    position: "I call for this clause to be deleted in its entirety.",
    category: 'DELETE'
  },
  {
    id: 'clause-31-b',
    clauseId: 'Clause 31(b)(i)',
    title: "VAT Exemption Removed for Digital Financial Services",
    concern: "Removes the VAT exemption for money transfers, payment processing, settlement, merchant acquiring, gateway, and aggregation services supplied over a software platform for a fee or commission. Digital financial transaction costs will rise directly, hitting mobile money users hardest.",
    position: "I call for this clause to be deleted in its entirety.",
    category: 'DELETE'
  },
  {
    id: 'clauses-34-36',
    clauseId: 'Clauses 34, 35 & 36',
    title: "Excise Duty on Mobile Phones: Raised to 25%",
    concern: "Raises excise duty on all telephones for cellular networks from 10% to 25%, removes the prior 'imported' limitation so locally assembled phones are also covered, and shifts duty liability from importation to activation. Smartphones will cost significantly more, locking lower-income Kenyans out of digital access.",
    position: "I call for this clause to be deleted in its entirety.",
    category: 'DELETE'
  },
  {
    id: 'clause-41',
    clauseId: 'Clause 41',
    title: "New Section 18A: Automatic Exchange of Virtual Asset Data",
    concern: "Introduces automatic international exchange of transaction data for virtual asset service providers without adequate safeguards for data protection, independent oversight, or Data Protection Commissioner involvement. Risks mass surveillance and violations of Article 31 (Privacy).",
    position: "I call for this clause to be deleted in its entirety.",
    category: 'DELETE'
  },
  {
    id: 'clause-42',
    clauseId: 'Clause 42',
    title: "New Section 29A: Broad KRA Commissioner Discretion",
    concern: "Grants the KRA Commissioner overly broad discretion in tax assessments and penalties, bypassing fair process. Imposes fines of KES 100,000 and a 3-year jail term for false statements, punitive even for minor errors. Violates Articles 47 and 50.",
    position: "I call for this clause to be deleted in its entirety.",
    category: 'DELETE'
  },
  {
    id: 'clause-45',
    clauseId: 'Clause 45',
    title: "Deletion of Section 42(14)(e): Removal of Appeal Protection",
    concern: "Removes original provision that bars KRA from issuing an agency notice (freezing funds) once a taxpayer has formally appealed. KRA can freeze business funds while appeals are active, causing liquidity crises and forcing payment before cases are heard.",
    position: "I call for this clause to be deleted in its entirety.",
    category: 'DELETE'
  },
  {
    id: 'clause-17-a',
    clauseId: 'Clause 17(a)(i)',
    title: "Deletion of Kenya Airways WHT Exemption",
    concern: "Removes withholding tax exemption for specialised technical, maintenance, compliance, and training support services paid by Kenya Airways to non-resident providers. Raises operational costs for the national carrier, passed to passengers and taxpayers.",
    position: "I call for this clause to be deleted in its entirety.",
    category: 'DELETE'
  },
  {
    id: 'clause-5',
    clauseId: 'Clause 5',
    title: "Deletion of Section 8(5A): Pre-1991 Pension Lump-Sum Rules",
    concern: "Deletes special tax treatment for accumulated pension funds contributed prior to 1991. Workers who held savings before 1991 lose favourable treatment, retrospectively worsening their retirement position.",
    position: "I call for this clause to be deleted in its entirety.",
    category: 'DELETE'
  },
  {
    id: 'clauses-18-19',
    clauseId: 'Clauses 18 & 19',
    title: "Sections 52 & 52B: Shortened Filing Deadlines",
    concern: "Moves income tax return deadlines from June 30 to April 30. Nil returns must be filed by January 31. Taxpayers have less time for audits and reviews, exposing them to rush errors and late filing penalties. Violates Article 47 on Fair Administrative Action.",
    position: "I call for this clause to be deleted in its entirety.",
    category: 'DELETE'
  },
  {
    id: 'eco-levy',
    clauseId: 'First Schedule, Part VII',
    title: "Introduction of Eco-Levy on Office Equipment and Electronics",
    concern: "Imposes a levy on locally manufactured and imported finished office equipment (printers, photocopiers), data processing machines (servers, storage), and plastic packaging. Will significantly increase cost of digital equipment and essential goods using plastic packaging, contrary to 'National Digital Master Plan' and 'Green Economy Strategy'.",
    position: "I call for this clause to be deleted in its entirety.",
    category: 'DELETE'
  },
  {
    id: 'motor-vehicle-tax',
    clauseId: 'Clause 6',
    title: "Introduction of 2.5% Motor Vehicle Tax",
    concern: "Imposes an annual tax at 2.5% of the vehicle value (subject to a floor of KES 5,000 and cap of KES 100,000) collected during motor vehicle insurance cover issuance. Double taxation for car owners, effectively a wealth tax on a depreciating asset, raising transport and logistics costs.",
    position: "I call for this clause to be deleted in its entirety.",
    category: 'DELETE'
  },
  {
    id: 'clause-5-inf-bond',
    clauseId: 'Clause 5(b)',
    title: "Taxation of Infrastructure Bond Interest",
    concern: "Removes original tax exemption on interest income from infrastructure bonds. Discourages investment in critical national infrastructure projects and increases the cost of public debt as investors demand higher yields to compensate for tax.",
    position: "I call for this clause to be deleted in its entirety.",
    category: 'DELETE'
  },
  {
    id: 'reit-dev-deletion',
    clauseId: 'Clause 7',
    title: "Deletion of REIT Conversion Benefits",
    concern: "Removes special corporate tax rate for entities converting into REITS (Real Estate Investment Trusts). Disincentivizes formalization of the real estate sector and undermines the Affordable Housing agenda by making REITs less attractive for developers.",
    position: "I call for this clause to be deleted in its entirety.",
    category: 'DELETE'
  },
  {
    id: 'export-levy',
    clauseId: 'Clause 40',
    title: "Expansion of Export Levy on Critical Materials",
    concern: "Introduces export levies on additional raw and semi-processed materials (leather, scrap metal). While intended to encourage local value addition, the lack of local processing capacity means farmers and collectors lose their international markets without a viable local alternative, leading to income loss in rural sectors.",
    position: "I call for this clause to be deleted in its entirety until industrial capacity is guaranteed.",
    category: 'DELETE'
  },
  {
    id: 'kra-data-privacy',
    clauseId: 'New Section 18B',
    title: "Broad KRA Access to Personal Data sans Warrant",
    concern: "Allows KRA to access personal financial data, mobile money records, and digital assets directly from providers without a court warrant or oversight from the Data Protection Commissioner. Glaring violation of Article 31 (Right to Privacy) and risks misuse of sensitive citizen information.",
    position: "I call for this clause to be deleted in its entirety in defense of Article 31.",
    category: 'DELETE'
  }
];
