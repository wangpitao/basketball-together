interface MessageItem {
  id: string;
  userName: string;
  timeAgo: string;
  status: string;
  statusText: string;
  statusTheme: string;
  time: string;
  remainingSpots?: number;
  remainingText: string;
  remark: string;
  signupCount: number;
  isFull: boolean;
  joined: boolean;
}

interface VenueInfo {
  id: string;
  name: string;
  address: string;
  openTime: string;
  fee: string;
  courtCount: string;
  rating: number;
  ratingCount: number;
}

Page({
  data: {
    activeTab: 'venue',
    venueId: '',
    venueName: '',
    venueLat: 0,
    venueLng: 0,
    venueInfo: {
      id: '',
      name: '',
      address: '',
      openTime: '06:00-22:00',
      fee: '免费开放',
      courtCount: '2个标准篮球场',
      rating: 4.8,
      ratingCount: 0
    } as VenueInfo,
    messageList: [] as MessageItem[],
    updateTimer: null as any
  },

  onLoad(options) {
    // 优先从 storage 读取元数据（避免复杂 query 拼接）
    try {
      const meta = wx.getStorageSync('selectedVenueMeta')
      if (meta && meta.placeId) {
        this.setData({
          venueId: meta.placeId,
          venueName: meta.name,
          venueLat: Number(meta.latitude) || 0,
          venueLng: Number(meta.longitude) || 0,
          'venueInfo.id': meta.placeId,
          'venueInfo.name': meta.name,
          'venueInfo.address': meta.address || ''
        })
        try { wx.removeStorageSync('selectedVenueMeta') } catch (_) {}
      }
    } catch (_) {}

    // 兼容从 query 传入
    if (options && options.id) this.setData({ venueId: options.id })
    if (options && options.name) this.setData({ venueName: options.name, 'venueInfo.name': options.name })
    if (options && options.address) this.setData({ 'venueInfo.address': options.address })
    if (options && options.lat && options.lng) this.setData({ venueLat: Number(options.lat), venueLng: Number(options.lng) })

    this.loadVenueInfo();
    this.loadMessageList();
    this.startRealTimeUpdate();
  },

  onShow() {
    // 处理 tab 切换再次进入场馆页时不触发 onLoad 的情况
    try {
      const meta = wx.getStorageSync('selectedVenueMeta')
      if (meta && meta.placeId) {
        if (meta.placeId !== this.data.venueId) {
          this.setData({
            venueId: meta.placeId,
            venueName: meta.name,
            venueLat: Number(meta.latitude) || 0,
            venueLng: Number(meta.longitude) || 0,
            'venueInfo.id': meta.placeId,
            'venueInfo.name': meta.name,
            'venueInfo.address': meta.address || ''
          })
          // 元数据改变时刷新列表
          this.loadMessageList()
        }
        try { wx.removeStorageSync('selectedVenueMeta') } catch (_) {}
      }
    } catch (_) {}
    // 无论是否有元数据变化，返回场馆页时都刷新一次列表，确保发布后立即可见
    this.loadMessageList()
  },
  
  onUnload() {
    // 清除定时器
    if (this.data.updateTimer) {
      clearInterval(this.data.updateTimer);
    }
  },

  // 加载场馆信息
  loadVenueInfo() {
    // 实际项目中应该从服务器获取场馆信息
    // 这里使用模拟数据
    console.log('加载场馆信息:', this.data.venueId);
    
    // 如果有真实的场馆ID，可以调用云函数获取数据
    // 这里使用默认数据
  },
  
  // 加载留言板信息（云函数）
  async loadMessageList() {
    if (!this.data.venueId) return
    wx.showNavigationBarLoading()
    try {
      const res = await wx.cloud.callFunction({
        name: 'listVenueMessages',
        data: { placeId: this.data.venueId }
      }) as any
      const result = (res && res.result) ? res.result as any : {}
      const list = Array.isArray(result.list) ? result.list : []
      const openid = (wx.getStorageSync('openid') || '').toString()
      const mapped: MessageItem[] = list.map((m: any) => {
        const participants = Array.isArray(m.participants) ? m.participants : []
        const maxPlayers = Number(m.maxPlayers)||0
        const joined = openid && participants.includes(openid)
        return {
          id: m._id,
          userName: (m.authorNickname && typeof m.authorNickname === 'string' && m.authorNickname.trim()) ? m.authorNickname : (m._openid?.slice(-6) || '球友'),
          timeAgo: '刚刚',
          status: 'recruiting',
          statusText: '招募中',
          statusTheme: 'success',
          time: formatTimeRange(m.gameTime),
          remainingSpots: Math.max(0, maxPlayers - participants.length),
          remainingText: formatRemainText(maxPlayers, participants.length),
          remark: m.notes || m.content || '',
          signupCount: participants.length,
          isFull: participants.length >= maxPlayers,
          joined,
        }
      })
      this.setData({ messageList: mapped })
    } catch (e) {
      wx.showToast({ title: '加载留言失败', icon: 'none' })
    } finally {
      wx.hideNavigationBarLoading()
    }
  },

  // 返回上一页
  goBack() {
    wx.navigateBack();
  },

  // 加入约球
  joinGame() {
    console.log('加入约球');
    wx.showToast({
      title: '请选择下方具体约球',
      icon: 'none'
    });
  },

  // 跳转到发布约球页
  goCreate() {
    try {
      const meta = {
        placeId: this.data.venueId,
        name: this.data.venueInfo.name,
        address: this.data.venueInfo.address,
        latitude: this.data.venueLat,
        longitude: this.data.venueLng,
      }
      wx.setStorageSync('selectedVenueMeta', meta)
    } catch (_) {}
    wx.navigateTo({
      url: `/pages/create/create?venueId=${this.data.venueId}&venueName=${this.data.venueInfo.name}`
    });
  },

  // 加入留言约球
  async joinMessage(e: any) {
    const id = e.currentTarget.dataset.id;
    if (!id) return
    // 登录校验
    const user = wx.getStorageSync('cloudUser')
    if (!user || !user._id) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      setTimeout(() => { wx.switchTab({ url: '/pages/mine/mine' }) }, 600)
      return
    }
    wx.showLoading({ title: '加入中', mask: true })
    try {
      const res = await wx.cloud.callFunction({ name: 'joinMessage', data: { messageId: id } }) as any
      const result = res && res.result ? res.result as any : {}
      if (result && result.success) {
        wx.showToast({ title: '已加入', icon: 'success' })
        this.loadMessageList()
      } else {
        wx.showToast({ title: (result && result.message) || '加入失败', icon: 'none' })
      }
    } catch (e) {
      wx.showToast({ title: '加入失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  // 打开球局详情
  openMessageDetail(e: any) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({ url: `/pages/message/detail?id=${id}` })
  },

  // 底部导航切换
  onTabChange(e: any) {
    const value = e.detail.value;
    this.setData({ activeTab: value });
    if (value === 'index') {
      wx.reLaunch({ url: '/pages/index/index' });
    } else if (value === 'venue') {
      return;
    } else if (value === 'mine') {
      wx.reLaunch({ url: '/pages/mine/mine' });
    }
  },

  // 启动实时更新
  startRealTimeUpdate() {
    // 每30秒更新一次时间
    const updateTimer = setInterval(() => {
      this.updateMessageTimes();
    }, 30000);
    
    this.setData({ updateTimer });
  },
  
  // 更新留言时间
  updateMessageTimes() {
    const messageList = this.data.messageList.map((item, index) => {
      if (index === 0) {
        // 只更新第一条消息的时间，模拟实时更新
        const minutes = Math.floor(Math.random() * 10) + 1;
        return {
          ...item,
          timeAgo: `${minutes}分钟前`
        };
      }
      return item;
    });
    
    this.setData({ messageList });
  }
});

function formatTimeRange(ts: number): string {
  if (!ts) return ''
  const d = new Date(ts)
  const mm = (d.getMonth()+1).toString().padStart(2,'0')
  const dd = d.getDate().toString().padStart(2,'0')
  const hh = d.getHours().toString().padStart(2,'0')
  const mi = d.getMinutes().toString().padStart(2,'0')
  return `${mm}-${dd} ${hh}:${mi}`
}

function formatRemainText(max: number, joined: number): string {
  if (!max) return ''
  const left = Math.max(0, max - joined)
  if (left === 0) return '已满员'
  return `还差${left}人`
}