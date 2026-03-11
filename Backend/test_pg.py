import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import os
from dotenv import load_dotenv

load_dotenv()

DB_USER = os.getenv('DB_USER', 'postgres')
DB_PASSWORD = os.getenv('DB_PASSWORD', 'zora')
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')

try:
    print(f"Testing PostgreSQL connection for user: {DB_USER}")
    conn = psycopg2.connect(
        dbname='postgres',
        user=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST,
        port=DB_PORT
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    print("✅ Connection successful!")
    
    # Try to create our database now that we have a connection
    cursor = conn.cursor()
    cursor.execute("SELECT 1 FROM pg_catalog.pg_database WHERE datname = 'crms2_master'")
    exists = cursor.fetchone()
    if not exists:
        print("Creating crms2_master database...")
        cursor.execute("CREATE DATABASE crms2_master;")
        print("✅ Database created!")
    else:
        print("✅ crms2_master database already exists!")
        
    cursor.close()
    conn.close()
    
except psycopg2.OperationalError as e:
    print("\n❌ CONNECTION FAILED!")
    if "password authentication failed" in str(e):
        print("The password in the .env file is INCORRECT.")
    else:
        print(f"Error details: {e}")
