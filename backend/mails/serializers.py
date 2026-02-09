from rest_framework import serializers
from .models import FilteredEmail


class FilteredEmailSerializer(serializers.ModelSerializer):
    class Meta:
        model = FilteredEmail
        fields = ["id", "subject", "sender", "body", "date_received", "is_processed"]
        read_only_fields = ["id"]
