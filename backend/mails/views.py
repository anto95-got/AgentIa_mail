import os

from django.shortcuts import render
from imap_tools import MailBox, AND
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .models import FilteredEmail
from .serializers import FilteredEmailSerializer


def index(request):
    return render(request, "index.html")


class EmailAgentScanView(APIView):
    def get(self, request):
        imap_host = os.getenv("IMAP_HOST", "imap.gmail.com")
        imap_email = os.getenv("IMAP_EMAIL")
        imap_password = os.getenv("IMAP_APP_PASSWORD")

        if not imap_email or not imap_password:
            return Response(
                {
                    "error": (
                        "Missing IMAP credentials. Set IMAP_EMAIL and "
                        "IMAP_APP_PASSWORD in your environment."
                    )
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        try:
            with MailBox(imap_host).login(imap_email, imap_password) as mailbox:
                for msg in mailbox.fetch(AND(seen=False)):
                    subject = (msg.subject or "").strip()
                    if "urgent" in subject.lower():
                        body = (msg.text or msg.html or "").strip()
                        FilteredEmail.objects.get_or_create(
                            subject=subject,
                            sender=msg.from_,
                            date_received=msg.date,
                            defaults={"body": body},
                        )

            emails = FilteredEmail.objects.all().order_by("-date_received")
            serializer = FilteredEmailSerializer(emails, many=True)
            return Response(serializer.data)

        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
