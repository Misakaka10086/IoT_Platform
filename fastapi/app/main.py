from fastapi import FastAPI
from dotenv import load_dotenv
from .api.emqx import main as emqx_api
from .api.emqx import webhook as emqx_webhook

load_dotenv()

app = FastAPI()

app.include_router(emqx_api.router, prefix="/api/emqx", tags=["emqx"])
app.include_router(emqx_webhook.router, prefix="/api/emqx/webhook", tags=["emqx-webhook"])

@app.get("/")
def read_root():
    return {"message": "FastAPI service is running"}
