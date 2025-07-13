import os
import pusher
from ..models.pusher import DeviceStatusUpdate, DeviceConnectionEvent, DeviceOTAProgressUpdate, DeviceOTAEvent

class PusherService:
    def __init__(self):
        self.pusher_client = pusher.Pusher(
            app_id=os.environ["PUSHER_APP_ID"],
            key=os.environ["PUSHER_KEY"],
            secret=os.environ["PUSHER_SECRET"],
            cluster=os.environ["PUSHER_CLUSTER"],
            ssl=True
        )

    def triggerDeviceStatusUpdate(self, device_id: str, status: str, data: dict):
        event_data = DeviceStatusUpdate(device_id=device_id, status=status, timestamp=data['timestamp'], data=data)
        self.pusher_client.trigger('device-status', 'status-update', event_data.dict())

    def triggerDeviceConnected(self, device_id: str, data: dict):
        event_data = DeviceConnectionEvent(device_id=device_id, event_type='connected', timestamp=data['timestamp'], data=data)
        self.pusher_client.trigger('device-events', 'device-connected', event_data.dict())

    def triggerDeviceDisconnected(self, device_id: str, reason: str, data: dict):
        event_data = DeviceConnectionEvent(device_id=device_id, event_type='disconnected', reason=reason, timestamp=data['timestamp'], data=data)
        self.pusher_client.trigger('device-events', 'device-disconnected', event_data.dict())

    def triggerDeviceOTAProgressUpdate(self, device_id: str, progress: str):
        event_data = DeviceOTAProgressUpdate(device_id=device_id, status=progress, timestamp="")
        self.pusher_client.trigger('device-ota-status', 'progress-update', event_data.dict())

    def triggerDeviceOTASuccess(self, device_id: str):
        event_data = DeviceOTAEvent(device_id=device_id, status='success', timestamp="")
        self.pusher_client.trigger('device-ota-events', 'ota-success', event_data.dict())

    def triggerDeviceOTAError(self, device_id: str):
        event_data = DeviceOTAEvent(device_id=device_id, status='error', timestamp="")
        self.pusher_client.trigger('device-ota-events', 'ota-error', event_data.dict())

pusher_service = PusherService()
