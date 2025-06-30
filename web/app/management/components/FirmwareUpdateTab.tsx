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
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  GitHub as GitHubIcon,
  DeveloperBoard as BoardIcon,
  SystemUpdateAlt as UpdateIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
} from "@mui/icons-material";
import PinwheelLoader from "../../components/PinwheelLoader";
import {
  FirmwareApiResponse,
  FirmwareUpdateResponse,
} from "../../../types/firmware";

export default function FirmwareUpdateTab() {
  const [firmwareData, setFirmwareData] = useState<FirmwareApiResponse | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updateResponse, setUpdateResponse] =
    useState<FirmwareUpdateResponse | null>(null);
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
    setUpdateResponse(null);
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
    if (commit === selectedCommit) {
      setSelectedCommit(null); //再次点击取消选择
      setSelectedBoards({});
    } else {
      setSelectedCommit(commit);
      setSelectedBoards({}); // 重置所选的board
    }
    setUpdateResponse(null); // 清除上次的更新结果
  };

  const handleBoardSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedBoards({
      ...selectedBoards,
      [event.target.name]: event.target.checked,
    });
  };

  const handleUpdate = async () => {
    const boardsToUpdate = Object.keys(selectedBoards).filter(
      (b) => selectedBoards[b]
    );
    if (!selectedCommit || boardsToUpdate.length === 0) {
      setError("Please select a firmware version and at least one board.");
      return;
    }

    setUpdating(true);
    setError(null);
    setUpdateResponse(null);

    try {
      const response = await fetch("/api/firmware/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commitSha: selectedCommit,
          boards: boardsToUpdate,
        }),
      });

      const result: FirmwareUpdateResponse = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Failed to initiate update.");
      }
      setUpdateResponse(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const getSelectedBoardsCount = () =>
    Object.values(selectedBoards).filter(Boolean).length;

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

    if (error && !firmwareData) {
      // 只在没有数据时全屏显示错误
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
        <Paper elevation={1} sx={{ p: { xs: 2, md: 3 }, mb: 3 }}>
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

        <Collapse in={!!selectedCommit}>
          {selectedCommit && firmwareData[selectedCommit] && (
            <Paper elevation={1} sx={{ p: { xs: 2, md: 3 }, mb: 3 }}>
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
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <BoardIcon fontSize="small" />
                        <Typography>{board}</Typography>
                      </Box>
                    }
                  />
                ))}
              </FormGroup>
            </Paper>
          )}
        </Collapse>

        <Divider sx={{ my: 3 }} />

        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: 2,
          }}
        >
          {updating && <CircularProgress size={24} />}
          <Button
            variant="contained"
            color="primary"
            startIcon={<UpdateIcon />}
            disabled={
              !selectedCommit || getSelectedBoardsCount() === 0 || updating
            }
            onClick={handleUpdate}
          >
            Initiate Update ({getSelectedBoardsCount()})
          </Button>
        </Box>
        {error && (
          <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {updateResponse && (
          <Paper elevation={2} sx={{ p: { xs: 2, md: 3 }, mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Update Results
            </Typography>
            <List dense>
              {updateResponse.results.map((res, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    {res.success ? (
                      <SuccessIcon color="success" />
                    ) : (
                      <ErrorIcon color="error" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={res.board}
                    secondary={
                      res.success
                        ? `Command sent to topic: ${res.topic}`
                        : `Error: ${res.error}`
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        )}
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
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh List"}
        </Button>
      </Box>
      {renderContent()}
    </Box>
  );
}
