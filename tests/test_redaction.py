from api_client import Client
def test_phi_is_redacted_before_provider_boundary():
    c=Client().role('clinician')
    cases=[
        ('Name: Mei Nordin', ['Mei Nordin'], ['[NAME]']),
        ('Identifier S1234567A', ['S1234567A'], ['[ID]']),
        ('Call +65 9123 4567', ['9123 4567'], ['[PHONE]']),
        ('Email sarah.tan@example.com', ['sarah.tan@example.com'], ['[EMAIL]']),
        ('DOB: 12/04/1972', ['12/04/1972'], ['[DOB]']),
        ('Lives at 18 Orchard Road.', ['18 Orchard Road'], ['[ADDRESS]']),
        ('Patient: Daniel Koh; Sarah Tan S1234567A +65 9123 4567 sarah.tan@example.com DOB: 12/04/1972 18 Orchard Road.', ['Daniel Koh','Sarah Tan','S1234567A','9123 4567','sarah.tan@example.com','12/04/1972','18 Orchard Road'], ['[NAME]','[ID]','[PHONE]','[EMAIL]','[DOB]','[ADDRESS]']),
    ]
    for text,raw_values,tags in cases:
        status,p=c.request('/api/redaction','POST',{'text':text}); assert status==200
        for raw in raw_values: assert raw not in p['providerReceived']
        for tag in tags: assert tag in p['providerReceived']
    clinical='HbA1c 8.3%; metformin 500 mg twice daily; renal function pending.'
    status,p=c.request('/api/redaction','POST',{'text':clinical}); assert status==200 and p['providerReceived']==clinical
def test_patient_cannot_access_redaction_demo(): assert Client().role('patient').request('/api/redaction','POST',{'text':'Sarah Tan'})[0]==403
