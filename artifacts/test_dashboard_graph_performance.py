"""Isolated tests: no database writes and no production test fixtures."""
from concurrent.futures import ThreadPoolExecutor
from decimal import Decimal
from threading import Event
from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import uuid4
from app.core.read_cache import ReadCache
from app.graph.sync_service import GraphSyncService, _value
from app.graph.overview_service import serialize_neo4j, relational_overview
from app.graph.driver import secure_driver_options
from neo4j import TrustCustomCAs


def test_read_cache_coalesces_concurrent_loads():
    cache = ReadCache()
    started, release = Event(), Event()
    calls = []
    def load():
        calls.append(1); started.set(); release.wait(2); return {"ok": True}
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = [pool.submit(cache.get_or_load, "user", load) for _ in range(8)]
        assert started.wait(1)
        release.set()
        results = [f.result() for f in futures]
    assert len(calls) == 1
    assert all(r[0] == {"ok": True} for r in results)
    assert sum(not r[1] for r in results) == 1


def test_ttl_capacity_and_invalidation():
    cache = ReadCache(ttl=5, capacity=2)
    with patch("app.core.read_cache.monotonic", return_value=0):
        cache.get_or_load("a", lambda: 1)
        cache.get_or_load("b", lambda: 2)
        cache.get_or_load("c", lambda: 3)
        assert len(cache._items) == 2 and "a" not in cache._items
    with patch("app.core.read_cache.monotonic", return_value=6):
        assert cache.get_or_load("c", lambda: 4) == (4, False)
    cache.clear()
    assert not cache._items


def test_failed_load_is_not_cached():
    cache = ReadCache()
    def fail(): raise ValueError("unavailable")
    try: cache.get_or_load("a", fail)
    except ValueError: pass
    assert cache.get_or_load("a", lambda: 3) == (3, False)


def test_neo4j_writes_are_batched_not_per_record():
    db, session, tx = MagicMock(), MagicMock(), MagicMock()
    uid = uuid4()
    rows = [{"id": uid, "amount": Decimal("119.00")} for _ in range(501)]
    db.execute.return_value.mappings.return_value.partitions.return_value = [rows[:500], rows[500:]]
    session.execute_write.side_effect = lambda callback: callback(tx)
    count = GraphSyncService(db)._write_batches(session, MagicMock(), "UNWIND $rows AS row MERGE (n {id:row.id}) SET n+=row", str(uid), "sync")
    assert count == 501 and tx.run.call_count == 2
    assert all(isinstance(c.args[0], str) for c in tx.run.call_args_list)
    assert session.execute_write.call_args_list[0].args[0].timeout == 30
    assert [len(c.kwargs["rows"]) for c in tx.run.call_args_list] == [500, 1]
    assert tx.run.call_args_list[0].kwargs["rows"][0] == {"id": str(uid), "amount": 119.0}


class Node(dict):
    def __init__(self, kind, **props): super().__init__(props); self.labels = {kind}


def test_neo4j_serialization_preserves_real_relationships():
    c = Node("Commitment", id="sub", display_name="Subscription", representative_amount=119.0)
    m = Node("Merchant", id="merchant", canonical_name="Spotify", category="Music")
    rel = SimpleNamespace(start_node=c, end_node=m, type="ASSOCIATED_WITH")
    result = serialize_neo4j({"nodes": [c, m], "relationships": [rel], "last_sync_at": None}, 50)
    assert result.source == "neo4j" and len(result.edges) == 1
    assert result.edges[0].data.source == "sub" and result.edges[0].data.target == "merchant"
    assert result.nodes[0].data.category == "Music"


def test_relational_graph_is_connected_and_bounded_without_lazy_collections():
    db = MagicMock()
    uid, cid, mid, aid, tid = [uuid4() for _ in range(5)]
    merchant = SimpleNamespace(id=mid, canonical_name="Spotify", category="Music")
    commitment = SimpleNamespace(id=cid, display_name="Spotify", representative_amount=119,
        status="active", cadence="monthly", confidence_band="high", merchant=merchant)
    account = SimpleNamespace(id=aid, label="Test card", currency="INR", masked_reference="4242")
    db.scalars.side_effect = [SimpleNamespace(all=lambda:[commitment]), SimpleNamespace(all=lambda:[account]), SimpleNamespace(all=lambda:[])]
    tx = SimpleNamespace(id=tid, account_id=aid, raw_descriptor="Spotify", amount=119, transaction_date=SimpleNamespace(isoformat=lambda:"2026-11-01"), payment_channel="card", merchant_id=mid, commitment_id=cid)
    db.execute.return_value.all.return_value = [tx]
    result = relational_overview(db, uid, 50)
    ids = {n.data.id for n in result.nodes}
    assert all(e.data.source in ids and e.data.target in ids for e in result.edges)
    assert {e.data.relationship_type for e in result.edges} == {"OWNS_ACCOUNT", "HAS_COMMITMENT", "ASSOCIATED_WITH", "SUPPORTED_BY", "HAS_TRANSACTION", "PAID_TO"}
    assert db.scalars.call_count == 3 and db.execute.call_count == 1


def test_invalidation_during_load_does_not_store_stale_snapshot():
    cache = ReadCache()
    def load(): cache.clear(); return "old"
    cache.get_or_load("a", load)
    assert not cache._items


def test_public_tls_uses_verified_ca_bundle():
    uri, options = secure_driver_options("neo4j+s://example.databases.neo4j.io")
    assert uri == "neo4j://example.databases.neo4j.io"
    assert options["encrypted"] is True
    assert isinstance(options["trusted_certificates"], TrustCustomCAs)
    assert options["trusted_certificates"].certs
    assert secure_driver_options("bolt://127.0.0.1:7687") == ("bolt://127.0.0.1:7687", {})
