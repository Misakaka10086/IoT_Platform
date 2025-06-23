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
  Skeleton,
} from "@mui/material";
import { Refresh as RefreshIcon } from "@mui/icons-material";
import { DeviceCard } from "./components/DeviceCard";
import { useDeviceStatus } from "./hooks/useDeviceStatus";

export default function Home() {
  const {
    devices,
    loading,
    error,
    pusherConnected,
    refreshDevices,
    updateDeviceStatus,
  } = useDeviceStatus();

  const onlineDevices = devices.filter((device) => device.status === "online");
  const offlineDevices = devices.filter(
    (device) => device.status === "offline"
  );

  if (loading) {
    return (
      <Box>
        {/* Header with loading skeleton */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 3,
          }}
        >
          <Skeleton variant="text" width={200} height={40} />
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Skeleton variant="rectangular" width={120} height={24} />
            <Skeleton variant="circular" width={32} height={32} />
            <Skeleton variant="text" width={100} height={20} />
          </Box>
        </Box>

        {/* Loading grid */}
        <Grid container spacing={3}>
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={item}>
              <Paper sx={{ p: 2 }}>
                <Skeleton variant="text" width="60%" height={24} />
                <Skeleton
                  variant="text"
                  width="40%"
                  height={20}
                  sx={{ mb: 1 }}
                />
                <Skeleton variant="rectangular" width="100%" height={100} />
                <Box sx={{ mt: 1, display: "flex", gap: 1 }}>
                  <Skeleton variant="rectangular" width={60} height={24} />
                  <Skeleton variant="rectangular" width={80} height={24} />
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Center loading indicator */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            mt: 4,
            gap: 2,
          }}
        >
          <CircularProgress size={24} />
          <Typography variant="body2" color="text.secondary">
            Loading devices...
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
          alignItems: "center",
          justifyContent: "space-between",
          mb: 3,
        }}
      >
        <Typography variant="h4" component="h1">
          Device Dashboard
        </Typography>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
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
                {onlineDevices.map((device) => (
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
