from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import Company
from .serializers import CompanySerializer, CompanyDetailSerializer
from .services import provision_new_company_tenant, deactivate_company, activate_company, generate_secure_password, create_or_reset_tenant_admin, get_company_usage_stats, delete_company_and_tenant
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model

from leads.models import Lead

class CompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return CompanyDetailSerializer
        return CompanySerializer

    def retrieve(self, request, *args, **kwargs):
        company = self.get_object()
        usage_stats = get_company_usage_stats(company)
        serializer = self.get_serializer(company, context={"usage_stats": usage_stats})
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        """
        Creates a Company AND provisions their Database.
        """
        data = request.data
        try:
            company, admin_email, admin_password = provision_new_company_tenant(data)
            return Response({
                "message": "Company and Database successfully provisioned.",
                "credentials": {
                    "email": admin_email,
                    "password": admin_password
                },
                "company": CompanySerializer(company).data
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        company = self.get_object()
        try:
            delete_company_and_tenant(company.pk)
        except Exception as exc:
            return Response(
                {"error": f"Failed to delete tenant database: {exc}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        return Response(
            {"message": f"{company.company_name} and its tenant database were deleted successfully."},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=['patch'], url_path='deactivate')
    def deactivate(self, request, pk=None):
        company = deactivate_company(pk)
        return Response({"status": "Deactivated", "company": CompanySerializer(company).data})

    @action(detail=True, methods=['patch'], url_path='suspend')
    def suspend(self, request, pk=None):
        company = deactivate_company(pk)
        return Response({"status": "Inactive", "company": CompanySerializer(company).data})

    @action(detail=True, methods=['patch'], url_path='activate')
    def activate(self, request, pk=None):
        company = activate_company(pk)
        return Response({"status": "Active", "company": CompanySerializer(company).data})

    @action(detail=True, methods=['post'], url_path='generate-credential')
    def generate_credential(self, request, pk=None):
        company = self.get_object()
        password = generate_secure_password()
        email = company.company_email
        create_or_reset_tenant_admin(
            company.db_name,
            email,
            password,
            remove_other_admins=True
        )
        
        return Response({
            "message": "New credential generated.",
            "email": email,
            "password": password
        })

@api_view(['GET'])
def admin_dashboard(request):
    """
    Returns SaaS global stats for the Admin Panel.
    """
    total = Company.objects.count()
    active = Company.objects.filter(status='Active').count()
    inactive = Company.objects.filter(status='Inactive').count()
    
    return Response({
        "total_clients": total,
        "active_clients": active,
        "inactive_clients": inactive,
        "total_crm_users": active * 5, 
        "total_leads": active * 120
    })

@api_view(['POST'])
@permission_classes([AllowAny])
def admin_login(request):
    """
    Super Admin login for the SaaS Dashboard itself.
    Usually bypasses tenant routing because it reads from the 'crms2_master' database.
    """
    email = request.data.get('email')
    password = request.data.get('password')
    
    # Basic master validation. In reality, we ensure this user is a superuser in master.
    user = authenticate(email=email, password=password)
    if user and user.is_superuser:
        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        })
    return Response({"error": "Invalid Admin Credentials"}, status=status.HTTP_401_UNAUTHORIZED)
