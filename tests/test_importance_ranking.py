from api_client import Client
MEDICATION_HIGHLIGHT='40000000-0000-4000-8000-000000000004'
def test_feedback_payload_schema_and_bounds():
    c=Client().role('clinician'); assert c.request('/api/importance','POST',{'action':'pin'})[0]==400
    for _ in range(40): c.request('/api/importance','POST',{'highlightId':MEDICATION_HIGHLIGHT,'action':'dismiss'})
    _,p=c.request('/api/importance'); assert p['weights']['medication_change']>=.8
