import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const NEWSAPI_KEY = Deno.env.get('NEWSAPI_KEY');
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CIVIC_KEYWORDS = [
  // Legislature & Law
  "Bill", "Act", "Parliament", "Senate", "National Assembly", "County Assembly",
  "Constitutional", "Amendment", "Gazette", "Statutory", "Regulation", "Policy",
  "Law", "Legislation", "Hansard", "Motion", "Petition", "Referendum",
  "Reading", "Assented", "Enactment", "Repeal", "Clause", "Schedule",

  // Judiciary & Justice
  "Judiciary", "High Court", "Supreme Court", "Court of Appeal", "Magistrate",
  "Ruling", "Judgment", "Injunction", "Contempt", "Acquittal", "Sentence",
  "DCI", "DPP", "ODPP", "LSK", "Prosecution", "Arrest", "Detention",
  "Bail", "Extradition", "Inquest",

  // Public Finance
  "Budget", "Finance Bill", "Treasury", "National Treasury", "Taxation",
  "Levy", "KRA", "Excise", "VAT", "PAYE", "Withholding Tax", "Digital Tax",
  "Audit", "Auditor General", "Supplementary Budget", "Appropriation",
  "Expenditure", "Public Debt", "Eurobond", "IMF", "World Bank", "CRA",
  "Equalisation Fund", "Conditional Grant", "Own Source Revenue",

  // Accountability & Governance
  "EACC", "Corruption", "Graft", "Bribery", "Embezzlement", "Misappropriation",
  "Accountability", "Transparency", "Oversight", "Public Participation",
  "Ombudsman", "CAJ", "IPOA", "KNCHR", "Ethics", "Conflict of Interest",
  "Vetting", "Impeachment", "Censure",

  // Devolution & County
  "Devolution", "County", "Governor", "Senator", "MCA", "Ward",
  "County Government", "Intergovernmental", "CRA", "County Budget",
  "County Assembly", "Petition County", "Ward Development Fund",

  // Elections & IEBC
  "IEBC", "Elections", "By-election", "Voter Registration", "Electoral",
  "Returning Officer", "Tallying", "Rigging", "Nomination", "Party Primary",
  "Campaign Finance", "ORPP", "Political Party",

  // Land & Property
  "Land", "Title Deed", "NLC", "Land Commission", "Eviction", "Compulsory Acquisition",
  "Land Rates", "Survey", "Squatter", "Community Land", "Encroachment",

  // Health
  "SHIF", "SHA", "NHIF", "Social Health", "Universal Health Coverage", "UHC",
  "Health Levy", "Drug", "KEBS", "KEPHIS", "Pharmacy", "Hospital",
  "Maternal", "Reproductive Health", "Mental Health Bill",

  // Education
  "Education", "CBC", "KNEC", "TSC", "University Fee", "HELB", "School",
  "Teacher", "TVET", "Scholarship", "Capitation", "Free Education",

  // Security & Human Rights
  "Police", "GSU", "KDF", "Human Rights", "Enforced Disappearance",
  "Abduction", "Extrajudicial", "Brutality", "Protest", "Demonstration",
  "Strike", "Crackdown", "Teargas", "Detainee", "Whistleblower",

  // Economy & Trade
  "CBK", "Central Bank", "Interest Rate", "Inflation", "Shilling",
  "Exchange Rate", "CMA", "NSE", "SGR", "PPP", "Privatisation",
  "Parastatal", "Tender", "Procurement", "PPRA", "Single Source",
  "Affordable Housing", "Hustler Fund", "MSME",

  // Digital & Technology
  "eCitizen", "Digital Service Tax", "Data Protection", "ODPC",
  "Cybercrime", "NTSA", "Communications Authority", "CA", "Licence",

  // Social & Welfare
  "Unemployment", "Hunger", "Drought", "NEMA", "Water", "Sanitation",
  "Energy", "KPLC", "Power", "Tariff", "Subsidy", "Social Protection",
  "Disability", "Youth Fund", "Women Fund", "Bursary",

  // Named Institutions (catch-all for headlines)
  "MP", "CS", "PS", "CEO", "Auditor", "Inspector General", "IG",
  "Governor", "Cabinet", "State House", "AG", "Solicitor General"
];

