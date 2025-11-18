import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { OperatorPermissions } from '../hooks/useOperatorPermissions';

interface AdminEntryButtonProps {
  permissions: OperatorPermissions;
  className?: string;
}

export const AdminEntryButton: React.FC<AdminEntryButtonProps> = ({
  permissions,
  className = ''
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/admin-batch-mint');
  };

  // Don't render if user doesn't have operator permissions
  if (!permissions.isOperator && !permissions.isOwner) {
    return null;
  }

  // Don't render while loading
  if (permissions.isLoading) {
    return null;
  }

  return (
    <div className={`admin-entry-container ${className}`}>
      <button
        className="admin-entry-button"
        onClick={handleClick}
        title={
          permissions.isOwner
            ? "Contract Owner - Full access to admin panel"
            : "Operator - Access to batch minting functions"
        }
      >
        <span className="admin-icon">🔧</span>
        <span className="admin-text">
          {permissions.isOwner ? "管理员面板" : "批量铸造管理"}
        </span>
        <span className="admin-badge">
          {permissions.isOwner ? "OWNER" : "OPERATOR"}
        </span>
      </button>

      {permissions.error && (
        <div className="admin-permission-error">
          ⚠️ {permissions.error}
        </div>
      )}
    </div>
  );
};