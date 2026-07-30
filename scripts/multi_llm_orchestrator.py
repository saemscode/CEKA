import os
import json
import logging
import time
import re
from typing import List, Dict, Any, Optional, Union
from datetime import datetime, timezone

# ---------------------------------------------------------------------------
# Logging setup
# ---------------------------------------------------------------------------
logger = logging.getLogger(__name__)

class MultiLLMOrchestrator:
    """
    GO-HAM Multi-LLM Orchestrator v2.0

    Full provider coverage: Cerebras → Groq → DeepSeek → NVIDIA →
    OpenRouter → Cohere → HuggingFace → Gemini → Anthropic → OpenAI
    """

    def __init__(self):
        self.api_keys = {
            "openai":      os.getenv("OPENAI_API_KEY_1") or os.getenv("OPENAI_API_KEY_2"),
            "anthropic":   os.getenv("ANTHROPIC_API_KEY"),
            "gemini":      os.getenv("CEKA_GEMINI_API_KEY") or os.getenv("GEMINI_API_KEY") or os.getenv("VITE_GEMINI_API_KEY"),
            "groq":        os.getenv("CEKA_GROQ_API_KEY") or os.getenv("GROQ_API_KEY"),
            "openrouter":  os.getenv("OPENROUTER_API_KEY"),
            "deepseek":    os.getenv("DEEPSEEK_API_KEY"),
            "deepseek2":   os.getenv("DEEPSEEK_API_KEY_SECONDARY"),
            "cerebras":    os.getenv("CEREBRAS_API_KEY"),
            "cerebras2":   os.getenv("CEREBRAS_API_KEY_2") or os.getenv("CEREBRAS_API_KEY_SECONDARY"),
            "cohere":      os.getenv("COHERE_API_KEY"),
            "nvidia_nemotron": os.getenv("NEMOTRON_3_NVIDIA_API_KEY") or os.getenv("NVIDIA_API_KEY"),
            "nvidia_llama":    os.getenv("LLAMA_4_MAVERICK_NVIDIA_API_KEY"),
            "sambanova":   os.getenv("SAMBANOVA_API_KEY"),
            "siliconflow": os.getenv("SILICON_FLOW_API_KEY"),
            "huggingface": os.getenv("HF_API_TOKEN"),
        }

        self.default_chain = [
            "cerebras", "cerebras2", "sambanova", "siliconflow", "groq", 
            "nvidia_llama", "nvidia_nemotron", "deepseek", "deepseek2",
            "openrouter", "cohere", "huggingface",
            "gemini", "anthropic", "openai"
        ]

        self.metrics = {
            "total_calls": 0,
            "success_calls": 0,
            "failed_calls": 0,
            "providers_used": {},
            "total_tokens_estimate": 0
        }

    # -----------------------------------------------------------------------
    #  Manus Fallback
    # -----------------------------------------------------------------------
    def call_manus_agent(self, goal: str) -> Optional[str]:
        """Fallback agent stub for extremely corrupted PDFs."""
        logger.warning(f"[MANUS] Agent called with goal: {goal}")
        return None

    # -----------------------------------------------------------------------
    #  JSON cleaning utilities
    # -----------------------------------------------------------------------

    def _clean_json_response(self, text: str) -> str:
        if not text: return ""
        raw = text.strip()
        if "```" in raw:
            match = re.search(r'```(?:json)?\n?(.*?)\n?```', raw, re.DOTALL | re.I)
            if match:
                raw = match.group(1).strip()
            else:
                raw = raw.replace("```json", "").replace("```", "").strip()
        raw = re.sub(r',\s*([\]}])', r'\1', raw)
        return raw

    def extract_json(self, response_text: str) -> Dict[str, Any]:
        cleaned = self._clean_json_response(response_text)
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError as e:
            logger.warning(f"      [ORCHESTRATOR] JSON Decode Error: {e}")
            match = re.search(r'(\{.*\})', cleaned, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group(1))
                except: pass
            return {}

    # -----------------------------------------------------------------------
    #  Provider Methods
    # -----------------------------------------------------------------------

    def _call_cerebras(self, prompt: str, system_prompt: str = "") -> Optional[str]:
        """Cerebras primary key — ultra-fast inference."""
        return self._cerebras_request(prompt, system_prompt, self.api_keys["cerebras"])

    def _call_cerebras2(self, prompt: str, system_prompt: str = "") -> Optional[str]:
        """Cerebras secondary key — fallback for quota exhaustion."""
        return self._cerebras_request(prompt, system_prompt, self.api_keys["cerebras2"])

    def _cerebras_request(self, prompt: str, system_prompt: str, api_key: Optional[str]) -> Optional[str]:
        """Shared Cerebras request. Tries best models in order."""
        if not api_key: return None
        try:
            import requests
            headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            # Try models from best (largest) to smallest
            for model in ["gpt-oss-120b", "zai-glm-4.7", "llama3.1-8b"]:
                payload = {"model": model, "messages": messages, "max_tokens": 4096, "temperature": 0.1}
                resp = requests.post(
                    "https://api.cerebras.ai/v1/chat/completions",
                    headers=headers, json=payload, timeout=30
                )
                if resp.status_code == 200:
                    logger.info(f"      [ORCHESTRATOR] Cerebras success via {model}")
                    return resp.json()["choices"][0]["message"]["content"]
                elif resp.status_code == 404:
                    continue  # model not available, try next
                elif resp.status_code == 429:
                    logger.warning(f"      [ORCHESTRATOR] Cerebras rate limit on {model}")
                    break  # quota hit, no point trying more models
                else:
                    logger.warning(f"      [ORCHESTRATOR] Cerebras HTTP {resp.status_code}: {resp.text[:150]}")
            return None
        except Exception as e:
            logger.error(f"      [ORCHESTRATOR] Cerebras Error: {e}")
            return None

    def _call_gemini(self, prompt: str, system_prompt: str = "") -> Optional[str]:
        if not self.api_keys["gemini"]: return None
        try:
            import google.generativeai as genai
            genai.configure(api_key=self.api_keys["gemini"])
            model = genai.GenerativeModel('gemini-2.0-flash')
            full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt
            resp = model.generate_content(full_prompt)
            return resp.text if resp and resp.text else None
        except Exception as e:
            logger.error(f"      [ORCHESTRATOR] Gemini Error: {e}")
            return None

    def _call_anthropic(self, prompt: str, system_prompt: str = "") -> Optional[str]:
        if not self.api_keys["anthropic"]: return None
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=self.api_keys["anthropic"])
            resp = client.messages.create(
                model="claude-3-5-sonnet-20240620",
                max_tokens=4096,
                system=system_prompt or "You are a professional legislative analyst.",
                messages=[{"role": "user", "content": prompt}]
            )
            return resp.content[0].text if resp.content else None
        except Exception as e:
            logger.error(f"      [ORCHESTRATOR] Anthropic Error: {e}")
            return None

    def _call_openai(self, prompt: str, system_prompt: str = "") -> Optional[str]:
        if not self.api_keys["openai"]: return None
        try:
            import openai
            client = openai.OpenAI(api_key=self.api_keys["openai"])
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            resp = client.chat.completions.create(
                model="gpt-4o",
                messages=messages,
                response_format={"type": "json_object"} if "json" in prompt.lower() else None
            )
            return resp.choices[0].message.content
        except Exception as e:
            logger.error(f"      [ORCHESTRATOR] OpenAI Error: {e}")
            return None

    def _call_groq(self, prompt: str, system_prompt: str = "") -> Optional[str]:
        if not self.api_keys["groq"]: return None
        try:
            from groq import Groq

            # Groq free-tier TPM cap: 12,000 tokens/min for llama-3.3-70b-versatile.
            # System prompt + JSON scaffolding consumes ~500 tokens.
            # Remaining budget: 11,500 tokens ≈ 46,000 characters at ~4 chars/token.
            # Truncate at the last newline before that boundary (sentence-aware).
            GROQ_CHAR_LIMIT = 46_000
            if len(prompt) > GROQ_CHAR_LIMIT:
                cut = prompt.rfind("\n", 0, GROQ_CHAR_LIMIT)
                prompt = prompt[: cut if cut != -1 else GROQ_CHAR_LIMIT]

            client = Groq(api_key=self.api_keys["groq"])
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            resp = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages,
                response_format={"type": "json_object"} if "json" in prompt.lower() else None
            )
            return resp.choices[0].message.content
        except Exception as e:
            msg = str(e)
            if "429" in msg and "Please try again in" in msg:
                match = re.search(r'Please try again in (?:(\d+)m)?([\d\.]+)s', msg)
                if match:
                    import time
                    m = int(match.group(1)) if match.group(1) else 0
                    s = float(match.group(2))
                    wait_time = (m * 60) + s + 1.0
                    if wait_time < 300: # only wait if less than 5 minutes
                        logger.warning(f"      [ORCHESTRATOR] Groq rate limited. Sleeping for {wait_time:.1f}s...")
                        time.sleep(wait_time)
                        resp = client.chat.completions.create(
                            model="llama-3.3-70b-versatile",
                            messages=messages,
                            response_format={"type": "json_object"} if "json" in prompt.lower() else None
                        )
                        return resp.choices[0].message.content
            logger.error(f"      [ORCHESTRATOR] Groq Error: {e}")
            return None

    def _call_deepseek(self, prompt: str, system_prompt: str = "") -> Optional[str]:
        """DeepSeek primary key."""
        return self._deepseek_request(prompt, system_prompt, self.api_keys["deepseek"])

    def _call_deepseek2(self, prompt: str, system_prompt: str = "") -> Optional[str]:
        """DeepSeek secondary/backup key."""
        return self._deepseek_request(prompt, system_prompt, self.api_keys["deepseek2"])

    def _deepseek_request(self, prompt: str, system_prompt: str, api_key: Optional[str]) -> Optional[str]:
        """Shared DeepSeek request logic."""
        if not api_key: return None
        try:
            import requests
            headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            payload = {"model": "deepseek-chat", "messages": messages, "max_tokens": 4096, "temperature": 0.1}
            resp = requests.post("https://api.deepseek.com/v1/chat/completions",
                                 headers=headers, json=payload, timeout=60)
            if resp.status_code == 200:
                return resp.json()["choices"][0]["message"]["content"]
            logger.warning(f"      [ORCHESTRATOR] DeepSeek HTTP {resp.status_code}: {resp.text[:200]}")
            return None
        except Exception as e:
            logger.error(f"      [ORCHESTRATOR] DeepSeek Error: {e}")
            return None

    def _call_nvidia_nemotron(self, prompt: str, system_prompt: str = "") -> Optional[str]:
        return self._openai_compat_request(
            prompt, system_prompt, self.api_keys["nvidia_nemotron"],
            "https://integrate.api.nvidia.com/v1/chat/completions",
            "nvidia/nemotron-4-340b-instruct", provider_name="NVIDIA Nemotron"
        )

    def _call_nvidia_llama(self, prompt: str, system_prompt: str = "") -> Optional[str]:
        return self._openai_compat_request(
            prompt, system_prompt, self.api_keys["nvidia_llama"],
            "https://integrate.api.nvidia.com/v1/chat/completions",
            "meta/llama-3.3-70b-instruct", provider_name="NVIDIA Llama"
        )

    def _call_sambanova(self, prompt: str, system_prompt: str = "") -> Optional[str]:
        return self._openai_compat_request(
            prompt, system_prompt, self.api_keys["sambanova"],
            "https://api.sambanova.ai/v1/chat/completions",
            "Meta-Llama-3.1-405B-Instruct", provider_name="SambaNova"
        )

    def _call_siliconflow(self, prompt: str, system_prompt: str = "") -> Optional[str]:
        return self._openai_compat_request(
            prompt, system_prompt, self.api_keys["siliconflow"],
            "https://api.siliconflow.cn/v1/chat/completions",
            "deepseek-ai/DeepSeek-V3", provider_name="SiliconFlow"
        )

    def _openai_compat_request(self, prompt: str, system_prompt: str, api_key: Optional[str], url: str, model: str, provider_name: str) -> Optional[str]:
        if not api_key: return None
        try:
            import requests
            headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            payload = {"model": model, "messages": messages, "max_tokens": 4096, "temperature": 0.1}
            resp = requests.post(url, headers=headers, json=payload, timeout=60)
            if resp.status_code == 200:
                return resp.json()["choices"][0]["message"]["content"]
            logger.warning(f"      [ORCHESTRATOR] {provider_name} HTTP {resp.status_code}: {resp.text[:200]}")
            return None
        except Exception as e:
            logger.error(f"      [ORCHESTRATOR] {provider_name} Error: {e}")
            return None

    def _call_cohere(self, prompt: str, system_prompt: str = "") -> Optional[str]:
        """Cohere — command-r-plus, reliable and capable."""
        if not self.api_keys["cohere"]: return None
        try:
            import requests
            headers = {
                "Authorization": f"Bearer {self.api_keys['cohere']}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            }
            payload = {
                "model": "command-r-plus",
                "message": prompt,
                "max_tokens": 4096,
                "temperature": 0.1,
            }
            if system_prompt:
                payload["preamble"] = system_prompt
            resp = requests.post(
                "https://api.cohere.com/v1/chat",
                headers=headers, json=payload, timeout=60
            )
            if resp.status_code == 200:
                data = resp.json()
                return data.get("text") or data.get("message", {}).get("content", [{}])[0].get("text")
            logger.warning(f"      [ORCHESTRATOR] Cohere HTTP {resp.status_code}: {resp.text[:200]}")
            return None
        except Exception as e:
            logger.error(f"      [ORCHESTRATOR] Cohere Error: {e}")
            return None

    def _call_huggingface(self, prompt: str, system_prompt: str = "") -> Optional[str]:
        """Hugging Face Inference API — serverless endpoint, free tier."""
        if not self.api_keys["huggingface"]: return None
        try:
            import requests
            headers = {
                "Authorization": f"Bearer {self.api_keys['huggingface']}",
                "Content-Type": "application/json",
            }
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            # Use HF Inference API serverless chat completions endpoint
            models_to_try = [
                "Qwen/Qwen2.5-72B-Instruct",
                "mistralai/Mistral-7B-Instruct-v0.3",
                "HuggingFaceH4/zephyr-7b-beta",
            ]
            for model in models_to_try:
                payload = {"model": model, "messages": messages, "max_tokens": 2048, "stream": False}
                resp = requests.post(
                    "https://api-inference.huggingface.co/v1/chat/completions",
                    headers=headers, json=payload, timeout=30
                )
                if resp.status_code == 200:
                    data = resp.json()
                    text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                    if text:
                        logger.info(f"      [ORCHESTRATOR] HuggingFace success via {model}")
                        return text
                elif resp.status_code == 503:
                    logger.warning(f"      [ORCHESTRATOR] HF model {model} loading, skipping...")
                    continue
            return None
        except Exception as e:
            logger.error(f"      [ORCHESTRATOR] HuggingFace Error: {e}")
            return None

    def _call_openrouter(self, prompt: str, system_prompt: str = "") -> Optional[str]:
        if not self.api_keys["openrouter"]: return None
        try:
            import requests
            headers = {
                "Authorization": f"Bearer {self.api_keys['openrouter']}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://ceka.co.ke",
                "X-Title": "CEKA Legislative Intelligence"
            }
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            models = [
                "meta-llama/llama-3.3-70b-instruct",
                "google/gemini-2.0-flash-001",
                "mistralai/mistral-nemo",
                "deepseek/deepseek-chat-v3-0324:free",
                "microsoft/phi-4:free",
            ]
            for model in models:
                payload = {"model": model, "messages": messages}
                resp = requests.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers=headers, json=payload, timeout=60
                )
                if resp.status_code == 200:
                    data = resp.json()
                    content = data.get("choices", [{}])[0].get("message", {}).get("content")
                    if content:
                        logger.info(f"      [ORCHESTRATOR] OpenRouter success via {model}")
                        return content
            return None
        except Exception as e:
            logger.error(f"      [ORCHESTRATOR] OpenRouter Error: {e}")
            return None

    # -----------------------------------------------------------------------
    #  Main Orchestration Logic
    # -----------------------------------------------------------------------

    def synthesize(self, prompt: str, system_prompt: str = "", provider_chain: List[str] = None) -> Optional[str]:
        """Run the synthesis loop through the provider chain until success."""
        chain = provider_chain or self.default_chain
        start_time = time.time()
        self.metrics["total_calls"] += 1

        for provider in chain:
            logger.info(f"      [ORCHESTRATOR] Attempting synthesis via {provider.upper()}...")
            call_func = getattr(self, f"_call_{provider}", None)
            if not call_func: continue

            result = call_func(prompt, system_prompt)
            if result and result.strip():
                elapsed = int((time.time() - start_time) * 1000)
                self.metrics["success_calls"] += 1
                self.metrics["providers_used"][provider] = self.metrics["providers_used"].get(provider, 0) + 1
                logger.info(f"      [ORCHESTRATOR] SUCCESS via {provider.upper()} ({elapsed}ms)")
                return result

            logger.warning(f"      [ORCHESTRATOR] {provider.upper()} failed or returned empty. Falling back...")

        self.metrics["failed_calls"] += 1
        logger.error("      [ORCHESTRATOR] ALL PROVIDERS FAILED in the chain.")
        return None

    def get_structured_intelligence(self, prompt: str, system_prompt: str = "") -> Dict[str, Any]:
        """Helper method to get and parse JSON intelligence."""
        res = self.synthesize(prompt, system_prompt)
        if res:
            return self.extract_json(res)
        return {}