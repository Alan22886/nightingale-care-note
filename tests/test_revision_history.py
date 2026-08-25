from api_client import Client
CLINICIAN_ENTRY='30000000-0000-4000-8000-000000000005'
def test_versions_order_revert_and_audit():
    c=Client().role('clinician'); status,p=c.request(f'/api/entries/{CLINICIAN_ENTRY}'); assert status==200
    baseline=p['entry']['current_version']; old=p['entry']['entry_versions'][0]['content']
    status,p=c.request(f'/api/entries/{CLINICIAN_ENTRY}','PATCH',{'expectedVersion':baseline,'content':'Treatment plan revision A'}); assert status==200
    status,p=c.request(f'/api/entries/{CLINICIAN_ENTRY}','PATCH',{'expectedVersion':baseline+1,'content':'Treatment plan revision B'}); assert status==200
    versions=p['entry']['entry_versions']; assert [v['version'] for v in versions]==sorted(v['version'] for v in versions)
    status,p=c.request(f'/api/entries/{CLINICIAN_ENTRY}','PATCH',{'expectedVersion':baseline+2,'revertFrom':1}); assert status==200
    assert p['entry']['entry_versions'][-1]['content']==old and p['entry']['current_version']==baseline+3 and p['entry']['entry_versions'][-1]['reverted_from_version']==1
    status,audit=c.request('/api/audit'); assert status==200
    last=audit['events'][0]; assert last['action']=='ENTRY_REVERTED' and last['from_version']+1==last['to_version']
