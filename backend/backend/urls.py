from django.contrib import admin
from django.urls import path, re_path
from mails import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/login/', views.google_login),
    path('api/auth/callback/', views.google_callback),
    path('api/auth/logout/', views.google_logout),
    path('api/user/me/', views.get_user_profile),
    path('api/gmail/scan/', views.GmailScannerView.as_view()),
    re_path(r'^.*$', views.index), # Capture tout pour React
]