import os
import json
import logging
import requests
import time
from datetime import datetime
from typing import List, Dict, Any, Optional

# Specialized SDKs
import google.generativeai as genai
from supabase import create_client, Client
from openai import OpenAI
from groq import Groq
from cohere import Client as CohereClient
from cerebras.cloud.sdk import Cerebras

# ==============================================================================
# CEKA SOVEREIGN INTELLIGENCE MESH (THE SIS 5-API EDITION)
# Integrated: Manus, DeepSeek, Groq, Cerebras, Cohere, Gemini.
# Mission: 100% Column Density, Legal Sovereignty, Infinite Redundancy.
# ==============================================================================

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [SOVEREIGN-MESH-ORCHESTRATOR] - %(levelname)s - %(message)s'
)

class AttunedSynchronizer:
    def __init__(self, api_key: str):
        self.api_key = api_key
        # Primary Vision / Context Core
        genai.configure(api_key=self.api_key)
        
        # 1. Reasoning Core (DeepSeek)
        self.deepseek_key = os.getenv("DEEPSEEK_API_KEY", "DEEPSEEK_KEY_REQUIRED")
        self.deepseek_client = OpenAI(api_key=self.deepseek_key, base_url="https://api.deepseek.com")
        
        # 2. Status Watchdog (Groq)
        self.groq_key = os.getenv("GROQ_API_KEY", "GROQ_KEY_REQUIRED")
        self.groq_client = Groq(api_key=self.groq_key)
        
        # 3. Social Synthesizer (Cerebras)
        self.cerebras_key = os.getenv("CEREBRAS_API_KEY", "CEREBRAS_KEY_REQUIRED")
        self.cerebras_client = Cerebras(api_key=self.cerebras_key)
        
        # 4. Legal Librarian (Cohere)
        self.cohere_key = os.getenv("COHERE_API_KEY", "COHERE_KEY_REQUIRED")
        self.cohere_client = CohereClient(self.cohere_key)
        
        # 5. Agentic Scraper (Manus)
        self.manus_key = os.getenv("MANUS_API_KEY", "MANUS_KEY_REQUIRED")
        
        # Supabase Integration
        self.supabase_url = "https://cajrvemigxghnfmyopiy.supabase.co"
        self.supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_KEY_REQUIRED")
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        
        # Path to the Sovereign Mind Master Prompt (Production relative path)
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.prompt_path = os.path.join(base_dir, "context", "CEKA-AI-Prompt.md")
        self.output_sql = "scripts/attuned_intelligence_feed.sql"
        self._load_master_prompt()
        self._load_active_profile()

    def _load_master_prompt(self):
        try:
            with open(self.prompt_path, 'r', encoding='utf-8') as f:
                self.master_prompt = f.read()
            logging.info("📜 Attuned Master Prompt loaded successfully.")
        except Exception as e:
            logging.error(f"❌ Failed to load master prompt: {str(e)}")
            self.master_prompt = "ROLE: CEKA SOVEREIGN MIND. MISSION: TRANSFORM DATA INTO CIVIC INTELLIGENCE. GO HAM."

    def _load_active_profile(self):
        """Fetches the active Intelligence Profile (Kibaki, Nyayo, Baba) from Supabase."""
        try:
            res = self.supabase.table("ai_intelligence_configs").select("*").eq("is_active", True).single().execute()
            if res.data:
                self.profile = res.data
                logging.info(f"🎭 Active Intelligence Profile: {self.profile['display_name']}")
            else:
                logging.warning("⚠️ No active profile found. Defaulting to THE_KIBAKI_LOGICIAN.")
                self.profile = {"profile_name": "DEFAULT", "system_prompt": "You are a precise constitutional scholar."}
        except Exception as e:
            logging.error(f"❌ Failed to load intelligence profile: {str(e)}")
            self.profile = {"profile_name": "DEFAULT", "system_prompt": "You are a precise constitutional scholar."}

    # ========================== SPECIALIZED ORGAN HANDLERS ==========================

    def _call_deepseek(self, prompt: str, schema: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Heavy Reasoning: Structural Transformation into Database columns."""
        logging.info("🧠 Routing to DeepSeek (Reasoning Core)...")
        try:
            response = self.deepseek_client.chat.completions.create(
                model="deepseek-chat",
                messages=[{"role": "system", "content": "You are a precise legislative data engine. Output JSON only."}, 
                          {"role": "user", "content": prompt}],
                response_format={'type': 'json_object'}
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            logging.error(f"❌ DeepSeek call failed: {str(e)}")
            return None

    def _call_groq(self, snippet: str) -> Optional[str]:
        """Rapid Inference: Instant Stage Detection."""
        logging.info("⚡ Routing to Groq (Status Watchdog)...")
        try:
            completion = self.groq_client.chat.completions.create(
                model="llama-3.1-70b-versatile",
                messages=[{"role": "system", "content": "Analyze bill snippet. Return one-word legislative stage."}, 
                          {"role": "user", "content": snippet}],
                temperature=0.1,
                max_tokens=10
            )
            return completion.choices[0].message.content.strip()
        except Exception as e:
            logging.error(f"❌ Groq call failed: {str(e)}")
            return None

    def _call_cerebras(self, social_data: str) -> Optional[Dict[str, Any]]:
        """High Throughput: Social Sentiment / Tabloid Synthesis."""
        logging.info("🗜️ Routing to Cerebras (Social Synthesizer)...")
        try:
            response = self.cerebras_client.chat.completions.create(
                model="llama3.1-70b",
                messages=[{"role": "system", "content": "Synthesize social sentiment into 'tabloid_summary' and 'ai_concerns' JSON."}, 
                          {"role": "user", "content": social_data}],
                response_format={'type': 'json_object'}
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            logging.error(f"❌ Cerebras call failed: {str(e)}")
            return None

    def _call_cohere_rerank(self, bill_summary: Dict[str, Any]) -> str:
        """Constitutional Grounding: Reranking Bill against the Constitution Vector Store."""
        logging.info("📖 Routing to Cohere (Legal Librarian)...")
        try:
            # 1. Fetch Constitutional Articles (simplified for this run, assuming vector check)
            # In production, this pulls from the 'constitution_articles' table
            res = self.supabase.table("constitution_articles").select("clause_ref, content").limit(50).execute()
            docs = [f"[{d['clause_ref']}]: {d['content']}" for d in res.data]
            
            rerank = self.cohere_client.rerank(
                query=f"{bill_summary.get('title')} {bill_summary.get('summary')}",
                documents=docs,
                top_n=3,
                model="rerank-english-v3.0"
            )
            selected = [docs[hit.index] for hit in rerank.results]
            return "\n\n".join(selected)
        except Exception as e:
            logging.error(f"❌ Cohere Rerank failed: {str(e)}")
            return "Constitutional RAG grounding unavailable."

    def call_manus_agent(self, goal: str) -> Optional[str]:
        """Agentic Hunter: Autonomous Scraper Fallback."""
        logging.info(f"🕵️ Triggering Manus Agent: {goal[:50]}...")
        headers = {"Authorization": f"Bearer {self.manus_key}", "Content-Type": "application/json"}
        payload = {"goal": goal, "max_steps": 5}
        try:
            # Note: Assuming standard Manus API endpoint
            res = requests.post("https://api.manus.ai/v1/execute", headers=headers, json=payload, timeout=60)
            if res.status_code == 200:
                return res.json().get('result')
            return None
        except Exception as e:
            logging.error(f"❌ Manus Agent failed: {str(e)}")
            return None

    # ========================== ORCHESTRATION LOOP ==========================

    def retrieve_constitutional_context(self, query: str) -> str:
        """Performs RAG to retrieve the 2010 Constitution clauses relevant to the topic."""
        logging.info(f"🔎 Retrieving Constitutional Context for: {query[:50]}...")
        try:
            response = genai.embed_content(
                model="models/text-embedding-004",
                content=query,
                task_type="retrieval_query"
            )
            embedding = response['embedding']
            res = self.supabase.rpc("match_constitution", {
                "query_embedding": embedding,
                "match_threshold": 0.5,
                "match_count": 5
            }).execute()
            
            if res.data:
                context = "\n\n".join([f"[{d['clause_ref']}]: {d['content']}" for d in res.data])
                logging.info(f"📖 Retrieved {len(res.data)} relevant Articles.")
                return f"### CONSTITUTIONAL_CONTEXT (2010 CONSTITUTION)\n{context}"
            return "No specific constitutional matches found."
        except Exception as e:
            logging.error(f"❌ RAG Retrieval failed: {str(e)}")
            return "Constitutional RAG unavailable for this run."

    def get_structured_intelligence(self, prompt: str, system_prompt: str) -> Dict[str, Any]:
        """Backward compatibility wrapper for legislative_scraper.py."""
        # Wrap the legacy call into the new Mesh loop
        raw_input = {"text": prompt, "title": "Legacy Distillation"}
        # For legacy calls, we use a simpler routing if needed, 
        # but here we leverage the full mesh for quality.
        res = self.execute_cov_loop(raw_input)
        return res['metadata'] if res and 'metadata' in res else {}

    def execute_cov_loop(self, raw_input: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Executes the Sovereign Intelligence Mesh routing logic."""
        title = raw_input.get('title', 'Unknown')
        text = raw_input.get('text', '')
        logging.info(f"🧠 Initiating Sovereign Mesh COV Loop for: {title}")
        
        # [STAGE 1] Vision/Primary Scan (Gemini 1.5 Pro)
        # Used for "seeing" physical stamps and layout.
        constitutional_context = self.retrieve_constitutional_context(f"{title} {text}")
        full_system_prompt = f"{self.master_prompt}\n\nINTELLIGENCE_PROFILE: {self.profile['system_prompt']}\n\n{constitutional_context}"
        
        model = genai.GenerativeModel("gemini-1.5-pro")
        
        try:
            # Cascade Routing Logic
            # 1. Structural Logic (DeepSeek)
            logic_prompt = f"Transform this legislative text into the CEKA data model: {text[:20000]}"
            structural_intel = self._call_deepseek(logic_prompt, {}) or {}
            
            # 2. Constitutional Anchoring (Cohere)
            legal_grounding = self._call_cohere_rerank({"title": title, "summary": structural_intel.get('summary', '')})
            
            # 3. Rapid Status Check (Groq)
            snippet = text[:2000] # Usually the stage stamp is at the top
            fast_status = self._call_groq(snippet)
            
            # 4. Social Pulse (Cerebras) - Only if social context exists
            social_pulse = {}
            if raw_input.get('social_context'):
                social_pulse = self._call_cerebras(json.dumps(raw_input['social_context'])) or {}

            # 5. Final Synthesis (Gemini 1.5 Pro)
            # Combines all specialized organ outputs into the final CEKA payload
            synthesis_prompt = f"""
            SYNTHESIZE THE FOLLOWING INTELLIGENCE INTO A MASTER RECORD:
            
            STRUCTURAL_LOGIC: {json.dumps(structural_intel)}
            LEGAL_GROUNDING: {legal_grounding}
            RAPID_STATUS: {fast_status}
            SOCIAL_PULSE: {json.dumps(social_pulse)}
            
            OUTPUT: A complete JSON object for the public.bills table, including:
            - neural_summary
            - tabloid_summary
            - ai_concerns (list)
            - constitutional_section
            - corroboration_score
            """
            
            response = model.generate_content(
                f"SYSTEM: {full_system_prompt}\nMISSION: FINAL ATTUNED SYNTHESIS.\nDATA: {synthesis_prompt}",
                generation_config={"temperature": 0.2, "top_p": 0.95}
            )
            
            raw_text = response.text
            parsed_result = self._parse_attuned_output(raw_text)
            
            if parsed_result:
                # Append Logic for JSONB columns
                parsed_result['metadata']['sis_profile'] = self.profile['profile_name']
                parsed_result['metadata']['mesh_enabled'] = True
                parsed_result['metadata']['current_stage'] = fast_status
                return parsed_result
            
            return None
            
        except Exception as e:
            logging.error(f"❌ Execution failure: {str(e)}")
            return None

    def _parse_attuned_output(self, text: str) -> Optional[Dict[str, Any]]:
        """Extracts HTML content and the CEKA_META JSON block."""
        try:
            if "<!-- CEKA_META" in text:
                parts = text.split("<!-- CEKA_META")
                html_content = parts[0].strip()
                meta_raw = parts[1].split("-->")[0].strip()
                metadata = json.loads(meta_raw)
                return {
                    "content": html_content,
                    "metadata": metadata,
                    "title": metadata.get("title", "Untitled Intelligence")
                }
            # Fallback for plain JSON output
            if text.startswith("{"):
                metadata = json.loads(text)
                return {"content": metadata.get("neural_summary", ""), "metadata": metadata, "title": metadata.get("title", "Untitled")}
            return None
        except Exception as e:
            logging.error(f"❌ Parsing failure: {str(e)}")
            return None

    def process_queue(self, inputs: List[Dict[str, Any]]):
        logging.info(f"🚀 Processing {len(inputs)} intelligence units through the Sovereign Mesh.")
        verified_results = []
        for item in inputs:
            result = self.execute_cov_loop(item)
            if result:
                verified_results.append(result)
        
        if verified_results:
            self._write_sql_feed(verified_results)

    def _write_sql_feed(self, results: List[Dict[str, Any]]):
        header = "-- CEKA SIS SOVEREIGN MESH FEED\n"
        rows = []
        for res in results:
            meta = res['metadata']
            title = res['title'].replace("'", "''")
            content = res['content'].replace("'", "''")
            score = int(meta.get('factual_integrity', 0) * 100) or meta.get('corroboration_score', 0)
            metrics = json.dumps(meta).replace("'", "''")
            excerpt = f"Mesh Intelligence [{meta.get('sis_profile')}] verified with score {score}%.".replace("'", "''")
            rows.append(f"('{title}', '{excerpt}', '{content}', 'draft', {score}, '{metrics}'::jsonb, 'CEKA')")

        body = "INSERT INTO public.generated_articles (title, excerpt, content, status, analysis_score, verification_metrics, author) VALUES\n" + ",\n".join(rows) + "\nON CONFLICT (title) DO NOTHING;"
        with open(self.output_sql, 'w', encoding='utf-8') as f:
            f.write(body)

# Alias for backward compatibility with legislative_scraper.py
MultiLLMOrchestrator = AttunedSynchronizer

if __name__ == "__main__":
    API_KEY = os.getenv("GEMINI_API_KEY", "API_KEY_REQUIRED")
    ENGINE = AttunedSynchronizer(api_key=API_KEY)
    SAMPLE_INPUTS = [{
        "title": "Referendum Bill 2026",
        "text": "THE SENATE FIRST READING 02 APR 2026. A Bill for an Act of Parliament to provide for the procedure of a referendum...",
        "source_id": "PAR-20260402"
    }]
    ENGINE.process_queue(SAMPLE_INPUTS)
