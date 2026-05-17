"use client";

import { Beaker, Zap, Users, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";


interface SidebarProps {
  isCollapsed?: boolean;
}

export default function Sidebar({ isCollapsed = false }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentView = searchParams.get("view") || "analysis";


  const menuItems = [
    { icon: Beaker, label: "Pazar Analizi", href: "/dashboard?view=analysis", active: currentView === "analysis" && pathname === "/dashboard" },
    { icon: Zap, label: "Rekabet Analizi", href: "/dashboard?view=benchmark", active: currentView === "benchmark" && pathname === "/dashboard" },
    { icon: MessageSquare, label: "Ajan Tartışması", href: "/dashboard?view=debate", active: currentView === "debate" && pathname === "/dashboard" },
    { icon: Users, label: "Persona Lab", href: "/dashboard?view=personas", active: currentView === "personas" && pathname === "/dashboard" },
  ];


  return (
    <aside className={cn(
      "h-full border-r border-border bg-card/30 backdrop-blur-md flex flex-col transition-all duration-300",
      isCollapsed ? "w-20" : "w-64"
    )}>
      <div className="p-6">
        <div className={cn("flex items-center gap-3 mb-8", isCollapsed && "justify-center")}>
          <div className="bg-primary/20 p-2 rounded-lg glow-blue shrink-0">
            <Beaker className="w-6 h-6 text-primary" />
          </div>
          {!isCollapsed && (
            <motion.span 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-xl font-black tracking-tighter text-gradient"
            >
              PAZARLAB AI
            </motion.span>
          )}
        </div>

        <nav className="space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                isCollapsed && "justify-center px-0",
                item.active 
                  ? "bg-primary/10 text-primary border border-primary/20 glow-blue" 
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
              title={isCollapsed ? item.label : ""}
            >
              <item.icon className={cn("w-5 h-5 shrink-0", item.active ? "text-primary" : "group-hover:text-primary transition-colors")} />
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  {item.label}
                </motion.span>
              )}
              {item.active && !isCollapsed && (
                <motion.div 
                  layoutId="active-pill"
                  className="absolute right-2 w-1 h-4 bg-primary rounded-full"
                />
              )}
              {item.active && isCollapsed && (
                <motion.div 
                   layoutId="active-dot"
                   className="absolute right-1 w-1.5 h-1.5 bg-primary rounded-full glow-blue"
                />
              )}
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
}

