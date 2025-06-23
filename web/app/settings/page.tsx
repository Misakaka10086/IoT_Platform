"use client";

import React, { useState, useEffect } from "react";
import { Box, Card, CardContent, Typography, Alert } from "@mui/material";
import { Wifi as WifiIcon } from "@mui/icons-material";
import { pusherClientService } from "../services/pusherClientService";

export default function SettingsPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize Pusher client if not already initialized
    const initializePusher = async () => {
      try {
        // Check if Pusher is already initialized
        if (pusherClientService.getConnectionState() !== "disconnected") {
          setIsInitialized(true);
          setIsConnected(pusherClientService.isClientConnected());
          return;
        }

        // Get Pusher config from API
        const response = await fetch("/api/pusher/config");
        const data = await response.json();

        if (data.success) {
          pusherClientService.initialize(data.config);
          setIsInitialized(true);

          // Set up connection status listeners
          const pusher = pusherClientService["pusher"]; // 访问私有属性
          if (pusher) {
            pusher.connection.bind("connected", () => {
              setIsConnected(true);
            });

            pusher.connection.bind("disconnected", () => {
              setIsConnected(false);
            });

            // Initial state
            setIsConnected(pusherClientService.isClientConnected());
          }
        }
      } catch (err) {
        console.error("❌ Settings page: Error initializing Pusher:", err);
      }
    };

    initializePusher();
  }, []);

  return (
    <Box sx={{ maxWidth: 800, mx: "auto" }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Settings
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <WifiIcon sx={{ mr: 1 }} />
            <Typography variant="h6">Real-time Status Updates</Typography>
          </Box>

          <Alert severity="success" sx={{ mb: 2 }}>
            <Typography variant="body2">
              Device status updates are now handled via EMQX WebHook and Pusher
              for real-time updates. Configuration is managed through
              environment variables.
            </Typography>
          </Alert>

          <Alert severity={isConnected ? "success" : "warning"} sx={{ mb: 2 }}>
            <Typography variant="body2">
              Pusher Connection Status:{" "}
              {isConnected ? "Connected" : "Disconnected"}
            </Typography>
          </Alert>

          <Typography variant="body2" color="text.secondary">
            To enable WebHook functionality, configure EMQX to send events to:
            <br />
            <code>https://your-domain.vercel.app/api/emqx/webhook</code>
            <br />
            <br />
            Events to configure: <code>client.connected</code> and{" "}
            <code>client.disconnected</code>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
