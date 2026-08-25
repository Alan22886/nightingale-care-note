from api_client import Client
def test_every_highlight_resolves_to_immutable_span():
    status,p=Client().role('clinician').request('/api/highlights'); assert status==200
    assert any(h['ai'] for h in p['highlights'])
    for h in p['highlights']:
        prov=h['provenance']; source=p['sources'][prov['sourceEntryId']]; version=source['version']
        assert version['id']==prov['sourceVersionId']
        assert version['content'][prov['startOffset']:prov['endOffset']]==prov['sourceExcerpt']
