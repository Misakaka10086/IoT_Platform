"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
} from "@mui/material";
import {
  Home as HomeIcon,
  Settings as SettingsIcon,
  PlayArrow as TestIcon,
  ManageAccounts as ManagementIcon,
  Brightness4,
  Brightness7,
} from "@mui/icons-material";
import { useTheme } from "./AppThemeProvider";

export const Header: React.FC = () => {
  const { themeMode, toggleTheme } = useTheme();
  const pathname = usePathname();

  return (
    <AppBar position="static" elevation={1}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          IoT Device Management Platform
        </Typography>

        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            component={Link}
            href="/"
            color="inherit"
            startIcon={<HomeIcon />}
            variant={pathname === "/" ? "contained" : "text"}
            sx={{
              backgroundColor:
                pathname === "/" ? "rgba(255, 255, 255, 0.1)" : "transparent",
            }}
          >
            Home
          </Button>
          <Button
            component={Link}
            href="/settings"
            color="inherit"
            startIcon={<SettingsIcon />}
            variant={pathname === "/settings" ? "contained" : "text"}
            sx={{
              backgroundColor:
                pathname === "/settings"
                  ? "rgba(255, 255, 255, 0.1)"
                  : "transparent",
            }}
          >
            Settings
          </Button>
          <Button
            component={Link}
            href="/test"
            color="inherit"
            startIcon={<TestIcon />}
            variant={pathname === "/test" ? "contained" : "text"}
            sx={{
              backgroundColor:
                pathname === "/test"
                  ? "rgba(255, 255, 255, 0.1)"
                  : "transparent",
            }}
          >
            Test
          </Button>
          <Button
            component={Link}
            href="/management"
            color="inherit"
            startIcon={<ManagementIcon />}
            variant={pathname === "/management" ? "contained" : "text"}
            sx={{
              backgroundColor:
                pathname === "/management"
                  ? "rgba(255, 255, 255, 0.1)"
                  : "transparent",
            }}
          >
            Management
          </Button>
          <IconButton color="inherit" onClick={toggleTheme} sx={{ ml: 1 }}>
            {themeMode === "dark" ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
};
