from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from database import supabase, s3_client, BUCKET_NAME
from auth import get_current_user
import uuid

router = APIRouter(
    tags=["projects"]
)


class FileUploadRequest(BaseModel):
    filename: str
    file_size: str
    file_type: str


@router.get("/api/projects/{project_id}/files")
async def get_project_files(
    project_id: str,
    clerk_id : str = Depends(get_current_user)
):
    try:
        # get all files for this project -fk constriant endure project exists and belongs to user
        result= supabase.table("project_documents").select("*").eq("project_id", project_id).eq("clerk_id", clerk_id).order("created_at", desc=True).execute()
        
        return {
            "message": "project files retrieved successfully",
            "data": result.data or []
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail= f"Failed to get project files: {str(e)}")
    


@router.post("/api/projects/{project_id}/files/upload_url")
async def get_upload_url(
    project_id : str,
    file_request : FileUploadRequest,
    clerk_id : str = Depends(get_current_user)
    ):

    try:

        #verify project exists and belongs to the user

        projects_result = supabase.table("projects").select("id").eq("id", project_id).eq("clerk_id", clerk_id).execute()
        
        if not projects_result.data:
            raise HTTPException(status_code=400, detail="Project nor founs or access denied")
        
        # Generate unique S3 key

        file_extension = file_request.filename.split('.')[-1] if '.' in file_request.filename else ''
        unique_id = str(uuid.uuid4())
        s3_key = f"projects/{project_id}/documents/{unique_id}.{file_extension}"

        #Generate presigned url (expires in 1 hr)
        presigned_url = s3_client.generate_presigned_url(
            'put_object',
            Params= {
                'Bucket' : BUCKET_NAME,
                'key' : s3_key,
                'ContentType' : file_request.file_type
            },

            ExpiresIn = 3600
        )

        #Create database record with pending status

        document_result = supabase.table("project_document").insert({
            'project_id': project_id,
            'filename' : file_request.filename,
            's3_key' : s3_key,
            'file_size': file_request.file_size,
            'file_type': file_request.file_type,
            'processing_status': 'uploading',
            'clerk_id': clerk_id
        }).execute()


        if not document_result.data:
            raise HTTPException(status_code=500, detail="failed to create document record")
        
        return {
            "message" : "upload URL generated successfully",
            "data": {
                "upload_url": presigned_url,
                "s3_key": s3_key,
                "document": document_result.data[0]
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail= f"Failed to generate the presigned url : {str(e)}")
        
        


