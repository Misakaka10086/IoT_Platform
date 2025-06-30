"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Chip,
  Paper,
  Alert,
  Button,
  CircularProgress,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Divider,
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  Memory as BoardIcon,
  SaveAlt as SaveAltIcon,
  CloudUpload as CloudUploadIcon,
} from "@mui/icons-material";
import PinwheelLoader from "../../components/PinwheelLoader";
import { FirmwareS3Info } from "../../api/firmware/s3/route"; // Import the interface

interface GroupedFirmware {
  gitCommitSha: string;
  versions: FirmwareS3Info[]; // All firmware files associated with this commit SHA
}

export default function FirmwareUpdateTab() {
  const [allFirmwareS3Data, setAllFirmwareS3Data] = useState<FirmwareS3Info[]>([]);
  const [groupedFirmwareData, setGroupedFirmwareData] = useState<GroupedFirmware[]>([]);
  const [selectedGitCommitSha, setSelectedGitCommitSha] = useState<string | null>(null);
  const [selectedBoards, setSelectedBoards] = useState<Record<string, boolean>>({}); // s3Key: true/false

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);


  const fetchFirmwareData = async () => {
    setLoading(true);
    setError(null);
    setSelectedGitCommitSha(null);
    setSelectedBoards({});
    try {
      const response = await fetch("/api/firmware/s3");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status}`);
      }
      const data: { firmwareData: FirmwareS3Info[] } = await response.json();
      setAllFirmwareS3Data(data.firmwareData || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch firmware data from S3.");
      setAllFirmwareS3Data([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFirmwareData();
  }, []);

  useEffect(() => {
    // Group firmware data by gitCommitSha
    const groups: Record<string, FirmwareS3Info[]> = {};
    allFirmwareS3Data.forEach((fw) => {
      if (!groups[fw.gitCommitSha]) {
        groups[fw.gitCommitSha] = [];
      }
      groups[fw.gitCommitSha].push(fw);
    });

    const groupedArray: GroupedFirmware[] = Object.entries(groups).map(
      ([gitCommitSha, versions]) => ({
        gitCommitSha,
        versions: versions.sort((a,b) => a.board.localeCompare(b.board)), // Sort boards alphabetically
      })
    );

    // Sort groups by the lastModified date of the newest firmware in each group
    groupedArray.sort((a, b) => {
        const lastModifiedA = Math.max(...a.versions.map(v => v.lastModified ? new Date(v.lastModified).getTime() : 0));
        const lastModifiedB = Math.max(...b.versions.map(v => v.lastModified ? new Date(v.lastModified).getTime() : 0));
        return lastModifiedB - lastModifiedA; // Newest first
    });

    setGroupedFirmwareData(groupedArray);
  }, [allFirmwareS3Data]);

  const handleGitCommitShaChipClick = (gitCommitSha: string) => {
    setSelectedGitCommitSha(gitCommitSha);
    setSelectedBoards({}); // Reset board selection when a new commit is chosen
  };

  const handleBoardCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedBoards({
      ...selectedBoards,
      [event.target.name]: event.target.checked, // name is s3Key
    });
  };

  const selectedFirmwareForCommit = useMemo(() => {
    if (!selectedGitCommitSha) return [];
    return groupedFirmwareData.find(g => g.gitCommitSha === selectedGitCommitSha)?.versions || [];
  }, [selectedGitCommitSha, groupedFirmwareData]);

  const handleConfirmUpdate = () => {
    // This will be implemented in Part 2
    setSubmitting(true);
    console.log("Selected for update:", {
      gitCommitSha: selectedGitCommitSha,
      selectedFirmwareToUpdate: Object.entries(selectedBoards)
        .filter(([_, isSelected]) => isSelected)
        .map(([s3Key, _]) => allFirmwareS3Data.find(fw => fw.s3Key === s3Key)),
    });
    // Simulate API call
    setTimeout(() => {
      setSubmitting(false);
      alert("Update functionality is not yet implemented.\nCheck console for selected data.");
    }, 1500);
  };

  const getSelectedBoardCount = () => {
    return Object.values(selectedBoards).filter(Boolean).length;
  }

  if (loading && groupedFirmwareData.length === 0) {
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
          Loading firmware data from S3...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ py: 2 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h5" gutterBottom component="div">
          Firmware Update
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchFirmwareData}
          disabled={loading}
        >
          Refresh Firmware List
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <SaveAltIcon sx={{ mr: 1 }} /> 1. Select Firmware Version (Git Commit SHA)
        </Typography>
        {groupedFirmwareData.length > 0 ? (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, py:1 }}>
            {groupedFirmwareData.map((group) => (
              <Chip
                key={group.gitCommitSha}
                label={`${group.gitCommitSha.substring(0, 7)}... (${group.versions.length} board${group.versions.length > 1 ? 's' : ''})`}
                onClick={() => handleGitCommitShaChipClick(group.gitCommitSha)}
                color={
                  selectedGitCommitSha === group.gitCommitSha
                    ? "primary"
                    : "default"
                }
                variant={
                  selectedGitCommitSha === group.gitCommitSha
                    ? "filled"
                    : "outlined"
                }
                sx={{
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                  fontSize: "0.9rem",
                  cursor: "pointer",
                }}
              />
            ))}
          </Box>
        ) : (
          !loading && <Typography variant="body2" color="text.secondary">
            No firmware versions found in S3.
          </Typography>
        )}
      </Paper>

      {selectedGitCommitSha && (
        <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <BoardIcon sx={{ mr: 1 }} /> 2. Select Target Board(s) for Commit <Chip size="small" label={selectedGitCommitSha.substring(0,7)} sx={{ml: 1, fontFamily: "var(--font-jetbrains-mono), monospace"}}/>
          </Typography>
          {selectedFirmwareForCommit.length > 0 ? (
            <FormGroup>
              {selectedFirmwareForCommit.map((fw) => (
                <Paper key={fw.s3Key} variant="outlined" sx={{ p: 2, mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={selectedBoards[fw.s3Key] || false}
                        onChange={handleBoardCheckboxChange}
                        name={fw.s3Key}
                      />
                    }
                    label={
                        <Box>
                            <Typography variant="body1">{fw.board}</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "var(--font-jetbrains-mono), monospace" }}>
                                File: {fw.version} (SHA256: {fw.sha256.substring(0,12)}...)
                            </Typography>
                        </Box>
                    }
                  />
                  <Typography variant="caption" color="text.secondary">
                    Updated: {fw.lastModified ? new Date(fw.lastModified).toLocaleDateString() : 'N/A'}
                  </Typography>
                </Paper>
              ))}
            </FormGroup>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No specific firmware files found for this commit. This shouldn't happen if data is consistent.
            </Typography>
          )}
        </Paper>
      )}

      {selectedGitCommitSha && getSelectedBoardCount() > 0 && (
        <Paper elevation={2} sx={{ p:3, position: 'sticky', bottom: 16, zIndex: 10 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1">
                    Ready to update <strong>{getSelectedBoardCount()}</strong> board(s) with firmware from commit <strong>{selectedGitCommitSha.substring(0,7)}</strong>.
                </Typography>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />}
                    onClick={handleConfirmUpdate}
                    disabled={submitting || getSelectedBoardCount() === 0}
                    size="large"
                >
                    {submitting ? "Processing..." : `Confirm Update for ${getSelectedBoardCount()} Board(s)`}
                </Button>
            </Box>
        </Paper>
      )}
    </Box>
  );
}
