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
  // CircularProgress, // No longer directly used for loading state here
  Tooltip,
  useMediaQuery,
} from "@mui/material";
import { useTheme as useMuiTheme } from "@mui/material/styles";
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import ProfileDialog from "./ProfileDialog";
import ProfileCardMobile from "./ProfileCardMobile";
import PinwheelLoader from "../../components/PinwheelLoader"; // Import PinwheelLoader
import { DeviceProfile } from "../../../types/device";

export default function ProfilesTab() {
  const [profiles, setProfiles] = useState<DeviceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<DeviceProfile | null>(
    null
  );
  const [formData, setFormData] = useState({
    model: "",
    default_config: "",
  });

  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("sm")); // sm breakpoint for table cell truncation

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
    setIsEditMode(false);
    setProfileDialogOpen(true);
  };

  const handleEditProfile = (profile: DeviceProfile) => {
    setSelectedProfile(profile);
    setFormData({
      model: profile.model,
      default_config: JSON.stringify(profile.default_config, null, 2),
    });
    setIsEditMode(true);
    setProfileDialogOpen(true);
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

      const url = isEditMode
        ? `/api/profiles/${selectedProfile?.model}`
        : "/api/profiles";

      const method = isEditMode ? "PUT" : "POST";

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
        const action = isEditMode ? "updated" : "created";
        setSuccess(`Profile ${action} successfully`);
        setProfileDialogOpen(false);
        setSelectedProfile(null);
        loadProfiles();
      } else {
        const data = await response.json();
        setError(
          data.error || `Failed to ${isEditMode ? "update" : "create"} profile`
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
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "300px", // Adjusted for typical tab content height
          py: 3,
        }}
      >
        <PinwheelLoader />
        <Typography variant="h6" color="text.secondary" sx={{ mt: 3 }}>
          Loading profiles...
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
      ) : isMobile ? (
        <Box>
          {profiles.map((profile) => (
            <ProfileCardMobile
              key={profile.id}
              profile={profile}
              onEdit={handleEditProfile}
              onDelete={handleDeleteProfile}
            />
          ))}
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 600 }} aria-label="profiles table">
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
                      title={JSON.stringify(profile.default_config)} // Show full config on hover
                    >
                      {JSON.stringify(profile.default_config)}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
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

      {/* Profile Dialog for Add/Edit */}
      <ProfileDialog
        open={profileDialogOpen}
        onClose={() => setProfileDialogOpen(false)}
        onSave={saveProfile}
        formData={formData}
        setFormData={setFormData}
        isEditMode={isEditMode}
        profileModel={selectedProfile?.model}
      />

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
