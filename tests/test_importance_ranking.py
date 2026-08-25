from api_client import Client
def test_feedback_payload_schema_and_bounds():
    c=Client().role('clinician'); assert c.request('/api/importance','POST',{'category':'unknown','action':'pin'})[0]==400
    for _ in range(40): c.request('/api/importance','POST',{'category':'administrative','action':'dismiss'})
    _,p=c.request('/api/importance'); assert p['weights']['administrative']>=.8
