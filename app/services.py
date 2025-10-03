from typing import Dict, Any, List
import os
import re
import string
import asyncio
import httpx


# ---------------- In-memory storage (replaceable) ----------------
results: Dict[str, Dict[str, Any]] = {}


# ---------------- .env loader (no external deps) ----------------
def _load_env_file(path: str = ".env") -> None:
    try:
        if not os.path.exists(path):
            return
        with open(path, "r", encoding="utf-8") as f:
            for raw in f:
                line = raw.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" not in line:
                    continue
                key, value = line.split("=", 1)
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if key and value and key not in os.environ:
                    os.environ[key] = value
    except Exception:
        # Silently ignore .env parsing issues to avoid breaking startup
        pass

# Load .env early
_load_env_file()


# ---------------- NLP Preprocessing ----------------
_DEFAULT_STOPWORDS: List[str] = [
    # English
    "a", "an", "the", "and", "or", "but", "if", "while", "of", "to", "in", "on", "for",
    "at", "by", "from", "with", "as", "is", "are", "was", "were", "be", "been", "being",
    "this", "that", "these", "those", "it", "its", "i", "you", "your", "yours", "we",
    "our", "ours", "they", "their", "theirs", "he", "she", "him", "her", "his", "hers",
    "not", "no", "do", "does", "did", "done", "can", "could", "should", "would", "will",
    "just", "so", "than", "then", "there", "here", "about", "into", "over", "under",
    # Portuguese (pt-BR)
    "a", "o", "as", "os", "um", "uma", "uns", "umas",
    "de", "da", "do", "das", "dos", "duma", "dum", "dumas", "duns",
    "em", "no", "na", "nos", "nas", "num", "numa", "nuns", "numas",
    "por", "pelo", "pela", "pelos", "pelas",
    "para", "pra", "com", "sem", "sob", "sobre", "entre", "até", "após", "antes", "desde", "durante", "contra", "perante",
    "e", "ou", "mas", "porém", "contudo", "todavia", "porque", "que", "como", "quando", "onde",
    "se", "pois", "portanto", "então", "também", "ainda", "já", "só", "somente", "nunca", "sempre", "talvez",
    "muito", "muita", "muitos", "muitas", "pouco", "pouca", "poucos", "poucas", "todo", "toda", "todos", "todas",
    "mesmo", "mesma", "mesmos", "mesmas", "cada", "qualquer", "quaisquer", "nada", "tudo",
    "eu", "tu", "você", "vocês", "ele", "ela", "eles", "elas", "nós", "vós",
    "me", "te", "se", "nos", "vos", "lhe", "lhes",
    "meu", "minha", "meus", "minhas", "teu", "tua", "teus", "tuas",
    "seu", "sua", "seus", "suas", "dele", "dela", "deles", "delas",
    "este", "esta", "estes", "estas", "esse", "essa", "esses", "essas", "aquele", "aquela", "aqueles", "aquelas", "isto", "isso", "aquilo",
    "aqui", "aí", "ali", "lá",
    "ser", "estar", "ter", "haver", "foi", "era", "são", "está", "estão", "fui", "foram",
]

_SUFFIXES = ("ing", "edly", "edly", "ed", "s")


def _simple_tokenize(text: str) -> List[str]:
    text = text.lower()
    text = text.replace("\n", " ")
    text = re.sub(r"\s+", " ", text)
    text = text.translate(str.maketrans("", "", string.punctuation))
    return [t for t in text.split(" ") if t]


def _simple_stem(token: str) -> str:
    for s in _SUFFIXES:
        if token.endswith(s) and len(token) > len(s) + 2:
            return token[: -len(s)]
    return token


def preprocess_text(text: str) -> List[str]:
    tokens = _simple_tokenize(text or "")
    filtered = [t for t in tokens if t not in _DEFAULT_STOPWORDS]
    stemmed = [_simple_stem(t) for t in filtered]
    return stemmed


_PRODUCTIVE_KEYWORDS = {
    # English
    "invoice", "payment", "schedule", "meeting", "follow", "timeline", "deliverable",
    "proposal", "contract", "update", "report", "deadline", "review", "sync", "plan",
    "action", "task", "next", "confirm", "confirmat", "call", "agenda", "scope",
    # Portuguese (pt-BR)
    "fatura", "boleto", "pagamento", "agenda", "reuniao", "reunião", "marcar",
    "cronograma", "prazo", "entrega", "entregavel", "entregável",
    "proposta", "contrato", "atualizacao", "atualização", "relatorio", "relatório",
    "revisao", "revisão", "alinhamento", "plano", "acao", "ação", "tarefa", "proximo", "próximo",
    "confirmar", "ligacao", "ligação", "chamada", "pauta", "escopo", "orcamento", "orçamento", "aprovacao", "aprovação",
}


