"use client";
import AppHeader from "@/components/navigation/AppHeader";
import RelationshipExplorer from "@/components/relationships/RelationshipExplorer";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
export default function RelationshipsPage() {
  return (
    <ProtectedRoute>
      <div className="dashboard-v2">
        <AppHeader />
        <main id="workspace-content" tabIndex={-1} className="workspace-content dashboard-main relationships-page">
          <header className="dashboard-title">
            <div>
              <span className="dash-eyebrow">
                <span className="live-dot" />
                RELATIONSHIP INTELLIGENCE
              </span>
              <h1>
                Connect the dots<span>.</span>
              </h1>
              <p>
                Your accounts, commitments, merchants, and the evidence that
                connects them.
              </p>
            </div>
          </header>
          <RelationshipExplorer />
        </main>
      </div>
    </ProtectedRoute>
  );
}
