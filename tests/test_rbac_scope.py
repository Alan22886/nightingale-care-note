from api_client import Client
def test_staff_cannot_edit_clinician_note():
    c=Client().role('staff'); status,_=c.request('/api/entries/clinician_note','PATCH',{'expectedVersion':1,'content':'overwrite'}); assert status==403
def test_clinician_cannot_edit_staff_note():
    c=Client().role('clinician'); status,_=c.request('/api/entries/staff_note','PATCH',{'expectedVersion':1,'content':'overwrite'}); assert status==403
def test_patient_cannot_retrieve_internal_comments_or_raw_ai():
    c=Client().role('patient'); assert c.request('/api/security?resource=internal-comments')[0]==403; assert c.request('/api/security?resource=raw-ai')[0]==403
def test_clinic_a_cannot_access_clinic_b_patient():
    c=Client().role('clinician'); assert c.request('/api/security?resource=patient&clinic=clinic-b')[0]==403
