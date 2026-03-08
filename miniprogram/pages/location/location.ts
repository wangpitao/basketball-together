Page({
  data: {
    latitude: 0,
    longitude: 0,
    accuracy: 0,
    speed: null,
    loading: false,
    locationSuccess: false,
    locationError: false,
    errorMessage: ''
  },

  onLoad() {
    // 页面加载时不自动获取位置，等待用户点击按钮
  },

  getLocation() {
    this.setData({
      loading: true,
      locationSuccess: false,
      locationError: false,
      errorMessage: ''
    });

    wx.showLoading({
      title: '获取位置中',
      mask: true
    });

    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        console.log('位置获取成功:', res);
        this.setData({
          latitude: res.latitude,
          longitude: res.longitude,
          accuracy: res.accuracy,
          speed: res.speed,
          locationSuccess: true
        });
      },
      fail: (err) => {
        console.error('位置获取失败:', err);
        let errorMsg = '无法获取位置信息';
        
        // 处理常见错误
        if (err.errMsg.includes('auth deny')) {
          errorMsg = '位置权限被拒绝，请在设置中开启位置权限';
        } else if (err.errMsg.includes('timeout')) {
          errorMsg = '获取位置超时，请检查网络连接或GPS信号';
        }
        
        this.setData({
          locationError: true,
          errorMessage: errorMsg
        });
        
        wx.showToast({
          title: errorMsg,
          icon: 'none',
          duration: 2000
        });
      },
      complete: () => {
        this.setData({ loading: false });
        wx.hideLoading();
      }
    });
  }
});
