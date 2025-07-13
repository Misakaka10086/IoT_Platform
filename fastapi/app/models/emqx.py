from pydantic import BaseModel
from typing import Optional, Dict, Any, Literal

class EmqxWebhookBase(BaseModel):
    event: str
    timestamp: int
    node: str
    metadata: Optional[Dict[str, Any]] = None

class EmqxClientConnected(EmqxWebhookBase):
    event: Literal['client.connected']
    clientid: str
    username: str
    connected_at: int
    sockname: str
    peername: str
    proto_name: str
    proto_ver: int
    keepalive: int
    clean_start: bool
    expiry_interval: int
    mountpoint: str
    is_bridge: bool
    receive_maximum: int
    conn_props: Dict[str, Any]
    client_attrs: Dict[str, Any]

class EmqxClientDisconnected(EmqxWebhookBase):
    event: Literal['client.disconnected']
    clientid: str
    username: str
    disconnected_at: int
    sockname: str
    peername: str
    proto_name: str
    proto_ver: int
    reason: str
    disconn_props: Dict[str, Any]
    client_attrs: Dict[str, Any]

EmqxWebhookEvent = EmqxClientConnected | EmqxClientDisconnected

class EmqxMessagePublish(EmqxWebhookBase):
    event: Literal['message.publish']
    clientid: str
    username: str
    topic: str
    payload: str
