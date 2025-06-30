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
  useMediaQuery,
  // CircularProgress, // No longer directly used for loading state here
} from "@mui/material";
import { useTheme as useMuiTheme } from "@mui/material/styles";
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import ConfigurationDialog from "./ConfigurationDialog";
import DeviceCardMobile from "./DeviceCardMobile";
import PinwheelLoader from "../../components/PinwheelLoader"; // Import PinwheelLoader
import { Device } from "../../../types/device";

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

  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("md")); // md breakpoint for table column changes

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
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "300px", // Adjusted for typical tab content height
          py: 3,
        }}
      >
        <PinwheelLoader />
        <Typography variant="h6" color="text.secondary" sx={{ mt: 3 }}>
          Loading devices...
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
      ) : isMobile ? (
        <Box>
          {devices.map((device) => (
            <DeviceCardMobile
              key={device.id}
              device={device}
              onEditConfig={handleEditConfig}
              onEditDescription={handleEditDescription}
              onDelete={handleDeleteDevice}
            />
          ))}
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }} aria-label="devices table">
            <TableHead>
              <TableRow>
                <TableCell sx={{ whiteSpace: "nowrap" }}>Device ID</TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>Chip</TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>Board</TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>Git Version</TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>Status</TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>Last Seen</TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>Registered</TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>Description</TableCell>
                <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {devices.map((device) => (
                <TableRow key={device.id}>
                  <TableCell>
                    <Typography
                      variant="body2"
                      fontFamily="monospace"
                      sx={{
                        display: "block",
                        maxWidth: 150,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {device.device_id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={device.chip} size="small" />
                  </TableCell>
                  <TableCell>
                    <Chip label={device.board} size="small" />
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      fontFamily="monospace"
                      color="text.secondary"
                    >
                      {device.git_version.substring(0, 6)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={device.online ? "Online" : "Offline"}
                      color={device.online ? "success" : "error"}
                      size="small"
                      sx={{ minWidth: 70 }} // Ensure chip has enough width
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ whiteSpace: "nowrap" }}>
                      {formatDate(device.last_seen)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ whiteSpace: "nowrap" }}>
                      {formatDate(device.registered_at)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          display: "block",
                          maxWidth: 200,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
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
