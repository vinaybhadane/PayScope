"""Six predefined subscriptions for guest demos; prices are illustrative INR values."""
from datetime import datetime, timezone
from decimal import Decimal
import uuid

from sqlalchemy import select, text
from app.models.account import Account
from app.models.commitment import Commitment
from app.models.commitment_transaction import CommitmentTransaction
from app.models.merchant import Merchant
from app.models.transaction import Transaction
from app.analytics.date_utils import estimate_next_expected_date

DEMO_SUBSCRIPTIONS = (
    ("netflix", "Netflix", "Netflix", "Entertainment", 649, 16),
    ("prime", "Amazon Prime", "Amazon", "Entertainment", 299, 18),
    ("youtube", "YouTube Premium", "YouTube", "Entertainment", 129, 20),
    ("spotify", "Spotify", "Spotify", "Entertainment", 119, 14),
    ("chatgpt", "ChatGPT Plus", "OpenAI", "Productivity", 1999, 22),
    ("gemini", "Gemini Pro", "Google", "Productivity", 1950, 26),
)


def seed_subscription_demo(db, user_id):
    # Serialize concurrent tab/bootstrap requests for this guest's workspace.
    db.execute(text('SELECT pg_advisory_xact_lock(hashtextextended(:key, 0))'),
               {'key': 'demo-seed:' + str(user_id)})
    account_id = uuid.uuid5(user_id, 'subscription-demo-card')
    if db.get(Account, account_id) is None:
        db.add(Account(id=account_id, user_id=user_id, label='Demo Visa •• 4242',
                       account_type='card', currency='INR', is_synthetic=True))
        db.flush()
    now = datetime.now(timezone.utc)
    for slug, name, company, category, amount, day in DEMO_SUBSCRIPTIONS:
        commitment_id = uuid.uuid5(user_id, 'subscription-demo:' + slug)
        if db.get(Commitment, commitment_id) is not None:
            continue
        merchant = db.scalar(select(Merchant).where(Merchant.canonical_name == company))
        if merchant is None:
            merchant = Merchant(id=uuid.uuid5(uuid.NAMESPACE_URL, 'payscope-company:' + company),
                                canonical_name=company, category=category,
                                commitment_type_default='subscription', is_fictional_demo_merchant=False)
            db.add(merchant)
            db.flush()
        dates = []
        # Six completed calendar months keep the sample evidence stable and easy to follow.
        for offset in range(6, 0, -1):
            month_index = now.year * 12 + now.month - 1 - offset
            dates.append(datetime(month_index // 12, month_index % 12 + 1, day, tzinfo=timezone.utc))
        value = Decimal(amount)
        db.add(Commitment(id=commitment_id, user_id=user_id, merchant_id=merchant.id,
            display_name=name, category=category, commitment_type='subscription', cadence='monthly',
            amount_pattern='fixed', status='active', currency='INR', representative_amount=value,
            amount_min=value, amount_max=value, first_seen_at=dates[0], last_seen_at=dates[-1],
            next_expected_date=estimate_next_expected_date(dates[-1].date(), 'monthly', 0),
            annualised_amount=value * 12, annualisation_method='monthly_x_12',
            confidence_score=Decimal(95), confidence_band='high', detector_version='predefined-demo-v2',
            detection_explanation='Predefined demo subscription with six monthly synthetic payments. Amounts are illustrative.',
            detection_reason_codes=['predefined_demo']))
        db.flush()
        for index, date in enumerate(dates):
            transaction_id = uuid.uuid5(commitment_id, str(index))
            db.add(Transaction(id=transaction_id, user_id=user_id, account_id=account_id,
                merchant_id=merchant.id, transaction_date=date, raw_descriptor=name,
                normalised_descriptor=name.lower(), amount=value, currency='INR', direction='debit',
                transaction_status='successful', payment_channel='card', is_synthetic=True,
                external_synthetic_id='demo-v2:' + slug + ':' + str(index)))
            db.flush()
            db.add(CommitmentTransaction(commitment_id=commitment_id, transaction_id=transaction_id,
                relationship_role='recurrence_evidence', reason='Predefined monthly demo payment'))

    # Seed SynthWrite AI trial subscription for demo workspace
    synth_slug = "synthwrite"
    synth_id = uuid.uuid5(user_id, 'subscription-demo:' + synth_slug)
    if db.get(Commitment, synth_id) is None:
        synth_merchant = db.scalar(select(Merchant).where(Merchant.canonical_name == "SynthWrite AI"))
        if synth_merchant is None:
            synth_merchant = Merchant(
                id=uuid.uuid5(uuid.NAMESPACE_URL, 'payscope-company:SynthWrite AI'),
                canonical_name="SynthWrite AI", category="Productivity",
                commitment_type_default='subscription', is_fictional_demo_merchant=False
            )
            db.add(synth_merchant)
            db.flush()
        val_799 = Decimal("799.00")
        db.add(Commitment(
            id=synth_id, user_id=user_id, merchant_id=synth_merchant.id,
            display_name="SynthWrite AI", category="Productivity", commitment_type="subscription",
            cadence="monthly", amount_pattern="fixed", status="active", currency="INR",
            representative_amount=val_799, amount_min=val_799, amount_max=val_799,
            first_seen_at=now, last_seen_at=now,
            next_expected_date=estimate_next_expected_date(now.date(), 'monthly', 0),
            annualised_amount=val_799 * 12, annualisation_method="monthly_x_12",
            confidence_score=Decimal(95), confidence_band="high", detector_version="predefined-demo-v2",
            detection_explanation="Free trial converting to monthly subscription.",
            detection_reason_codes=["trial_conversion"]
        ))
        db.flush()
        from app.models.payment_notification import PaymentNotification
        notif_id = uuid.uuid5(synth_id, 'trial-started-notif')
        if db.get(PaymentNotification, notif_id) is None:
            db.add(PaymentNotification(
                id=notif_id, user_id=user_id, merchant_hint="SynthWrite AI",
                event_type="trial_started", event_timestamp=now,
                message_text="Your free trial ends in 3 days; the next charge will be ₹799.",
                payment_mechanism="upi_autopay", is_synthetic=True
            ))
        synth_tx_id = uuid.uuid5(synth_id, 'trial-tx-0')
        if db.get(Transaction, synth_tx_id) is None:
            db.add(Transaction(
                id=synth_tx_id, user_id=user_id, account_id=account_id,
                merchant_id=synth_merchant.id, transaction_date=now,
                raw_descriptor="SYNTHWRITE AI PRO PLAN", normalised_descriptor="synthwrite ai pro plan",
                amount=val_799, currency="INR", direction="debit",
                transaction_status="successful", payment_channel="upi", is_synthetic=True,
                external_synthetic_id='demo-v2:synthwrite:0'
            ))
            db.flush()
            db.add(CommitmentTransaction(
                commitment_id=synth_id, transaction_id=synth_tx_id,
                relationship_role="recurrence_evidence", reason="First paid conversion after free trial"
            ))

    db.commit()
    from app.analytics.insights import run_insight_detection
    run_insight_detection(db, user_id)
    from app.analytics.demo_review import save_predefined_demo_report
    from app.core.read_cache import invalidate_read_caches
    save_predefined_demo_report(db, user_id)
    invalidate_read_caches()
    return {'success': True, 'total_discovered': 7, 'model': 'predefined-demo-v2'}
