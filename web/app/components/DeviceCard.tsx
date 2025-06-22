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
} from "@mui/material";
import { Memory as ChipIcon, Schedule as TimeIcon } from "@mui/icons-material";
import { keyframes } from "@emotion/react";
import { Device } from "../../types/device";

interface DeviceCardProps {
  device: Device & {
    status: "online" | "offline";
    data?: Record<string, any>;
  };
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

export const DeviceCard: React.FC<DeviceCardProps> = ({ device }) => {
  const muiTheme = useMuiTheme();
  const isOnline = device.status === "online";

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleString();
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
            </Box>
          </Box>
          <Divider />
          <Stack spacing={1.5}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <ChipIcon sx={{ color: "text.secondary" }} />
              <Typography variant="body2" color="text.secondary">
                Chip: <strong>{device.chip}</strong>
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <TimeIcon sx={{ color: "text.secondary" }} />
              <Typography variant="body2" color="text.secondary">
                Last Seen: <strong>{formatDate(device.last_seen)}</strong>
              </Typography>
            </Box>
            {device.description && (
              <Typography variant="body2" color="text.secondary">
                {device.description}
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
                  {Object.entries(device.data).map(([key, value]) => (
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
