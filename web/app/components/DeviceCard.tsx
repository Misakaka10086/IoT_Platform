"use client";

import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Divider,
  Stack,
  Box,
  useTheme as useMuiTheme,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import {
  Memory as ChipIcon,
  Schedule as TimeIcon,
  PowerSettingsNew as PowerIcon,
  PowerOff as PowerOffIcon,
  GitHub as GitHubIcon,
  CheckCircleOutline,
  ErrorOutline,
} from "@mui/icons-material";
import DeveloperBoardIcon from "@mui/icons-material/DeveloperBoard";
import { keyframes } from "@emotion/react";
import { DeviceStatus } from "../../types/device";
import { OTAStatus } from "../../types/ota-types";
interface DeviceCardProps {
  device: DeviceStatus;
  otaStatus?: OTAStatus;
  onStatusUpdate?: (
    deviceId: string,
    status: "online" | "offline"
  ) => Promise<void>;
}

const pulse = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(76, 175, 80, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(76, 175, 80, 0);
  }
`;

export const DeviceCard: React.FC<DeviceCardProps> = ({
  device,
  otaStatus,
  onStatusUpdate,
}) => {
  const muiTheme = useMuiTheme();
  const isOnline = device.status === "online";

  // 👈 4. 新增的OTA渲染逻辑
  const renderOtaInfo = () => {
    if (!otaStatus) return null; // 如果没有OTA状态，不渲染任何东西

    // 如果OTA有最终结果
    if (otaStatus.result) {
      return (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            mt: 1,
            p: 1,
            borderRadius: 1,
            bgcolor:
              otaStatus.result === "success" ? "success.light" : "error.light",
          }}
        >
          {otaStatus.result === "success" ? (
            <CheckCircleOutline color="success" />
          ) : (
            <ErrorOutline color="error" />
          )}
          <Typography variant="body2" color="text.primary">
            OTA {otaStatus.result}
          </Typography>
        </Box>
      );
    }

    // 如果OTA正在进行中
    if (otaStatus.progressStatus) {
      return (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            mt: 1,
            p: 1,
            borderRadius: 1,
            bgcolor: "info.light",
          }}
        >
          <CircularProgress size={20} />
          <Typography variant="body2" color="text.primary">
            {otaStatus.progressStatus}
          </Typography>
        </Box>
      );
    }

    return null;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleString();
  };

  const handleStatusToggle = async () => {
    if (onStatusUpdate) {
      const newStatus = isOnline ? "offline" : "online";
      await onStatusUpdate(device.device_id, newStatus);
    }
  };

  return (
    <Card
      sx={{
        height: "100%",
        backgroundColor:
          muiTheme.palette.mode === "dark"
            ? "rgba(40, 40, 40, 0.6)"
            : "rgba(255, 255, 255, 0.7)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: 4,
        transition: "transform 0.3s ease, box-shadow 0.3s ease",
        "&:hover": {
          transform: "translateY(-5px)",
          boxShadow: `0 10px 20px rgba(0,0,0,0.2)`,
        },
      }}
    >
      <CardContent>
        <Stack spacing={2}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography
              variant="h6"
              component="div"
              sx={{ fontWeight: "bold" }}
            >
              Device{" "}
              <span style={{ color: muiTheme.palette.primary.main }}>
                {device.device_id}
              </span>
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Chip
                label={device.status}
                size="small"
                color={isOnline ? "success" : "error"}
                variant="outlined"
              />
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  backgroundColor: isOnline ? "success.main" : "error.main",
                  animation: isOnline ? `${pulse} 2s infinite` : "none",
                }}
              />
              {onStatusUpdate && (
                <Tooltip title={`Mark as ${isOnline ? "offline" : "online"}`}>
                  <IconButton
                    size="small"
                    onClick={handleStatusToggle}
                    color={isOnline ? "error" : "success"}
                  >
                    {isOnline ? <PowerOffIcon /> : <PowerIcon />}
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>
          <Divider />
          {renderOtaInfo()}
          <Stack spacing={1.5}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <ChipIcon sx={{ color: "text.secondary" }} />
              <Typography variant="body2" color="text.secondary">
                Chip: <strong>{device.data?.chip || "Unknown"}</strong>
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <DeveloperBoardIcon sx={{ color: "text.secondary" }} />
              <Typography variant="body2" color="text.secondary">
                Board: <strong>{device.data?.board || "Unknown"}</strong>
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <GitHubIcon sx={{ color: "text.secondary" }} />
              <Typography variant="body2" color="text.secondary">
                Git:{" "}
                <strong>
                  {device.data?.git_version.substring(0, 6) || "Unknown"}
                </strong>
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <TimeIcon sx={{ color: "text.secondary" }} />
              <Typography variant="body2" color="text.secondary">
                Last Seen: <strong>{formatDate(device.last_seen)}</strong>
              </Typography>
            </Box>
            {device.data?.description && (
              <Typography variant="body2" color="text.secondary">
                {device.data.description}
              </Typography>
            )}
            {device.data && Object.keys(device.data).length > 0 && (
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  Sensor Data:
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  {Object.entries(device.data)
                    .filter(([key]) => !["chip", "description"].includes(key))
                    .map(([key, value]) => (
                      <Chip
                        key={key}
                        label={`${key}: ${value}`}
                        size="small"
                        variant="outlined"
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                    ))}
                </Box>
              </Box>
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};