const CEKA_IMPRINT_PROMPT = `You are the Lead Intelligence Strategist for CEKA (Civic Education Kenya).
Your mission is to surface the 3 most urgent civic topics from Kenyan news headlines that directly affect ordinary Kenyans — not political commentary, not celebrity news, not vague policy discussion.

HARD CRITERIA — a topic MUST meet ALL of these:
1. LEGAL OR INSTITUTIONAL ANCHOR: It must involve a named Kenyan law, bill, institution (IEBC, EACC, NLC, CBK, TSC, DCI, DPP, LSK, KRA, CRA, SRC, KNEC, Parliament, Senate, County Assembly), or constitutional right.
2. CITIZEN IMPACT: It must change something a Kenyan citizen directly experiences — taxes, health, land, school fees, elections, public safety, employment, or basic rights.
3. VERIFIABLE: It must reference something that can be looked up — a bill number, gazette notice, court ruling, audit report, or official statement.
4. NOT ALREADY ABSTRACT: Do not pick topics that are pure commentary, opinion, or party politics with no policy/legal substance.

TONE RULES:
- Topic names must be plain, direct English. No jargon. No dramatic language.
- Bad example: "The Hubris of Parliament's Sovereignty Vault"
- Good example: "New Tax on Digital Payments Explained"

OUTPUT: Return EXACTLY a JSON array of 3 objects. No markdown. No preamble. Raw JSON only.
[
  {
    "name": "Short plain-English title (max 10 words)",
    "description": "2 sentences. Sentence 1: what happened. Sentence 2: why an ordinary Kenyan should care.",
    "keywords": ["3 to 5 specific tags, not generic"],
    "priority": "high|normal",
    "civic_hook": "One sentence: the single most important question this topic raises for citizens",
    "real_cases": [
      {
        "name": "Name of person or group",
        "location": "Specific Kenyan location",
        "link": "Source URL if available in headline/desc",
        "situation": "Brief summary of their specific struggle/story"
      }
    ]
  }
]`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (!NEWSAPI_KEY || !GEMINI_API_KEY) {
      throw new Error('API keys (NEWSAPI, GEMINI) not configured');
    }

    // 1. Fetch Headlines from High-Value Kenyan Sources
    const query = "Kenya (Parliament OR Senate OR Judiciary OR Economy OR Corruption OR Politics)";
    const newsResponse = await fetch(`https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=30&apiKey=${NEWSAPI_KEY}`);
    const newsData = await newsResponse.json();
    
    if (!newsData.articles || newsData.articles.length === 0) {
      return new Response(JSON.stringify({ success: false, message: "No trending news found." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const headlines = newsData.articles.map((a: any) => `${a.title}: ${a.description}`).join("\n");

    // 2. Distill Topics with Gemini (CEKA Imprint)
    const geminiPayload = {
      contents: [{
        parts: [{ 
          text: `${CEKA_IMPRINT_PROMPT}\n\nRaw Headlines:\n${headlines}` 
        }]
      }],
      generationConfig: {
        temperature: 0.2,
        topP: 0.8,
        maxOutputTokens: 1024,
      }
    };

    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiPayload)
    });

    const geminiData = await geminiResponse.json();
    const resultText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!resultText) throw new Error("Gemini failed to return topics.");

    // Clean JSON from markdown if present
    const cleanJson = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
    const topics = JSON.parse(cleanJson);

    let queuedCount = 0;

    // 3. Queue Topics
    for (const topic of topics) {
      // Deduplication check
      const { data: existing } = await supabase
        .from('content_topics')
        .select('id')
        .eq('name', topic.name)
        .maybeSingle();

      if (existing) continue;

      // Insert Topic
      const { data: newTopic, error: topicError } = await supabase
        .from('content_topics')
        .insert({
          name: topic.name,
          description: `${topic.description}${topic.civic_hook ? `\n\nCivic Hook: ${topic.civic_hook}` : ''}${topic.real_cases ? `\n\nReal Cases: ${JSON.stringify(topic.real_cases)}` : ''}`,
          keywords: topic.keywords || [],
          priority: topic.priority || 'normal',
          is_active: true
        })
        .select('id')
        .single();

      if (!topicError && newTopic) {
        // Add to Queue
        const { error: queueError } = await supabase
          .from('content_queue')
          .insert({
            topic_id: newTopic.id,
            status: 'pending',
            priority: topic.priority || 1,
            scheduled_for: new Date().toISOString()
          });

        if (!queueError) queuedCount++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, queued: queuedCount, topics: topics.map((t: any) => t.name) }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    console.error("discover-topics error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
