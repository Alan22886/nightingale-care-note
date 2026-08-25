from api_client import Client
def test_versions_order_revert_and_audit():
    c=Client().role('clinician'); status,p=c.request('/api/entries/clinician_note'); assert status==200
    baseline=p['entry']['versions'][-1]['version']; old=p['entry']['versions'][0]['content']
    status,p=c.request('/api/entries/clinician_note','PATCH',{'expectedVersion':baseline,'content':'Treatment plan revision A'}); assert status==200
    status,p=c.request('/api/entries/clinician_note','PATCH',{'expectedVersion':baseline+1,'content':'Treatment plan revision B'}); assert status==200
    versions=p['entry']['versions']; assert [v['version'] for v in versions]==sorted(v['version'] for v in versions)
    status,p=c.request('/api/entries/clinician_note','PATCH',{'revertFrom':1}); assert status==200
    assert p['entry']['content']==old and p['entry']['versions'][-1]['version']==baseline+3 and p['entry']['versions'][-1]['revertedFrom']==1
    status,audit=c.request('/api/audit'); assert status==200
    last=audit['events'][-1]; assert last['actor']=='clinician_a' and last['action']=='ENTRY_REVERTED' and last['fromVersion']+1==last['toVersion']
