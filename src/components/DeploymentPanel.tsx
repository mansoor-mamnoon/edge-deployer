import React from "react";

interface DeploymentPanelProps {
  status: string;
  isDeploying: boolean;
  statusClass: string;
  deployUrl: string | null;
}

const DeploymentPanel: React.FC<DeploymentPanelProps> = ({
  status,
  isDeploying,
  statusClass,
  deployUrl,
}) => {
  return (
    <>
      {/* Status + Spinner */}
      <div
        className={statusClass}
        style={{
          color: "#ccc",
          padding: "5px 10px",
          display: "flex",
          alignItems: "center",
        }}
      >
        {status}
        {isDeploying && <div className="loader" style={{ marginLeft: 10 }}></div>}
      </div>

      {/* Link to deployed Cloudflare Worker */}
      {deployUrl && (
        <a
          href={deployUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#4af", marginLeft: "12px", padding: "5px 10px" }}
        >
          🔗 View Deployed Worker
        </a>
      )}
    </>
  );
};

export default DeploymentPanel;
