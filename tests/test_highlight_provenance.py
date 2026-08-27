from api_client import Client
def test_every_highlight_resolves_to_immutable_span():
    clinician=Client().role('clinician')
    status,p=clinician.request('/api/highlights'); assert status==200
    assert any(h['trust_state']=='AI Suggested' for h in p['highlights'])
    for h in p['highlights']:
        prov=h['provenance_spans'][0]
        source_status,source=clinician.request(f"/api/entries/{prov['source_entry_id']}")
        assert source_status==200
        version=next(v for v in source['entry']['entry_versions'] if v['id']==prov['source_version_id'])
        assert version['content'][prov['start_offset']:prov['end_offset']]==prov['source_excerpt']
