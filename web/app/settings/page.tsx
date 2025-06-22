"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Grid,
  Switch,
  FormControlLabel,
  Divider,
  CircularProgress,
} from "@mui/material";
import {
  Save as SaveIcon,
  Wifi as WifiIcon,
  Api as ApiIcon,
} from "@mui/icons-material";
import { mqttService, MqttConfig } from "../services/mqttService";

export default function SettingsPage() {
  const [config, setConfig] = useState<MqttConfig>({
    host: "",
    port: 1883,
    path: "",
    subscriptionTopic: "device/+/status",
    username: "",
    password: "",
    clientId: `web-client-${Math.random().toString(36).substr(2, 9)}`,
    useWebSocket: true,
  });

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    // Load saved config from localStorage
    const savedConfig = localStorage.getItem("mqttConfig");
    if (savedConfig) {
      try {
        const parsedConfig = JSON.parse(savedConfig);
        setConfig(parsedConfig);
      } catch (error) {
        console.error("Error loading saved config:", error);
      }
    }

    // Check connection status
    setIsConnected(mqttService.isConnected());
  }, []);

  const handleConfigChange = (
    field: keyof MqttConfig,
    value: string | number | boolean
  ) => {
    setConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = () => {
    localStorage.setItem("mqttConfig", JSON.stringify(config));
    setSuccess("Configuration saved successfully!");
    setError(null);

    // Clear success message after 3 seconds
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    setSuccess(null);

    try {
      console.log("Connecting with config:", config);
      await mqttService.connect(config);
      setIsConnected(true);
      setSuccess("✅ Successfully connected to MQTT broker!");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Connection failed:", error);
      setError(`❌ Failed to connect: ${errorMessage}`);
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    mqttService.disconnect();
    setIsConnected(false);
    setSuccess("🔌 Disconnected from MQTT broker");
  };

  const handleTestApiConnection = async () => {
    if (!config.host) {
      setError("Please configure MQTT host first");
      return;
    }

    setIsTestingApi(true);
    setError(null);
    setSuccess(null);

    try {
      // Initialize device status service with MQTT host only
      const { deviceStatusService } = await import(
        "../services/deviceStatusService"
      );
      deviceStatusService.initEmqxApi(config.host);

      const isConnected = await deviceStatusService.testEmqxConnection();

      if (isConnected) {
        setSuccess("✅ EMQX API connection successful!");
      } else {
        setError(
          "❌ EMQX API connection failed. Please check your environment variables."
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setError(`❌ EMQX API test failed: ${errorMessage}`);
    } finally {
      setIsTestingApi(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: "auto" }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Settings
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <WifiIcon sx={{ mr: 1 }} />
            <Typography variant="h6">MQTT Configuration</Typography>
          </Box>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Host"
                value={config.host}
                onChange={(e) => handleConfigChange("host", e.target.value)}
                margin="normal"
                helperText="MQTT broker hostname or IP address"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Port"
                type="number"
                value={config.port}
                onChange={(e) =>
                  handleConfigChange("port", parseInt(e.target.value) || 1883)
                }
                margin="normal"
                helperText="MQTT port (e.g., 1883, 8083, 443 for wss)"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Path (optional)"
                value={config.path}
                onChange={(e) => handleConfigChange("path", e.target.value)}
                margin="normal"
                helperText="WebSocket path (e.g., /mqtt, /ws)"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Subscription Topic"
                value={config.subscriptionTopic}
                onChange={(e) =>
                  handleConfigChange("subscriptionTopic", e.target.value)
                }
                margin="normal"
                helperText="The topic to subscribe to for device messages"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Username (optional)"
                value={config.username}
                onChange={(e) => handleConfigChange("username", e.target.value)}
                margin="normal"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Password (optional)"
                type="password"
                value={config.password}
                onChange={(e) => handleConfigChange("password", e.target.value)}
                margin="normal"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Client ID"
                value={config.clientId}
                onChange={(e) => handleConfigChange("clientId", e.target.value)}
                margin="normal"
                helperText="Unique identifier for this client"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.useWebSocket || false}
                    onChange={(e) =>
                      handleConfigChange("useWebSocket", e.target.checked)
                    }
                  />
                }
                label="Use WebSocket (recommended for browser environments)"
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, display: "flex", gap: 2, flexWrap: "wrap" }}>
            <Button
              variant="outlined"
              onClick={handleSave}
              startIcon={<SaveIcon />}
            >
              Save Configuration
            </Button>

            {!isConnected ? (
              <Button
                variant="contained"
                onClick={handleConnect}
                disabled={isConnecting}
                startIcon={
                  isConnecting ? <CircularProgress size={16} /> : <WifiIcon />
                }
              >
                {isConnecting ? "Connecting..." : "Connect"}
              </Button>
            ) : (
              <Button
                variant="outlined"
                color="error"
                onClick={handleDisconnect}
              >
                Disconnect
              </Button>
            )}
          </Box>

          <Box sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Switch checked={isConnected} disabled color="success" />
              }
              label={`Connection Status: ${
                isConnected ? "Connected" : "Disconnected"
              }`}
            />
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <ApiIcon sx={{ mr: 1 }} />
            <Typography variant="h6">EMQX API Configuration</Typography>
          </Box>

          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              EMQX API credentials are configured via environment variables:
              <br />
              <code>EMQX_API_KEY</code> and <code>EMQX_SECRET_KEY</code>
            </Typography>
          </Alert>

          <Box sx={{ mt: 2 }}>
            <Button
              variant="contained"
              onClick={handleTestApiConnection}
              disabled={isTestingApi || !config.host}
              startIcon={
                isTestingApi ? <CircularProgress size={16} /> : <ApiIcon />
              }
            >
              {isTestingApi ? "Testing..." : "Test API Connection"}
            </Button>
          </Box>

          <Box sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={
                    !!process.env.EMQX_API_KEY && !!process.env.EMQX_SECRET_KEY
                  }
                  disabled
                  color="success"
                />
              }
              label={`API Configuration: ${
                process.env.EMQX_API_KEY && process.env.EMQX_SECRET_KEY
                  ? "Configured"
                  : "Not Configured"
              }`}
            />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
