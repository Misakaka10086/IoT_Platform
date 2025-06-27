"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { pusherClientService } from "../services/pusherClientService";

interface PusherContextType {
  isPusherConnected: boolean;
  isPusherInitialized: boolean;
}

const PusherContext = createContext<PusherContextType | undefined>(undefined);

// 这是其他Hook可以用来获取Pusher连接状态的Hook
export function usePusher() {
  const context = useContext(PusherContext);
  if (!context) {
    throw new Error("usePusher must be used within a PusherProvider");
  }
  return context;
}

// 这是包裹整个应用的Provider组件
export function PusherProvider({ children }: { children: ReactNode }) {
  const [isPusherInitialized, setIsPusherInitialized] = useState(false);
  const [isPusherConnected, setIsPusherConnected] = useState(false);

  useEffect(() => {
    // 这段逻辑只在组件首次挂载时执行一次
    const initializePusher = async () => {
      if (pusherClientService.isClientConnected()) {
        setIsPusherInitialized(true);
        setIsPusherConnected(true);
        return;
      }

      try {
        const response = await fetch("/api/pusher/config");
        const data = await response.json();

        if (data.success) {
          pusherClientService.initialize(data.config);

          // ✅【核心修正】: 直接使用Pusher的事件来更新状态，而不是setInterval
          const pusher = pusherClientService.getPusherInstance(); // 假设你在service中暴露一个获取实例的方法

          if (pusher) {
            const onConnected = () => setIsPusherConnected(true);
            const onDisconnected = () => setIsPusherConnected(false);

            // 绑定事件监听器
            pusher.connection.bind("connected", onConnected);
            pusher.connection.bind("disconnected", onDisconnected);
            pusher.connection.bind("error", onDisconnected); // 发生错误也视为断开

            // 设置初始状态
            setIsPusherConnected(pusher.connection.state === "connected");

            // 标记为已初始化
            setIsPusherInitialized(true);

            // 返回清理函数，在组件卸载时解绑监听器
            return () => {
              pusher.connection.unbind("connected", onConnected);
              pusher.connection.unbind("disconnected", onDisconnected);
              pusher.connection.unbind("error", onDisconnected);
            };
          } else {
            throw new Error(
              "Pusher instance not available after initialization."
            );
          }
        } else {
          throw new Error(data.error || "Failed to get Pusher config");
        }
      } catch (err) {
        console.error("❌ Failed to initialize Pusher:", err);
        setIsPusherInitialized(true);
      }
    };

    const cleanupPromise = initializePusher();
    return () => {
      cleanupPromise.then((cleanup) => cleanup && cleanup());
    };
  }, []); // 依赖项为空，确保只初始化一次

  const value = { isPusherConnected, isPusherInitialized };

  return (
    <PusherContext.Provider value={value}>{children}</PusherContext.Provider>
  );
}
