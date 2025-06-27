"use client";

import React from "react";
import {
  Box,
  Typography,
  Grid,
  Alert,
  Paper,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
  // Skeleton, // No longer needed directly here
} from "@mui/material";
import { Refresh as RefreshIcon } from "@mui/icons-material";
import { DeviceCard } from "./components/DeviceCard";
import { useDeviceStatus } from "./hooks/useDeviceStatus";
import { useDeviceOTAStatus } from "./hooks/useDeviceOTAStatus";
import PinwheelLoader from "./components/PinwheelLoader"; // Import the new loader

export default function Home() {
  const {
    devices,
    loading,
    error,
    pusherConnected,
    refreshDevices,
    updateDeviceStatus,
  } = useDeviceStatus();

  const { otaStatuses, error: otaError } = useDeviceOTAStatus();

  const onlineDevices = devices.filter((device) => device.status === "online");
  const offlineDevices = devices.filter(
    (device) => device.status === "offline"
  );

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column", // Outer box still controls overall page centering
          justifyContent: "center",
          alignItems: "center",
          minHeight: "calc(100vh - 200px)",
          py: 3,
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {" "}
          {/* Inner box for grouping loader and text */}
          <PinwheelLoader />
          <Typography variant="h6" color="text.secondary" sx={{ mt: 3 }}>
            {" "}
            {/* Adjusted margin-top */}
            Loading devices...
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {" "}
            {/* Adjusted margin-top */}
            Please wait while we fetch the latest device statuses.
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" }, // Stack on xs, row on sm and up
          alignItems: { xs: "flex-start", sm: "center" }, // Align items to start on xs
          justifyContent: "space-between",
          mb: 3,
          gap: { xs: 2, sm: 1 }, // Add gap for stacked layout
        }}
      >
        <Typography variant="h4" component="h1" sx={{ mb: { xs: 1, sm: 0 } }}>
          {" "}
          {/* Add margin bottom on xs */}
          Device Dashboard
        </Typography>
        <Box
          sx={{
            display: "flex",
            gap: 1,
            alignItems: "center",
            flexWrap: "wrap", // Allow items to wrap if needed on very small screens
          }}
        >
          <Chip
            label={pusherConnected ? "Pusher Connected" : "Pusher Disconnected"}
            color={pusherConnected ? "success" : "error"}
            size="small"
          />
          <Tooltip title="Refresh devices">
            <IconButton onClick={refreshDevices} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Typography variant="body2" color="text.secondary">
            {devices.length} devices total
          </Typography>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {!pusherConnected && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Real-time connection not available. Device status updates may be
          delayed.
        </Alert>
      )}

      {devices.length === 0 && (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No devices found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {pusherConnected
              ? "Devices will appear here when they connect and send their status information."
              : "Please check your connection and wait for devices to register."}
          </Typography>
        </Paper>
      )}

      {devices.length > 0 && (
        <>
          {onlineDevices.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography
                variant="h5"
                gutterBottom
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                Online Devices ({onlineDevices.length})
                <Chip label="Online" color="success" size="small" />
              </Typography>
              <Grid container spacing={3}>
                {onlineDevices.map((device) => {
                  const currentOtaStatus = otaStatuses[device.device_id];
                  return (
                    <Grid
                      size={{ xs: 12, sm: 6, md: 4, lg: 3 }}
                      key={device.device_id}
                    >
                      <DeviceCard
                        device={device}
                        onStatusUpdate={updateDeviceStatus}
                        otaStatus={currentOtaStatus} // 👈 传递 otaStatus
                      />
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          )}

          {offlineDevices.length > 0 && (
            <Box>
              <Typography
                variant="h5"
                gutterBottom
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                Offline Devices ({offlineDevices.length})
                <Chip label="Offline" color="error" size="small" />
              </Typography>
              <Grid container spacing={3}>
                {offlineDevices.map((device) => (
                  <Grid
                    size={{ xs: 12, sm: 6, md: 4, lg: 3 }}
                    key={device.device_id}
                  >
                    <DeviceCard
                      device={device}
                      onStatusUpdate={updateDeviceStatus}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
