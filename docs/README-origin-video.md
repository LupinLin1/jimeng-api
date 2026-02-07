# 原始质量视频URL功能 - 快速开始

## 功能说明

此功能会自动获取并返回原始质量（Origin）的视频URL，无需修改任何现有代码。

## 快速测试

### 方法1: 使用Shell脚本（推荐）

```bash
# 1. 设置token
export JIMENG_TOKEN="your_actual_token"

# 2. 启动服务（另一个终端）
npm run dev

# 3. 运行测试脚本
./test-origin-video.sh
```

### 方法2: 使用Node.js脚本

```bash
# 1. 设置token
export JIMENG_TOKEN="your_actual_token"

# 2. 启动服务（另一个终端）
npm run dev

# 3. 运行测试
node examples/origin-video-test.js
```

### 方法3: 手动curl测试

```bash
curl -X POST http://localhost:3000/v1/videos/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "model": "seedance-2.0",
    "prompt": "一只猫在草地上奔跑",
    "duration": 5
  }'
```

## 验证结果

### 检查日志

在服务日志中查找以下关键信息：

```
✓ 成功场景:
  - 检测到itemId: 1234567890
  - 尝试获取原始质量视频URL
  - 成功获取原始视频URL: https://...
  - ✓ 成功获取原始质量视频URL

✗ 降级场景:
  - 检测到itemId: 1234567890
  - 尝试获取原始质量视频URL
  - 未能从get_local_item_list响应中提取origin URL
  - ✗ 无法获取原始URL,使用当前URL
```

### 检查URL参数

原始质量URL通常包含以下参数：
- `br=6619` - 比特率参数
- `ds=12` - 质量级别参数

### 检查文件大小

对于5秒视频：
- **原始质量**: 约4MB
- **中质量**: 约1-1.5MB
- **低质量**: 约300-500KB

## 实现细节

### 修改的文件

1. **src/api/controllers/videos.ts** - 主要实现
   - 新增 `fetchOriginVideoUrl()` 函数
   - 修改视频生成成功后的URL提取逻辑

2. **test-origin-video.sh** - Shell测试脚本

3. **examples/origin-video-test.js** - Node.js测试脚本

### 关键特性

- ✅ **自动降级**: 如果获取原始URL失败，自动使用现有URL
- ✅ **向后兼容**: 所有现有代码无需修改
- ✅ **错误处理**: 完善的错误处理和日志记录
- ✅ **灵活提取**: 支持多种itemId字段位置

## 常见问题

### Q: 如果获取原始URL失败怎么办？

A: 系统会自动降级使用 `get_history_by_ids` 返回的URL，功能不受影响。

### Q: 是否会影响性能？

A: 仅在视频生成成功后额外调用一次API，影响可忽略不计。

### Q: 需要修改现有调用代码吗？

A: 不需要，接口返回格式保持不变（返回URL字符串）。

## 相关文档

- [功能详细说明](./origin-video-feature.md)
- [API文档](../README.md)

## 支持

如有问题，请查看服务日志或提交Issue。
