from django.db import models

class FilteredEmail(models.Model):
    subject = models.CharField(max_length=255)
    sender = models.CharField(max_length=255)
    body = models.TextField()
    date_received = models.DateTimeField()
    is_processed = models.BooleanField(default=False)

    def __str__(self):
        return self.subject