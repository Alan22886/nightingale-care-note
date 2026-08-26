from api_client import Client
CLINICIAN_ENTRY='30000000-0000-4000-8000-000000000006'
STAFF_ENTRY='30000000-0000-4000-8000-000000000007'
CLINIC_B_PATIENT='20000000-0000-4000-8000-000000000006'
def test_staff_cannot_edit_clinician_note():
    c=Client().role('staff'); _,entry=c.request(f'/api/entries/{CLINICIAN_ENTRY}')
    status,_=c.request(f'/api/entries/{CLINICIAN_ENTRY}','PATCH',{'expectedVersion':entry['entry']['current_version'],'content':'overwrite'}); assert status==403
def test_clinician_cannot_edit_staff_note():
    c=Client().role('clinician'); _,entry=c.request(f'/api/entries/{STAFF_ENTRY}')
    status,_=c.request(f'/api/entries/{STAFF_ENTRY}','PATCH',{'expectedVersion':entry['entry']['current_version'],'content':'overwrite'}); assert status==403
def test_patient_cannot_retrieve_internal_comments_or_raw_ai():
    c=Client().role('patient'); assert c.request('/api/security?resource=internal-comments')[0]==403; assert c.request('/api/security?resource=raw-ai')[0]==403
    status,workspace=c.request('/api/workspace?patientId=20000000-0000-4000-8000-000000000004'); assert status==200
    assert workspace['patient']['full_name']=='Sarah Tan'
    assert len(workspace['patients'])==1
    assert not workspace['comments'] and not workspace['highlights']
    assert all(not entry['entry_type'].startswith('ai_') and len(entry['entry_versions'])==1 for entry in workspace['entries'])
def test_clinic_a_cannot_access_clinic_b_patient():
    c=Client().role('clinician'); assert c.request(f'/api/security?resource=patient&patientId={CLINIC_B_PATIENT}')[0]==403
