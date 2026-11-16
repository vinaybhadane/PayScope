"""Unit and contract tests for MerchantLogoService, URL safety, SSRF protection, and API metadata contract."""
import unittest
import uuid
from decimal import Decimal
from datetime import date

from app.matching.merchant_logo_service import (
    MerchantLogoService,
    ResolvedMerchantMetadata,
    TRUSTED_MERCHANT_REGISTRY,
)
from app.models.merchant import Merchant
from app.analytics.financial_impact.schemas import (
    CommitmentCostItem,
    MerchantCostRanking,
    UpcomingExpenseItem,
    SavingsOpportunityItem,
)


class TestMerchantLogoService(unittest.TestCase):
    """Test suite for safe server-side merchant logo and domain resolution."""

    def test_url_safety_and_ssrf_prevention(self):
        """Verify strict HTTPS enforcement, local asset approval, and rejection of unsafe schemes/SSRF."""
        # Allowed valid URLs
        self.assertTrue(MerchantLogoService.is_safe_https_url("https://netflix.com/logo.svg"))
        self.assertTrue(MerchantLogoService.is_safe_https_url("https://www.google.com/s2/favicons?domain=spotify.com&sz=128"))
        self.assertTrue(MerchantLogoService.is_safe_https_url("/merchant-logos/netflix.svg"))
        self.assertTrue(MerchantLogoService.is_safe_https_url("/merchant-logos/chatgpt.png"))

        # Rejected unsafe protocols
        self.assertFalse(MerchantLogoService.is_safe_https_url("http://insecure.com/logo.png"))
        self.assertFalse(MerchantLogoService.is_safe_https_url("javascript:alert(1)"))
        self.assertFalse(MerchantLogoService.is_safe_https_url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=="))
        self.assertFalse(MerchantLogoService.is_safe_https_url("file:///etc/passwd"))

        # Rejected SSRF targets (loopback, private networks, intranet)
        self.assertFalse(MerchantLogoService.is_safe_https_url("https://localhost/logo.png"))
        self.assertFalse(MerchantLogoService.is_safe_https_url("https://127.0.0.1/logo.png"))
        self.assertFalse(MerchantLogoService.is_safe_https_url("https://10.0.0.5/logo.png"))
        self.assertFalse(MerchantLogoService.is_safe_https_url("https://192.168.1.1/logo.png"))
        self.assertFalse(MerchantLogoService.is_safe_https_url("https://172.16.0.1/logo.png"))
        self.assertFalse(MerchantLogoService.is_safe_https_url("https://169.254.169.254/latest/meta-data"))
        self.assertFalse(MerchantLogoService.is_safe_https_url("https://intranet/logo.png"))
        self.assertFalse(MerchantLogoService.is_safe_https_url(""))
        self.assertFalse(MerchantLogoService.is_safe_https_url(None))

    def test_domain_normalization(self):
        """Ensure domains are safely extracted and normalized."""
        self.assertEqual(MerchantLogoService.normalize_domain("https://www.netflix.com/browse"), "netflix.com")
        self.assertEqual(MerchantLogoService.normalize_domain("http://SPOTIFY.COM/"), "spotify.com")
        self.assertEqual(MerchantLogoService.normalize_domain("openai.com"), "openai.com")
        self.assertEqual(MerchantLogoService.normalize_domain("www.figma.com/files"), "figma.com")

        # Invalid domains return None
        self.assertIsNone(MerchantLogoService.normalize_domain("localhost"))
        self.assertIsNone(MerchantLogoService.normalize_domain("http://127.0.0.1"))
        self.assertIsNone(MerchantLogoService.normalize_domain("not-a-domain"))
        self.assertIsNone(MerchantLogoService.normalize_domain(""))
        self.assertIsNone(MerchantLogoService.normalize_domain(None))

    def test_curated_directory_resolution(self):
        """Verify known curated merchants are resolved with approved assets and domains."""
        # Direct lookup by name
        meta_netflix = MerchantLogoService.resolve_merchant_metadata(fallback_name="Netflix")
        self.assertEqual(meta_netflix.verification_status, "verified")
        self.assertEqual(meta_netflix.merchant_domain, "netflix.com")
        self.assertEqual(meta_netflix.merchant_logo_url, "/merchant-logos/netflix.svg")
        self.assertEqual(meta_netflix.logo_source, "curated")

        meta_spotify = MerchantLogoService.resolve_merchant_metadata(fallback_name="spotify")
        self.assertEqual(meta_spotify.verification_status, "verified")
        self.assertEqual(meta_spotify.merchant_domain, "spotify.com")
        self.assertEqual(meta_spotify.merchant_logo_url, "/merchant-logos/spotify.svg")

        meta_chatgpt = MerchantLogoService.resolve_merchant_metadata(fallback_name="ChatGPT")
        self.assertEqual(meta_chatgpt.verification_status, "verified")
        self.assertEqual(meta_chatgpt.merchant_domain, "openai.com")
        self.assertEqual(meta_chatgpt.merchant_logo_url, "/merchant-logos/chatgpt.png")

    def test_merchant_model_cached_metadata_reuse(self):
        """Verify that existing verified metadata stored on the merchant is reused without reprocessing."""
        m_id = uuid.uuid4()
        m = Merchant(
            id=m_id,
            canonical_name="Custom Verified SaaS",
            category="cloud_software",
            domain="customsaas.io",
            logo_url="https://customsaas.io/brand/logo.svg",
            logo_source="manual",
            verification_status="verified",
        )

        res = MerchantLogoService.resolve_merchant_metadata(merchant=m)
        self.assertEqual(res.merchant_id, str(m_id))
        self.assertEqual(res.merchant_name, "Custom Verified SaaS")
        self.assertEqual(res.merchant_domain, "customsaas.io")
        self.assertEqual(res.merchant_logo_url, "https://customsaas.io/brand/logo.svg")
        self.assertEqual(res.logo_source, "manual")
        self.assertEqual(res.verification_status, "verified")

    def test_verified_domain_favicon_fallback(self):
        """Verify that a merchant with an uncurated but verified domain falls back to Google Favicon service."""
        m = Merchant(
            id=uuid.uuid4(),
            canonical_name="Acme Billing Services",
            category="financial",
            website_url="https://www.acmebilling.com/portal",
            verification_status="unverified",
        )

        res = MerchantLogoService.resolve_merchant_metadata(merchant=m)
        self.assertEqual(res.verification_status, "verified")
        self.assertEqual(res.merchant_domain, "acmebilling.com")
        self.assertEqual(res.merchant_logo_url, "https://www.google.com/s2/favicons?domain=acmebilling.com&sz=128")
        self.assertEqual(res.logo_source, "verified_domain_favicon")

    def test_unverified_unknown_merchant_safe_null_fallback(self):
        """Verify that unknown merchants with no reliable domain safely return null, avoiding guessing or fake marks."""
        res = MerchantLogoService.resolve_merchant_metadata(fallback_name="Random Local Plumbing BLR")
        self.assertEqual(res.verification_status, "unverified")
        self.assertIsNone(res.merchant_domain)
        self.assertIsNone(res.merchant_logo_url)
        self.assertEqual(res.logo_source, "unresolved")

        # Fictional demo merchant without verified external domain
        m = Merchant(
            id=uuid.uuid4(),
            canonical_name="Fictional Mystery Service",
            category="utilities",
            website_url=None,
            domain=None,
            logo_url=None,
            verification_status="unverified",
        )
        res_m = MerchantLogoService.resolve_merchant_metadata(merchant=m)
        self.assertEqual(res_m.verification_status, "unverified")
        self.assertIsNone(res_m.merchant_domain)
        self.assertIsNone(res_m.merchant_logo_url)

    def test_api_metadata_contract_cross_page_parity(self):
        """Verify that Savings and Spending Analysis schemas share the exact canonical merchant metadata contract."""
        m_id = uuid.uuid4()
        c_id = uuid.uuid4()

        # 1. CommitmentCostItem (Spending Analysis - All Subscriptions)
        cost_item = CommitmentCostItem(
            commitment_id=c_id,
            merchant_id=m_id,
            merchant_name="Netflix",
            merchant_domain="netflix.com",
            merchant_logo_url="/merchant-logos/netflix.svg",
            logo_source="curated",
            display_name="Netflix 4K Premium",
            commitment_type="subscription",
            cadence="monthly",
            amount_pattern="fixed",
            representative_amount=Decimal("649.00"),
            currency="INR",
            normalized_monthly_cost=Decimal("649.00"),
            annualized_cost=Decimal("7788.00"),
            calculation_method="direct",
            confidence_band="high",
            status="active",
            is_confirmed=True,
            is_candidate=False,
            transaction_count=12,
        )

        # 2. MerchantCostRanking (Spending Analysis - Top Companies)
        ranking = MerchantCostRanking(
            merchant_id=m_id,
            merchant_name="Netflix",
            merchant_domain="netflix.com",
            merchant_logo_url="/merchant-logos/netflix.svg",
            logo_source="curated",
            category="entertainment",
            monthly_cost=Decimal("649.00"),
            annualized_cost=Decimal("7788.00"),
            historical_spend_12m=Decimal("7788.00"),
            percentage_of_total=Decimal("15.5"),
            commitment_count=1,
            aliases=["NETFLIX", "NFLX"],
        )

        # 3. UpcomingExpenseItem (Spending Analysis - Upcoming Payments)
        upcoming = UpcomingExpenseItem(
            commitment_id=c_id,
            display_name="Netflix 4K Premium",
            merchant_id=m_id,
            merchant_name="Netflix",
            merchant_domain="netflix.com",
            merchant_logo_url="/merchant-logos/netflix.svg",
            logo_source="curated",
            expected_date=date(2026, 12, 1),
            estimated_amount=Decimal("649.00"),
            currency="INR",
            cadence="monthly",
            estimation_basis="scheduled",
            is_confirmed=True,
        )

        # 4. SavingsOpportunityItem (Savings - Subscriptions You Can Cancel)
        opp = SavingsOpportunityItem(
            id="opp_1",
            opportunity_type="PRICE_INCREASE",
            classification="POTENTIAL",
            commitment_id=c_id,
            commitment_name="Netflix 4K Premium",
            merchant_id=m_id,
            merchant_name="Netflix",
            merchant_domain="netflix.com",
            merchant_logo_url="/merchant-logos/netflix.svg",
            logo_source="curated",
            category="subscription",
            current_monthly_cost=Decimal("649.00"),
            current_annual_cost=Decimal("7788.00"),
            potential_monthly_saving=Decimal("150.00"),
            potential_annual_saving=Decimal("1800.00"),
            evidence_summary="Price increased from 499 to 649.",
        )

        # Ensure all 4 schemas expose the exact same verified metadata contract
        models = [cost_item, ranking, upcoming, opp]
        for model in models:
            d = model.model_dump()
            self.assertEqual(d["merchant_id"], m_id)
            self.assertEqual(d["merchant_name"], "Netflix")
            self.assertEqual(d["merchant_domain"], "netflix.com")
            self.assertEqual(d["merchant_logo_url"], "/merchant-logos/netflix.svg")
            self.assertEqual(d["logo_source"], "curated")


if __name__ == "__main__":
    unittest.main()
