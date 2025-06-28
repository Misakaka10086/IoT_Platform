// web/app/management/components/FirmwareVersionsTab.tsx

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
  CircularProgress,
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  GitHub as GitHubIcon,
  CalendarToday as CalendarIcon,
  LocalOffer,
} from "@mui/icons-material";
import PinwheelLoader from "../../components/PinwheelLoader";
import { DeviceInfo, GitVersion } from "../../../types/device";
import { GitCommitInfo } from "../../../types/ota-types";

export default function FirmwareVersionsTab() {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [firmwareVersions, setFirmwareVersions] = useState<GitVersion[]>([]);
  const [selectedFirmwareVersion, setSelectedFirmwareVersion] =
    useState<GitVersion | null>(null);

  // New states for commit info
  const [commitInfo, setCommitInfo] = useState<GitCommitInfo | null>(null);
  const [commitLoading, setCommitLoading] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDevices();
  }, []);

  // Effect to load firmware versions when a device is selected
  useEffect(() => {
    setSelectedFirmwareVersion(null);
    if (selectedDeviceId) {
      loadFirmwareVersions(selectedDeviceId);
    } else {
      setFirmwareVersions([]);
    }
  }, [selectedDeviceId]);

  // Effect to load commit info when a firmware version is selected
  useEffect(() => {
    setCommitInfo(null);
    setCommitError(null);

    if (selectedFirmwareVersion) {
      const fetchCommitInfo = async () => {
        setCommitLoading(true);
        try {
          const response = await fetch(
            `/api/git/info/${selectedFirmwareVersion.version}`
          );
          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || `Error ${response.status}`);
          }
          const data: GitCommitInfo = await response.json();
          setCommitInfo(data);
        } catch (err: any) {
          setCommitError(err.message || "Failed to fetch commit details.");
        } finally {
          setCommitLoading(false);
        }
      };
      fetchCommitInfo();
    }
  }, [selectedFirmwareVersion]);

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
          {" "}
          {error}{" "}
        </Alert>
      )}

      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          {" "}
          1. Select Device{" "}
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
                {device.device_id}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>

      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          {" "}
          2. Firmware Versions{" "}
        </Typography>
        {selectedDeviceId ? (
          firmwareVersions.length > 0 ? (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {firmwareVersions.map((version) => (
                <Chip
                  key={version.id}
                  label={version.version.substring(0, 6)}
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
                  sx={{
                    fontFamily: "var(--font-jetbrains-mono), monospace",
                    fontSize: "1rem",
                  }}
                  icon={<GitHubIcon />}
                />
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {" "}
              No firmware versions found for this device.{" "}
            </Typography>
          )
        ) : (
          <Typography variant="body2" color="text.secondary">
            {" "}
            Please select a device to view its firmware versions.{" "}
          </Typography>
        )}
      </Paper>

      <Paper elevation={1} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          {" "}
          3. Commit Details{" "}
        </Typography>
        {commitLoading ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <CircularProgress size={24} />
            <Typography variant="body2" color="text.secondary">
              Loading commit info...
            </Typography>
          </Box>
        ) : commitError ? (
          <Alert severity="warning">{commitError}</Alert>
        ) : commitInfo ? (
          <Box>
            <Box
              component="pre"
              sx={{
                bgcolor: "action.hover",
                p: 2,
                borderRadius: 1,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontFamily: "var(--font-jetbrains-mono), monospace",
                fontSize: "1.2rem",
              }}
            >
              {commitInfo.message}
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
              <CalendarIcon fontSize="small" color="action" />
              <Typography variant="caption" color="text.secondary">
                Authored on: {formatDate(commitInfo.authored_at)}
              </Typography>
              <LocalOffer fontSize="small" color="action" />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  // 关键样式：允许在长单词或字符串内部换行
                  overflowWrap: "break-word",
                  // 确保组件宽度能被正确计算
                  minWidth: 0,
                }}
              >
                SHA: {commitInfo.version}
              </Typography>
            </Box>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Select a firmware version above to see its commit details.
          </Typography>
        )}
      </Paper>
    </Box>
  );
}
