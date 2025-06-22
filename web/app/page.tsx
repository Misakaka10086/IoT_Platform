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
  Button,
} from "@mui/material";
import { Refresh as RefreshIcon } from "@mui/icons-material";
import { DeviceCard } from "./components/DeviceCard";
import { mqttService } from "./services/mqttService";
import { deviceStatusService } from "./services/deviceStatusService";
import { Device, DeviceStatus } from "../types/device";
import { emqxApiService } from "./services/emqxApiService";

export default function Home() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceStatuses, setDeviceStatuses] = useState<DeviceStatus[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [emqxConfigured, setEmqxConfigured] = useState(false);

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

    // Subscribe to device status updates from MQTT and EMQX
    const unsubscribeStatus = deviceStatusService.subscribe((statuses) => {
      setDeviceStatuses(statuses);
    });

    // Check connection status
    setIsConnected(mqttService.isConnected());

    // Check EMQX configuration and initialize
    const checkEmqxConfig = () => {
      const savedMqttConfig = localStorage.getItem("mqttConfig");

      if (savedMqttConfig) {
        try {
          const mqttConfig = JSON.parse(savedMqttConfig);

          if (mqttConfig.host) {
            console.log("🔗 Initializing EMQX API with host:", mqttConfig.host);
            deviceStatusService.initEmqxApi(mqttConfig.host);
            setEmqxConfigured(true);
          }
        } catch (error) {
          console.error("Error loading MQTT config:", error);
        }
      }
    };

    checkEmqxConfig();

    return unsubscribeStatus;
  }, []);

  // Combine database devices with MQTT/EMQX statuses
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

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await deviceStatusService.refreshFromEmqx();
    } catch (error) {
      console.error("Error refreshing device statuses:", error);
    } finally {
      setRefreshing(false);
    }
  };

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
            label={isConnected ? "Connected" : "Disconnected"}
            color={isConnected ? "success" : "error"}
            size="small"
          />
          {emqxConfigured && (
            <Chip
              label="EMQX API"
              color="primary"
              size="small"
              variant="outlined"
            />
          )}
          <Typography variant="body2" color="text.secondary">
            {devicesWithStatus.length} devices total
          </Typography>
          {emqxConfigured && (
            <Button
              size="small"
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
          )}
        </Box>
      </Box>

      {!isConnected && !emqxConfigured && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Not connected to MQTT broker and EMQX API not configured. Please go to
          Settings to configure and connect.
        </Alert>
      )}

      {!isConnected && emqxConfigured && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Using EMQX API for device status. MQTT connection not available.
        </Alert>
      )}

      {isConnected && !emqxConfigured && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Using MQTT for device status. Consider configuring EMQX API in
          Settings for more reliable status updates.
        </Alert>
      )}

      {devicesWithStatus.length === 0 && (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No devices found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isConnected || emqxConfigured
              ? "Devices will appear here when they connect and send their status information."
              : "Please connect to MQTT broker or configure EMQX API and wait for devices to register."}
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
