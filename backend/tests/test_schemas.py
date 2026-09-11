from app.schemas import AblateRequest, AnalyzeRequest


def test_analyze_request_schema():
    req = AnalyzeRequest(sentence="Hello world")
    assert req.sentence == "Hello world"

def test_ablate_request_schema():
    req = AblateRequest(sentence="Test prompt", zero_layers=[0, 1])
    assert req.sentence == "Test prompt"
    assert req.zero_layers == [0, 1]
