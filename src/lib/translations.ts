import { Language } from "@/contexts/LanguageContext";

// Define translations for commonly used texts
export const translations: Record<string, Record<Language, string>> = {
  // General & App Intro
  "Pieces:": { en: "Pieces:", sw: "Vipande:", ksl: "Pieces:", br: "⠏⠊⠑⠉⠑⠎" },
  "Breaking Down Topics": { en: "Breaking Down Topics", sw: "Kuchambua Mada", ksl: "Breaking Down Topics", br: "⠃⠗⠑⠁⠅⠊⠝⠛ ⠙⠕⠺⠝ ⠞⠕⠏⠊⠉⠎" },
  "Simplifying complex civic, social and legal issues through visual education series. Swipe through to learn, download to share and act.": {
    en: "Simplifying complex civic, social and legal issues through visual education series. Swipe through to learn, download to share and act.",
    sw: "Kurahisisha masuala tata ya kiraia, kijamii na kisheria kupitia mfululizo wa elimu ya kuona. Telezesha kidole ili kujifunza, pakua ili kushiriki na kuchukua hatua.",
    ksl: "Simplifying issues visual learn share act",
    br: "⠎⠊⠍⠏⠇⠊⠋⠽⠊⠝⠛ ⠉⠕⠍⠏⠇⠑⠭ ⠊⠎⠎⠥⠑⠎"
  },
  "EXPLORE ALL PIECES": { en: "EXPLORE ALL PIECES", sw: "CHUNGUZA VIPANDE VYOTE", ksl: "EXPLORE ALL PIECES", br: "⠑⠭⠏⠇⠕⠗⠑ ⠁⠇⠇ ⠏⠊⠑⠉⠑⠎" },
  "Education Series": { en: "Education Series", sw: "Mfululizo wa Elimu", ksl: "Education Series", br: "⠑⠙⠥⠉⠁⠞⠊⠕⠝ ⠎⠑⠗⠊⠑⠎" },
  "Empowering Citizens through": {
    en: "Empowering Citizens through",
    sw: "Kuwawezesha Wananchi kupitia",
    ksl: "Empowering Citizens through",
    br: "⠑⠍⠏⠕⠺⠑⠗⠊⠝⠛ ⠉⠊⠞⠊⠵⠑⠝⠎ ⠞⠓⠗⠕⠥⠛⠓"
  },
  "Civic Education": {
    en: "Civic Education",
    sw: "Elimu ya Uraia",
    ksl: "Civic Education",
    br: "⠉⠊⠧⠊⠉ ⠑⠙⠥⠉⠁⠞⠊⠕⠝"
  },
  "Access civic knowledge, track legislation, and participate in building a better Kenya.": {
    en: "Access civic knowledge, track legislation, and participate in building a better Kenya.",
    sw: "Pata maarifa ya uraia, fuatilia sheria, na shiriki katika kujenga Kenya bora.",
    ksl: "Access civic knowledge, track legislation, and participate in building a better Kenya.",
    br: "⠁⠉⠉⠑⠎⠎ ⠉⠊⠧⠊⠉ ⠅⠝⠕⠺⠇⠑⠙⠛⠑⠂ ⠞⠗⠁⠉⠅ ⠇⠑⠛⠊⠎⠇⠁⠞⠊⠕⠝⠂ ⠁⠝⠙ ⠏⠁⠗⠞⠊⠉⠊⠏⠁⠞⠑ ⠊⠝ ⠃⠥⠊⠇⠙⠊⠝⠛ ⠁ ⠃⠑⠞⠞⠑⠗ ⠅⠑⠝⠽⠁⠲"
  },
  "Welcome to CEKA": {
    en: "Welcome to CEKA",
    sw: "Karibu CEKA",
    ksl: "Welcome to CEKA",
    br: "⠺⠑⠇⠉⠕⠍⠑ ⠞⠕ ⠉⠑⠅⠁"
  },
  "Welcome to CEKA 🇰🇪": {
    en: "Welcome to CEKA 🇰🇪",
    sw: "Karibu CEKA 🇰🇪",
    ksl: "Welcome to CEKA 🇰🇪",
    br: "⠺⠑⠇⠉⠕⠍⠑ ⠞⠕ ⠉⠑⠅⠁ 🇰🇪"
  },
  "Join our community of active citizens": {
    en: "Join our community of active citizens",
    sw: "Jiunge na jumuiya yetu ya raia wanaoshiriki",
    ksl: "Join our community of active citizens",
    br: "⠚⠕⠊⠝ ⠕⠥⠗ ⠉⠕⠍⠍⠥⠝⠊⠞⠽ ⠕⠋ ⠁⠉⠞⠊⠧⠑ ⠉⠊⠞⠊⠵⠑⠝⠎"
  },

  // Kenyanized Discourse (2027 Engine)
  "Bunge Square": { en: "Bunge Square", sw: "Uwanja wa Bunge", ksl: "Bunge Square", br: "⠃⠥⠝⠛⠑ ⠎⠟⠥⠁⠗⠑" },
  "Discussion on national issues": { en: "Discussion on national issues", sw: "Majadiliano ya kitaifa", ksl: "Discussion on national issues", br: "⠙⠊⠎⠉⠥⠎⠎⠊⠕⠝ ⠕⠝ ⠝⠁⠞⠊⠕⠝⠁⠇ ⠊⠎⠎⠥⠑⠎" },
  "Policy Watch 2024-2027": { en: "Policy Watch 2024-2027", sw: "Uangalizi wa Sera 2024-2027", ksl: "Policy Watch", br: "⠏⠕⠇⠊⠉⠽ ⠺⠁⠞⠉⠓" },
  "Monitoring constitutional implementation": { en: "Monitoring constitutional implementation", sw: "Kufuatilia utekelezaji wa katiba", ksl: "Monitoring constitution", br: "⠍⠕⠝⠊⠞⠕⠗⠊⠝⠛ ⠉⠕⠝⠎⠞⠊⠞⠥⠞⠊⠕⠝⠁⠇ ⠊⠍⠏⠇⠑⠍⠑⠝⠞⠁⠞⠊⠕⠝" },
  "Mashinani Dialogue": { en: "Mashinani Dialogue", sw: "Mazungumzo ya Mashinani", ksl: "Mashinani Dialogue", br: "⠍⠁⠎⠓⠊⠝⠁⠝⠊ ⠙⠊⠁⠇⠕⠛⠥⠑" },
  "County and devolved government watch": { en: "County and devolved government watch", sw: "Uangalizi wa serikali za kaunti", ksl: "County watch", br: "⠉⠕⠥⠝⠞⠽ ⠁⠝⠙ ⠙⠑⠧⠕⠇⠧⠑⠙ ⠛⠕⠧⠑⠗⠝⠍⠑⠝⠞ ⠺⠁⠞⠉⠓" },
  "Youth Pulse": { en: "Youth Pulse", sw: "Mapigo ya Vijana", ksl: "Youth Pulse", br: "⠽⠕⠥⠞⠓ ⠏⠥⠇⠎⠑" },
  "Involvement of young citizens": { en: "Involvement of young citizens", sw: "Ushiriki wa vijana", ksl: "Youth involvement", br: "⠊⠝⠧⠕⠇⠧⠑⠍⠑⠝⠞ ⠕⠋ ⠽⠕⠥⠝⠛ ⠉⠊⠞⠊⠵⠑⠝⠎" },

  // General UI Strings
  "Loading...": { en: "Loading...", sw: "Inapakia...", ksl: "Loading...", br: "⠇⠕⠁⠙⠊⠝⠛⠲⠲⠲" },
  "Search...": { en: "Search...", sw: "Tafuta...", ksl: "Search...", br: "⠎⠑⠁⠗⠉⠓⠲⠲⠲" },
  "Learn More": { en: "Learn More", sw: "Jifunze Zaidi", ksl: "Learn More", br: "⠇⠑⠁⠗⠝ ⠍⠕⠗⠑" },
  "View All": { en: "View All", sw: "Tazama Zote", ksl: "View All", br: "⠧⠊⠑⠺ ⠁⠇⠇" },
  "Download": { en: "Download", sw: "Pakua", ksl: "Download", br: "⠙⠕⠺⠝⠇⠕⠁⠙" },
  "Submit": { en: "Submit", sw: "Wasilisha", ksl: "Submit", br: "⠎⠥⠃⠍⠊⠞" },
  "Cancel": { en: "Cancel", sw: "Ghairi", ksl: "Cancel", br: "⠉⠁⠝⠉⠑⠇" },
  "Save": { en: "Save", sw: "Hifadhi", ksl: "Save", br: "⠎⠁⠧⠑" },
  "Delete": { en: "Delete", sw: "Futa", ksl: "Delete", br: "⠙⠑⠇⠑⠞⠑" },
  "Edit": { en: "Edit", sw: "Hariri", ksl: "Edit", br: "⠑⠙⠊⠞" },
  "Close": { en: "Close", sw: "Funga", ksl: "Close", br: "⠉⠇⠕⠎⠑" },
  "Back": { en: "Back", sw: "Rudi", ksl: "Back", br: "⠃⠁⠉⠅" },
  "Next": { en: "Next", sw: "Endelea", ksl: "Next", br: "⠝⠑⠭⠞" },
  "Success": { en: "Success", sw: "Imefaulu", ksl: "Success", br: "⠎⠥⠉⠉⠑⠎⠎" },
  "Error": { en: "Error", sw: "Hitilafu", ksl: "Error", br: "⠑⠗⠗⠕⠗" },

  // Navigation
  "Home": { en: "Home", sw: "Nyumbani", ksl: "Home", br: "⠓⠕⠍⠑" },
  "Resources": { en: "Resources", sw: "Rasilimali", ksl: "Resources", br: "⠗⠑⠎⠕⠥⠗⠉⠑⠎" },
  "Community": { en: "Community", sw: "Uwanja wa Jamii", ksl: "Community", br: "⠉⠕⠍⠍⠥⠝⠊⠞⠽" },
  "Notifications": { en: "Notifications", sw: "Arifa", ksl: "Notifications", br: "⠝⠕⠞⠊⠋⠊⠉⠁⠞⠊⠕⠝⠎" },
  "Profile": { en: "Profile", sw: "Wasifu", ksl: "Profile", br: "⠏⠗⠕⠋⠊⠇⠑" },
  "Blog": { en: "Blog", sw: "Msimamo", ksl: "Blog", br: "⠃⠇⠕⠛" },
  "Calendar": { en: "Calendar", sw: "Kalenda", ksl: "Calendar", br: "⠉⠁⠇⠑⠝⠙⠁⠗" },
  "Tools": { en: "Tools", sw: "Zana", ksl: "Tools", br: "⠞⠕⠕⠇⠎" },

  // Legislative Detail
  "Legislative Tracker": { en: "Legislative Tracker", sw: "Kifuatiliaji cha Sheria", ksl: "Legislative Tracker", br: "⠇⠑⠛⠊⠎⠇⠁⠞⠊⠧⠑ ⠞⠗⠁⠉⠅⠑⠗" },
  "Stay informed about bills and legislative changes in Kenya": {
    en: "Stay informed about bills and legislative changes in Kenya",
    sw: "Pata taarifa kuhusu miswada na mabadiliko ya kisheria nchini Kenya",
    ksl: "Stay informed about bills",
    br: "⠎⠞⠁⠽ ⠊⠝⠋⠕⠗⠍⠑⠙ ⠁⠃⠕⠥⠞ ⠃⠊⠇⠇⠎"
  },
  "Follow Bill": { en: "Follow Bill", sw: "Fuatilia Mswada", ksl: "Follow Bill", br: "⠋⠕⠇⠇⠕⠺ ⠃⠊⠇⠇" },
  "Following": { en: "Following", sw: "Unalifuata", ksl: "Following", br: "⠋⠕⠇⠇⠕⠺⠊⠝⠛" },

  // Misc 2027 Election Special
  "Election Integrity": { en: "Election Integrity", sw: "Uadilifu wa Uchaguzi", ksl: "Election Integrity", br: "⠑⠇⠑⠉⠞⠊⠕⠝ ⠊⠝⠞⠑⠛⠗⠊⠞⠽" },
  "Voter Education": { en: "Voter Education", sw: "Elimu ya Mpiga Kura", ksl: "Voter Education", br: "⠧⠕⠞⠑⠗ ⠑⠙⠥⠉⠁⠞⠊⠕⠝" },
  "My Vote My Power": { en: "My Vote My Power", sw: "Kura Yangu Nguvu Yangu", ksl: "My Vote My Power", br: "⠍⠽ ⠧⠕⠞⠑ ⠍⠽ ⠏⠕⠺⠑⠗" },
  "Discover": { en: "Discover", sw: "Gundua", ksl: "Discover", br: "⠙⠊⠎⠉⠕⠧⠑⠗" },
  "Engage": { en: "Engage", sw: "Shiriki", ksl: "Engage", br: "⠑⠝⠛⠁⠛⠑" },
  "Resource Hub": { en: "Resource Hub", sw: "Kituo cha Rasilimali", ksl: "Resource Hub", br: "⠗⠑⠎⠕⠥⠗⠉⠑ ⠥⠃" },
  "Community Hub": { en: "Community Hub", sw: "Uwanja wa Jamii", ksl: "Community Hub", br: "⠉⠕⠍⠍⠥⠝⠊⠞⠽ ⠥⠃" },
  "Translation Hub": { en: "Translation Hub", sw: "Kituo cha Tafsiri", ksl: "Translation Hub", br: "⠞⠗⠁⠝⠎⠇⠁⠞⠊⠕⠝ ⠥⠃" },
  "Help translate civic education into Kenyan local languages.": {
    en: "Help translate civic education into Kenyan local languages.",
    sw: "Saidia kutafsiri elimu ya uraia katika lugha za mitaa za Kenya.",
    ksl: "Help translate civic tech",
    br: "⠓⠑⠇⠏ ⠞⠗⠁⠝⠎⠇⠁⠞⠑ ⠉⠊⠧⠊⠉ ⠑⠙⠥⠉⠁⠞⠊⠕⠝"
  },
  "Volunteer": { en: "Volunteer", sw: "Jitolee", ksl: "Volunteer", br: "⠧⠕⠇⠥⠝⠞⠑⠑⠗" },
  "Mwananchi": { en: "Mwananchi", sw: "Mwananchi", ksl: "Mwananchi", br: "⠍⠺⠁⠝⠁⠝⠉⠓⠊" },
  "Assembly": { en: "Assembly", sw: "Bunge", ksl: "Assembly", br: "⠁⠎⠎⠑⠍⠃⠇⠽" },
  "Bunge Live": { en: "Bunge Live", sw: "Bunge Mubashara", ksl: "Bunge Live", br: "⠃⠥⠝⠛⠑ ⠇⠊⠧⠑" },
  "Discourse Threads": { en: "Discourse Threads", sw: "Mihadhara", ksl: "Discourse Threads", br: "⠙⠊⠎⠉⠕⠥⠗⠎⠑ ⠞⠓⠗⠑⠁⠙⠎" },
  "Join the heartbeat of Kenyan civic participation. Real-time updates, policy tracker, and community voices as we move towards 2027.": {
    en: "Join the heartbeat of Kenyan civic participation. Real-time updates, policy tracker, and community voices as we move towards 2027.",
    sw: "Jiunge na mapigo ya ushiriki wa uraia nchini Kenya. Taarifa za wakati halisi, ufuatiliaji wa sera, na sauti za kijamii tunapoelekea 2027.",
    ksl: "Join civic heartbeat Kenya 2027",
    br: "⠚⠕⠊⠝ ⠞⠓⠑ ⠓⠑⠁⠗⠞⠃⠑⠁⠞ ⠕⠋ ⠅⠑⠝⠽⠁⠝ ⠉⠊⠧⠊⠉ ⠏⠁⠗⠞⠊⠉⠊⠏⠁⠞⠊⠕⠝⠲"
  },

  // Legislative Intelligence (Sovereign Engine)
  "Ask Sovereign Intelligence...": {
    en: "Ask Sovereign Intelligence...",
    sw: "Uliza Akili Huru...",
    ksl: "Ask Intelligence",
    br: "⠁⠎⠅ ⠎⠕⠧⠑⠗⠑⠊⠛⠝ ⠊⠝⠞⠑⠇⠇⠊⠛⠑⠝⠉⠑"
  },
  "I can analyze bills, summarize legislation, and answer questions about Kenyan civic rights based on verified public data.": {
    en: "I can analyze bills, summarize legislation, and answer questions about Kenyan civic rights based on verified public data.",
    sw: "Naweza kuchambua miswada, kufupisha sheria, na kujibu maswali kuhusu haki za kiraia za Kenya kulingana na data ya umma iliyothibitishwa.",
    ksl: "Analyze bills answer questions",
    br: "⠊ ⠉⠁⠝ ⠁⠝⠁⠇⠽⠵⠑ ⠃⠊⠇⠇⠎"
  },
  "Start typing to awaken the Sovereign Engine...": {
    en: "Start typing to awaken the Sovereign Engine...",
    sw: "Anza kuandika ili kuamsha Mtambo wa Kujitegemea...",
    ksl: "Start typing awaken Engine",
    br: "⠎⠞⠁⠗⠞ ⠞⠽⠏⠊⠝⠛"
  },
  "Download Civic Intelligence Pack": {
    en: "Download Civic Intelligence Pack",
    sw: "Pakua Kifurushi cha Ujasusi wa Kiraia",
    ksl: "Download pack",
    br: "⠙⠕⠺⠝⠇⠕⠁⠙ ⠏⠁⠉⠅"
  },
  "Official Bill PDF": {
    en: "Official Bill PDF",
    sw: "Mswada Rasmi wa PDF",
    ksl: "Bill PDF",
    br: "⠃⠊⠇⠇ ⠏⠙⠋"
  },
  "News & Corroboration": {
    en: "News & Corroboration",
    sw: "Habari na Uthibitisho",
    ksl: "News proof",
    br: "⠝⠑⠺⠎ ⠏⠗⠕⠕⠋"
  },
  "Sources Found": {
    en: "Sources Found",
    sw: "Vyanzo Vimepatikana",
    ksl: "Sources",
    br: "⠎⠕⠥⠗⠉⠑⠎"
  },
  "Data Fidelity Score": {
    en: "Data Fidelity Score",
    sw: "Alama ya Ukweli wa Data",
    ksl: "Fidelity score",
    br: "⠋⠊⠙⠑⠇⠊⠞⠽"
  },
  "Legislative Narrative": {
    en: "Legislative Narrative",
    sw: "Maelezo ya Sheria",
    ksl: "Legislation notes",
    br: "⠝⠁⠗⠗⠁⠞⠊⠧⠑"
  }
};

export type TranslationKey = keyof typeof translations;

export function translate(text: string, language: Language): string {
  if (translations[text] && translations[text][language]) {
    return translations[text][language];
  }
  // Simplified fallback logic for partial matches
  const key = Object.keys(translations).find(k => k.toLowerCase() === text.toLowerCase());
  if (key && translations[key][language]) {
    return translations[key][language];
  }
  return text;
}
