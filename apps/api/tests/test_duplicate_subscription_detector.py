"""Unit tests for duplicate and overlapping subscription detector."""
from decimal import Decimal
import uuid
import pytest

from app.models.commitment import Commitment
from app.models.merchant import Merchant
from app.analytics.insights.duplicate_subscription_detector import detect_duplicate_subscriptions


def _make_commitment(name: str, category: str = "Entertainment", merchant_name: str = None) -> Commitment:
    m = Merchant(
        id=uuid.uuid4(),
        canonical_name=merchant_name or name,
        category=category,
    ) if merchant_name else None
    return Commitment(
        id=uuid.uuid4(),
        display_name=name,
        category=category,
        commitment_type="subscription",
        cadence="monthly",
        status="active",
        representative_amount=Decimal("199.00"),
        annualised_amount=Decimal("2388.00"),
        merchant=m,
    )


def test_detect_music_duplicates_spotify_and_youtube_premium():
    """Detect two music subscriptions: Spotify and YouTube Premium."""
    spotify = _make_commitment("Spotify", "Entertainment", "Spotify")
    youtube = _make_commitment("YouTube Premium", "Entertainment", "YouTube")
    gym = _make_commitment("Zenith Fitness", "Fitness", "Zenith Fitness")

    results = detect_duplicate_subscriptions([spotify, youtube, gym])
    assert len(results) == 2  # One result for each involved commitment

    spotify_res = next(r for r in results if r.primary_commitment.display_name == "Spotify")
    assert spotify_res.cluster_type == "music"
    assert spotify_res.cluster_label == "music"
    assert "You have two music subscriptions: Spotify and YouTube Premium." in spotify_res.summary


def test_detect_ai_duplicates_chatgpt_and_gemini():
    """Detect two AI subscriptions: ChatGPT and Gemini."""
    chatgpt = _make_commitment("ChatGPT Plus", "Productivity", "OpenAI")
    gemini = _make_commitment("Gemini Pro", "Productivity", "Google")
    netflix = _make_commitment("Netflix", "Entertainment", "Netflix")

    results = detect_duplicate_subscriptions([chatgpt, gemini, netflix])
    ai_results = [r for r in results if r.cluster_type == "ai"]
    assert len(ai_results) == 2

    chatgpt_res = next(r for r in ai_results if r.primary_commitment.display_name == "ChatGPT Plus")
    assert chatgpt_res.summary == "You have two AI subscriptions: ChatGPT and Gemini."


def test_no_duplicate_for_single_subscription():
    """Single subscription in category should not produce duplicate insights."""
    spotify = _make_commitment("Spotify", "Entertainment")
    gym = _make_commitment("Zenith Fitness", "Fitness")

    results = detect_duplicate_subscriptions([spotify, gym])
    assert len(results) == 0
