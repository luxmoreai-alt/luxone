from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CompanyViewSet, admin_dashboard, admin_login

router = DefaultRouter(trailing_slash=False)
router.register(r'companies', CompanyViewSet, basename='company')

urlpatterns = [
    path('admin/login', admin_login, name='saas_admin_login'),
    path('admin/dashboard', admin_dashboard, name='saas_admin_dashboard'),
    path(
        'admin/company/<int:pk>/suspend',
        CompanyViewSet.as_view({'patch': 'suspend'}),
        name='saas_admin_company_suspend'
    ),
    path(
        'admin/company/<int:pk>/activate',
        CompanyViewSet.as_view({'patch': 'activate'}),
        name='saas_admin_company_activate'
    ),
    path('admin/', include(router.urls)),
]
