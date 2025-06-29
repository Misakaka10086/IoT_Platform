"use client";

import React from "react";
import {
  Box,
  Container,
  Typography,
  useTheme as useMuiTheme,
} from "@mui/material";
export const Footer = () => {
  const muiTheme = useMuiTheme();
  const gitSha = process.env.NEXT_PUBLIC_GIT_SHA || "Unknown";
  return (
    <Box
      component="footer"
      sx={{
        py: 2,
        px: 3,
        mt: "auto",
        backgroundColor: (theme) => theme.palette.background.paper,
        borderTop: "1px solid",
        borderColor: (theme) => theme.palette.divider,
        textAlign: "center",
      }}
    >
      <Typography variant="body2" color="text.secondary">
        IoT Device Management Platform © {new Date().getFullYear()}
        {" | "}
        <Typography component="span" variant="body2" color="primary">
          {gitSha}
        </Typography>
      </Typography>
    </Box>
  );
};
