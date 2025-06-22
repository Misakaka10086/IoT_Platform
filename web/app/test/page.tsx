"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Alert,
  Grid,
  Divider,
  CircularProgress,
} from "@mui/material";
import { PlayArrow as TestIcon, Storage as DbIcon } from "@mui/icons-material";

export default function TestPage() {
  const [deviceId, setDeviceId] = useState("TEST_DEVICE_001");
  const [chip, setChip] = useState("");
  const [chipOptions, setChipOptions] = useState<string[]>([]);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingChips, setLoadingChips] = useState(true);

  // Load chip types from database
  useEffect(() => {
    const loadChipTypes = async () => {
      try {
        const response = await fetch("/api/device-profiles?models_only=true");
        if (response.ok) {
          const models = await response.json();
          setChipOptions(models);
          // Set first chip as default if available
          if (models.length > 0 && !chip) {
            setChip(models[0]);
          }
        } else {
          console.error("Failed to load chip types");
        }
      } catch (err) {
        console.error("Error loading chip types:", err);
      } finally {
        setLoadingChips(false);
      }
    };

    loadChipTypes();
  }, [chip]);

  const testDeviceRegistration = async () => {
    if (!chip) {
      setError("Please select a chip type");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/devices/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          device_id: deviceId,
          chip: chip,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || "Registration failed");
      }
    } catch (err) {
      setError("Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  const initializeDatabase = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/init", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
        // Reload chip types after initialization
        const chipResponse = await fetch(
          "/api/device-profiles?models_only=true"
        );
        if (chipResponse.ok) {
          const models = await chipResponse.json();
          setChipOptions(models);
          if (models.length > 0) {
            setChip(models[0]);
          }
        }
      } else {
        setError(data.error || "Initialization failed");
      }
    } catch (err) {
      setError("Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: "auto" }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Database & API Test
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <DbIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Initialize Database</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Insert default device profiles (ESP32, ESP8266, Arduino)
              </Typography>
              <Button
                variant="contained"
                onClick={initializeDatabase}
                disabled={loading}
                startIcon={<DbIcon />}
              >
                Initialize Database
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <TestIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Test Device Registration</Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <TextField
                  fullWidth
                  label="Device ID"
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="Chip Type"
                  value={chip}
                  onChange={(e) => setChip(e.target.value)}
                  margin="normal"
                  select
                  SelectProps={{ native: true }}
                  disabled={loadingChips}
                  helperText={
                    loadingChips
                      ? "Loading chip types..."
                      : "Select a chip type from database"
                  }
                >
                  {loadingChips ? (
                    <option>Loading...</option>
                  ) : chipOptions.length === 0 ? (
                    <option>No chip types available</option>
                  ) : (
                    chipOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))
                  )}
                </TextField>
                {loadingChips && (
                  <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
                    <CircularProgress size={16} sx={{ mr: 1 }} />
                    <Typography variant="caption" color="text.secondary">
                      Loading chip types from database...
                    </Typography>
                  </Box>
                )}
              </Box>
              <Button
                variant="contained"
                onClick={testDeviceRegistration}
                disabled={loading || loadingChips || !chip}
                startIcon={<TestIcon />}
              >
                Test Registration
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {result && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Result
            </Typography>
            <pre
              style={{
                backgroundColor: "#f5f5f5",
                padding: "16px",
                borderRadius: "4px",
                overflow: "auto",
                fontSize: "14px",
              }}
            >
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
