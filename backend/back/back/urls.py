from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from drf_yasg import openapi
from drf_yasg.views import get_schema_view
from rest_framework.permissions import AllowAny

schema_view_v1 = get_schema_view(
    openapi.Info(
        title="제목",
        default_version="v1",
        description="설명",
        terms_of_service="https://www.google.com/policies/terms/",
    ),
    public=True,
    permission_classes=[
        AllowAny,
    ],
)

urlpatterns = [
    path("api/v1/", include("games.urls")),
    path("api/v1/", include("accounts.urls")),
    path("api/v1/", include("friendrequests.urls")),
    re_path(
        r"^swagger(?P<format>\.json|\.yaml)$",
        schema_view_v1.without_ui(cache_timeout=0),
        name="schema-json",
    ),
    re_path(
        r"^swagger/$",
        schema_view_v1.with_ui("swagger", cache_timeout=0),
        name="schema-swagger-ui",
    ),
    re_path(
        r"^redoc/$",
        schema_view_v1.with_ui("redoc", cache_timeout=0),
        name="schema-redoc",
    ),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)