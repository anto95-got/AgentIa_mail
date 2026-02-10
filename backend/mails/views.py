import os, json
from django.shortcuts import render, redirect
from django.contrib.auth import login, logout
from django.contrib.auth.models import User
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
import google.generativeai as genai
from google.generativeai import types as genai_types
from google.generativeai.protos import Content, Part, FunctionResponse

from .tools import delete_old_emails, get_recent_emails, delete_emails_by_ids

# Force la bibliothèque à accepter le changement de format des scopes de Google
os.environ['OAUTHLIB_RELAX_TOKEN_SCOPE'] = '1'


def get_google_flow():
    """Configure le flux Google avec les scopes exacts attendus par l'API."""
    secret_path = os.path.join(settings.BASE_DIR, settings.GOOGLE_CLIENT_SECRET_FILE)

    return Flow.from_client_secrets_file(
        secret_path,
        scopes=[
            'https://mail.google.com/',  # requis pour supprimer définitivement des mails (batchDelete)
            'https://www.googleapis.com/auth/gmail.modify',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
            'openid'
        ],
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

@csrf_exempt
@api_view(['POST'])
def google_logout(request):
    logout(request)
    request.session.flush()  # vide la session (dont google_token)
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
                "snippet": m.get('snippet', ''),
                "date": m.get('internalDate'),  # timestamp ms pour affichage
            })
        return Response(mail_list)


@method_decorator(csrf_exempt, name="dispatch")
class GmailDeleteView(APIView):
    """Supprime des mails par ID (mails récents listés au scan)."""
    authentication_classes = []  # pas d'auth DRF → pas de vérif CSRF par SessionAuthentication
    permission_classes = []

    def post(self, request):
        token = request.session.get("google_token")
        if not token:
            return Response({"error": "Unauthorized"}, status=401)
        data = getattr(request, "data", None) or {}
        ids = data.get("ids")
        if ids is not None and not isinstance(ids, list):
            ids = [ids]
        ids = ids or []
        ids = [str(i) for i in ids if i]
        if not ids:
            return Response({"error": "ids requis (liste d'IDs)."}, status=400)
        try:
            service = build(
                "gmail", "v1",
                credentials=Credentials.from_authorized_user_info(json.loads(token)),
            )
            deleted = delete_emails_by_ids(service, ids)
            return Response({"deleted": deleted})
        except Exception as e:
            return Response({"error": str(e)}, status=500)


# Déclaration des outils pour Gemini
DELETE_OLD_EMAILS_DECLARATION = genai_types.FunctionDeclaration(
    name="delete_old_emails",
    description="Supprime les e-mails Gmail plus anciens qu'un nombre de jours donné. Utilise cet outil quand l'utilisateur demande de nettoyer, supprimer ou archiver des mails anciens.",
    parameters={
        "type": "object",
        "properties": {
            "days": {
                "type": "integer",
                "description": "Nombre de jours : les messages reçus avant cette limite (en jours) seront supprimés.",
            },
        },
        "required": ["days"],
    },
)

GET_RECENT_EMAILS_DECLARATION = genai_types.FunctionDeclaration(
    name="get_recent_emails",
    description="Récupère les derniers e-mails reçus (sujet, expéditeur, extrait). Utilise cet outil quand l'utilisateur demande de lister, voir, résumer ou lire les derniers mails.",
    parameters={
        "type": "object",
        "properties": {
            "limit": {
                "type": "integer",
                "description": "Nombre de mails à récupérer (par défaut 5, max 20).",
            },
        },
        "required": [],
    },
)


@method_decorator(csrf_exempt, name="dispatch")
class ChatAIView(APIView):
    """Vue du chat IA avec accès Gmail sécurisé par session."""

    def post(self, request):
        # Vérification obligatoire du token Gmail en session
        token = request.session.get("google_token")
        if not token:
            return Response({"error": "Unauthorized"}, status=401)

        message = (request.data or {}).get("message") or (request.POST.get("message") or "")
        if not message.strip():
            return Response({"error": "Le champ 'message' est requis."}, status=400)

        api_key = getattr(settings, "GEMINI_API_KEY", "") or os.environ.get("GEMINI_API_KEY")
        if not api_key:
            return Response({"error": "GEMINI_API_KEY non configurée."}, status=500)

        try:
            genai.configure(api_key=api_key)
            tool = genai_types.Tool(function_declarations=[DELETE_OLD_EMAILS_DECLARATION, GET_RECENT_EMAILS_DECLARATION])
            model = genai.GenerativeModel("gemini-2.5-flash", tools=[tool])
            contents = [{"role": "user", "parts": [message]}]
            max_tool_rounds = 5
            for _ in range(max_tool_rounds):
                response = model.generate_content(contents)
                if not response.candidates or not response.candidates[0].content.parts:
                    return Response(
                        {"error": "Réponse vide du modèle."},
                        status=502,
                    )
                parts = response.candidates[0].content.parts
                function_call = None
                for part in parts:
                    if getattr(part, "function_call", None):
                        function_call = part.function_call
                        break
                if not function_call:
                    text = getattr(response, "text", None) or ""
                    return Response({"reply": text})

                # Exécuter l'outil avec le service Gmail de la session
                raw_args = getattr(function_call, "args", None) or {}
                args = dict(raw_args) if raw_args else {}
                try:
                    service = build(
                        "gmail",
                        "v1",
                        credentials=Credentials.from_authorized_user_info(json.loads(token)),
                    )
                    if function_call.name == "delete_old_emails":
                        days = args.get("days", 30)
                        deleted_count = delete_old_emails(service, days=int(days))
                        tool_result = {"deleted_count": deleted_count}
                    elif function_call.name == "get_recent_emails":
                        limit = min(args.get("limit", 5), 20)
                        emails = get_recent_emails(service, limit=int(limit))
                        tool_result = {"emails": emails}
                    else:
                        return Response(
                            {"error": f"Outil inconnu: {function_call.name}"},
                            status=400,
                        )
                except Exception as e:
                    tool_result = {"error": str(e)}

                # Envoyer le résultat de l'outil au modèle pour obtenir une réponse textuelle
                contents.append(response.candidates[0].content)
                contents.append({
                    "role": "user",
                    "parts": [Part(function_response=FunctionResponse(
                        name=function_call.name,
                        response=tool_result,
                    ))],
                })

            return Response(
                {"error": "Trop d’appels d’outils consécutifs."},
                status=502,
            )
        except Exception as e:
            return Response(
                {"error": f"Erreur serveur: {str(e)}"},
                status=500,
            )