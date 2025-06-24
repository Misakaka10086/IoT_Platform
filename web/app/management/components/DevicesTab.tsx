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
import ConfigurationDialog from "./ConfigurationDialog";

interface Device {
  id: number;
  device_id: string;
  chip: string;
  registered_at: string;
  last_seen: string | null;
  online: boolean;
  description: string | null;
}

export default function DevicesTab() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [descriptionDialogOpen, setDescriptionDialogOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
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

  const handleEditConfig = (device: Device) => {
    setSelectedDevice(device);
    setConfigDialogOpen(true);
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

      {/* Configuration Dialog */}
      <ConfigurationDialog
        open={configDialogOpen}
        onClose={() => setConfigDialogOpen(false)}
        onSave={loadDevices}
        device={selectedDevice}
        onError={setError}
        onSuccess={setSuccess}
      />

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
