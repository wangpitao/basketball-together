# 云函数本地敏感配置说明

为避免泄露密钥，请在每个云函数目录下使用本地未提交的 `config.js` 或 `.env` 管理私密信息（已在仓库 `.gitignore` 中忽略）。

示例（createMessage/config.example.js）：
```js
module.exports = {
  // 例如第三方服务 Key，或自定义服务端密钥
  SOME_SECRET_KEY: "REPLACE_WITH_YOUR_KEY"
};
```

实际使用：
1. 复制 `config.example.js` 为 `config.js`，填入真实值（请勿提交）
2. 云端依赖通过「上传并部署：云端安装依赖」自动安装

