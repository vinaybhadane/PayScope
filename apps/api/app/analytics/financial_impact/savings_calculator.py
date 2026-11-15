"""Savings Intelligence engine: opportunity discovery, evidence linking, and what-if calculations."""

import uuid
from decimal import Decimal
from typing import Any, Dict, List, Optional, Set
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.analytics.financial_impact.commitment_costs import get_user_commitment_costs
from app.analytics.financial_impact.config import (
    SAVINGS_CLASS_POTENTIAL,
    SAVINGS_CLASS_USER_SELECTED,
)
from app.analytics.financial_impact.normalization import round_currency
from app.analytics.financial_impact.schemas import (
    SavingsCalculateRequest,
    SavingsCalculateResponse,
    SavingsOpportunityItem,
    SavingsSummaryResponse,
    CommitmentCostItem,
)
from app.models.commitment import Commitment
from app.models.commitment_insight import CommitmentInsight
from app.models.insight_evidence import InsightEvidence
from app.models.price_event import PriceEvent
from app.models.usage_coverage import UsageCoverage


def get_user_savings_opportunities(
    db: Session,
    user_id: uuid.UUID,
    cost_items: Optional[List[CommitmentCostItem]] = None,
) -> List[SavingsOpportunityItem]:
    """AI recommendations paired with recorded costs for explicit cancellation scenarios."""
    if cost_items is None:
        cost_items = get_user_commitment_costs(db, user_id)
    cost_map = {item.commitment_id: item for item in cost_items}
    # AI chooses relevant product-specific scenarios. Currency arithmetic uses
    # persisted observations; Gemini never supplies an invented savings amount.
    from app.models.workspace_intelligence import WorkspaceIntelligence
    review = db.get(WorkspaceIntelligence, user_id)
    if review:
        result = []
        for sub in review.report.get('subscriptions', []):
            item = cost_map.get(uuid.UUID(sub['commitment_id']))
            recommendation = sub.get('savings_recommendation')
            if not item or not item.is_confirmed or not recommendation:
                continue
            result.append(SavingsOpportunityItem(id=f'opp_ai_{item.commitment_id}', opportunity_type='AI_REVIEW',
                classification=SAVINGS_CLASS_POTENTIAL, commitment_id=item.commitment_id,
                commitment_name=item.display_name, merchant_name=item.merchant_name,
                category=item.category or item.commitment_type,
                current_monthly_cost=item.normalized_monthly_cost, current_annual_cost=item.annualized_cost,
                potential_monthly_saving=item.normalized_monthly_cost, potential_annual_saving=item.annualized_cost,
                evidence_summary=recommendation + ' Simulator assumption: full cancellation of this subscription, not a plan discount. No cancellation is performed.',
                details={'source': review.model, 'assumption': 'User-selected cancellation; full observed recurring cost avoided. No cancellation has been performed.'}))
        return result

    return []



