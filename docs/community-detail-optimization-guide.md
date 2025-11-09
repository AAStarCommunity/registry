# CommunityDetail Page Optimization Guide

**日期**: 2025-11-09
**文件**: `src/pages/explorer/CommunityDetail.tsx`
**目标**: 完成任务B的3个优化项

---

## 📋 任务清单

- [ ] **任务6**: Safe 连接切换按钮
- [ ] **任务7**: Alert 改为 Toast 通知
- [ ] **任务8**: 布局优化

---

## 任务6: Safe 连接切换按钮

### 问题
当在 Safe App 中访问页面时，如果用户已用EOA连接，需要提供切换到Safe的方式。

### 解决方案

#### 方式1: 检测Safe环境并自动提示

```tsx
// 在 CommunityDetail.tsx 添加
import { useSafeApp } from "../../hooks/useSafeApp";

export function CommunityDetail() {
  const { sdk, safe, isLoading, isSafeApp } = useSafeApp();
  const [userAddress, setUserAddress] = useState<string>("");
  const [isOwner, setIsOwner] = useState(false);

  // ... existing code ...

  // 检查owner匹配
  useEffect(() => {
    if (community && userAddress) {
      // EOA owner match
      const eoaMatch = community.community.toLowerCase() === userAddress.toLowerCase();

      // Safe owner match
      const safeMatch = safe ? community.community.toLowerCase() === safe.safeAddress.toLowerCase() : false;

      setIsOwner(eoaMatch || safeMatch);

      // 如果Safe是owner，但用户连接的是EOA，提示切换
      if (!safeMatch && safe && community.community.toLowerCase() === safe.safeAddress.toLowerCase()) {
        // 显示提示：检测到Safe是owner，建议使用Safe连接
      }
    }
  }, [community, userAddress, safe]);

  return (
    <div className="community-detail">
      {/* Safe Detection Banner */}
      {isSafeApp && safe && community &&
       community.community.toLowerCase() === safe.safeAddress.toLowerCase() &&
       userAddress.toLowerCase() !== safe.safeAddress.toLowerCase() && (
        <div className="safe-detection-banner">
          <div className="banner-icon">ℹ️</div>
          <div className="banner-content">
            <p>
              <strong>Safe Wallet Detected:</strong> This community is owned by Safe {safe.safeAddress.slice(0,6)}...{safe.safeAddress.slice(-4)}
            </p>
            <p style={{marginTop: '0.5rem', fontSize: '0.9rem'}}>
              You are currently connected with {userAddress.slice(0,6)}...{userAddress.slice(-4)}.
              To edit community settings, ensure you're using the Safe App interface.
            </p>
          </div>
        </div>
      )}

      {/* ... rest of the page ... */}
    </div>
  );
}
```

#### CSS样式

```css
/* Safe Detection Banner */
.safe-detection-banner {
  max-width: 1200px;
  margin: 1rem auto;
  padding: 1.25rem;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%);
  border: 2px solid rgba(59, 130, 246, 0.3);
  border-radius: 12px;
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.safe-detection-banner .banner-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.safe-detection-banner .banner-content {
  flex: 1;
  color: var(--text-color);
}

.safe-detection-banner .banner-content p {
  margin: 0;
  line-height: 1.6;
}
```

#### 方式2: 自动识别并切换连接地址

```tsx
// 优先使用Safe地址而不是EOA
const getEffectiveAddress = () => {
  if (isSafeApp && safe) {
    return safe.safeAddress;
  }
  return userAddress;
};

// 在检查owner时使用
const effectiveAddress = getEffectiveAddress();
const isOwner = community?.community.toLowerCase() === effectiveAddress.toLowerCase();
```

---

## 任务7: Alert 改为 Toast 通知

### 问题
当前使用 `alert()` 显示交易成功/失败信息，用户体验不佳。

### 解决方案：使用 react-toastify

#### 1. 安装依赖

```bash
npm install react-toastify
```

#### 2. 在 CommunityDetail.tsx 顶部导入

```tsx
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
```

#### 3. 替换所有 alert 调用

**修改前**:
```tsx
alert(`Transaction proposed to Safe!\n\nPlease approve it in the Safe interface.\n\nTransaction Hash: ${safeTxResult.safeTxHash}`);
```

**修改后**:
```tsx
toast.success(
  <div>
    <strong>Transaction proposed to Safe!</strong>
    <p style={{margin: '0.5rem 0'}}>Please approve it in the Safe interface.</p>
    <p style={{margin: 0, fontSize: '0.85rem', fontFamily: 'monospace'}}>
      Tx Hash: {safeTxResult.safeTxHash.slice(0,10)}...{safeTxResult.safeTxHash.slice(-8)}
    </p>
  </div>,
  {
    position: "top-right",
    autoClose: 5000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
  }
);
```

#### 4. 添加 ToastContainer 到组件

```tsx
return (
  <div className="community-detail">
    <ToastContainer />
    {/* ... rest of content ... */}
  </div>
);
```

#### 5. Toast 类型示例

```tsx
// Success
toast.success("Transaction confirmed!");

// Error
toast.error(`Failed to transfer ownership: ${err.message}`);

// Info
toast.info("Checking registration status...");

// Warning
toast.warning("Please connect your wallet first");

// Loading (with promise)
const toastId = toast.loading("Processing transaction...");
// ... do async work ...
toast.update(toastId, {
  render: "Transaction confirmed!",
  type: "success",
  isLoading: false,
  autoClose: 3000
});
```

---

## 任务8: 布局优化

### 优化1: Community Owner 独立一行显示

