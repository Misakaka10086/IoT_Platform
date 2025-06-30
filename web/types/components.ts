import { Device, DeviceStatus, DeviceProfile, ConfigVersion } from "./device"; // Corrected import
import { OTAStatus } from "./ota-types";

export interface DeviceCardProps {
  device: DeviceStatus;
  otaStatus?: OTAStatus;
  onStatusUpdate?: (
    deviceId: string,
    status: "online" | "offline"
  ) => Promise<void>;
}

export interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// For ConfigurationDialog.tsx
export interface ConfigurationDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  device: Device | null;
  onError: (error: string) => void;
  onSuccess: (message: string) => void;
}

// For DeviceCardMobile.tsx
export interface DeviceCardMobileProps {
  device: Device;
  onEditConfig: (device: Device) => void;
  onEditDescription: (device: Device) => void;
  onDelete: (device: Device) => void;
}

// For ProfileDialog.tsx
export interface ProfileDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  formData: { model: string; default_config: string };
  setFormData: React.Dispatch<
    React.SetStateAction<{ model: string; default_config: string }>
  >;
  isEditMode: boolean;
  profileModel?: string;
}

// For ProfileCardMobile.tsx - This was the missing/incorrect one
export interface ProfileCardMobileProps {
  profile: DeviceProfile;
  onEdit: (profile: DeviceProfile) => void;
  onDelete: (profile: DeviceProfile) => void;
}
