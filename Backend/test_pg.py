import os

import psycopg2
from dotenv import load_dotenv
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT


def main():
    load_dotenv()

    db_user = os.getenv("DB_USER", "postgres")
    db_password = os.getenv("DB_PASSWORD", "zora")
    db_host = os.getenv("DB_HOST", "localhost")
    db_port = os.getenv("DB_PORT", "5432")

    try:
        print(f"Testing PostgreSQL connection for user: {db_user}")
        conn = psycopg2.connect(
            dbname="postgres",
            user=db_user,
            password=db_password,
            host=db_host,
            port=db_port,
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        print("Connection successful!")

        cursor = conn.cursor()
        cursor.execute("SELECT 1 FROM pg_catalog.pg_database WHERE datname = 'crms2_master'")
        exists = cursor.fetchone()
        if not exists:
            print("Creating crms2_master database...")
            cursor.execute("CREATE DATABASE crms2_master;")
            print("Database created!")
        else:
            print("crms2_master database already exists!")

        cursor.close()
        conn.close()

    except psycopg2.OperationalError as exc:
        print("\nCONNECTION FAILED!")
        if "password authentication failed" in str(exc):
            print("The password in the .env file is incorrect.")
        else:
            print(f"Error details: {exc}")


if __name__ == "__main__":
    main()