**问题**: 当前Owner地址在编辑时显示不全

**解决方案**: 将Owner卡片设置为full-width

#### 修改代码

```tsx
{/* Main Info Grid */}
<div className="info-grid">
  {/* Basic Information - Read-only */}
  <div className="info-card">...</div>

  {/* Token Information - Read-only */}
  <div className="info-card">...</div>

  {/* Paymaster Information - Read-only */}
  <div className="info-card">...</div>
</div>

{/* Community Owner - Full Width Row */}
<div className={`info-card-full editable ${editMode.ownerAddress || pendingChanges.ownerAddress ? 'editing' : ''}`}>
  <h3>👤 Community Owner</h3>
  <div className="owner-content">
    <div className="info-row">
      <span className="label">Owner Address:</span>
      {editMode.ownerAddress || (batchEditMode && pendingChanges.ownerAddress) ? (
        <div className="edit-controls-inline">
          <input
            type="text"
            value={newOwnerAddress}
            onChange={(e) => setNewOwnerAddress(e.target.value)}
            placeholder="0x..."
            className="address-input-full"
          />
          <button onClick={handleSaveOwner} className="save-btn">✅</button>
          <button onClick={handleCancelOwnerEdit} className="cancel-btn">❌</button>
        </div>
      ) : (
        <>
          <a
            href={getEtherscanAddressUrl(community.community)}
            target="_blank"
            rel="noopener noreferrer"
            className="address-link-full"
          >
            {community.community}
          </a>
          {isOwner && (
            <button onClick={handleEditOwner} className="transfer-owner-btn">
              🔄 Transfer Owner
            </button>
          )}
        </>
      )}
    </div>
  </div>
</div>

{/* Permissionless Mint Configuration */}
<div className={`info-card-full editable ${editMode.permissionlessMint || pendingChanges.permissionlessMint !== undefined ? 'editing' : ''}`}>
  <h3>⚙️ MySBT Register Configuration</h3>
  {/* ... existing permissionlessMint content ... */}
</div>

{/* MySBT Information - Full Width Row */}
<div className="info-card-full">
  <h3>🎫 MySBT Information</h3>
  <div className="info-rows">
    <div className="info-row">
      <span className="label">Supported SBTs:</span>
      <div className="sbt-list">
        {community.supportedSBTs.length > 0 ? (
          community.supportedSBTs.map((sbt, idx) => (
            <a
              key={idx}
              href={getEtherscanAddressUrl(sbt)}
              target="_blank"
              rel="noopener noreferrer"
              className="sbt-badge-link"
            >
              {sbt}
            </a>
          ))
        ) : (
          <span className="value empty">None</span>
        )}
      </div>
      <span className="readonly-badge">Read-only</span>
    </div>
  </div>
</div>
```

#### CSS样式

```css
/* Full-width info card */
.info-card-full {
  grid-column: 1 / -1; /* Span all columns */
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 1rem;
}

.info-card-full.editable {
  border: 2px solid #e5e7eb;
  transition: all 0.3s;
}

.info-card-full.editable.editing {
  border-color: #3b82f6;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
}

/* Full-width address input */
.address-input-full {
  flex: 1;
  width: 100%;
  max-width: 600px;
  padding: 0.75rem;
  border: 2px solid #3b82f6;
  border-radius: 6px;
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 0.9rem;
  transition: all 0.3s;
}

/* Full-width address link */
.address-link-full {
  color: #3b82f6;
  text-decoration: none;
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 0.9rem;
  transition: color 0.2s;
  word-break: break-all;
  flex: 1;
  max-width: 600px;
}

/* Transfer Owner Button */
.transfer-owner-btn {
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 2px 4px rgba(245, 158, 11, 0.2);
}

.transfer-owner-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(245, 158, 11, 0.3);
}

/* Owner content container */
.owner-content {
  margin-top: 1rem;
}
```

### 优化2: 改进Edit按钮为Transfer Owner

将 "✏️ Edit" 改为更明确的 "🔄 Transfer Owner" 按钮（已在上面代码中实现）

### 优化3: 响应式布局改进

```css
/* Responsive adjustments */
@media (max-width: 768px) {
  .info-grid {
    grid-template-columns: 1fr;
  }

  .address-input-full,
  .address-link-full {
    max-width: 100%;
  }

  .info-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .edit-controls-inline {
    flex-direction: column;
    width: 100%;
  }

  .transfer-owner-btn {
    width: 100%;
    margin-top: 0.5rem;
  }
}
```

---

## 🔧 实施步骤

### 步骤1: Safe连接优化
1. 添加Safe检测逻辑
2. 添加Safe Detection Banner
3. 添加CSS样式

### 步骤2: Toast通知
1. 安装 react-toastify
2. 导入到 CommunityDetail.tsx
3. 替换所有 alert 为 toast
4. 添加 ToastContainer

### 步骤3: 布局优化
1. 修改HTML结构（Owner和MySBT独立行）
2. 添加.info-card-full CSS
3. 修改Edit按钮为Transfer Owner
4. 测试响应式布局

---

## 📝 测试清单

- [ ] Safe App环境下正确检测Safe地址
- [ ] Toast通知正常显示（success/error/info）
- [ ] Owner地址完整显示（不被截断）
- [ ] Transfer Owner按钮点击正常
- [ ] MySBT列表独立行显示
- [ ] 移动端布局正常
- [ ] 编辑状态下输入框宽度合适

---

**文档版本**: v1.0
**最后更新**: 2025-11-09
**维护者**: AAstar Dev Team
