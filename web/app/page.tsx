"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Grid,
  Alert,
  Paper,
  Chip,
  CircularProgress,
} from "@mui/material";
import { DeviceCard } from "./components/DeviceCard";
import { mqttService } from "./services/mqttService";
import { deviceStatusClientService } from "./services/deviceStatusClientService";
import { Device, DeviceStatus } from "../types/device";

export default function Home() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceStatuses, setDeviceStatuses] = useState<DeviceStatus[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [sseConnected, setSseConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load devices from database
    const loadDevices = async () => {
      try {
        const response = await fetch("/api/devices");
        if (response.ok) {
          const deviceData: Device[] = await response.json();
          setDevices(deviceData);
        }
      } catch (error) {
        console.error("Error loading devices:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDevices();

    // Connect to SSE stream for real-time device status updates
    deviceStatusClientService.connect();

    // Subscribe to device status updates from SSE
    const unsubscribeStatus = deviceStatusClientService.subscribe(
      (statuses) => {
        setDeviceStatuses(statuses);
      }
    );

    // Check MQTT connection status
    setIsConnected(mqttService.isConnected());

    // Monitor SSE connection status
    const checkSseConnection = () => {
      setSseConnected(deviceStatusClientService.isConnected());
    };

    const sseConnectionInterval = setInterval(checkSseConnection, 2000);

    return () => {
      unsubscribeStatus();
      clearInterval(sseConnectionInterval);
      deviceStatusClientService.disconnect();
    };
  }, []);

  // Combine database devices with real-time statuses
  const devicesWithStatus = devices.map((device) => {
    const status = deviceStatuses.find((s) => s.device_id === device.device_id);
    return {
      ...device,
      status: status?.status || "offline",
      last_seen: status?.last_seen || device.last_seen,
      data: status?.data,
    };
  });

  const onlineDevices = devicesWithStatus.filter(
    (device) => device.status === "online"
  );
  const offlineDevices = devicesWithStatus.filter(
    (device) => device.status === "offline"
  );

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "200px",
        }}
      >
        <CircularProgress />
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
            label={isConnected ? "MQTT Connected" : "MQTT Disconnected"}
            color={isConnected ? "success" : "error"}
            size="small"
          />
          <Chip
            label={sseConnected ? "SSE Connected" : "SSE Disconnected"}
            color={sseConnected ? "success" : "error"}
            size="small"
          />
          <Typography variant="body2" color="text.secondary">
            {devicesWithStatus.length} devices total
          </Typography>
        </Box>
      </Box>

      {!isConnected && !sseConnected && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Not connected to MQTT broker and SSE stream not available. Please go
          to Settings to configure MQTT connection.
        </Alert>
      )}

      {!isConnected && sseConnected && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Using real-time device status updates via Server-Sent Events. MQTT
          connection not available.
        </Alert>
      )}

      {isConnected && !sseConnected && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Using MQTT for device status. SSE stream not available.
        </Alert>
      )}

      {devicesWithStatus.length === 0 && (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No devices found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isConnected || sseConnected
              ? "Devices will appear here when they connect and send their status information."
              : "Please connect to MQTT broker and wait for devices to register."}
          </Typography>
        </Paper>
      )}

      {devicesWithStatus.length > 0 && (
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
                    <DeviceCard device={device} />
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
                    <DeviceCard device={device} />
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
