"""Indexing quality check and graph wiring (no LLM, no database)."""

from ai.analyze import PromiseOut, ReelOut, StanceOut, VideoAnalysis, check_slice, quote_found, transcript_slices

LINES = [
    (10.0, "Today we are testing the new three cylinder engine"),
    (14.5, "and honestly the vibration at idle is much better than I expected"),
    (19.0, "I will make a part two video comparing it with the four cylinder"),
    (24.0, "so make sure you subscribe"),
]


def _vocab():
    words = " ".join(t for _, t in LINES).lower().split()
    return {tuple(words[i : i + 3]) for i in range(len(words) - 2)}, set(words)


def test_quote_found_accepts_real_and_near_verbatim_quotes():
    grams, vocab = _vocab()
    assert quote_found("the vibration at idle is much better than I expected", grams, vocab)
    assert quote_found("Honestly, the vibration at idle is much better", grams, vocab)  # punctuation/case
    assert not quote_found("this engine is the worst purchase I have ever made", grams, vocab)
    assert not quote_found("", grams, vocab)


def test_check_slice_keeps_valid_items_and_reports_problems():
    draft = VideoAnalysis(
        reels=[ReelOut(start=10, end=40), ReelOut(start=500, end=530)],
        promises=[
            PromiseOut(timestamp=19, quote="I will make a part two video", promise="Part 2: 3 vs 4 cylinder"),
            PromiseOut(timestamp=19, quote="I promise a giveaway next week", promise="Giveaway"),
        ],
        stances=[
            StanceOut(timestamp=14.5, topic="Three Cylinder Engines", stance="Smoother than expected",
                      quote="the vibration at idle is much better"),
            StanceOut(timestamp=900, topic="engines", stance="x", quote="the vibration at idle is much better"),
        ],
    )
    ok, problems = check_slice(draft, LINES)
    assert [r.start for r in ok.reels] == [10]
    assert [p.promise for p in ok.promises] == ["Part 2: 3 vs 4 cylinder"]
    assert [s.topic for s in ok.stances] == ["three cylinder engines"]  # normalised
    joined = " | ".join(problems)
    assert "reel at 500" in joined and "Giveaway" in joined and "900" in joined
    assert len(problems) == 3


def test_lenient_parsing_drops_only_bad_items():
    data = {
        "reels": [{"start": "12.5", "end": 40, "scores": {"hook": "9", "value": "n/a"}}, {"start": "oops"}],
        "promises": [{"promise": "Make part 2", "quote": "q"}, {"quote": "no promise field"}],
        "stances": None,
    }
    a = VideoAnalysis.lenient(data)
    assert len(a.reels) == 1 and a.reels[0].start == 12.5
    assert a.reels[0].scores.hook == 9 and a.reels[0].scores.value == 5  # unparseable score → neutral
    assert [p.promise for p in a.promises] == ["Make part 2"]
    assert a.stances == []


def test_transcript_slices_respect_size():
    class C:
        def __init__(self, segs):
            self.segments = segs

    chunks = [C([[float(i), "word " * 40] for i in range(j * 10, j * 10 + 10)]) for j in range(5)]
    slices = transcript_slices(chunks, max_chars=1000)
    assert sum(len(s) for s in slices) == 50
    assert all(sum(len(f"[{a}] {b}") + 1 for a, b in s) <= 1000 + 250 for s in slices)


def test_indexing_graph_wiring():
    from agents.indexing_graph import build_graph

    g = build_graph().get_graph()
    edges = {(e.source, e.target) for e in g.edges}
    for edge in [
        ("__start__", "resolve_channel"),
        ("__start__", "store_upload"),
        ("__start__", "audit_promises"),
        ("fetch_transcript", "fetch_transcript"),
        ("next_video", "extract"),
        ("quality_check", "extract"),  # retry loop
        ("quality_check", "save"),
        ("save", "next_video"),
        ("audit_promises", "finish"),
    ]:
        assert edge in edges, edge
