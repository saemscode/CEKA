import re

with open("scripts/multi_llm_orchestrator.py", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update __init__ keys and default_chain
init_old = """    def __init__(self):
        self.api_keys = {
            "openai":      os.getenv("OPENAI_API_KEY_1") or os.getenv("OPENAI_API_KEY_2"),
            "anthropic":   os.getenv("ANTHROPIC_API_KEY"),
            "gemini":      os.getenv("GEMINI_API_KEY") or os.getenv("VITE_GEMINI_API_KEY"),
            "groq":        os.getenv("GROQ_API_KEY"),
            "openrouter":  os.getenv("OPENROUTER_API_KEY"),
            "deepseek":    os.getenv("DEEPSEEK_API_KEY"),
            "deepseek2":   os.getenv("DEEPSEEK_API_KEY_SECONDARY"),
            "cerebras":    os.getenv("CEREBRAS_API_KEY"),
            "cerebras2":   os.getenv("CEREBRAS_API_KEY_SECONDARY"),
            "cohere":      os.getenv("COHERE_API_KEY"),
            "nvidia":      os.getenv("NVIDIA_API_KEY"),
            "huggingface": os.getenv("HF_API_TOKEN"),
        }

        # Priority chain — fastest/cheapest first, paid/premium last
        # Cerebras: ultra-fast, free tier
        # Groq: fast, free tier (100k TPD limit)
        # DeepSeek / DeepSeek2: primary + secondary keys
        # OpenRouter: multi-model fallback (most reliable currently)
        # NVIDIA NIM: skip if timing out — timeout set to 10s
        # Cohere: trial key (1000 calls/month)
        # HuggingFace: free inference API
        # Gemini/Anthropic/OpenAI: all currently quota/credit exhausted
        self.default_chain = [
            "cerebras", "cerebras2", "groq", "deepseek", "deepseek2",
            "openrouter", "nvidia", "cohere", "huggingface",
            "gemini", "anthropic", "openai"
        ]"""

init_new = """    def __init__(self):
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
        ]"""
content = content.replace(init_old, init_new)

# 2. Add SambaNova and SiliconFlow and Nvidia Llama/Nemotron
nvidia_old = """    def _call_nvidia(self, prompt: str, system_prompt: str = "") -> Optional[str]:
        \"\"\"NVIDIA NIM — OpenAI-compatible. Timeout 10s (fails fast if no credits).\"\"\"
        if not self.api_keys["nvidia"]: return None
        try:
            import requests
            headers = {
                "Authorization": f"Bearer {self.api_keys['nvidia']}",
                "Content-Type": "application/json"
            }
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            payload = {
                "model": "meta/llama-3.3-70b-instruct",
                "messages": messages,
                "max_tokens": 4096,
                "temperature": 0.1,
                "stream": False,
            }
            resp = requests.post(
                "https://integrate.api.nvidia.com/v1/chat/completions",
                headers=headers, json=payload, timeout=10  # Fail fast — don't block 60s per bill
            )
            if resp.status_code == 200:
                return resp.json()["choices"][0]["message"]["content"]
            logger.warning(f"      [ORCHESTRATOR] NVIDIA HTTP {resp.status_code}: {resp.text[:200]}")
            return None
        except Exception as e:
            logger.warning(f"      [ORCHESTRATOR] NVIDIA fast-fail: {e}")
            return None"""

nvidia_new = """    def _call_nvidia_nemotron(self, prompt: str, system_prompt: str = "") -> Optional[str]:
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
            return None"""
content = content.replace(nvidia_old, nvidia_new)

# 3. Groq smart backoff
groq_old = """            resp = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages,
                response_format={"type": "json_object"} if "json" in prompt.lower() else None
            )
            return resp.choices[0].message.content
        except Exception as e:
            logger.error(f"      [ORCHESTRATOR] Groq Error: {e}")
            return None"""

groq_new = """            resp = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages,
                response_format={"type": "json_object"} if "json" in prompt.lower() else None
            )
            return resp.choices[0].message.content
        except Exception as e:
            msg = str(e)
            if "429" in msg and "Please try again in" in msg:
                match = re.search(r'Please try again in (?:(\\d+)m)?([\\d\\.]+)s', msg)
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
            return None"""
content = content.replace(groq_old, groq_new)

with open("scripts/multi_llm_orchestrator.py", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated scripts/multi_llm_orchestrator.py")
