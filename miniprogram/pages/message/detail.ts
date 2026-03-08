Page({
  data: {
    id: '',
    message: {} as any,
    displayTime: '',
    comments: [] as any[],
    isFull: false,
    joined: false,
    joining: false,
    commentText: '',
    sending: false,
  },
  onLoad(options: any) {
    const id = options?.id || ''
    if (!id) { wx.showToast({ title: '参数错误', icon: 'none' }); return }
    this.setData({ id })
    this.loadDetail()
  },
  async loadDetail() {
    try {
      wx.showNavigationBarLoading()
      const res: any = await wx.cloud.callFunction({ name: 'getMessageDetail', data: { id: this.data.id } })
      const result = res?.result || {}
      if (!result.success) { wx.showToast({ title: result.message || '加载失败', icon: 'none' }); return }
      const msg = result.message || {}
      const openid = (wx.getStorageSync('openid') || '').toString()
      const participants = Array.isArray(msg.participants) ? msg.participants : []
      const maxPlayers = Number(msg.maxPlayers) || 0
      const joined = openid && participants.includes(openid)
      const isFull = maxPlayers && participants.length >= maxPlayers
      const comments = Array.isArray(msg.comments) ? msg.comments : []
      this.setData({
        message: msg,
        displayTime: formatTimeRange(msg.gameTime),
        joined,
        isFull,
        comments,
      })
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      wx.hideNavigationBarLoading()
    }
  },
  async onJoin() {
    if (this.data.joining || this.data.joined || this.data.isFull) return
    // 登录校验
    const user = wx.getStorageSync('cloudUser')
    if (!user || !user._id) { wx.showToast({ title: '请先登录', icon: 'none' }); setTimeout(()=>wx.switchTab({ url: '/pages/mine/mine' }), 600); return }
    this.setData({ joining: true })
    try {
      const res: any = await wx.cloud.callFunction({ name: 'joinMessage', data: { messageId: this.data.id } })
      const result = res?.result || {}
      if (result.success) {
        wx.showToast({ title: '已加入', icon: 'success' })
        await this.loadDetail()
      } else {
        wx.showToast({ title: result.message || '加入失败', icon: 'none' })
      }
    } catch (e) {
      wx.showToast({ title: '加入失败', icon: 'none' })
    } finally {
      this.setData({ joining: false })
    }
  },
  onInput(e: any) {
    this.setData({ commentText: e?.detail?.value || '' })
  },
  async onSend() {
    const text = (this.data.commentText || '').trim()
    if (!text) return
    // 登录校验
    const user = wx.getStorageSync('cloudUser')
    if (!user || !user._id) { wx.showToast({ title: '请先登录', icon: 'none' }); setTimeout(()=>wx.switchTab({ url: '/pages/mine/mine' }), 600); return }
    if (this.data.sending) return
    this.setData({ sending: true })
    try {
      const res: any = await wx.cloud.callFunction({ name: 'addMessageComment', data: { messageId: this.data.id, content: text } })
      const result = res?.result || {}
      if (result.success) {
        wx.showToast({ title: '已发布', icon: 'success' })
        this.setData({ commentText: '' })
        await this.loadDetail()
      } else {
        wx.showToast({ title: result.message || '发布失败', icon: 'none' })
      }
    } catch (e) {
      wx.showToast({ title: '发布失败', icon: 'none' })
    } finally {
      this.setData({ sending: false })
    }
  },
  formatTime(t: number) {
    return formatTimeRange(t)
  }
})

function formatTimeRange(ts: number): string {
  if (!ts) return ''
  const d = new Date(ts)
  const mm = (d.getMonth()+1).toString().padStart(2,'0')
  const dd = d.getDate().toString().padStart(2,'0')
  const hh = d.getHours().toString().padStart(2,'0')
  const mi = d.getMinutes().toString().padStart(2,'0')
  return `${mm}-${dd} ${hh}:${mi}`
}

