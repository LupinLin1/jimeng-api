# 原始质量视频URL自动获取功能

## 功能概述

实现了自动获取和返回原始质量（Origin）视频URL的功能，无需用户修改任何调用代码。

## 实现细节

### 1. 新增函数 `fetchOriginVideoUrl`

**位置**: `src/api/controllers/videos.ts:225-256`

该函数调用 `/mweb/v1/get_local_item_list` API 来获取包含完整质量的视频信息。

**参数**:
- `itemId`: 视频项ID
- `refreshToken`: 刷新令牌

**返回值**:
- 成功: 返回原始视频URL字符串
- 失败: 返回 `null`

### 2. 修改视频生成流程

**位置**: `src/api/controllers/videos.ts:760-800`

在视频生成成功后，新增了自动获取原始质量URL的逻辑：

1. **首先尝试提取视频URL**（作为降级方案）
2. **提取itemId**: 从多个可能的字段中提取视频ID
3. **调用新API**: 使用 `fetchOriginVideoUrl` 获取原始URL
4. **自动降级**: 如果获取失败，使用已有的URL

### 3. itemId 提取的多重策略

由于API响应结构可能变化，代码检查以下多个字段位置：

```typescript
const itemId = firstItem.id ||
               firstItem.item_id ||
               firstItem.video?.id ||
               firstItem.video?.item_id ||
               firstItem.video?.video_id ||
               firstItem.common_attr?.id;
```

### 4. 降级策略

采用三层降级策略确保功能稳定性：

1. **优先**: 调用 `get_local_item_list` 获取 origin URL
2. **降级**: 使用 `get_history_by_ids` 返回的 URL
3. **保底**: 使用 `extractVideoUrl` 的所有降级字段

## 日志输出

实现中添加了清晰的日志标识：

- `检测到itemId: xxxxx` - 成功提取itemId
- `尝试获取原始质量视频URL` - 开始调用新API
- `✓ 成功获取原始质量视频URL` - origin URL获取成功
- `✗ 无法获取原始URL,使用当前URL` - 降级使用现有URL
- `未能找到itemId` - itemId提取失败

## 测试验证

### 运行测试脚本

```bash
# 设置token
export JIMENG_TOKEN="your_token_here"

# 运行测试
./test-origin-video.sh
```

### 手动测试

```bash
# 启动服务
npm run dev

# 生成视频
curl -X POST http://localhost:3000/v1/videos/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "model": "seedance-2.0",
    "prompt": "一只猫在草地上奔跑",
    "duration": 5
  }'
```

### 验证要点

1. **检查日志输出**: 查看上述关键日志
2. **验证URL参数**: 检查返回的URL是否包含 `br=6619&ds=12` 参数
3. **验证文件大小**: 5秒视频应约为4MB（原始质量）
4. **降级测试**: 模拟API失败，验证是否自动降级

## 预期结果

### 成功场景
- 返回包含 `ds=12&br=6619` 参数的URL（origin质量）
- 日志显示 `✓ 成功获取原始质量视频URL`
- 文件大小约为4MB（5秒视频）

### 降级场景
- 如果origin获取失败，返回现有URL
- 日志显示 `✗ 无法获取原始URL,使用当前URL`
- 功能不受影响，视频生成成功

## 向后兼容性

✓ 所有现有调用代码无需修改
✓ 接口返回格式保持不变（返回URL字符串）
✓ 自动降级机制确保功能稳定性

## 技术要点

1. **错误处理**: 使用 try-catch 确保API调用失败不影响主流程
2. **日志记录**: 详细记录每个步骤，便于调试
3. **灵活提取**: 支持多种itemId字段位置，适应API变化
4. **性能影响**: 仅在视频生成成功后额外调用一次API，影响可忽略

## 相关文件

- `src/api/controllers/videos.ts` - 主要实现文件
- `src/lib/image-utils.ts` - extractVideoUrl工具函数
- `src/api/controllers/core.ts` - request函数（依赖）
- `test-origin-video.sh` - 测试脚本
