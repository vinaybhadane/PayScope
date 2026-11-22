"""Duplicate and overlapping subscription detection engine.

Identifies subscriptions providing similar or redundant services in the same category
(e.g., Spotify and YouTube Premium in music; ChatGPT and Gemini in AI).
"""
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Dict, List, Optional, Set
import re

from app.models.commitment import Commitment

NUMBER_WORDS = {
    1: "one",
    2: "two",
    3: "three",
    4: "four",
    5: "five",
    6: "six",
    7: "seven",
    8: "eight",
    9: "nine",
    10: "ten",
}

# Domain-specific clusters for similar type products
SIMILAR_PRODUCT_CLUSTERS = [
    {
        "type": "music",
        "label": "music",
        "keywords": [
            "spotify", "youtube music", "apple music", "gaana", "jiosaavn",
            "amazon music", "wynk", "tidal", "deezer", "soundcloud", "music",
            "youtube premium",
        ],
    },
    {
        "type": "ai",
        "label": "AI",
        "keywords": [
            "chatgpt", "openai", "gemini", "google gemini", "claude",
            "anthropic", "copilot", "perplexity", "midjourney", "cursor",
        ],
    },
    {
        "type": "video_streaming",
        "label": "video streaming",
        "keywords": [
            "netflix", "amazon prime", "prime video", "disney", "hotstar",
            "hulu", "sonyliv", "zee5", "jiocinema", "apple tv", "hbo", "max",
        ],
    },
    {
        "type": "cloud_storage",
        "label": "cloud storage",
        "keywords": [
            "google one", "google drive", "icloud", "dropbox", "onedrive", "box", "skyvault",
        ],
    },
    {
        "type": "fitness",
        "label": "fitness",
        "keywords": [
            "cult.fit", "cultfit", "gold's gym", "anytime fitness", "zenith fitness",
            "fitness first", "gym",
        ],
    },
]


@dataclass
class DuplicateSubscriptionResult:
    """Detected overlapping/duplicate service group."""
    cluster_type: str
    cluster_label: str
    primary_commitment: Commitment
    other_commitments: List[Commitment]
    all_commitments: List[Commitment]
    summary: str
    explanation: str
    potential_annual_saving: Decimal = Decimal("0.00")


def _clean_product_name(name: str) -> str:
    """Normalize common service names to concise brand names (e.g. ChatGPT Plus -> ChatGPT)."""
    n = name.strip()
    if re.search(r"\bspotify\b", n, re.I):
        return "Spotify"
    if re.search(r"\byoutube\s+premium\b", n, re.I):
        return "YouTube Premium"
    if re.search(r"\byoutube\s+music\b", n, re.I):
        return "YouTube Music"
    if re.search(r"\bchatgpt\b", n, re.I) or re.search(r"\bopenai\b", n, re.I):
        return "ChatGPT"
    if re.search(r"\bgemini\b", n, re.I):
        return "Gemini"
    if re.search(r"\bnetflix\b", n, re.I):
        return "Netflix"
    if re.search(r"\bprime\b", n, re.I) or re.search(r"\bamazon\s+prime\b", n, re.I):
        return "Amazon Prime"
    return n


def _format_names_list(names: List[str]) -> str:
    """Format a list of names into natural English: 'A and B' or 'A, B, and C'."""
    clean_names = [_clean_product_name(n) for n in names if n and n.strip()]
    # Deduplicate while preserving order
    deduped = []
    for c in clean_names:
        if c not in deduped:
            deduped.append(c)

    if not deduped:
        return ""
    if len(deduped) == 1:
        return deduped[0]
    if len(deduped) == 2:
        return f"{deduped[0]} and {deduped[1]}"
    return ", ".join(deduped[:-1]) + f", and {deduped[-1]}"


def _matches_cluster(commitment: Commitment, cluster_keywords: List[str]) -> bool:
    """Check if commitment matches a cluster keyword."""
    text_corpus = f"{commitment.display_name} {commitment.category or ''} {commitment.commitment_type or ''}".lower()
    if commitment.merchant:
        text_corpus += f" {commitment.merchant.canonical_name.lower()} {commitment.merchant.category or ''}"
    
    for kw in cluster_keywords:
        if kw in text_corpus:
            return True
    return False


