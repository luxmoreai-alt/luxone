from saas_admin.models import Company
from saas_admin.services import configure_tenant_database_in_settings
from authentication.models import User

# Step 1: Show all companies / tenant DBs
companies = list(Company.objects.all())
print("=== Companies ===")
for c in companies:
    print(f"  id={c.id}  name={c.name}  db={c.db_name}  status={c.status}")

if not companies:
    print("  (none found)")

# Step 2: Show users in DEFAULT db
print("\n=== Users in default DB ===")
for u in User.objects.using("default").all():
    print(f"  {u.email}  role={u.role}  active={u.is_active}")

# Step 3: For each active company, show + fix users in its tenant DB
EMAIL = "durgamuthusamy457@gmail.com"
PASSWORD = "durga123"

for company in companies:
    if company.status != "Active":
        continue
    configure_tenant_database_in_settings(company.db_name)
    print(f"\n=== Users in tenant DB: {company.db_name} ===")
    try:
        users = User.objects.using(company.db_name).all()
        for u in users:
            print(f"  {u.email}  role={u.role}  active={u.is_active}")

        # Fix or create admin user in this tenant DB
        u = User.objects.using(company.db_name).filter(is_active=True).first()
        if u:
            print(f"\n  --> Resetting password for: {u.email}")
            u.set_password(PASSWORD)
            u.role = "admin"
            u.is_admin = True
            u.must_change_password = False
            u.save(using=company.db_name)
            print(f"  --> Done. Login: {u.email} / {PASSWORD}")
        else:
            print(f"\n  --> No user found, creating admin...")
            u = User(email=EMAIL, role="admin", is_admin=True, is_active=True,
                     name="Durga Muthusamy", must_change_password=False)
            u.set_password(PASSWORD)
            u.save(using=company.db_name)
            print(f"  --> Created: {u.email} / {PASSWORD}")
    except Exception as e:
        print(f"  ERROR: {e}")
