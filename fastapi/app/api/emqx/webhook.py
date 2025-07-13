import json
from datetime import datetime
from fastapi import APIRouter, Request, HTTPException
from ..models.emqx import EmqxWebhookEvent, EmqxMessagePublish
from ..models.ota import OTAPayloadBase
from ..models.pusher import DatabaseDeviceStatusUpdate
from ..services.database import database_service
from ..services.pusher import pusher_service

router = APIRouter()

@router.post("/events/connection")
async def handle_connection_webhook(event: EmqxWebhookEvent):
    if not event.clientid.startswith('ESP32-'):
        return {"success": True, "message": "Non-IoT device ignored"}

    if hasattr(event, 'reason') and event.reason == 'discarded':
        return {"success": True, "message": "Discarded event ignored"}

    device_id = event.clientid.replace('ESP32-', '')
    is_connected = event.event == 'client.connected'
    status = 'online' if is_connected else 'offline'

    device_event_data = {
        'username': event.username,
        'sockname': event.sockname,
        'peername': event.peername,
        'proto_name': event.proto_name,
        'proto_ver': event.proto_ver,
        'node': event.node,
        'timestamp': datetime.now().isoformat(),
    }
    if is_connected:
        device_event_data.update({
            'keepalive': event.keepalive,
            'clean_start': event.clean_start,
            'expiry_interval': event.expiry_interval,
            'mountpoint': event.mountpoint,
            'is_bridge': event.is_bridge,
            'receive_maximum': event.receive_maximum,
        })

    status_update = DatabaseDeviceStatusUpdate(
        device_id=device_id,
        status=status,
        last_seen=datetime.now().isoformat(),
        data=device_event_data
    )

    try:
        database_service.update_device_status(status_update)
        if is_connected:
            pusher_service.triggerDeviceConnected(device_id, device_event_data)
        else:
            pusher_service.triggerDeviceDisconnected(device_id, event.reason, device_event_data)
        pusher_service.triggerDeviceStatusUpdate(device_id, status, device_event_data)
    except Exception as e:
        # log error but continue
        print(f"Error updating database or triggering pusher: {e}")

    return {"success": True, "device_id": device_id, "status": status}


@router.post("/events/ota")
async def handle_ota_webhook(event: EmqxMessagePublish):
    try:
        payload = OTAPayloadBase.parse_raw(event.payload)

        if payload.status == "OTA Progress":
            pusher_service.triggerDeviceOTAProgressUpdate(payload.id, f"{payload.progress}%")
        elif payload.status == "OTA Success":
            pusher_service.triggerDeviceOTASuccess(payload.id)
        elif payload.status == "OTA Error":
            pusher_service.triggerDeviceOTAError(payload.id)

    except Exception as e:
        print(f"Error processing OTA payload: {e}")
        # Optionally, trigger an error event to Pusher
        # pusher_service.triggerDeviceOTAError(event.clientid.replace('ESP32-', ''), "Invalid payload")

    return {"success": True, "message": "OTA event received"}
