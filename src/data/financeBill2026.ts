export interface FinanceBillClause {
  id: string;
  clauseId: string;
  title: string;
  concern: string;
  position: string;
  category: 'DELETE' | 'AMEND' | 'ACCEPT';
}

export const FINANCE_BILL_2026_CLAUSES: FinanceBillClause[] = [
  // --- HIGH IMPACT DELETIONS (TAX HIKES & COST OF LIVING) ---
  {
    id: 'clause-37-phones',
    clauseId: 'Clause 36',
    title: '25% Tax on All Mobile Phones',
    concern: "This bill raises the tax on mobile phones from 10% to 25%. This will make smartphones significantly more expensive for every Kenyan, making it harder for students, small traders, and rural families to access the internet and digital services (First Schedule Excise).",
    position: "I demand that the tax be kept at 10% to keep communication affordable.",
    category: 'DELETE'
  },
  {
    id: 'clause-34-phone-activation',
    clauseId: 'Clause 34',
    title: 'Excise Duty at Point of Mobile Activation',
    concern: "Requires excise duty on mobile phones to be paid at the time of activation, not just at import. This creates a second taxable event that could trigger new charges for gifted or second-hand phones already in the country (Section 6(4A)).",
    position: "I demand the deletion of Section 6(4A) to prevent unfair taxation at the point of hardware activation.",
    category: 'DELETE'
  },
  {
    id: 'clause-mitumba-clothes',
    clauseId: 'Customs 6309',
    title: '5% New Tax on Second-hand Clothes (Mitumba)',
    concern: "A new 5% tax is being added to imported second-hand clothes. This hits the poorest Kenyans hardest who depend on mitumba for affordable clothing and threatens the survival of millions of small traders.",
    position: "I call for the total removal of this tax on essential clothing.",
    category: 'DELETE'
  },
  {
    id: 'clause-mitumba-shoes',
    clauseId: 'Customs footwear',
    title: '5% New Tax on Second-hand Shoes',
    concern: "Similar to clothing, a 5% tax is being added to second-hand shoes, increasing the cost of basic footwear for Kenyan families.",
    position: "I demand this clause be deleted entirely.",
    category: 'DELETE'
  },
  {
    id: 'clause-bread-tax',
    clauseId: 'Clause 31',
    title: 'Adding 16% Tax to Bread',
    concern: "Moving bread from Tax-Free (Zero-rated) to 16% VAT is a direct attack on our breakfast table. In a cost-of-living crisis, families cannot afford to pay more for a basic staple food (First Schedule VAT).",
    position: "I call for bread to remain Tax-Free (Zero-rated).",
    category: 'DELETE'
  },
  {
    id: 'clause-medicine-costs',
    clauseId: 'VAT Schedule 1',
    title: 'Higher Prices for Life-Saving Medicine',
    concern: "The bill removes tax-free status for inputs used to make medicines in Kenya. This will lead to an immediate increase in the price of medicine, hurting the sick and the elderly.",
    position: "I demand that medical manufacturing supplies stay Tax-Free (Zero-rated).",
    category: 'DELETE'
  },
  {
    id: 'clause-animal-feed',
    clauseId: 'VAT Schedule 1b',
    title: 'Increasing the Price of Milk and Eggs (Animal Feed)',
    concern: "By removing the tax-free status of animal feed inputs, the cost of farming will go up. Farmers will be forced to raise the price of milk, eggs, and meat for all Kenyans.",
    position: "I call for animal feeds inputs to remain Tax-Free to ensure food security.",
    category: 'DELETE'
  },
  {
    id: 'clause-motor-vehicle-2.5',
    clauseId: 'Clause 12',
    title: '2.5% Annual Tax on Every Vehicle',
    concern: "Amends Section 18D of the ITA to introduce a motor vehicle tax. This acts as a wealth tax on a depreciating asset and will lead to higher matatu fares and transport costs for food and materials.",
    position: "I call for the total removal of this yearly car tax.",
    category: 'DELETE'
  },
  {
    id: 'clause-solar-tax',
    clauseId: 'VAT Schedule 1c',
    title: 'New Tax on Solar and Lithium Batteries',
    concern: "Moving solar products from Tax-Free to Taxable will stall Kenya's green energy transition and make clean lighting more expensive for rural homes.",
    position: "I call for solar products to remain Tax-Free for at least 5 more years.",
    category: 'DELETE'
  },
  {
    id: 'clause-ebus-bikes',
    clauseId: 'VAT Schedule 1d',
    title: 'Taxing Electric Motorcycles and Buses',
    concern: "Introducing tax on electric transport will stop the move toward cheaper, cleaner matatus and bodabodas, keeping transport costs high.",
    position: "I demand that e-mobility remains Zero-rated to protect our environment and lower fares.",
    category: 'DELETE'
  },

  // --- LEGAL & CIVIL RIGHTS THREATS ---
  {
    id: 'clause-29a-proactive-assessment',
    clauseId: 'Section 29A',
    title: 'KRA Proactive Assessment Powers',
    concern: "Grants the Commissioner power to issue tax assessments based on 'proactively obtained' information even before a taxpayer has filed or defaulted. This allows for offensive harassment of citizens and businesses without due process.",
    position: "I call for the total deletion of Section 29A to protect the right to self-assessment and due process.",
    category: 'DELETE'
  },
  {
    id: 'clause-77-weekends',
    clauseId: 'Clause 49',
    title: 'Stealing Time from Legal Justice (Weekends)',
    concern: "This bill counts Saturdays and Sundays in the challenge window by deleting subsection (2) of TPA Section 77. This effectively steals 8-10 days from citizens, making it almost impossible to prepare a proper legal defense against KRA.",
    position: "I demand that tax deadlines continue to count only 'Working Days'.",
    category: 'DELETE'
  },
  {
    id: 'clause-agency-notices',
    clauseId: 'S. 42(14)(e)',
    title: 'Freezing Bank Accounts during Court Cases',
    concern: "KRA power grab targeting funds even while a citizen is still appealing a case in court. This can kill a business before they have even had their day in court.",
    position: "I call for the total deletion of this proposal to protect fair legal process.",
    category: 'DELETE'
  },
  {
    id: 'clause-kra-privacy',
    clauseId: 'TPA Section',
    title: 'KRA Access to Data without Court Orders',
    concern: "Allowing tax officers to look through our private M-Pesa and bank data without a judge's warrant is a direct violation of our constitutional right to privacy.",
    position: "I demand that any data access must require a High Court warrant.",
    category: 'DELETE'
  },
  {
    id: 'clause-small-trader-invoice',
    clauseId: 'VAT S.42',
    title: 'Forcing Small Traders into Complex Invoicing',
    concern: "Amends VAT Act Section 42 to replace 'registered person' with 'person', requiring every individual to issue a tax invoice regardless of status. This adds huge technical burdens on mama mbogas.",
    position: "I call for small traders to be exempt from formal invoicing requirements.",
    category: 'DELETE'
  },

  // --- ECONOMIC & SECTOR IMPACTS ---
  {
    id: 'clause-rental-tax-10',
    clauseId: '3rd Schedule',
    title: 'Raising Rent Tax to 10%',
    concern: "Increasing the residential rental tax from 7.5% to 10% will force landlords to raise monthly rent. This hits urban youths and families already struggling with high bills.",
    position: "I call for the rate to stay at 7.5% to avoid countrywide rent hikes.",
    category: 'AMEND'
  },
  {
    id: 'clause-digital-sep',
    clauseId: 'Clause 4',
    title: 'Non-Resident Rental Income Tax',
    concern: "Inserts Section 6B to the ITA, taxing income derived from the use or occupation of property in Kenya by non-residents. This creates a new complex layer of rental taxation targeting cross-border property usage.",
    position: "I demand the deletion of Clause 4 to maintain a clear rental tax framework.",
    category: 'DELETE'
  },
  {
    id: 'clause-interchange-bank',
    clauseId: 'Clause 2(b)',
    title: 'Taxing Interchange and Merchant Fees',
    concern: "Inserts interchange and merchant service fees into the definition of 'management fee' under ITA Section 2, making card payment fees significantly more expensive for consumers.",
    position: "I call for this to be deleted to support our digital economy.",
    category: 'DELETE'
  },
  {
    id: 'clause-deemed-60',
    clauseId: 'S. 24(1)',
    title: 'Forcing Businesses to Pay 60% of Earnings',
    concern: "Amends Section 24 of the ITA (Clause 16). Forces companies to pay out 60% of profits instead of letting them reinvest to build more factories or hire more Kenyans.",
    position: "I call for businesses to have the freedom to reinvest their own earnings.",
    category: 'AMEND'
  },
  {
    id: 'clause-vintage-50',
    clauseId: 'EDA Antique',
    title: '50% Tax on Antique/Collector Cars',
    concern: "A massive 50% tax on heritage vehicles. This targets a small niche but the rate is excessively high and discourages the preservation of history.",
    position: "I call for a more reasonable 20% rate for vintage vehicles.",
    category: 'AMEND'
  },
  {
    id: 'clause-local-plastic-eda',
    clauseId: 'EDA Plastic',
    title: 'Tax on Locally Made Plastic Packaging',
    concern: "Taxing local plastic (Tariff 3923.30.00) will make milk, bread bags, and cleaning soap more expensive for every consumer. It also hurts our local factories.",
    position: "I call for no new taxes on locally produced packaging materials.",
    category: 'DELETE'
  },
  {
    id: 'clause-sugar-local-eda',
    clauseId: 'Tariff 17.04',
    title: 'Higher Price for Local Sweets and Biscuits',
    concern: "Introducing an excise tax on imported sugar confectionary under Clause 36. This increases the cost of common household items.",
    position: "I call for this tax to be dropped.",
    category: 'DELETE'
  },
  {
    id: 'clause-coal-eda',
    clauseId: 'EDA Coal',
    title: 'New 5% Tax on Coal Energy',
    concern: "Under Clause 36, taxing coal increases the cost of energy for local factories, which will then raise the prices of the goods they sell to us.",
    position: "I call for the removal of this energy tax.",
    category: 'DELETE'
  },
  {
    id: 'clause-pharma-raw',
    clauseId: 'Feeds/Pharma',
    title: 'Taxing Raw Materials for Life-Saving Drugs',
    concern: "Increases the manufacturing cost of drugs in Kenya by removing tax-free status on raw materials. Hits hospitals and patients directly.",
    position: "I demand these materials stay in the Zero-rated category.",
    category: 'DELETE'
  },
  {
    id: 'clause-sugarcane-trans',
    clauseId: 'VAT Sugar',
    title: 'Taxing Sugarcane Transport',
    concern: "Removing zero-rated status for sugarcane transport in the First Schedule will reduce the earnings of our farmers and increase the price of sugar.",
    position: "I call for sugarcane transport to remain Tax-Free.",
    category: 'DELETE'
  },

  // --- SECTOR-SPECIFIC & SECONDARY MARKET IMPACTS ---
  {
    id: 'clause-aviation-narrow',
    clauseId: 'Chapter 88',
    title: 'Taxing Small and Commercial Aircraft',
    concern: "Narrowing tax exemptions for aircraft under Clauses 54/55 will increase costs for air cargo, making Kenya a more expensive hub.",
    position: "I demand that aircraft and spare parts remain Tax-Free.",
    category: 'DELETE'
  },
  {
    id: 'clause-national-carrier',
    clauseId: 'KQ Tech',
    title: 'New Tax on Aircraft Maintenance Services',
    concern: "Removes tax exemptions for technical services for our national carrier. This will increase operational costs and airline ticket prices.",
    position: "I call for this exemption to be maintained to keep our skies competitive.",
    category: 'DELETE'
  },
  {
    id: 'clause-gratuity-3',
    clauseId: 'Gratuity',
    title: 'Limiting Tax-Free Gratuity to 3-Year Contracts',
    concern: "Clause 3 amends Section 5 of the ITA to only allow tax-free gratuity for continuous service over 3 years. This punishes short-term workers and young professionals.",
    position: "I demand that gratuity remains tax-free for all employees regardless of contract length.",
    category: 'AMEND'
  },
  {
    id: 'clause-2-xiii-pension-retroactive',
    clauseId: 'Clause 2',
    title: 'Retrospective Tax on Pre-2010 Pension Savings',
    concern: "Deletes Section 53(1), exposing workers with pension savings predating 2010 to immediate retrospective tax consequences on their hard-earned life savings.",
    position: "I demand the retention of Section 53(1) to protect the vested rights of long-term workers.",
    category: 'DELETE'
  },
  {
    id: 'clause-pension-reclassification',
    clauseId: 'Pages 53/74',
    title: 'Taxation of Pension & Public Lump Sums',
    concern: "Reclassifies public pension scheme lump sums to align with commercial registered funds, effectively increasing the tax burden on retirees' payouts.",
    position: "I demand that public pension lump sums remain protected from new tax reclassifications.",
    category: 'DELETE'
  },
  {
    id: 'clause-vat-refund-3',
    clauseId: 'Clause 28',
    title: 'Delaying VAT Refunds for 3 Full Years',
    concern: "Amends Section 31 of the VAT Act to extend the refund window from 2 to 3 years. This starves businesses of working capital and slows the economy.",
    position: "I call for the refund window to be shortened to 1 year.",
    category: 'DELETE'
  },
  {
    id: 'clause-reit-property',
    clauseId: 'REIT Stamp',
    title: 'Easier Real Estate Investment (REITs)',
    concern: "Clause 56 Section 96A removes heavy taxes when moving property into investment trusts. This helps modernize our housing market.",
    position: "I support this move to formalize and grow the property market.",
    category: 'ACCEPT'
  },
  {
    id: 'clause-trust-single',
    clauseId: 'S. 11 Trust',
    title: 'Preventing Double Tax on Family Trusts',
    concern: "Clause 8 replaces Section 11 of the ITA to ensure beneficiaries are not taxed again after the trust pays income tax. This protects family savings.",
    position: "I support this measure for tax fairness.",
    category: 'ACCEPT'
  },
  {
    id: 'clause-cbk-home',
    clauseId: 'CBK Loans',
    title: 'Interest Relief for CBK Housing Loans',
    concern: "Provides tax relief for interest on specific employee loans. This is a good model that should be used for all Kenyans.",
    position: "I support this but urge that every Kenyan with a mortgage gets similar relief.",
    category: 'ACCEPT'
  },
  {
    id: 'clause-extractive-rate',
    clauseId: 'Mining 30%',
    title: 'Standardizing Tax for Foreign Mining Firms',
    concern: "Aligns the tax rate for foreign petroleum and mining firms with the standard 30% rate, ensuring they pay their fair share.",
    position: "I support this for tax equity.",
    category: 'ACCEPT'
  },
  {
    id: 'clause-amnesty-ext',
    clauseId: 'Clause 44',
    title: 'Extending Tax Amnesty until December 2026',
    concern: "Amends Section 39A of the TPA to give citizens more time to settle old tax debts without massive interest and penalties.",
    position: "I call on Parliament to approve this extension for all Kenyans.",
    category: 'ACCEPT'
  },
  {
    id: 'clause-immovable-def',
    clauseId: 'S. 2 ITA',
    title: 'Fixing the Definition of Immovable Property',
    concern: "Clause 2(a). Corrects the law to ensure land and mining rights are treated fairly. A necessary legal clean-up.",
    position: "I support this clean-up.",
    category: 'ACCEPT'
  },
  {
    id: 'clause-offshore-cgt',
    clauseId: 'Catch-all',
    title: 'Widening Offshore Tax on Global Share Sales',
    concern: "Clause 2(d) attempts to tax share sales that happen outside Kenya if there is any 'nexus' to Kenya. Overly broad and will drive away foreign investors.",
    position: "I demand a minimum 20% value threshold to avoid nuisance taxes.",
    category: 'AMEND'
  },
  {
    id: 'clause-vasp-framework',
    clauseId: 'Clauses 37-41',
    title: 'Mandatory VASP Data Reporting & 1M Penalties',
    concern: "Amends the TPA to force crypto providers to file mandatory information returns on all users. Violates financial privacy and criminalizes digital innovation.",
    position: "I call for the removal of the mandatory reporting framework and the reduction of the penalty to KES 50,000.",
    category: 'AMEND'
  },
  {
    id: 'clause-interchange-Fees',
    clauseId: 'Clause 2(b) + 7',
    title: 'Taxing the Hidden Fees in Card Payments',
    concern: "Combines the 'management fee' redefinition with Section 10 withholding (Clause 7) to tax bank interchange fees. Businesses will pass this cost to shoppers.",
    position: "I call for the total deletion of this hidden tax.",
    category: 'DELETE'
  },
  {
    id: 'issue-winnings-reintro',
    clauseId: 'Betting',
    title: 'Reintroducing 20% Tax on Winnings',
    concern: "Brings back the 20% tax on betting payouts in the Excise First Schedule Part II which was removed only last year.",
    position: "I call for a stable and predictable tax rate for the sector.",
    category: 'AMEND'
  },
  {
    id: 'issue-scrap-metal',
    clauseId: 'Clause 7',
    title: 'New Withholding Tax on Scrap Metal Sale',
    concern: "Inserts scrap metal into the Section 10 ITA list (withholding tax). This will bankrupt many poor collectors who work on tiny margins.",
    position: "I demand this clause be deleted until a profit-only tax is possible.",
    category: 'DELETE'
  },
  {
    id: 'issue-electricity-meter',
    clauseId: 'Excise Meter',
    title: 'Potential Hidden Tax on Smart Meters',
    concern: "Broadening the definition of excisable telecommunications to include network-connected smart meters will raise electricity bills.",
    position: "I call for smart energy meters to remain Tax-Free.",
    category: 'DELETE'
  },
  {
    id: 'issue-software-royalty-2',
    clauseId: 'Clause 2(c)',
    title: 'Higher Cost for Business Software (Royalty)',
    concern: "Rewrites the royalty definition in ITA Section 2 to explicitly include off-the-shelf software, making accounting tools more expensive.",
    position: "I call for software to stay in its current non-royalty category.",
    category: 'DELETE'
  },
  {
    id: 'antique-car-tax-37',
    clauseId: 'Clause 33 & 36',
    title: '50% Luxury Tax on Antique & Classic Vehicles',
    concern: "Clause 33 defines antique vehicles and Clause 36 imposes a 50% rate. This will destroy the restoration sector and cultural heritage in Kenya.",
    position: "I demand the deletion of this punitive tax to protect the collectors' economy.",
    category: 'DELETE'
  },
  {
    id: 'filing-deadline-shift-v2',
    clauseId: 'Clause 18',
    title: 'Shortened Tax Filing Deadline (April instead of June)',
    concern: "Amends ITA Section 52 to move the deadline for annual tax returns from June 30th to April 30th. This creates unnecessary pressure on audit compliance.",
    position: "I urge Parliament to retain the June 30th deadline to allow for proper auditing.",
    category: 'DELETE'
  },
  {
    id: 'digital-finance-vat-28',
    clauseId: 'Clause 31',
    title: '16% Tax on Digital Bank & Mobile Money Transfers',
    concern: "Imposes 16% VAT on digital financial services and payment processing by amending the First and Second Schedules. Increases transaction costs for ordinary Kenyans.",
    position: "I formally oppose this tax on financial inclusion and demand its total deletion.",
    category: 'DELETE'
  },
  {
    id: 'clause-31-vat-exemption-finance',
    clauseId: 'Clause 31',
    title: 'Removal of VAT Exemption on Financial Services',
    concern: "Amends the VAT Second Schedule Part II to remove exemptions for money transfers and payment aggregation. This is the statutory foundation for taxing financial inclusion.",
    position: "I demand that financial services remain in the VAT-exempt list to protect financial inclusion.",
    category: 'DELETE'
  },
  {
    id: 'calendar-days-dispute-77',
    clauseId: 'Clause 49',
    title: 'Counting Weekends in Tax Dispute Timelines',
    concern: "Amends ITA Section 77 (Clause 49). Counts Saturdays and Sundays against the citizen's right to legal defense in tax objections.",
    position: "I demand that timelines remain as 'Working Days' to protect the right to fair administrative action.",
    category: 'DELETE'
  },
  {
    id: 'unconstitutional-assembly-violation',
    clauseId: 'Articles 27(8), 81(b), 3(2)',
    title: 'Unconstitutionality of National Assembly Composition',
    concern: "The National Assembly is in violation of the Two-Thirds Gender Rule. Any business conducted, including this Finance Bill, is unconstitutional under Article 3(2).",
    position: "I formally challenge the legality of the National Assembly to process this Bill and demand compliance with the Constitution.",
    category: 'DELETE'
  }
];
