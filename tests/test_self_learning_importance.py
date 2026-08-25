from api_client import Client
def test_positive_feedback_increases_bounded_category_weight():
    c=Client().role('clinician'); c.request('/api/importance','POST',{'reset':True}); _,before=c.request('/api/importance')
    for _ in range(20): c.request('/api/importance','POST',{'category':'medication_change','action':'pin'})
    _,after=c.request('/api/importance'); assert after['weights']['medication_change']>before['weights']['medication_change']; assert .8<=after['weights']['medication_change']<=1.35; assert after['weights']['medication_change']>after['weights']['administrative']
