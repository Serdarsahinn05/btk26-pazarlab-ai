"use client";

import { useState, Suspense } from "react";
import Sidebar from "@/components/Sidebar";
import StatusBar from "@/components/StatusBar";
import { cn } from "@/lib/utils";
import { Menu, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar Wrapper */}
        <div className={cn(
          "fixed inset-y-0 left-0 z-[70] lg:relative transition-all duration-300 ease-in-out",
          isSidebarCollapsed ? "w-20" : "w-64",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}>
          <Suspense fallback={<div className="w-full h-full bg-card/30" />}>
            <Sidebar isCollapsed={isSidebarCollapsed} />
          </Suspense>
          
          {/* Collapse Toggle Button (Desktop) */}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden lg:flex absolute -right-3 top-10 w-6 h-6 bg-primary rounded-full items-center justify-center text-white shadow-lg shadow-primary/20 hover:scale-110 transition-transform z-[80]"
          >
            {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 relative overflow-y-auto bg-grid-dots flex flex-col min-w-0 custom-scrollbar">
          {/* Mobile Header */}
          <header className="lg:hidden flex items-center justify-between p-4 border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-40">
             <div className="flex items-center gap-2">
                <div className="bg-primary/20 p-1.5 rounded-lg">
                  <div className="w-5 h-5 bg-primary rounded-sm" />
                </div>
                <span className="text-lg font-black tracking-tighter text-gradient">PAZARLAB</span>
             </div>
             <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(true)}>
                <Menu className="w-6 h-6" />
             </Button>
          </header>

          <div className="flex-1 min-h-0 relative p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </main>

      </div>

      <Suspense fallback={null}>
        <StatusBar />
      </Suspense>
    </div>
  );
}
