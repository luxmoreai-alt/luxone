import os
import django
from copy import deepcopy

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crm_backend.settings')
django.setup()

from saas_admin.services import provision_new_company_tenant
import traceback

data = {
    'company_name': 'Debugger Company 4',
    'company_email': 'debug4@test.com',
    'contact_person': 'Debugger',
    'subscription_plan': 'Basic'
}

try:
    print("Attempting to provision company database...")
    company, email, pwd = provision_new_company_tenant(data)
    print("✅ SUCCESS!")
    print(f"Company: {company.company_name}")
    print(f"DB: {company.db_name}")
    print(f"Email: {email}")
except Exception as e:
    print("\n❌ FAILED WITH EXCEPTION:")
    traceback.print_exc()
