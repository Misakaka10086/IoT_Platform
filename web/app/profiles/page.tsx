"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Memory as ChipIcon,
} from "@mui/icons-material";
import { DeviceProfile } from "../../types/device";

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<DeviceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<DeviceProfile | null>(
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
      const response = await fetch("/api/device-profiles");
      if (response.ok) {
        const data = await response.json();
        setProfiles(data);
      } else {
        setError("Failed to load device profiles");
      }
    } catch (err) {
      setError("Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleAddProfile = () => {
    setEditingProfile(null);
    setFormData({ model: "", default_config: "" });
    setDialogOpen(true);
  };

  const handleEditProfile = (profile: DeviceProfile) => {
    setEditingProfile(profile);
    setFormData({
      model: profile.model,
      default_config: JSON.stringify(profile.default_config, null, 2),
    });
    setDialogOpen(true);
  };

  const handleSaveProfile = async () => {
    try {
      let configObj;
      try {
        configObj = JSON.parse(formData.default_config);
      } catch (e) {
        setError("Invalid JSON format for default_config");
        return;
      }

      const response = await fetch("/api/device-profiles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: formData.model,
          default_config: configObj,
        }),
      });

      if (response.ok) {
        setSuccess(
          editingProfile
            ? "Profile updated successfully!"
            : "Profile created successfully!"
        );
        setDialogOpen(false);
        loadProfiles();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to save profile");
      }
    } catch (err) {
      setError("Network error occurred");
    }
  };

  const formatConfig = (config: Record<string, any>) => {
    return Object.entries(config)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");
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
          flexDirection: { xs: "column", sm: "row" }, // Stack on xs, row on sm and up
          alignItems: { xs: "flex-start", sm: "center" }, // Align items to start on xs
          justifyContent: "space-between",
          mb: 3,
          gap: { xs: 2, sm: 1 }, // Add gap for stacked layout
        }}
      >
        <Typography variant="h4" component="h1" sx={{ mb: { xs: 1, sm: 0 } }}> {/* Add margin bottom on xs */}
          Device Profiles
        </Typography>
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

      <Card>
        <CardContent>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Model</TableCell>
                  <TableCell>Default Configuration</TableCell>
                  <TableCell>Created At</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {profiles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      <Typography color="text.secondary">
                        No device profiles found. Click "Initialize Database" in
                        the Test page to create default profiles.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  profiles.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <ChipIcon color="primary" />
                          <Typography variant="body2" fontWeight="medium">
                            {profile.model}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            maxWidth: { xs: 150, sm: 250, md: 400 }, // Responsive maxWidth
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={formatConfig(profile.default_config)} // Show full content on hover
                        >
                          {formatConfig(profile.default_config)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        <Typography variant="body2" color="text.secondary">
                          {new Date(profile.created_at).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={() => handleEditProfile(profile)}
                          color="primary"
                        >
                          <EditIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingProfile ? "Edit Device Profile" : "Add Device Profile"}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Model Name"
                value={formData.model}
                onChange={(e) =>
                  setFormData({ ...formData, model: e.target.value })
                }
                placeholder="e.g., ESP32, ESP8266, Arduino"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Default Configuration (JSON)"
                value={formData.default_config}
                onChange={(e) =>
                  setFormData({ ...formData, default_config: e.target.value })
                }
                multiline
                rows={8}
                placeholder={`{
  "led_color": "#00ff00",
  "interval": 60,
  "wifi_ssid": "",
  "wifi_password": ""
}`}
                helperText="Enter valid JSON configuration"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveProfile} variant="contained">
            {editingProfile ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