def detect_duplicate_subscriptions(
    commitments: List[Commitment],
) -> List[DuplicateSubscriptionResult]:
    """Detect overlapping subscriptions for similar type products.
    
    Examples:
    - Music: Spotify and YouTube Premium -> 'You have two music subscriptions: Spotify and YouTube Premium.'
    - AI: ChatGPT and Gemini -> 'You have two AI subscriptions: ChatGPT and Gemini.'
    - Category-based: Multiple active commitments in the same category.
    """
    # Only evaluate active or user-confirmed commitments
    active = [
        c for c in commitments
        if c.status in ("active", "user_confirmed")
        and (c.representative_amount is None or c.representative_amount >= Decimal("0.00"))
    ]

    results: List[DuplicateSubscriptionResult] = []
    handled_commitment_ids: Set[str] = set()

    # 1. Match specific product clusters (Music, AI, Video, Storage, Fitness)
    for cluster in SIMILAR_PRODUCT_CLUSTERS:
        ctype = cluster["type"]
        clabel = cluster["label"]
        keywords = cluster["keywords"]

        matching = [c for c in active if _matches_cluster(c, keywords)]
        # Remove exact duplicate IDs if any
        deduped_matching: List[Commitment] = []
        seen_ids = set()
        for c in matching:
            if str(c.id) not in seen_ids:
                seen_ids.add(str(c.id))
                deduped_matching.append(c)

        if len(deduped_matching) >= 2:
            count = len(deduped_matching)
            count_word = NUMBER_WORDS.get(count, str(count))
            # Format clean merchant/display names
            formatted_names = _format_names_list([
                c.display_name or (c.merchant.canonical_name if c.merchant else "")
                for c in deduped_matching
            ])
            # E.g. "You have two music subscriptions: Spotify and YouTube Premium."
            summary = f"You have {count_word} {clabel} subscriptions: {formatted_names}."
            explanation = (
                f"You have {count_word} active subscriptions providing similar {clabel} services ({formatted_names}). "
                f"Review whether you need both services active simultaneously to avoid redundant monthly payments."
            )

            # Sort by annualised amount; the cheaper one(s) represent potential savings
            sorted_by_cost = sorted(deduped_matching, key=lambda c: c.annualised_amount or Decimal("0.00"))
            savings = sum(
                (c.annualised_amount or (c.representative_amount or Decimal("0")) * 12 for c in sorted_by_cost[:-1]),
                Decimal("0.00")
            )

            for c in deduped_matching:
                handled_commitment_ids.add(str(c.id))
                others = [o for o in deduped_matching if o.id != c.id]
                results.append(
                    DuplicateSubscriptionResult(
                        cluster_type=ctype,
                        cluster_label=clabel,
                        primary_commitment=c,
                        other_commitments=others,
                        all_commitments=deduped_matching,
                        summary=summary,
                        explanation=explanation,
                        potential_annual_saving=savings,
                    )
                )

    # 2. Category-based fallback for any unhandled duplicates in the same category
    category_groups: Dict[str, List[Commitment]] = {}
    for c in active:
        if str(c.id) not in handled_commitment_ids:
            cat = (c.category or "").strip().lower()
            if cat and cat not in ("other", "unknown", "card", "loan", "subscription", "recurring", "membership", "needs_review"):
                category_groups.setdefault(cat, []).append(c)

    for cat, group in category_groups.items():
        if len(group) >= 2:
            count = len(group)
            count_word = NUMBER_WORDS.get(count, str(count))
            formatted_names = _format_names_list([c.display_name for c in group])
            summary = f"You have {count_word} {cat} subscriptions: {formatted_names}."
            explanation = (
                f"Multiple active subscriptions detected in '{cat.title()}': {formatted_names}. "
                f"Consolidating to a single preferred provider could reduce your recurring expenses."
            )
            sorted_by_cost = sorted(group, key=lambda c: c.annualised_amount or Decimal("0.00"))
            savings = sum(
                (c.annualised_amount or (c.representative_amount or Decimal("0")) * 12 for c in sorted_by_cost[:-1]),
                Decimal("0.00")
            )

            for c in group:
                others = [o for o in group if o.id != c.id]
                results.append(
                    DuplicateSubscriptionResult(
                        cluster_type=f"cat_{cat[:15]}",
                        cluster_label=cat,
                        primary_commitment=c,
                        other_commitments=others,
                        all_commitments=group,
                        summary=summary,
                        explanation=explanation,
                        potential_annual_saving=savings,
                    )
                )

    return results
