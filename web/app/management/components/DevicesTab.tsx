"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Button,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Tooltip,
  Card,
  CardContent,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";

interface Device {
  id: number;
  device_id: string;
  chip: string;
  registered_at: string;
  last_seen: string | null;
  online: boolean;
  description: string | null;
}

interface DeviceConfig {
  version: string;
  config: Record<string, any>;
}

export default function DevicesTab() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [descriptionDialogOpen, setDescriptionDialogOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [deviceConfig, setDeviceConfig] = useState<DeviceConfig | null>(null);
  const [configFormData, setConfigFormData] = useState({
    config: "",
  });
  const [descriptionFormData, setDescriptionFormData] = useState({
    description: "",
  });

  useEffect(() => {
    loadDevices();
  }, []);

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

  const handleDeleteDevice = (device: Device) => {
    setSelectedDevice(device);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteDevice = async () => {
    if (!selectedDevice) return;

    try {
      const response = await fetch(`/api/devices/${selectedDevice.device_id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setSuccess(`Device ${selectedDevice.device_id} deleted successfully`);
        loadDevices();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to delete device");
      }
    } catch (err) {
      setError("Network error occurred");
    } finally {
      setDeleteDialogOpen(false);
      setSelectedDevice(null);
    }
  };

  const handleEditConfig = async (device: Device) => {
    setSelectedDevice(device);
    try {
      const response = await fetch(`/api/devices/${device.device_id}/config`);
      if (response.ok) {
        const data = await response.json();
        setDeviceConfig(data.config);
        setConfigFormData({
          config: JSON.stringify(data.config.config, null, 2),
        });
        setConfigDialogOpen(true);
      } else {
        setError("Failed to load device configuration");
      }
    } catch (err) {
      setError("Network error occurred");
    }
  };

  const saveDeviceConfig = async () => {
    if (!selectedDevice || !deviceConfig) return;

    try {
      let configObj;
      try {
        configObj = JSON.parse(configFormData.config);
      } catch (e) {
        setError("Invalid JSON format for configuration");
        return;
      }

      const response = await fetch(
        `/api/devices/${selectedDevice.device_id}/config`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            config: configObj,
          }),
        }
      );

      if (response.ok) {
        setSuccess("Device configuration updated successfully");
        setConfigDialogOpen(false);
        setSelectedDevice(null);
        setDeviceConfig(null);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to update device configuration");
      }
    } catch (err) {
      setError("Network error occurred");
    }
  };

  const handleEditDescription = (device: Device) => {
    setSelectedDevice(device);
    setDescriptionFormData({
      description: device.description || "",
    });
    setDescriptionDialogOpen(true);
  };

  const saveDeviceDescription = async () => {
    if (!selectedDevice) return;

    try {
      const response = await fetch(
        `/api/devices/${selectedDevice.device_id}/description`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            description: descriptionFormData.description,
          }),
        }
      );

      if (response.ok) {
        setSuccess("Device description updated successfully");
        setDescriptionDialogOpen(false);
        setSelectedDevice(null);
        loadDevices(); // Refresh the device list to show updated description
      } else {
        const data = await response.json();
        setError(data.error || "Failed to update device description");
      }
    } catch (err) {
      setError("Network error occurred");
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleString();
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
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setSuccess(null)}
        >
          {success}
        </Alert>
      )}

      {devices.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No devices found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Devices will appear here when they register with the platform.
          </Typography>
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Device ID</TableCell>
                <TableCell>Chip</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Last Seen</TableCell>
                <TableCell>Registered</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {devices.map((device) => (
                <TableRow key={device.id}>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {device.device_id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={device.chip} size="small" />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={device.online ? "Online" : "Offline"}
                      color={device.online ? "success" : "error"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDate(device.last_seen)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDate(device.registered_at)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        {device.description || "-"}
                      </Typography>
                      <Tooltip title="Edit Description">
                        <IconButton
                          size="small"
                          onClick={() => handleEditDescription(device)}
                          color="primary"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Edit Configuration">
                      <IconButton
                        size="small"
                        onClick={() => handleEditConfig(device)}
                        color="primary"
                      >
                        <SettingsIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Device">
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteDevice(device)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete device{" "}
            <strong>{selectedDevice?.device_id}</strong>? This action cannot be
            undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={confirmDeleteDevice}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Configuration Edit Dialog */}
      <Dialog
        open={configDialogOpen}
        onClose={() => setConfigDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Edit Configuration - {selectedDevice?.device_id}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Current Version: {deviceConfig?.version}
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={12}
              label="Configuration (JSON)"
              value={configFormData.config}
              onChange={(e) => setConfigFormData({ config: e.target.value })}
              sx={{ mt: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigDialogOpen(false)}>Cancel</Button>
          <Button onClick={saveDeviceConfig} variant="contained">
            Save Configuration
          </Button>
        </DialogActions>
      </Dialog>

      {/* Description Edit Dialog */}
      <Dialog
        open={descriptionDialogOpen}
        onClose={() => setDescriptionDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Edit Description - {selectedDevice?.device_id}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              multiline
              label="Description"
              value={descriptionFormData.description}
              onChange={(e) =>
                setDescriptionFormData({ description: e.target.value })
              }
              placeholder="Enter device description..."
              sx={{ mt: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDescriptionDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={saveDeviceDescription} variant="contained">
            Save Description
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
