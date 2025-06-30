"use client";

import React, { useState } from "react";
import { Box, Tabs, Tab, Typography, Paper } from "@mui/material";
import {
  Devices as DevicesIcon,
  Memory as ProfilesIcon,
  History as HistoryIcon,
} from "@mui/icons-material";
import DevicesTab from "./components/DevicesTab";
import ProfilesTab from "./components/ProfilesTab";
import FirmwareVersionsTab from "./components/FirmwareVersionsTab";
import { TabPanelProps } from "../../types/components";

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`management-tabpanel-${index}`}
      aria-labelledby={`management-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `management-tab-${index}`,
    "aria-controls": `management-tabpanel-${index}`,
  };
}

export default function ManagementPage() {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box>
      <Tabs
        value={tabValue}
        onChange={handleTabChange}
        aria-label="management tabs"
        sx={{ borderBottom: 1, borderColor: "divider" }}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
      >
        <Tab
          label="Devices"
          icon={<DevicesIcon />}
          iconPosition="start"
          {...a11yProps(0)}
        />
        <Tab
          label="Profiles"
          icon={<ProfilesIcon />}
          iconPosition="start"
          {...a11yProps(1)}
        />
        <Tab
          label="Firmware Versions"
          icon={<HistoryIcon />}
          iconPosition="start"
          {...a11yProps(2)}
        />
      </Tabs>

      <TabPanel value={tabValue} index={0}>
        <DevicesTab />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <ProfilesTab />
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <FirmwareVersionsTab />
      </TabPanel>
    </Box>
  );
}
