// app.ts
App<IAppOption>({
  globalData: {},
  onLaunch() {
    // 初始化云开发环境
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'cloud1-0gn4ixonf3b9d5de',
        traceUser: true,
      });
    }

    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 登录（小程序本地会话，不涉及云端）
    wx.login({
      success: res => {
        console.log('wx.login code:', res.code)
      },
    })
  },
})