from api_client import Client
MEDICATION_HIGHLIGHT='40000000-0000-4000-8000-000000000005'
def test_positive_feedback_increases_bounded_category_weight():
    c=Client().role('clinician')
    c.request('/api/importance','POST',{'highlightId':MEDICATION_HIGHLIGHT,'action':'dismiss'})
    _,before=c.request('/api/importance')
    c.request('/api/importance','POST',{'highlightId':MEDICATION_HIGHLIGHT,'action':'pin'})
    _,after=c.request('/api/importance')
    assert after['weights']['administrative']>before['weights']['administrative']
    assert .8<=after['weights']['administrative']<=1.35
    assert Client().role('clinician').request('/api/importance')[1]['weights']['administrative']==after['weights']['administrative']
