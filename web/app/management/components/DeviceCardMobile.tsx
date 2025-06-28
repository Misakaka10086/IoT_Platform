"use client";

import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip,
  Divider,
  Stack,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  Memory as ChipIconMui, // Renamed to avoid conflict if ChipIcon is used as a component name
  Schedule as TimeIcon,
  Info as InfoIcon,
  SignalWifi4Bar as OnlineIcon,
  SignalWifiOff as OfflineIcon,
} from "@mui/icons-material";

interface Device {
  id: number;
  device_id: string;
  chip: string;
  git_version: string;
  registered_at: string;
  last_seen: string | null;
  online: boolean;
  description: string | null;
}

interface DeviceCardMobileProps {
  device: Device;
  onEditConfig: (device: Device) => void;
  onEditDescription: (device: Device) => void;
  onDelete: (device: Device) => void;
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return "Never";
  return new Date(dateString).toLocaleString(undefined, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const DeviceCardMobile: React.FC<DeviceCardMobileProps> = ({
  device,
  onEditConfig,
  onEditDescription,
  onDelete,
}) => {
  const isOnline = device.online;

  return (
    <Card sx={{ mb: 2, width: "100%" }}>
      <CardContent>
        <Stack spacing={1.5}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 1,
            }}
          >
            <Typography
              variant="h6"
              component="div"
              sx={{
                fontWeight: "medium",
                flexGrow: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              ID: {device.device_id}
            </Typography>
            <Chip
              icon={isOnline ? <OnlineIcon /> : <OfflineIcon />}
              label={isOnline ? "Online" : "Offline"}
              color={isOnline ? "success" : "error"}
              size="small"
              sx={{ ml: 1 }}
            />
          </Box>
          <Divider />

          <Stack spacing={1} sx={{ pt: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <InfoIcon fontSize="small" color="action" />
              <Typography
                variant="body2"
                color={device.description ? "text.secondary" : "text.disabled"}
                sx={{
                  flexGrow: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontStyle: device.description ? "normal" : "italic",
                }}
              >
                Desc: {device.description || "Not set"}
              </Typography>
              <Tooltip title="Edit Description">
                <IconButton
                  size="small"
                  onClick={() => onEditDescription(device)}
                  color="primary"
                >
                  <EditIcon fontSize="inherit" />
                </IconButton>
              </Tooltip>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <ChipIconMui fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                Chip: <strong>{device.chip}</strong>
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <TimeIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                Last Seen: <strong>{formatDate(device.last_seen)}</strong>
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Registered: {formatDate(device.registered_at)}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Git Ver: {device.git_version.substring(0, 6)}
              </Typography>
            </Box>
          </Stack>

          <Divider sx={{ mt: 1, mb: 1 }} />
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
            <Tooltip title="Edit Configuration">
              <IconButton
                size="small"
                onClick={() => onEditConfig(device)}
                color="primary"
              >
                <SettingsIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete Device">
              <IconButton
                size="small"
                onClick={() => onDelete(device)}
                color="error"
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default DeviceCardMobile;
