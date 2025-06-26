"use client";

import React from "react";
import { Box } from "@mui/material";
import styles from "./PinwheelLoader.module.css";

const PinwheelLoader: React.FC = () => {
  return (
    <Box className={styles.loader}>
      <Box className={styles.container}>
        <Box className={`${styles.paper_container} ${styles.red}`}>
          <Box className={`${styles.paper_leaf_1} ${styles.red_1}`}></Box>
          <Box className={`${styles.paper_leaf_2} ${styles.red_2}`}></Box>
        </Box>

        <Box className={`${styles.paper_container} ${styles.rotate_90}`}>
          <Box className={`${styles.paper_leaf_1} ${styles.yellow_1}`}></Box>
          <Box className={`${styles.paper_leaf_2} ${styles.yellow_2}`}></Box>
        </Box>

        <Box className={`${styles.paper_container} ${styles.rotate_180}`}>
          <Box className={`${styles.paper_leaf_1} ${styles.green_1}`}></Box>
          <Box className={`${styles.paper_leaf_2} ${styles.green_2}`}></Box>
        </Box>

        <Box className={`${styles.paper_container} ${styles.rotate_270}`}>
          <Box className={`${styles.paper_leaf_1} ${styles.blue_1}`}></Box>
          <Box className={`${styles.paper_leaf_2} ${styles.blue_2}`}></Box>
        </Box>
      </Box>
    </Box>
  );
};

export default PinwheelLoader;
