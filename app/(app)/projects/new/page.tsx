import { Topbar } from "@/components/layout/topbar";
import { NewProjectClient } from "./NewProjectClient";

export default function NewProjectPage() {
  return (
    <>
      <Topbar title="New Project" subtitle="Upload a brief or enter details manually" />
      <main style={{ flex: 1, padding: "1.5rem", overflowY: "auto" }}>
        <NewProjectClient />
      </main>
    </>
  );
}
