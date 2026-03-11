from crm_backend.middleware import get_current_db_name

class TenantRouter:
    """
    A router to control all database operations to route to dynamically assigned 
    tenant (PostgreSQL) databases or the master (`default`) database.
    """
    def db_for_read(self, model, **hints):
        """
        Reads go to the dynamically set database EXCEPT for `saas_admin` app.
        """
        if model._meta.app_label in ['saas_admin', 'contenttypes']:
            return 'default'
        return get_current_db_name()

    def db_for_write(self, model, **hints):
        """
        Writes go to the dynamically set database EXCEPT for `saas_admin` app.
        """
        if model._meta.app_label in ['saas_admin', 'contenttypes']:
            return 'default'
        return get_current_db_name()

    def allow_relation(self, obj1, obj2, **hints):
        """
        Allow relations if a model in the same database is involved.
        """
        return True

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        """
        Make sure the `saas_admin` app only appears in the 'default' database.
        And don't migrate `saas_admin` into tenant databases.
        """
        if app_label == 'saas_admin':
            return db == 'default'
        
        if db == 'default' and app_label not in ['saas_admin', 'auth', 'admin', 'contenttypes', 'sessions']:
             # Optional constraint to keep CRM tables out of 'default'
             pass
             
        return True
