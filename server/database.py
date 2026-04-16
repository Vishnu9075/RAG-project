from supabase import create_client, Client
from dotenv import load_dotenv
import boto3
import os

load_dotenv()

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SECRET_KEY")

if not supabase_url or not supabase_key:
    raise ValueError("Missing supabase credentials in env variables")

supabase: Client= create_client(supabase_url, supabase_key)


#s3 setup

s3_client = boto3.client(
    "s3",
    endpoint_url = os.getenv('AWS_ENDPOINT_URL_S3'),
    aws_access_key_id = os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key = os.getenv('AWS_SECRET_ACCESS_KEY'),
    region_name = os.getenv('AWS_REGION')
    )

BUCKET_NAME = os.getenv('S3_BUCKET_NAME')

if not BUCKET_NAME:
    raise ValueError("Missing S3_BUCKET_NAME in env variables")