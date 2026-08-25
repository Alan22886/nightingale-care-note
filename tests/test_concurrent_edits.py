from api_client import Client
def test_different_sections_update_independently():
    clinician=Client().role('clinician'); staff=Client().role('staff')
    _,cp=clinician.request('/api/entries/clinician_note'); _,sp=staff.request('/api/entries/staff_note')
    cv=cp['entry']['versions'][-1]['version']; sv=sp['entry']['versions'][-1]['version']
    assert clinician.request('/api/entries/clinician_note','PATCH',{'expectedVersion':cv,'content':'Clinician independent edit'})[0]==200
    assert staff.request('/api/entries/staff_note','PATCH',{'expectedVersion':sv,'content':'Staff independent edit'})[0]==200
def test_same_section_stale_write_returns_409():
    c=Client().role('clinician'); _,p=c.request('/api/entries/clinician_note'); version=p['entry']['versions'][-1]['version']
    assert c.request('/api/entries/clinician_note','PATCH',{'expectedVersion':version,'content':'First writer'})[0]==200
    status,p=c.request('/api/entries/clinician_note','PATCH',{'expectedVersion':version,'content':'Stale writer'}); assert status==409 and p['currentVersion']==version+1 and p['attemptedVersion']==version
