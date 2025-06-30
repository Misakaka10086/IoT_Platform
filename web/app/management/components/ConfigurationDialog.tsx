"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Chip,
  CircularProgress,
  useTheme, // 引入 useTheme 以便在 Monaco Editor 中使用
} from "@mui/material";
import GitHubIcon from "@mui/icons-material/GitHub";
import dynamic from "next/dynamic"; // 引入 dynamic
import { Device, DeviceConfig, ConfigVersion } from "../../../types/device"; // Changed ConfigVersionView to ConfigVersion
import { ConfigurationDialogProps } from "../../../types/components";


// 动态导入 Monaco Editor 以获得更好的体验
const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.Editor),
  {
    ssr: false,
    loading: () => (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "300px", // 与编辑器高度保持一致
          border: "1px solid rgba(0, 0, 0, 0.23)",
          borderRadius: "4px",
        }}
      >
        <CircularProgress />
      </Box>
    ),
  }
);

export default function ConfigurationDialog({
  open,
  onClose,
  onSave,
  device,
  onError,
  onSuccess,
}: ConfigurationDialogProps) {
  const theme = useTheme();
  const [deviceConfig, setDeviceConfig] = useState<DeviceConfig | null>(null);
  const [configVersions, setConfigVersions] = useState<ConfigVersion[]>([]); // Changed ConfigVersionView to ConfigVersion
  const [selectedVersion, setSelectedVersion] = useState<string>("");
  const [configFormData, setConfigFormData] = useState({
    config: "{}",
  });
  // 新增: 保存原始配置字符串，用于比较内容是否被修改
  const [originalConfigContent, setOriginalConfigContent] = useState("");
  const [isJsonValid, setIsJsonValid] = useState(true);
  const [loading, setLoading] = useState(false);
  const [versionsLoading, setVersionsLoading] = useState(false);

  useEffect(() => {
    if (open && device) {
      loadConfigurationData();
    }
  }, [open, device]);

  useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open]);

  const loadConfigurationData = async () => {
    if (!device) return;
    setLoading(true);
    try {
      const [configResponse, versionsResponse] = await Promise.all([
        fetch(`/api/devices/${device.device_id}/config`),
        fetch(`/api/devices/${device.device_id}/config/versions`),
      ]);

      if (!configResponse.ok) throw new Error("Failed to load configuration");
      if (!versionsResponse.ok) throw new Error("Failed to load versions");

      const configData = await configResponse.json();
      const versionsData = await versionsResponse.json();

      const initialConfigStr = JSON.stringify(
        configData.config.config,
        null,
        2
      );

      setDeviceConfig(configData.config);
      setConfigVersions(versionsData.versions as ConfigVersion[]); // Cast to ConfigVersion[]
      setSelectedVersion(configData.config.version);
      setConfigFormData({ config: initialConfigStr });
      // 新增: 初始化原始配置
      setOriginalConfigContent(initialConfigStr);
    } catch (err: any) {
      onError(err.message || "Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setDeviceConfig(null);
    setConfigVersions([]);
    setSelectedVersion("");
    setConfigFormData({ config: "{}" });
    // 新增: 重置原始配置
    setOriginalConfigContent("");
    setIsJsonValid(true);
    setLoading(false);
    setVersionsLoading(false);
  };

  const handleVersionChange = (version: string) => {
    setSelectedVersion(version);
    const selectedConfigVersion = configVersions.find(
      (v) => v.version === version
    );
    if (selectedConfigVersion) {
      const newConfigStr = JSON.stringify(
        selectedConfigVersion.config,
        null,
        2
      );
      setConfigFormData({ config: newConfigStr });
      // 新增: 当切换版本时，更新原始配置
      setOriginalConfigContent(newConfigStr);
    }
  };

  const handleSave = async () => {
    if (!device) return;

    let configObj;
    try {
      // 检查JSON有效性，即使按钮被禁用，也做一个最终检查
      configObj = JSON.parse(configFormData.config);
    } catch (e) {
      onError("Invalid JSON format for configuration");
      return;
    }

    // 新增: 比较当前内容和原始内容，判断是否被修改
    const isContentModified = configFormData.config !== originalConfigContent;

    if (isContentModified) {
      // 逻辑A: 内容被修改，创建新版本 (使用现有API)
      console.log("Content modified, creating new version...");
      await createNewVersion(configObj);
    } else {
      // 逻辑B: 内容未修改，切换到选定的版本 (使用新API)
      console.log("Content not modified, switching to selected version...");
      await setCurrentVersion(selectedVersion);
    }
  };

  const createNewVersion = async (configObj: Record<string, any>) => {
    if (!device) return;
    try {
      const response = await fetch(`/api/devices/${device.device_id}/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: configObj }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update device configuration");
      }
      onSuccess(
        "Device configuration updated successfully (new version created)"
      );
      onClose();
      onSave();
    } catch (err: any) {
      onError(err.message || "Network error occurred");
    }
  };

  // 新增: 用于切换当前版本的函数
  const setCurrentVersion = async (version: string) => {
    if (!device) return;
    try {
      const response = await fetch(
        `/api/devices/${device.device_id}/config/set-current`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ version }), // 发送要设置为当前的版本号
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to switch configuration version");
      }
      onSuccess(`Switched to version ${formatVersion(version)} successfully`);
      onClose();
      onSave();
    } catch (err: any) {
      onError(err.message || "Network error occurred");
    }
  };

  const formatVersion = (version: string) => {
    if (version.length === 15 && version.includes("T")) {
      const date = version.substring(0, 8);
      const time = version.substring(9);
      return `${date.substring(0, 4)}-${date.substring(4, 6)}-${date.substring(
        6,
        8
      )} ${time.substring(0, 2)}:${time.substring(2, 4)}:${time.substring(
        4,
        6
      )}`;
    }
    return version;
  };

  if (loading) {
    /* ... Loading UI ... */
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Edit Configuration - {device?.device_id}</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Configuration Version</InputLabel>
            <Select
              value={selectedVersion}
              label="Configuration Version"
              onChange={(e) => handleVersionChange(e.target.value)}
              disabled={versionsLoading}
            >
              {configVersions.map((v) => (
                <MenuItem key={v.version} value={v.version}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="body2">
                      {formatVersion(v.version)}
                    </Typography>
                    <Chip
                      icon={<GitHubIcon />}
                      label={v.git_version.substring(0, 6)}
                      size="small"
                      sx={{
                        fontFamily: "var(--font-jetbrains-mono), monospace",
                        fontSize: "0.875rem",
                      }}
                    />
                    {v.is_current && <Chip label="Current" color="primary" />}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* 升级为 Monaco Editor */}
          <Box
            sx={{
              mt: 1,
              border: "1px solid",
              borderColor: isJsonValid
                ? "rgba(0, 0, 0, 0.23)"
                : theme.palette.error.main,
              borderRadius: 1,
            }}
          >
            <MonacoEditor
              height="300px"
              language="json"
              theme={theme.palette.mode === "dark" ? "vs-dark" : "light"}
              value={configFormData.config}
              onChange={(value) => setConfigFormData({ config: value || "{}" })}
              onValidate={(markers) => setIsJsonValid(markers.length === 0)}
              options={{
                minimap: { enabled: false },
                automaticLayout: true,
                wordWrap: "on",
              }}
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!isJsonValid}
        >
          Save Configuration
        </Button>
      </DialogActions>
    </Dialog>
  );
}
