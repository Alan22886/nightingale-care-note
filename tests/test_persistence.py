from time import time_ns
from api_client import Client

SARAH='20000000-0000-4000-8000-000000000001'
STAFF_ENTRY='30000000-0000-4000-8000-000000000003'
TASK='60000000-0000-4000-8000-000000000001'

def test_comment_and_task_changes_survive_new_session():
    first=Client().role('staff')
    marker=f'persistence-{time_ns()}'
    status,created=first.request('/api/comments','POST',{'entryId':STAFF_ENTRY,'patientId':SARAH,'body':marker})
    assert status==201 and created['comment']['body']==marker
    _,workspace=first.request(f'/api/workspace?patientId={SARAH}')
    current=next(task for task in workspace['tasks'] if task['id']==TASK)['status']
    changed='In Progress' if current!='In Progress' else 'Open'
    assert first.request('/api/tasks','PATCH',{'id':TASK,'status':changed})[0]==200

    refreshed=Client().role('staff')
    status,workspace=refreshed.request(f'/api/workspace?patientId={SARAH}')
    assert status==200
    assert any(comment['body']==marker for comment in workspace['comments'])
    assert next(task for task in workspace['tasks'] if task['id']==TASK)['status']==changed
