from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from dotenv import load_dotenv
import os


load_dotenv()


supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SECRET_KEY")

if not supabase_url or not supabase_key:
    raise ValueError("Missing supabase credentials in env variables")

supabase: Client= create_client(supabase_url, supabase_key)

# Create FastAPI app
app = FastAPI(
    title="Six-Figure AI Engineering API",
    description="Backend API for Six-Figure AI Engineering application",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check endpoints
@app.get("/")
async def root():
    return {"message": "Six-Figure AI Engineering app is running!"}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "1.0.0"
    }


@app.get("/posts")
async def get_all_posts():
    """ Get All blog posts"""
    try:
        result = supabase.table("posts").select("*").order("created_at", desc=True).execute()
        return result.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/create-user")
async def clerk_webhook(webhook_data: dict):
    try:
        event_type = webhook_data.get("type")

        if event_type == "user.created":
            user_data = webhook_data.get("data", {})
            clerk_id = user_data.get("id")

        if not clerk_id:
            raise HTTPException(status_code=400, detail="no user id in webhook")
        
        result = supabase.table('users').insert({
            "clerk_id": clerk_id
        }).execute()

        return{
            "message": "user created successfully",
            "data": result.data[0]
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail="webhook processing failed: {str(e)}")





if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)