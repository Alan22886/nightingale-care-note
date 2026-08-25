import json, os, urllib.error, urllib.request
from http.cookiejar import CookieJar

BASE_URL=os.environ.get('NIGHTINGALE_BASE_URL','http://localhost:3000')
class Client:
    def __init__(self): self.opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(CookieJar()))
    def request(self,path,method='GET',body=None):
        data=json.dumps(body).encode() if body is not None else None
        req=urllib.request.Request(BASE_URL+path,data=data,method=method,headers={'content-type':'application/json'})
        try:
            with self.opener.open(req,timeout=5) as response:return response.status,json.loads(response.read() or b'{}')
        except urllib.error.HTTPError as error:return error.code,json.loads(error.read() or b'{}')
    def role(self,role):
        status,payload=self.request('/api/session','POST',{'role':role});assert status==200,payload;return self
