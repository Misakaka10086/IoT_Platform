"use client";

import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  IconButton,
  Tooltip,
  Divider,
  Stack,
  Chip,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Tune as ModelIcon, // Using Tune for Model/Profile
  DataObject as ConfigIcon,
  Schedule as TimeIcon,
} from "@mui/icons-material";
import { DeviceProfile } from "../../../types/device";
import { ProfileCardMobileProps } from "../../../types/components";

const formatDate = (dateString: string | null) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleString(undefined, {
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

const formatConfigPreview = (config: Record<string, any>): string => {
  const keys = Object.keys(config);
  if (keys.length === 0) return "Empty";
  return keys.slice(0, 3).join(", ") + (keys.length > 3 ? "..." : "");
};

export const ProfileCardMobile: React.FC<ProfileCardMobileProps> = ({
  profile,
  onEdit,
  onDelete,
}) => {
  return (
    <Card sx={{ mb: 2, width: "100%" }}>
      <CardContent>
        <Stack spacing={1.5}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 1,
            }}
          >
            <Typography variant="h6" component="div" sx={{ fontWeight: "medium", display:"flex", alignItems:"center", gap: 1 }}>
              <ModelIcon color="primary" /> {profile.model}
            </Typography>
          </Box>
          <Divider />

          <Stack spacing={1} sx={{pt: 1}}>
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
              <ConfigIcon fontSize="small" color="action" sx={{mt: 0.5}}/>
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Config Preview:
                </Typography>
                <Chip label={formatConfigPreview(profile.default_config)} size="small" variant="outlined"/>
              </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <TimeIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                Created: <strong>{formatDate(profile.created_at)}</strong>
              </Typography>
            </Box>
          </Stack>

          <Divider sx={{mt: 1, mb:1}}/>
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
            <Tooltip title="Edit Profile">
              <IconButton
                size="small"
                onClick={() => onEdit(profile)}
                color="primary"
              >
                <EditIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete Profile">
              <IconButton
                size="small"
                onClick={() => onDelete(profile)}
                color="error"
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default ProfileCardMobile;
