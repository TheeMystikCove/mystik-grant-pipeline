import { Sidebar } from "@/components/layout/sidebar";
import { AutoSignOut } from "@/components/AutoSignOut";
import { NexisPanel } from "@/components/nexis/NexisPanel";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <AutoSignOut />
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {children}
      </div>
      <NexisPanel />
    </div>
  );
}
