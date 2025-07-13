from pydantic import BaseModel
from typing import Literal, Dict, Any

class PusherEventData(BaseModel):
    device_id: str
    timestamp: str
    data: Dict[str, Any] | None = None

class DeviceStatusUpdate(PusherEventData):
    status: Literal['online', 'offline']

class DatabaseDeviceStatusUpdate(BaseModel):
    device_id: str
    status: Literal['online', 'offline']
    last_seen: str
    data: Dict[str, Any] | None = None

class DeviceConnectionEvent(PusherEventData):
    event_type: Literal['connected', 'disconnected']
    reason: str | None = None

class DeviceOTAProgressUpdate(PusherEventData):
    status: str

class DeviceOTAEvent(PusherEventData):
    status: Literal['success', 'error']
    message: str | None = None
