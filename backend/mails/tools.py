"""
Outils Gmail exposés à l'agent IA.
"""
from datetime import datetime, timedelta


def delete_old_emails(service, days: int) -> int:
    """
    Recherche et supprime les messages Gmail plus anciens que `days` jours.

    Args:
        service: Client Gmail API (build('gmail', 'v1', credentials=...)).
        days: Nombre de jours ; les messages antérieurs à cette date sont supprimés.

    Returns:
        Nombre de mails supprimés.
    """
    limit_date = datetime.utcnow() - timedelta(days=days)
    before_str = limit_date.strftime("%Y/%m/%d")
    query = f"before:{before_str}"
    deleted_count = 0
    page_token = None

    while True:
        list_params = {
            "userId": "me",
            "q": query,
            "maxResults": 500,
        }
        if page_token:
            list_params["pageToken"] = page_token

        result = service.users().messages().list(**list_params).execute()
        messages = result.get("messages", [])
        if not messages:
            break

        ids = [m["id"] for m in messages]
        # batchDelete accepte jusqu'à 1000 IDs
        service.users().messages().batchDelete(userId="me", body={"ids": ids}).execute()
        deleted_count += len(ids)

        page_token = result.get("nextPageToken")
        if not page_token:
            break

    return deleted_count


def get_recent_emails(service, limit: int = 10):
    """
    Récupère les N derniers e-mails (sujet, expéditeur, extrait).

    Args:
        service: Client Gmail API.
        limit: Nombre maximum de mails à retourner (défaut 10).

    Returns:
        Liste de dicts avec id, subject, sender, snippet.
    """
    result = service.users().messages().list(
        userId="me",
        maxResults=min(limit, 50),
    ).execute()
    messages = result.get("messages", [])
    out = []
    for msg in messages[:limit]:
        m = service.users().messages().get(userId="me", id=msg["id"]).execute()
        headers = m.get("payload", {}).get("headers", [])
        subject = next((h["value"] for h in headers if h["name"] == "Subject"), "")
        sender = next((h["value"] for h in headers if h["name"] == "From"), "")
        out.append({
            "id": msg["id"],
            "subject": subject,
            "sender": sender,
            "snippet": m.get("snippet", ""),
        })
    return out


def delete_emails_by_ids(service, message_ids: list) -> int:
    """
    Supprime des e-mails par leur ID Gmail.

    Args:
        service: Client Gmail API.
        message_ids: Liste d'IDs de messages à supprimer.

    Returns:
        Nombre de mails supprimés.
    """
    if not message_ids:
        return 0
    ids = message_ids[:1000]  # batchDelete max 1000
    service.users().messages().batchDelete(userId="me", body={"ids": ids}).execute()
    return len(ids)
