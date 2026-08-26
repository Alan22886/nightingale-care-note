from time import time_ns
from api_client import Client

TEST_PATIENT='20000000-0000-4000-8000-000000000007'
STAFF_ENTRY='30000000-0000-4000-8000-000000000007'
TASK='60000000-0000-4000-8000-000000000002'

def test_comment_and_task_changes_survive_new_session():
    first=Client().role('staff')
    marker=f'persistence-{time_ns()}'
    status,created=first.request('/api/comments','POST',{'entryId':STAFF_ENTRY,'patientId':TEST_PATIENT,'body':marker})
    assert status==201 and created['comment']['body']==marker
    _,workspace=first.request(f'/api/workspace?patientId={TEST_PATIENT}')
    current=next(task for task in workspace['tasks'] if task['id']==TASK)['status']
    changed='In Progress' if current!='In Progress' else 'Open'
    assert first.request('/api/tasks','PATCH',{'id':TASK,'status':changed})[0]==200

    refreshed=Client().role('staff')
    status,workspace=refreshed.request(f'/api/workspace?patientId={TEST_PATIENT}')
    assert status==200
    assert any(comment['body']==marker for comment in workspace['comments'])
    assert next(task for task in workspace['tasks'] if task['id']==TASK)['status']==changed
