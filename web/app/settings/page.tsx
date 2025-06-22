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
    host: "localhost",
    port: 1883,
    username: "",
    password: "",
    clientId: `web_client_${Math.random().toString(36).substr(2, 9)}`,
    useWebSocket: false,
    path: "/mqtt", // Default path
    subscriptionTopic: "device/+/status", // Default subscription topic
  });

  const [apiConfig, setApiConfig] = useState({
    apiKey: "",
    secretKey: "",
  });

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTesting, setIsTesting] = useState(false); // This state is no longer used but we keep it to minimize diff
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

    // Load saved API config from localStorage
    const savedApiConfig = localStorage.getItem("emqxApiConfig");
    if (savedApiConfig) {
      try {
        const parsedApiConfig = JSON.parse(savedApiConfig);
        setApiConfig(parsedApiConfig);
      } catch (error) {
        console.error("Error loading saved API config:", error);
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

  const handleApiConfigChange = (field: string, value: string) => {
    setApiConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = () => {
    localStorage.setItem("mqttConfig", JSON.stringify(config));
    localStorage.setItem("emqxApiConfig", JSON.stringify(apiConfig));
    setSuccess("Configuration saved successfully!");
    setError(null);

    // Clear success message after 3 seconds
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleTestConnection = async () => {
    // This function is no longer used
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
    if (!apiConfig.apiKey || !apiConfig.secretKey) {
      setError("Please enter both API Key and Secret Key");
      return;
    }

    if (!config.host) {
      setError("Please configure MQTT host first");
      return;
    }

    setIsTestingApi(true);
    setError(null);
    setSuccess(null);

    try {
      // Initialize device status service with API config and MQTT host
      const { deviceStatusService } = await import(
        "../services/deviceStatusService"
      );
      deviceStatusService.initEmqxApi(
        apiConfig.apiKey,
        apiConfig.secretKey,
        config.host
      );

      const isConnected = await deviceStatusService.testEmqxConnection();

      if (isConnected) {
        setSuccess("✅ EMQX API connection successful!");
      } else {
        setError("❌ EMQX API connection failed");
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
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Configure EMQX API credentials to fetch device connection status
          </Typography>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="API Key"
                value={apiConfig.apiKey}
                onChange={(e) =>
                  handleApiConfigChange("apiKey", e.target.value)
                }
                margin="normal"
                helperText="EMQX API key for authentication"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Secret Key"
                type="password"
                value={apiConfig.secretKey}
                onChange={(e) =>
                  handleApiConfigChange("secretKey", e.target.value)
                }
                margin="normal"
                helperText="EMQX API secret key for authentication"
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 3 }}>
            <Button
              variant="outlined"
              onClick={handleSave}
              startIcon={<SaveIcon />}
            >
              Save API Configuration
            </Button>
            <Button
              variant="contained"
              onClick={handleTestApiConnection}
              disabled={
                isTestingApi || !apiConfig.apiKey || !apiConfig.secretKey
              }
              startIcon={
                isTestingApi ? <CircularProgress size={16} /> : <ApiIcon />
              }
              sx={{ ml: 2 }}
            >
              {isTestingApi ? "Testing..." : "Test API Connection"}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
