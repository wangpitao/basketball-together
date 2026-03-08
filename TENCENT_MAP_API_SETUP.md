# 腾讯位置服务API设置指南

## 问题描述

在使用腾讯位置服务API时，可能会遇到以下错误：

1. `getLocation:fail the api need to be declared in the requiredPrivateInfos field in app.json/ext.json`
2. `此key未开启WebserviceAPI功能`

## 解决方案

### 1. 微信小程序位置权限配置

在`app.json`中添加以下配置：

```json
{
  "requiredPrivateInfos": [
    "getLocation"
  ],
  "permission": {
    "scope.userLocation": {
      "desc": "你的位置信息将用于小程序位置接口的效果展示"
    }
  }
}
```

### 2. 开通腾讯位置服务WebService API

1. 登录[腾讯位置服务控制台](https://lbs.qq.com/dev/console/user/info)
2. 在左侧菜单找到"应用管理"
3. 找到你的应用（Key为：`YJLBZ-2YDC4-RLQUD-FM4D4-WJLSK-GZBHC`）
4. 点击"设置"按钮
5. 在"启用产品"部分，确保勾选了"WebService API"
6. 保存设置

#### WebService API安全设置选项

WebService API有三个安全设置选项，建议设置如下：

1. **域名白名单**：添加你的微信小程序业务域名或开发测试域名
   - 如果是小程序云开发环境，可以添加`servicewechat.com`

2. **授权IP**：适用于服务器端调用，小程序前端调用不需要设置

3. **签名校验**：
   - 开发阶段可以不启用
   - 正式环境建议启用，需要在请求时计算并传递签名参数

**推荐配置**：开发阶段选择"域名白名单"，添加`servicewechat.com`，不启用签名校验

### 3. 配置微信小程序合法域名

在微信公众平台的小程序管理后台：

1. 进入"开发"->"开发管理"->"开发设置"
2. 在"服务器域名"部分，添加以下域名到request合法域名：
   - `https://apis.map.qq.com`

### 4. 申请地理位置接口权限

在微信公众平台的小程序管理后台：

1. 进入"开发"->"开发管理"->"接口设置"
2. 找到"获取当前的地理位置、速度"接口
3. 点击申请开通，按要求填写使用场景

### 5. 临时解决方案

在开发阶段，可以：

1. 在微信开发者工具中，点击右上角"详情"->"本地设置"
2. 勾选"不校验合法域名、web-view（业务域名）、TLS版本以及HTTPS证书"

## 注意事项

- 腾讯位置服务的WebService API需要单独开通
- 每个API Key有每日使用配额限制
- 在正式环境中，必须配置合法域名，不能使用"不校验合法域名"选项