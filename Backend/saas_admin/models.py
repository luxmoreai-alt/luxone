from django.db import models

class Company(models.Model):
    company_name = models.CharField(max_length=255, unique=True)
    company_email = models.EmailField(unique=True)
    contact_person = models.CharField(max_length=255)
    phone = models.CharField(max_length=50, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    subscription_plan = models.CharField(max_length=100)
    
    # Crucial technical fields
    db_name = models.CharField(max_length=100, unique=True)
    status = models.CharField(
        max_length=20, 
        choices=[('Active', 'Active'), ('Inactive', 'Inactive')], 
        default='Active'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.company_name