_UNPRODUCTIVE_KEYWORDS = {
    # English
    "offer", "discount", "promo", "promotion", "limited", "free", "deal", "buy",
    "sale", "win", "lottery", "click", "unsubscribe", "coupon", "save",
    # Portuguese (pt-BR)
    "oferta", "desconto", "promocao", "promoção", "limitado", "gratis", "grátis", "gratuito", "brinde",
    "compre", "venda", "ganhe", "sorteio", "clique", "descadastre", "cancelar inscricao", "cancelar inscrição",
    "cupom", "economize", "spam", "publicidade",
}


def classify_productivity(tokens: List[str]) -> str:
    if not tokens:
        return "Unproductive"
    pos = sum(1 for t in tokens if t in _PRODUCTIVE_KEYWORDS)
    neg = sum(1 for t in tokens if t in _UNPRODUCTIVE_KEYWORDS)
    score = pos - neg
    return "Productive" if score >= 1 else "Unproductive"


GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
GEMINI_ENDPOINT = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"


async def generate_suggested_reply_via_gemini(content: str, classification: str) -> str:
    if not GEMINI_API_KEY:
        return (
            "Thanks for the message. I will review and follow up with next steps shortly."
            if classification == "Productive"
            else "No response recommended."
        )

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {
                        "text": (
                            f"Context classification: {classification}.\n"
                            f"Email content:\n{content}\n\n"
                            "Draft a helpful reply."
                        )
                    }
                ],
            }
        ],
        "safetySettings": [],
        "generationConfig": {
            "temperature": 0.4,
            "topK": 40,
            "topP": 0.9,
            "maxOutputTokens": 256,
        },
    }

    params = {"key": GEMINI_API_KEY}
    timeout = httpx.Timeout(15.0, connect=5.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.post(GEMINI_ENDPOINT, params=params, json=payload)
        if resp.status_code != 200:
            return (
                "Thanks for the message. I will review and follow up with next steps shortly."
                if classification == "Productive"
                else "No response recommended."
            )
        data = resp.json()
        try:
            candidates = data.get("candidates", [])
            if not candidates:
                raise ValueError("no candidates")
            parts = candidates[0]["content"]["parts"]
            text = "".join(p.get("text", "") for p in parts)
            return text.strip() or (
                "Thanks for the message. I will review and follow up with next steps shortly."
                if classification == "Productive"
                else "No response recommended."
            )
        except Exception:
            return (
                "Thanks for the message. I will review and follow up with next steps shortly."
                if classification == "Productive"
                else "No response recommended."
            )


async def classify_via_gemini(content: str) -> str:
    """Ask Gemini to classify the email as Productive or Unproductive.
    Returns one of {"Productive", "Unproductive"} or raises on request failure.
    """
    if not GEMINI_API_KEY:
        raise RuntimeError("Missing GEMINI_API_KEY")

    prompt = (
        "Classify the email strictly as either 'Productive' or 'Unproductive'.\n"
        "Return ONLY the single word: Productive or Unproductive.\n\n"
        f"Email:\n{content}"
    )

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": prompt}],
            }
        ]
    }

    params = {"key": GEMINI_API_KEY}
    timeout = httpx.Timeout(15.0, connect=5.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.post(GEMINI_ENDPOINT, params=params, json=payload)
        resp.raise_for_status()
        data = resp.json()
        candidates = data.get("candidates", [])
        if not candidates:
            raise ValueError("No candidates from Gemini")
        parts = candidates[0].get("content", {}).get("parts", [])
        text = "".join(p.get("text", "") for p in parts).strip().lower()
        if "productive" in text and "unproductive" not in text:
            return "Productive"
        if "unproductive" in text:
            return "Unproductive"
        # Fallback if unclear
        return "Unproductive"


async def process_email(email_id: str, title: str, content: str) -> Dict[str, str]:
    # Preprocess to satisfy NLP requirement
    tokens = preprocess_text(f"{title}\n\n{content}")

    # Primary: classify via Gemini; fallback to local keyword heuristic
    try:
        classification = await classify_via_gemini(content)
    except Exception:
        classification = classify_productivity(tokens)

    # Suggest reply via Gemini with fallback
    try:
        suggested_reply = await generate_suggested_reply_via_gemini(content, classification)
    except Exception:
        await asyncio.sleep(0.1)
        suggested_reply = (
            "Thanks for the message. I will review and follow up with next steps shortly."
            if classification == "Productive"
            else "No response recommended."
        )

    return {"classification": classification, "suggested_reply": suggested_reply}


