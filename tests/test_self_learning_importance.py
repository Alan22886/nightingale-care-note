from api_client import Client
MEDICATION_HIGHLIGHT='40000000-0000-4000-8000-000000000004'
def test_positive_feedback_increases_bounded_category_weight():
    c=Client().role('clinician')
    c.request('/api/importance','POST',{'highlightId':MEDICATION_HIGHLIGHT,'action':'dismiss'})
    _,before=c.request('/api/importance')
    c.request('/api/importance','POST',{'highlightId':MEDICATION_HIGHLIGHT,'action':'pin'})
    _,after=c.request('/api/importance')
    assert after['weights']['medication_change']>before['weights']['medication_change']
    assert .8<=after['weights']['medication_change']<=1.35
    assert Client().role('clinician').request('/api/importance')[1]['weights']['medication_change']==after['weights']['medication_change']
