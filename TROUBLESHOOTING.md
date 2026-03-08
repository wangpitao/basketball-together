# 故障排除指南

## TDesign组件找不到的问题

### 1. 组件路径错误

如果遇到类似以下错误：
```
tdesign-miniprogram/tab-bar/tab-bar-item 路径下未找到组件
```

#### 解决方案

在微信开发者工具中：
1. 点击菜单栏的 **工具** -> **构建npm**
2. 等待构建完成
3. 重新编译项目

#### 组件路径配置

确保所有页面的 `*.json` 文件中，组件路径配置正确：

```json
{
  "usingComponents": {
    "t-navbar": "../../miniprogram_npm/tdesign-miniprogram/navbar/navbar",
    "t-button": "../../miniprogram_npm/tdesign-miniprogram/button/button",
    "t-cell": "../../miniprogram_npm/tdesign-miniprogram/cell/cell",
    "t-cell-group": "../../miniprogram_npm/tdesign-miniprogram/cell-group/cell-group",
    "t-icon": "../../miniprogram_npm/tdesign-miniprogram/icon/icon",
    "t-avatar": "../../miniprogram_npm/tdesign-miniprogram/avatar/avatar",
    "t-tab-bar": "../../miniprogram_npm/tdesign-miniprogram/tab-bar/tab-bar",
    "t-tab-bar-item": "../../miniprogram_npm/tdesign-miniprogram/tab-bar-item/tab-bar-item"
  }
}
```

### 2. 组件不存在的问题

#### t-select 组件不存在

**错误信息**：
```
tdesign-miniprogram/select/select 路径下未找到组件
```

**原因**：TDesign mini-program 中没有 `t-select` 组件

**解决方案**：使用 `t-picker` 组件替代

```json
// 错误的配置
"t-select": "../../miniprogram_npm/tdesign-miniprogram/select/select"

// 正确的配置
"t-picker": "../../miniprogram_npm/tdesign-miniprogram/picker/picker"
```

**WXML 修改**：
```xml
<!-- 原来的 t-select -->
<t-select 
  value="{{selectedValue}}" 
  options="{{options}}"
  bindchange="onChange"
/>

<!-- 修改为 t-picker -->
<t-picker 
  value="{{selectedValue}}" 
  options="{{options}}"
  bindchange="onChange"
/>
```

**TypeScript 修改**：
```typescript
// 调整事件处理函数
onChange(e: any) {
  // t-picker组件的事件格式可能与t-select不同
  const value = e.detail.value || e.detail;
  this.setData({ selectedValue: value });
}
```

### 3. 检查依赖安装

确保项目根目录的 `package.json` 中包含：

```json
{
  "dependencies": {
    "tdesign-miniprogram": "^1.10.1"
  }
}
```

### 4. 清理并重新安装

如果问题持续存在：

```bash
# 删除现有的依赖
rm -rf node_modules
rm -rf miniprogram/miniprogram_npm

# 重新安装
npm install

# 在微信开发者工具中重新构建npm
```

### 5. 检查微信开发者工具版本

确保使用最新版本的微信开发者工具，并检查基础库版本是否支持。

## 常见问题

1. **组件路径错误**: 确保使用正确的相对路径 `../../miniprogram_npm/tdesign-miniprogram/`
2. **npm包未构建**: 每次修改依赖后都需要重新构建npm
3. **组件名称错误**: 确保组件名称与TDesign官方文档一致
4. **组件不存在**: 某些组件在TDesign mini-program中不存在，需要使用替代方案

## 可用的TDesign组件

TDesign mini-program 提供的主要组件包括：
- `t-button` - 按钮
- `t-cell` - 单元格
- `t-cell-group` - 单元格组
- `t-input` - 输入框
- `t-textarea` - 文本域
- `t-picker` - 选择器（替代select）
- `t-switch` - 开关
- `t-radio` - 单选框
- `t-radio-group` - 单选框组
- `t-tag` - 标签
- `t-navbar` - 导航栏
- `t-tab-bar` - 标签栏
- `t-tab-bar-item` - 标签栏项
- `t-icon` - 图标
- `t-avatar` - 头像

## 联系支持

如果问题仍然存在，请检查：
- 微信开发者工具版本
- 基础库版本
- 项目配置是否正确
- 组件使用是否符合TDesign mini-program规范
