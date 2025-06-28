"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Paper,
  Alert,
  Button,
} from "@mui/material";
import { Refresh as RefreshIcon } from "@mui/icons-material";
import PinwheelLoader from "../../components/PinwheelLoader";
import { DeviceInfo, GitVersion } from "../../../types/device";

export default function FirmwareVersionsTab() {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [firmwareVersions, setFirmwareVersions] = useState<GitVersion[]>([]);
  const [selectedFirmwareVersion, setSelectedFirmwareVersion] =
    useState<GitVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDevices();
  }, []);

  useEffect(() => {
    // When the device changes, reset the selected firmware version to avoid stale selections.
    setSelectedFirmwareVersion(null);

    if (selectedDeviceId) {
      loadFirmwareVersions(selectedDeviceId);
    } else {
      // If no device is selected, also clear the list of versions.
      setFirmwareVersions([]);
    }
  }, [selectedDeviceId]);

  const loadDevices = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/devices");
      if (response.ok) {
        const data = await response.json();
        setDevices(data.devices || []);
      } else {
        setError("Failed to load devices");
      }
    } catch (err) {
      setError("Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  const loadFirmwareVersions = async (deviceId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `/api/devices/${deviceId}/firmware-versions`
      );
      if (response.ok) {
        const data = await response.json();
        // Sort by created_at in descending order (newest first)
        const sortedVersions = (data.firmwareVersions || []).sort(
          (a: GitVersion, b: GitVersion) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setFirmwareVersions(sortedVersions);
      } else {
        setError("Failed to load firmware versions");
      }
    } catch (err) {
      setError("Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDeviceChange = (event: any) => {
    setSelectedDeviceId(event.target.value);
  };

  const handleChipClick = (version: GitVersion) => {
    setSelectedFirmwareVersion(version);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
  };

  if (loading && devices.length === 0) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "300px",
          py: 3,
        }}
      >
        <PinwheelLoader />
        <Typography variant="h6" color="text.secondary" sx={{ mt: 3 }}>
          Loading data...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadDevices}
        >
          Refresh Devices
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Device Selection */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          1. Select Device
        </Typography>
        <FormControl fullWidth>
          <InputLabel id="device-select-label">Device</InputLabel>
          <Select
            labelId="device-select-label"
            id="device-select"
            value={selectedDeviceId}
            label="Device"
            onChange={handleDeviceChange}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {devices.map((device) => (
              <MenuItem key={device.device_id} value={device.device_id}>
                {device.device_id} ({device.description || "No Description"})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>

      {/* Firmware Version Selection */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          2. Firmware Versions
        </Typography>
        {selectedDeviceId ? (
          firmwareVersions.length > 0 ? (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {firmwareVersions.map((version) => (
                <Chip
                  key={version.id}
                  label={version.version}
                  onClick={() => handleChipClick(version)}
                  color={
                    selectedFirmwareVersion?.id === version.id
                      ? "primary"
                      : "default"
                  }
                  variant={
                    selectedFirmwareVersion?.id === version.id
                      ? "filled"
                      : "outlined"
                  }
                />
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No firmware versions found for this device.
            </Typography>
          )
        ) : (
          <Typography variant="body2" color="text.secondary">
            Please select a device to view its firmware versions.
          </Typography>
        )}
      </Paper>

      {/* Firmware Update Time Display */}
      <Paper elevation={1} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          3. Firmware Update Time
        </Typography>
        {selectedFirmwareVersion ? (
          <Typography variant="body1">
            Updated on:{" "}
            <strong>{formatDate(selectedFirmwareVersion.created_at)}</strong>
          </Typography>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Select a firmware version above to see its update time.
          </Typography>
        )}
      </Paper>
    </Box>
  );
}
