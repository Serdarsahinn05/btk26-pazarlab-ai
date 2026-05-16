"use client";

import { useEffect, useState } from "react";
import { Activity, Globe, Cpu, Wifi } from "lucide-react";


export default function StatusBar() {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);


  return (
    <footer className="h-8 border-t border-border bg-card/50 backdrop-blur-md flex items-center px-4 text-[10px] terminal-text text-muted-foreground z-50">
      <div className="flex items-center gap-4 flex-1">
        <div className="flex items-center gap-1.5 text-neon-green">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span>SYSTEM READY</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Activity className="w-3 h-3" />
          <span>ENGINE: STABLE</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Wifi className="w-3 h-3" />
          <span>API: CONNECTED (12ms)</span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-1.5">
          <Cpu className="w-3 h-3" />
          <span>GEMINI-1.5-FLASH</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Globe className="w-3 h-3" />
          <span>LOCATION: TR-IST</span>
        </div>
        <div className="border-l border-border pl-4 min-w-[70px]">
          {time ? time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "--:--:--"}
        </div>

      </div>
    </footer>
  );
}
