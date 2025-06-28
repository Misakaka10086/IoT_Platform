# Type Definitions - Pusher Integration

## Overview

This directory contains centralized type definitions for the Pusher integration in our IoT Platform. The types have been consolidated to eliminate redundancy and improve maintainability.

## Files

### `pusher-types.ts`
Centralized type definitions for all Pusher-related interfaces and types.

**Key Interfaces:**
- `PusherEventData` - Base interface for all Pusher events
- `DeviceStatusUpdate` - Device online/offline status updates
- `DatabaseDeviceStatusUpdate` - Database-specific device status updates (includes `last_seen`)
- `DeviceConnectionEvent` - Device connection/disconnection events
- `DeviceOTAProgressUpdate` - OTA progress updates
- `DeviceOTAEvent` - OTA success/error events
- `PusherClientConfig` - Pusher client configuration
- `PusherChannelStatus` - Channel subscription status

**Type Guards:**
- `isDeviceStatusUpdate()` - Validates device status update objects
- `isDeviceConnectionEvent()` - Validates device connection event objects
- `isDeviceOTAProgressUpdate()` - Validates OTA progress update objects
- `isDeviceOTAEvent()` - Validates OTA event objects

**Handler Types:**
- `DeviceStatusUpdateHandler` - Handler for device status updates
- `DeviceConnectionEventHandler` - Handler for device connection events
- `DeviceOTAProgressUpdateHandler` - Handler for OTA progress updates
- `DeviceOTAEventHandler` - Handler for OTA events
- `PusherErrorHandler` - Handler for Pusher errors

## Refactoring Changes

### Before Refactoring
- Interface definitions were scattered across multiple files
- Duplicate interfaces with similar purposes
- Inconsistent naming conventions
- Type definitions mixed with service logic

### After Refactoring
- All Pusher-related types centralized in `pusher-types.ts`
- Eliminated duplicate interface definitions
- Consistent naming conventions
- Clear separation of concerns
- Type guards for runtime validation

## Usage Examples

### Importing Types
```typescript
import { 
    DeviceStatusUpdate, 
    DeviceConnectionEvent,
    DeviceOTAProgressUpdate,
    DeviceOTAEvent 
} from '../../types/pusher-types';
```

### Using Type Guards
```typescript
import { isDeviceStatusUpdate } from '../../types/pusher-types';

if (isDeviceStatusUpdate(data)) {
    // TypeScript knows data is DeviceStatusUpdate
    console.log(data.device_id, data.status);
}
```

### Using Handler Types
```typescript
import { DeviceStatusUpdateHandler } from '../../types/pusher-types';

const handleStatusUpdate: DeviceStatusUpdateHandler = (data) => {
    console.log(`Device ${data.device_id} is now ${data.status}`);
};
```

## Benefits

1. **Reduced Redundancy** - Eliminated duplicate interface definitions
2. **Improved Maintainability** - Single source of truth for all Pusher types
3. **Better Type Safety** - Type guards ensure runtime type validation
4. **Consistent Naming** - Unified naming conventions across the codebase
5. **Clear Documentation** - Well-documented interfaces with examples
6. **Easier Refactoring** - Changes to types only need to be made in one place

## Migration Guide

If you're updating existing code to use the new centralized types:

1. Replace local interface definitions with imports from `pusher-types.ts`
2. Update import statements to use the new type definitions
3. Use type guards for runtime validation where appropriate
4. Update handler function signatures to use the new handler types

## Related Files

- `web/app/services/pusherClientService.ts` - Client-side Pusher service
- `web/app/services/pusherService.ts` - Server-side Pusher service
- `web/app/services/databaseService.ts` - Database service using Pusher types
- `web/app/hooks/useDeviceStatus.ts` - Device status hook
- `web/app/hooks/useDeviceOTAStatus.ts` - Device OTA status hook
- `web/app/api/emqx/webhook/events/connection/route.ts` - Webhook handler
- `web/app/api/emqx/webhook/events/ota/route.ts` - OTA webhook handler 