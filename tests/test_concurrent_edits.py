from api_client import Client

CLINICIAN_ENTRY='30000000-0000-4000-8000-000000000006'
STAFF_ENTRY='30000000-0000-4000-8000-000000000007'

def test_different_sections_update_independently():
    clinician=Client().role('clinician'); staff=Client().role('staff')
    _,cp=clinician.request(f'/api/entries/{CLINICIAN_ENTRY}'); _,sp=staff.request(f'/api/entries/{STAFF_ENTRY}')
    cv=cp['entry']['current_version']; sv=sp['entry']['current_version']
    assert clinician.request(f'/api/entries/{CLINICIAN_ENTRY}','PATCH',{'expectedVersion':cv,'content':'Clinician independent edit'})[0]==200
    assert staff.request(f'/api/entries/{STAFF_ENTRY}','PATCH',{'expectedVersion':sv,'content':'Staff independent edit'})[0]==200
def test_same_section_stale_write_returns_409():
    c=Client().role('clinician'); _,p=c.request(f'/api/entries/{CLINICIAN_ENTRY}'); version=p['entry']['current_version']
    assert c.request(f'/api/entries/{CLINICIAN_ENTRY}','PATCH',{'expectedVersion':version,'content':'First writer'})[0]==200
    status,p=c.request(f'/api/entries/{CLINICIAN_ENTRY}','PATCH',{'expectedVersion':version,'content':'Stale writer'})
    assert status==409 and p['currentVersion']==version+1 and p['attemptedVersion']==version
