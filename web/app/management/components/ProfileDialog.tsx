"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  InputLabel,
  CircularProgress,
  useTheme,
} from "@mui/material";
import dynamic from "next/dynamic";

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
          height: "250px",
          border: "1px solid rgba(0, 0, 0, 0.23)",
          borderRadius: "4px",
        }}
      >
        <CircularProgress />
      </Box>
    ),
  }
);

interface ProfileDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  formData: { model: string; default_config: string };
  setFormData: React.Dispatch<
    React.SetStateAction<{ model: string; default_config: string }>
  >;
  isEditMode: boolean;
  profileModel?: string;
}

export default function ProfileDialog({
  open,
  onClose,
  onSave,
  formData,
  setFormData,
  isEditMode,
  profileModel,
}: ProfileDialogProps) {
  const theme = useTheme();
  // 新增: state 用于跟踪 JSON 是否有效。默认为 true，因为初始值应该是有效的。
  const [isJsonValid, setIsJsonValid] = useState(true);

  // 新增: Monaco Editor 的 onValidate 回调函数
  const handleEditorValidation = (markers: any[]) => {
    // markers 是一个包含错误信息的数组。如果数组为空，则内容有效。
    setIsJsonValid(markers.length === 0);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {isEditMode ? `Edit Profile - ${profileModel}` : "Add New Profile"}
      </DialogTitle>
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
            sx={{ mb: 3 }}
          />

          <Box>
            <InputLabel
              shrink
              sx={{ fontSize: "1.25rem", position: "relative" }}
            >
              Default Configuration (JSON)
            </InputLabel>
            <Box
              sx={{
                mt: 1,
                border: "1px solid",
                borderColor: isJsonValid // 修改: 边框颜色根据 JSON 有效性变化
                  ? "rgba(0, 0, 0, 0.23)"
                  : theme.palette.error.main,
                borderRadius: 1,
                "&:hover": {
                  borderColor: isJsonValid
                    ? "rgba(0, 0, 0, 0.87)"
                    : theme.palette.error.dark,
                },
              }}
            >
              <MonacoEditor
                height="250px"
                language="json"
                theme={theme.palette.mode === "dark" ? "vs-dark" : "light"}
                value={formData.default_config}
                onChange={(value) =>
                  setFormData({ ...formData, default_config: value || "" })
                }
                onValidate={handleEditorValidation} // 新增: 绑定验证回调
                options={{
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  wordWrap: "on",
                  padding: {
                    top: 10,
                  },
                }}
              />
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={onSave}
          variant="contained"
          disabled={!isJsonValid} // 修改: 当 JSON 无效时禁用按钮
        >
          {isEditMode ? "Update Profile" : "Create Profile"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
