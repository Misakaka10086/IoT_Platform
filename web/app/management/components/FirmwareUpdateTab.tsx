"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Chip,
  Paper,
  Alert,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Button,
  Divider,
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  GitHub as GitHubIcon,
  DeveloperBoard as BoardIcon,
  SystemUpdateAlt as UpdateIcon,
} from "@mui/icons-material";
import PinwheelLoader from "../../components/PinwheelLoader";
import { FirmwareApiResponse } from "../../../types/firmware";

export default function FirmwareUpdateTab() {
  const [firmwareData, setFirmwareData] = useState<FirmwareApiResponse | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCommit, setSelectedCommit] = useState<string | null>(null);
  const [selectedBoards, setSelectedBoards] = useState<Record<string, boolean>>(
    {}
  );

  useEffect(() => {
    loadFirmware();
  }, []);

  const loadFirmware = async () => {
    setLoading(true);
    setError(null);
    setSelectedCommit(null);
    setSelectedBoards({});
    try {
      const response = await fetch("/api/firmware");
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to load firmware data");
      }
      const data: FirmwareApiResponse = await response.json();
      setFirmwareData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCommitSelect = (commit: string) => {
    setSelectedCommit(commit);
    setSelectedBoards({}); // 重置所选的board
  };

  const handleBoardSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedBoards({
      ...selectedBoards,
      [event.target.name]: event.target.checked,
    });
  };

  const renderContent = () => {
    if (loading) {
      return (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            py: 5,
          }}
        >
          <PinwheelLoader />
          <Typography variant="h6" color="text.secondary" sx={{ mt: 3 }}>
            Fetching firmware list from S3...
          </Typography>
        </Box>
      );
    }

    if (error) {
      return <Alert severity="error">{error}</Alert>;
    }

    if (!firmwareData || Object.keys(firmwareData).length === 0) {
      return (
        <Alert severity="info">
          No firmware versions found in the S3 bucket.
        </Alert>
      );
    }

    return (
      <Box>
        <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            1. Select Firmware Version (Git Commit)
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {Object.keys(firmwareData).map((commit) => (
              <Chip
                key={commit}
                icon={<GitHubIcon />}
                label={commit.substring(0, 7)}
                onClick={() => handleCommitSelect(commit)}
                color={selectedCommit === commit ? "primary" : "default"}
                variant={selectedCommit === commit ? "filled" : "outlined"}
                sx={{
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                  fontSize: "1rem",
                }}
              />
            ))}
          </Box>
        </Paper>

        {selectedCommit && firmwareData[selectedCommit] && (
          <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              2. Select Target Boards
            </Typography>
            <FormGroup>
              {firmwareData[selectedCommit].boards.map((board) => (
                <FormControlLabel
                  key={board}
                  control={
                    <Checkbox
                      checked={!!selectedBoards[board]}
                      onChange={handleBoardSelect}
                      name={board}
                    />
                  }
                  label={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <BoardIcon fontSize="small" />
                      <Typography>{board}</Typography>
                    </Box>
                  }
                />
              ))}
            </FormGroup>
          </Paper>
        )}

        <Divider sx={{ my: 3 }} />

        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<UpdateIcon />}
            disabled // 在第二部分实现功能前禁用此按钮
          >
            Initiate Update
          </Button>
        </Box>
        <Alert severity="warning" sx={{ mt: 2 }}>
          Update functionality will be implemented in the next step.
        </Alert>
      </Box>
    );
  };

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
        <Typography variant="h5">Firmware Update</Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadFirmware}
        >
          Refresh List
        </Button>
      </Box>
      {renderContent()}
    </Box>
  );
}
