from api_client import Client
def test_phi_is_redacted_before_provider_boundary():
    text='Sarah Tan S1234567A +65 9123 4567 sarah.tan@example.com DOB: 12/04/1972 18 Orchard Road'
    status,p=Client().role('clinician').request('/api/redaction','POST',{'text':text}); assert status==200
    for raw in ['Sarah Tan','S1234567A','9123 4567','sarah.tan@example.com','12/04/1972','18 Orchard Road']: assert raw not in p['providerReceived']
    for tag in ['[NAME]','[ID]','[PHONE]','[EMAIL]','[DOB]','[ADDRESS]']: assert tag in p['providerReceived']
def test_patient_cannot_access_redaction_demo(): assert Client().role('patient').request('/api/redaction','POST',{'text':'Sarah Tan'})[0]==403
