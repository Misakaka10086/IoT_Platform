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
  useMediaQuery,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { useTheme as useMuiTheme } from "@mui/material/styles";
import {
  Home as HomeIcon,
  Settings as SettingsIcon,
  PlayArrow as TestIcon,
  ManageAccounts as ManagementIcon,
  Brightness4,
  Brightness7,
  Menu as MenuIcon,
} from "@mui/icons-material";
import { useTheme } from "./AppThemeProvider"; // Custom theme hook

export const Header: React.FC = () => {
  const { themeMode, toggleTheme } = useTheme(); // Custom theme hook for light/dark mode
  const pathname = usePathname();
  const muiTheme = useMuiTheme(); // MUI theme for breakpoints
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("md")); // Use 'md' for a more common breakpoint

  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const toggleDrawer = (open: boolean) => (
    event: React.KeyboardEvent | React.MouseEvent
  ) => {
    if (
      event.type === "keydown" &&
      ((event as React.KeyboardEvent).key === "Tab" ||
        (event as React.KeyboardEvent).key === "Shift")
    ) {
      return;
    }
    setDrawerOpen(open);
  };

  const navItems = [
    { text: "Home", href: "/", icon: <HomeIcon /> },
    { text: "Settings", href: "/settings", icon: <SettingsIcon /> },
    { text: "Test", href: "/test", icon: <TestIcon /> },
    { text: "Management", href: "/management", icon: <ManagementIcon /> },
  ];

  const drawerList = (
    <Box
      sx={{ width: 250 }}
      role="presentation"
      onClick={toggleDrawer(false)}
      onKeyDown={toggleDrawer(false)}
    >
      <List>
        {navItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton component={Link} href={item.href} selected={pathname === item.href}>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <AppBar position="static" elevation={1}>
      <Toolbar>
        <Typography
          variant="h6"
          component="div"
          sx={{
            flexGrow: 1,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {isMobile ? "IoT Platform" : "IoT Device Management Platform"}
        </Typography>

        {isMobile ? (
          <>
            <IconButton color="inherit" onClick={toggleTheme} sx={{ ml: 1 }}>
              {themeMode === "dark" ? <Brightness7 /> : <Brightness4 />}
            </IconButton>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="end"
              onClick={toggleDrawer(true)}
              sx={{ ml: 0.5 }}
            >
              <MenuIcon />
            </IconButton>
            <Drawer anchor="right" open={drawerOpen} onClose={toggleDrawer(false)}>
              {drawerList}
            </Drawer>
          </>
        ) : (
          <Box sx={{ display: "flex", gap: 0.5 }}> {/* Reduced gap for desktop */}
            {navItems.map((item) => (
              <Button
                key={item.text}
                component={Link}
                href={item.href}
                color="inherit"
                startIcon={item.icon}
                variant={pathname === item.href ? "contained" : "text"}
                sx={{
                  backgroundColor:
                    pathname === item.href
                      ? "rgba(255, 255, 255, 0.1)"
                      : "transparent",
                  "&:hover": {
                    backgroundColor:
                      pathname === item.href
                        ? "rgba(255, 255, 255, 0.15)"
                        : "rgba(255, 255, 255, 0.05)",
                  },
                }}
              >
                {item.text}
              </Button>
            ))}
            <IconButton color="inherit" onClick={toggleTheme} sx={{ ml: 1 }}>
              {themeMode === "dark" ? <Brightness7 /> : <Brightness4 />}
            </IconButton>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};
