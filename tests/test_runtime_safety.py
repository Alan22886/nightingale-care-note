from api_client import Client

QA_PATIENT='20000000-0000-4000-8000-000000000007'
QA_RELEASED='33000000-0000-4000-8000-000000000001'
QA_DENIED=[
    '33000000-0000-4000-8000-000000000002',
    '33000000-0000-4000-8000-000000000003',
    '33000000-0000-4000-8000-000000000004',
    '33000000-0000-4000-8000-000000000005',
]
QA_SAFETY_HIGHLIGHT='40000000-0000-4000-8000-000000000006'

def test_patient_release_is_enforced_by_rls_for_hidden_qa_patient():
    patient=Client().role('qa_patient')
    assert patient.request(f'/api/entries/{QA_RELEASED}')[0]==200
    for entry_id in QA_DENIED:
        assert patient.request(f'/api/entries/{entry_id}')[0] in (403,404)
    status,workspace=patient.request(f'/api/workspace?patientId={QA_PATIENT}')
    assert status==200
    assert [entry['id'] for entry in workspace['entries']]==[QA_RELEASED]

def test_runtime_scribe_persists_only_an_internal_grounded_qa_draft():
    clinician=Client().role('clinician')
    raw='Automated Test Patient reviewed with Dr Marcus Lim. Lisinopril 5 mg QD. HbA1c 7.3%.'
    status,result=clinician.request('/api/scribe','POST',{'patientId':QA_PATIENT,'rawText':raw})
    assert status==201,result
    assert result['provider']=={'name':'deterministic','model':'deterministic-clinical-v2'}
    assert 'Automated Test Patient' not in result['redaction']['providerReceived']
    assert 'Dr Marcus Lim' not in result['redaction']['providerReceived']
    assert len(result['groundedAssertions'])>=2
    assert not result['withheldAssertions']
    assert result['draft']['releaseState']=='internal'
    entry_id=result['draft']['entryId']
    status,entry=clinician.request(f'/api/entries/{entry_id}')
    assert status==200
    assert entry['entry']['visibility']=='internal'
    assert entry['entry']['release_state']=='internal'
    assert entry['entry']['entry_type']=='ai_scribe_draft'
    assert Client().role('qa_patient').request(f'/api/entries/{entry_id}')[0] in (403,404)

def test_runtime_scribe_detects_incompatible_qa_dosage_as_needs_review():
    clinician=Client().role('clinician')
    clinician.request('/api/scribe','POST',{'patientId':QA_PATIENT,'rawText':'Metformin 500 mg twice daily.'})
    status,result=clinician.request('/api/scribe','POST',{'patientId':QA_PATIENT,'rawText':'Metformin 1000 mg twice daily.'})
    assert status==201,result
    assert result['needsReviewAssertions']
    assert result['conflicts']
    assert result['draft']['releaseState']=='review_required'

def test_scribe_role_boundary_and_safety_floor_acknowledgement():
    for role in ('patient','qa_patient','staff','admin'):
        assert Client().role(role).request('/api/scribe','POST',{'patientId':QA_PATIENT,'rawText':'Metformin 500 mg BID.'})[0]==403
    clinician=Client().role('clinician')
    assert clinician.request('/api/importance','POST',{'highlightId':QA_SAFETY_HIGHLIGHT,'action':'dismiss'})[0]==400
    status,result=clinician.request('/api/importance','POST',{'highlightId':QA_SAFETY_HIGHLIGHT,'action':'acknowledge'})
    assert status==200 and result['feedback']['status']=='accepted' and result['feedback']['safetyFloor'] is True
    assert clinician.request('/api/importance','POST',{'highlightId':QA_SAFETY_HIGHLIGHT,'action':'restore','status':'suggested','pinned':False})[0]==200
