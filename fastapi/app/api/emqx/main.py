import os
import requests
from fastapi import APIRouter, Depends, HTTPException, Query
from requests.auth import HTTPBasicAuth

router = APIRouter()

def get_emqx_credentials():
    api_key = os.environ.get("EMQX_API_KEY")
    secret_key = os.environ.get("EMQX_SECRET_KEY")
    if not api_key or not secret_key:
        raise HTTPException(status_code=500, detail="EMQX API credentials not configured in environment variables")
    return api_key, secret_key

@router.get("/api/emqx")
async def proxy_emqx_api(
    path: str = Query("clients", description="API path to proxy to EMQX"),
    host: str = Query(..., description="EMQX host"),
    credentials: tuple = Depends(get_emqx_credentials)
):
    api_key, secret_key = credentials

    # Remove protocol prefixes and port
    api_host = host.replace("mqtt://", "").replace("mqtts://", "").replace("wss://", "").replace("ws://", "")
    api_host = api_host.split(":")[0]

    api_url = f"http://{api_host}/api/v5/{path}"

    try:
        response = requests.get(
            api_url,
            auth=HTTPBasicAuth(api_key, secret_key),
            headers={"Content-Type": "application/json"}
        )
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"EMQX API error: {e}")
