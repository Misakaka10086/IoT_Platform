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

  return (
    <Box
      component="footer"
      sx={{
        py: 2,
        px: 2,
        mt: "auto",
        backgroundColor: muiTheme.palette.background.paper,
        borderTop: 1,
        borderColor: muiTheme.palette.divider,
      }}
    >
      <Container maxWidth="lg">
        <Typography variant="body2" color="text.secondary" align="center">
          IoT Device Management Platform v0.1.0
        </Typography>
      </Container>
    </Box>
  );
};