def get_user_savings_summary(
    db: Session,
    user_id: uuid.UUID,
    cost_items: Optional[List[CommitmentCostItem]] = None,
) -> SavingsSummaryResponse:
    """Return total potential savings aggregated by opportunity type with full opportunity breakdown."""
    if cost_items is None:
        cost_items = get_user_commitment_costs(db, user_id)
    opps = get_user_savings_opportunities(db, user_id, cost_items=cost_items)

    price_inc_savings = Decimal("0.00")
    unused_savings = Decimal("0.00")
    dup_savings = Decimal("0.00")

    commitment_max_savings: Dict[uuid.UUID, Decimal] = {}
    for opp in opps:
        t = opp.opportunity_type
        if t == "PRICE_INCREASE":
            price_inc_savings += opp.potential_annual_saving
        elif t == "POTENTIALLY_UNUSED":
            unused_savings += opp.potential_annual_saving
        elif t == "CATEGORY_DUPLICATE":
            dup_savings += opp.potential_annual_saving

        current_max = commitment_max_savings.get(opp.commitment_id, Decimal("0.00"))
        if opp.potential_annual_saving > current_max:
            commitment_max_savings[opp.commitment_id] = opp.potential_annual_saving

    confirmed_items = [item for item in cost_items if item.is_confirmed]
    baseline_confirmed_spend = sum(
        (item.annualized_cost for item in confirmed_items), Decimal("0.00")
    )

    raw_annual = sum(commitment_max_savings.values(), Decimal("0.00"))
    total_annual = min(raw_annual, baseline_confirmed_spend)
    total_monthly = round_currency(total_annual / Decimal("12"))

    return SavingsSummaryResponse(
        currency="INR",
        total_potential_annual_savings=round_currency(total_annual),
        total_potential_monthly_savings=round_currency(total_monthly),
        price_increase_savings=round_currency(price_inc_savings),
        unused_commitment_savings=round_currency(unused_savings),
        duplicate_service_savings=round_currency(dup_savings),
        opportunities_count=len(opps),
        opportunities=opps,
    )


def calculate_what_if_projection(
    db: Session,
    user_id: uuid.UUID,
    selected_opportunity_ids: List[str],
) -> SavingsCalculateResponse:
    """Calculate interactive what-if financial projection with double-counting and non-negative safeguards."""
    cost_items = get_user_commitment_costs(db, user_id)
    confirmed_items = [item for item in cost_items if item.is_confirmed]
    baseline_annual = sum(
        (item.annualized_cost for item in confirmed_items), Decimal("0.00")
    )
    cost_lookup = {item.commitment_id: item.annualized_cost for item in cost_items}

    all_opps = get_user_savings_opportunities(db, user_id)
    opp_lookup = {opp.id: opp for opp in all_opps}

    safeguards: List[str] = [
        "Baseline expenditure excludes unconfirmed/candidate commitments.",
    ]

    savings_by_commitment: Dict[uuid.UUID, Decimal] = {}
    selected_count = 0

    for opp_id in selected_opportunity_ids:
        opp = opp_lookup.get(opp_id)
        if not opp:
            continue

        selected_count += 1
        c_id = opp.commitment_id
        current_saved = savings_by_commitment.get(c_id, Decimal("0.00"))
        max_cost = cost_lookup.get(c_id, opp.current_annual_cost)

        new_saved = current_saved + opp.potential_annual_saving
        if new_saved > max_cost:
            savings_by_commitment[c_id] = max_cost
            if (
                "Double-count protection applied: savings capped at commitment annual cost."
                not in safeguards
            ):
                safeguards.append(
                    "Double-count protection applied: savings capped at commitment annual cost."
                )
        else:
            savings_by_commitment[c_id] = new_saved

    total_annual_savings = sum(savings_by_commitment.values(), Decimal("0.00"))
    total_monthly_savings = round_currency(total_annual_savings / Decimal("12"))

    projected_annual = baseline_annual - total_annual_savings
    if projected_annual < Decimal("0.00"):
        projected_annual = Decimal("0.00")
        safeguards.append(
            "Non-negative safeguard applied: projected annual cost floored at ₹0.00."
        )

    projected_monthly = round_currency(projected_annual / Decimal("12"))

    pct_reduction = Decimal("0.00")
    if baseline_annual > Decimal("0.00"):
        pct_reduction = round_currency(
            (total_annual_savings / baseline_annual) * Decimal("100.0")
        )

    return SavingsCalculateResponse(
        currency="INR",
        baseline_annual_cost=round_currency(baseline_annual),
        selected_annual_savings=round_currency(total_annual_savings),
        selected_monthly_savings=round_currency(total_monthly_savings),
        projected_annual_cost=round_currency(projected_annual),
        projected_monthly_cost=round_currency(projected_monthly),
        percentage_reduction=pct_reduction,
        selected_count=selected_count,
        safeguards_applied=safeguards,
    )
