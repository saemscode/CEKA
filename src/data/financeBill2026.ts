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
    clauseId: 'Clause 37',
    title: '25% Tax on All Mobile Phones',
    concern: "This bill raises the tax on mobile phones from 10% to 25%. This will make smartphones significantly more expensive for every Kenyan, making it harder for students, small traders, and rural families to access the internet and digital services.",
    position: "I demand that the tax be kept at 10% to keep communication affordable.",
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
    clauseId: 'Clause 28',
    title: 'Adding 16% Tax to Bread',
    concern: "Moving bread from Tax-Free (Zero-rated) to 16% VAT is a direct attack on our breakfast table. In a cost-of-living crisis, families cannot afford to pay more for a basic staple food.",
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
    concern: "This acts as a wealth tax on a depreciating asset. It will lead to higher matatu fares for passengers and higher transport costs for items moved by truck, including food and construction materials.",
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
    id: 'clause-77-weekends',
    clauseId: 'Clause 77',
    title: 'Stealing Time from Legal Justice (Weekends)',
    concern: "This bill counts Saturdays and Sundays in the 30-day window to challenge tax errors. This effectively steals 8-10 days from citizens, making it almost impossible to prepare a proper legal defense against KRA.",
    position: "I demand that tax deadlines continue to count only 'Working Days'.",
    category: 'DELETE'
  },
  {
    id: 'clause-agency-notices',
    clauseId: 'S. 42(14)(e)',
    title: 'Freezing Bank Accounts during Court Cases',
    concern: "KRA is being given the power to freeze funds even while a citizen is still appealing a case in court. This can kill a business before they have even had their day in court.",
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
    concern: "Requiring every person to issue a tax invoice, regardless of registration status, adds huge technical burdens on mama mbogas and small jua kali shops.",
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
    title: '6% High Tax on Digital Services (SEP)',
    concern: "This high 6% tax on digital companies will push up the cost of cloud storage, online tools, and software that Kenyan freelancers and startups rely on.",
    position: "I call for this rate to be lowered to 1.5% to match regional levels.",
    category: 'AMEND'
  },
  {
    id: 'clause-interchange-bank',
    clauseId: 'Income Tax',
    title: 'New Tax on Card Payment Fees',
    concern: "Adding tax to bank interchange fees will make using cards at supermarkets and petrol stations more expensive for consumers.",
    position: "I call for this to be deleted to support our digital economy.",
    category: 'DELETE'
  },
  {
    id: 'clause-deemed-60',
    clauseId: 'S. 24(1)',
    title: 'Forcing Businesses to Pay 60% of Earnings',
    concern: "Forces companies to pay out 60% of profits instead of letting them save that money to build more factories or hire more Kenyans. This will slow down job growth.",
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
    concern: "Taxing local plastic will make milk, bread bags, and cleaning soap more expensive for every consumer. It also hurts our local factories.",
    position: "I call for no new taxes on locally produced packaging materials.",
    category: 'DELETE'
  },
  {
    id: 'clause-sugar-local-eda',
    clauseId: 'Tariff 17.04',
    title: 'Higher Price for Local Sweets and Biscuits',
    concern: "Introducing an excise tax on local sugar products will increase the cost of common household items and hurt local confectionary manufacturers.",
    position: "I call for this tax to be dropped.",
    category: 'DELETE'
  },
  {
    id: 'clause-coal-eda',
    clauseId: 'EDA Coal',
    title: 'New 5% Tax on Coal Energy',
    concern: "Taxing coal increases the cost of energy for local factories, which will then raise the prices of the goods they sell to us.",
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
    concern: "Removing zero-rated status for sugarcane transport will reduce the earnings of our farmers and increase the price of sugar for consumers.",
    position: "I call for sugarcane transport to remain Tax-Free.",
    category: 'DELETE'
  },

  // --- SECTOR-SPECIFIC & SECONDARY MARKET IMPACTS ---
  {
    id: 'clause-aviation-narrow',
    clauseId: 'Chapter 88',
    title: 'Taxing Small and Commercial Aircraft',
    concern: "Narrowing tax exemptions for aircraft will increase costs for local air transport and cargo, making Kenya a more expensive hub in the region.",
    position: "I demand that aircraft and spare parts remain Tax-Free.",
    category: 'DELETE'
  },
  {
    id: 'clause-national-carrier',
    clauseId: 'KQ Tech',
    title: 'New Tax on Aircraft Maintenance Services',
    concern: "Removes tax exemptions for technical services for our national carrier. This will increase operational costs and Matatu-style price hikes in airline tickets.",
    position: "I call for this exemption to be maintained to keep our skies competitive.",
    category: 'DELETE'
  },
  {
    id: 'clause-gratuity-3',
    clauseId: 'Gratuity',
    title: 'Limiting Tax-Free Gratuity to 3-Year Contracts',
    concern: "Only employees with 3 years of continuous service can get tax-free gratuity. This punishes short-term workers and young professionals.",
    position: "I demand that gratuity remains tax-free for all employees regardless of contract length.",
    category: 'AMEND'
  },
  {
    id: 'clause-vat-refund-3',
    clauseId: 'Section 31',
    title: 'Delaying VAT Refunds for 3 Full Years',
    concern: "Lets KRA hold on to citizens' money for an extra year. This starves businesses of working capital and slows down the economy.",
    position: "I call for the refund window to be shortened to 1 year.",
    category: 'DELETE'
  },
  {
    id: 'clause-reit-property',
    clauseId: 'REIT Stamp',
    title: 'Easier Real Estate Investment (REITs)',
    concern: "Removes heavy taxes when moving property into investment trusts. This helps modernize our housing market.",
    position: "I support this move to formalize and grow the property market.",
    category: 'ACCEPT'
  },
  {
    id: 'clause-trust-single',
    clauseId: 'S. 11 Trust',
    title: 'Preventing Double Tax on Family Trusts',
    concern: "Ensures that once a family trust pays its taxes, the beneficiaries are not taxed again. This protects family savings.",
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
    clauseId: 'Amnesty',
    title: 'Extending Tax Amnesty until December 2026',
    concern: "Gives citizens more time to settle old tax debts without massive interest and penalties.",
    position: "I call on Parliament to approve this extension for all Kenyans.",
    category: 'ACCEPT'
  },
  {
    id: 'clause-immovable-def',
    clauseId: 'S. 2 ITA',
    title: 'Fixing the Definition of Immovable Property',
    concern: "Corrects the law to ensure land and mining rights are treated fairly. A necessary legal clean-up.",
    position: "I support this clean-up.",
    category: 'ACCEPT'
  },
  {
    id: 'clause-offshore-cgt',
    clauseId: 'Catch-all',
    title: 'Widening Offshore Tax on Global Share Sales',
    concern: "Attempts to tax share sales that happen outside Kenya if there is any 'nexus' to Kenya. Overly broad and will drive away foreign investors.",
    position: "I demand a minimum 20% value threshold to avoid nuisance taxes.",
    category: 'AMEND'
  },
  {
    id: 'clause-vasp-1m',
    clauseId: 'VASP 1M',
    title: 'Punitive KES 1M Penalty for Crypto Reports',
    concern: "Imposes a massive 1 million shilling penalty for crypto providers who miss a report. This is disproportional and will kill innovation.",
    position: "I call for a maximum penalty of KES 50,000.",
    category: 'AMEND'
  },
  {
    id: 'clause-interchange-Fees',
    clauseId: 'WHT Card',
    title: 'Taxing the Hidden Fees in Card Payments',
    concern: "Adds a 5-20% tax on the internal fees banks pay for card networking. Businesses will pass this hidden cost to shoppers.",
    position: "I call for the total deletion of this hidden tax.",
    category: 'DELETE'
  },
  {
    id: 'issue-winnings-reintro',
    clauseId: 'Betting',
    title: 'Reintroducing 20% Tax on Winnings',
    concern: "Brings back the 20% tax on betting payouts which was removed only last year. Creates an unstable tax environment.",
    position: "I call for a stable and predictable tax rate for the sector.",
    category: 'AMEND'
  },
  {
    id: 'issue-scrap-metal',
    clauseId: 'Scrap 1.5%',
    title: 'New 1.5% Tax on Every Scrap Metal Sale',
    concern: "Imposes a gross tax on scrap metal. Many poor collectors work on less than 1% profit; this tax will bankrupt them.",
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
    clauseId: 'Software',
    title: 'Higher Cost for Business Software (Royalty)',
    concern: "Treating regular software payments as royalties subject to 20% tax will make computers and accounting tools much more expensive.",
    position: "I call for software to stay in its current non-royalty category.",
    category: 'DELETE'
  },
  {
    id: 'antique-car-tax-37',
    clauseId: 'Clause 37 (Excise Duty)',
    title: '50% Luxury Tax on Antique & Classic Vehicles',
    concern: "Proposes a massive 50% ad valorem excise duty on antique, vintage, and classic vehicles older than 30 years and valued over KES 10 million. This will destroy the automotive heritage and restoration sector in Kenya.",
    position: "I demand the deletion of this punitive tax to protect the collectors' economy and cultural heritage.",
    category: 'DELETE'
  },
  {
    id: 'filing-deadline-shift',
    clauseId: 'Income Tax Sec 52',
    title: 'Shortened Tax Filing Deadline (April instead of June)',
    concern: "Moves the deadline for annual tax returns from June 30th to April 30th. This 2-month reduction creates unnecessary pressure on small businesses and individuals to finalize audits and compliance.",
    position: "I urge Parliament to retain the June 30th deadline to allow for proper constitutional and financial auditing.",
    category: 'DELETE'
  },
  {
    id: 'digital-finance-vat-28',
    clauseId: 'Clause 28 (VAT)',
    title: '16% Tax on Digital Bank & Mobile Money Transfers',
    concern: "Imposes 16% VAT on digital financial services, money transfers, and payment processing. This increases the cost of every transaction for ordinary Kenyans using M-Pesa or mobile banking.",
    position: "I formally oppose this tax on financial inclusion and demand its total deletion.",
    category: 'DELETE'
  },
  {
    id: 'calendar-days-dispute-77',
    clauseId: 'Clause 77 (TPA)',
    title: 'Counting Weekends in Tax Dispute Timelines',
    concern: "Changes the calculation of timelines for tax objections from working days to calendar days. This effectively 'steals' time from the citizen by counting Saturdays and Sundays against their right to legal defense.",
    position: "I demand that timelines remain as 'Working Days' to protect the right to fair administrative action.",
    category: 'DELETE'
  },
  {
    id: 'unconstitutional-assembly-violation',
    clauseId: 'Articles 27(8), 81(b), 3(2)',
    title: 'Unconstitutionality of National Assembly Composition',
    concern: "The current composition of the National Assembly is in blatant violation of the Two-Thirds Gender Rule (Articles 27(8) and 81(b)) and the Supreme Court Advisory Opinion 2 of 2012. Any business conducted, including the passage of the Finance Bill 2026, is therefore unconstitutional under Article 3(2).",
    position: "I formally challenge the legality of the National Assembly to process this Bill and demand its literal dissolution to comply with the Constitution.",
    category: 'DELETE'
  }
];
