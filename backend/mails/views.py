import os

from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from imap_tools import MailBox, AND
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status


def index(request):
    return render(request, "index.html")


def _get_credentials(request):
    imap_host = os.getenv("IMAP_HOST", "imap.gmail.com")
    imap_email = os.getenv("IMAP_EMAIL")
    imap_password = os.getenv("IMAP_APP_PASSWORD")

    if request.method == "POST" and request.data:
        data = request.data
        imap_email = data.get("email") or imap_email
        imap_password = data.get("password") or imap_password
        imap_host = data.get("host") or imap_host

    return imap_host, imap_email, imap_password


def _scan_and_return_emails(imap_host, imap_email, imap_password):
    result = []
    with MailBox(imap_host).login(imap_email, imap_password) as mailbox:
        for msg in mailbox.fetch(AND(seen=False), reverse=True):
            subject = (msg.subject or "").strip()
            body = (msg.text or msg.html or "").strip()[:500]
            sender = str(msg.from_) if msg.from_ else ""
            result.append({
                "id": msg.uid,
                "subject": subject,
                "sender": sender,
                "body": body,
                "date_received": msg.date.isoformat() if msg.date else None,
            })
            if len(result) >= 3:
                break
    return result


@method_decorator(csrf_exempt, name="dispatch")
class EmailAgentScanView(APIView):
    def get(self, request):
        imap_host, imap_email, imap_password = _get_credentials(request)
        if not imap_email or not imap_password:
            return Response(
                {
                    "error": (
                        "Identifiants manquants. Connectez-vous via le formulaire ou "
                        "configurez IMAP_EMAIL et IMAP_APP_PASSWORD."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            data = _scan_and_return_emails(imap_host, imap_email, imap_password)
            return Response(data)
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def post(self, request):
        imap_host, imap_email, imap_password = _get_credentials(request)
        if not imap_email or not imap_password:
            return Response(
                {"error": "Email et mot de passe requis."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            data = _scan_and_return_emails(imap_host, imap_email, imap_password)
            return Response(data)
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
