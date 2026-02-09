import os, json
from django.shortcuts import render, redirect
from django.contrib.auth import login, logout
from django.contrib.auth.models import User
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials

# Force la bibliothèque à accepter le changement de format des scopes de Google
os.environ['OAUTHLIB_RELAX_TOKEN_SCOPE'] = '1'
def get_google_flow():
    return Flow.from_client_secrets_file(
        'client_secret.json',
        scopes=['https://www.googleapis.com/auth/gmail.modify', 'openid', 'email', 'profile'],
        redirect_uri='http://localhost:8000/api/auth/callback/'
    )
def index(request):
    return render(request, "index.html", {
        'is_dev': settings.DEBUG,
        'vite_url': "http://localhost:5173"
    })
def google_login(request):
    flow = get_google_flow()
    auth_url, _ = flow.authorization_url(prompt='consent')
    return redirect(auth_url)

def google_callback(request):
    flow = get_google_flow()
    flow.fetch_token(authorization_response=request.build_absolute_uri().replace('http:', 'https:'))
    creds = flow.credentials
    user_info = build('oauth2', 'v2', credentials=creds).userinfo().get().execute()
    
    user, _ = User.objects.get_or_create(username=user_info['email'], defaults={'email': user_info['email'], 'first_name': user_info.get('given_name','')})
    login(request, user)
    request.session['google_token'] = creds.to_json()
    request.session.save()
    return redirect('http://localhost:8000/')

@api_view(['GET'])
def get_user_profile(request):
    if request.user.is_authenticated:
        return Response({"is_logged_in": True, "full_name": request.user.first_name, "email": request.user.email})
    return Response({"is_logged_in": False})

@api_view(['POST'])
def google_logout(request):
    logout(request)
    return Response({"status": "ok"})

class GmailScannerView(APIView):
    def get(self, request):
        token = request.session.get('google_token')
        if not token: return Response({"error": "Unauthorized"}, status=401)
        service = build('gmail', 'v1', credentials=Credentials.from_authorized_user_info(json.loads(token)))
        results = service.users().messages().list(userId='me', maxResults=10).execute()
        mail_list = []
        for msg in results.get('messages', []):
            m = service.users().messages().get(userId='me', id=msg['id']).execute()
            headers = m['payload']['headers']
            mail_list.append({
                "id": msg['id'],
                "subject": next((h['value'] for h in headers if h['name'] == 'Subject'), "Sans objet"),
                "sender": next((h['value'] for h in headers if h['name'] == 'From'), "Inconnu"),
                "snippet": m.get('snippet', '')
            })
        return Response(mail_list)
    
def get_google_flow():
    """Configure le flux Google avec les scopes exacts attendus par l'API."""
    secret_path = os.path.join(settings.BASE_DIR, 'client_secret.json')
    
    return Flow.from_client_secrets_file(
        secret_path,
        scopes=[
            'https://www.googleapis.com/auth/gmail.modify',
            'https://www.googleapis.com/auth/userinfo.email',   # Format complet
            'https://www.googleapis.com/auth/userinfo.profile', # Format complet
            'openid'
        ],
        redirect_uri='http://localhost:8000/api/auth/callback/'
    )