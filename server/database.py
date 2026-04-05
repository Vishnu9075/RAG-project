from supabase import create_client, Client
from dotenv import load_dotenv
import os

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SECRET_KEY")

if not supabase_url or not supabase_key:
    raise ValueError("Missing supabase credentials in env variables")

supabase: Client= create_client(supabase_url, supabase_key)
