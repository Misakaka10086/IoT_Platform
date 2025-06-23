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
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";

interface DeviceProfile {
  id: number;
  model: string;
  default_config: Record<string, any>;
  created_at: string;
}

export default function ProfilesTab() {
  const [profiles, setProfiles] = useState<DeviceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<DeviceProfile | null>(
    null
  );
  const [formData, setFormData] = useState({
    model: "",
    default_config: "",
  });

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/profiles");
      if (response.ok) {
        const data = await response.json();
        setProfiles(data.profiles || []);
      } else {
        setError("Failed to load profiles");
      }
    } catch (err) {
      setError("Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleAddProfile = () => {
    setFormData({
      model: "",
      default_config: "{}",
    });
    setAddDialogOpen(true);
  };

  const handleEditProfile = (profile: DeviceProfile) => {
    setSelectedProfile(profile);
    setFormData({
      model: profile.model,
      default_config: JSON.stringify(profile.default_config, null, 2),
    });
    setEditDialogOpen(true);
  };

  const handleDeleteProfile = (profile: DeviceProfile) => {
    setSelectedProfile(profile);
    setDeleteDialogOpen(true);
  };

  const saveProfile = async () => {
    try {
      let configObj;
      try {
        configObj = JSON.parse(formData.default_config);
      } catch (e) {
        setError("Invalid JSON format for configuration");
        return;
      }

      const url = editDialogOpen
        ? `/api/profiles/${selectedProfile?.model}`
        : "/api/profiles";

      const method = editDialogOpen ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: formData.model,
          default_config: configObj,
        }),
      });

      if (response.ok) {
        const action = editDialogOpen ? "updated" : "created";
        setSuccess(`Profile ${action} successfully`);
        setEditDialogOpen(false);
        setAddDialogOpen(false);
        setSelectedProfile(null);
        loadProfiles();
      } else {
        const data = await response.json();
        setError(
          data.error ||
            `Failed to ${editDialogOpen ? "update" : "create"} profile`
        );
      }
    } catch (err) {
      setError("Network error occurred");
    }
  };

  const confirmDeleteProfile = async () => {
    if (!selectedProfile) return;

    try {
      const response = await fetch(`/api/profiles/${selectedProfile.model}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setSuccess(`Profile ${selectedProfile.model} deleted successfully`);
        loadProfiles();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to delete profile");
      }
    } catch (err) {
      setError("Network error occurred");
    } finally {
      setDeleteDialogOpen(false);
      setSelectedProfile(null);
    }
  };

  const formatDate = (dateString: string) => {
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
          onClick={loadProfiles}
        >
          Refresh
        </Button>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddProfile}
        >
          Add Profile
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

      {profiles.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No profiles found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create your first device profile to get started.
          </Typography>
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Model</TableCell>
                <TableCell>Default Configuration</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {profiles.map((profile) => (
                <TableRow key={profile.id}>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {profile.model}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{
                        maxWidth: 300,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {JSON.stringify(profile.default_config)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDate(profile.created_at)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Edit Profile">
                      <IconButton
                        size="small"
                        onClick={() => handleEditProfile(profile)}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Profile">
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteProfile(profile)}
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

      {/* Add Profile Dialog */}
      <Dialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Add New Profile</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Model Name"
              value={formData.model}
              onChange={(e) =>
                setFormData({ ...formData, model: e.target.value })
              }
              placeholder="e.g., ESP32, ESP8266, Arduino"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              multiline
              rows={8}
              label="Default Configuration (JSON)"
              value={formData.default_config}
              onChange={(e) =>
                setFormData({ ...formData, default_config: e.target.value })
              }
              placeholder='{"wifi_ssid": "", "wifi_password": "", "mqtt_server": ""}'
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button onClick={saveProfile} variant="contained">
            Create Profile
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Profile - {selectedProfile?.model}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Model Name"
              value={formData.model}
              onChange={(e) =>
                setFormData({ ...formData, model: e.target.value })
              }
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              multiline
              rows={8}
              label="Default Configuration (JSON)"
              value={formData.default_config}
              onChange={(e) =>
                setFormData({ ...formData, default_config: e.target.value })
              }
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={saveProfile} variant="contained">
            Update Profile
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete profile{" "}
            <strong>{selectedProfile?.model}</strong>? This action cannot be
            undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={confirmDeleteProfile}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
