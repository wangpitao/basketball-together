Page({
  data: {
    id: '',
    message: {},
    displayTime: '',
    comments: [],
    isFull: false,
    joined: false,
    joining: false,
    commentText: '',
    sending: false,
  },
  onLoad(options) {
    const id = (options && options.id) || ''
    if (!id) { wx.showToast({ title: '参数错误', icon: 'none' }); return }
    this.setData({ id })
    this.loadDetail()
  },
  async loadDetail() {
    try {
      wx.showNavigationBarLoading()
      const res = await wx.cloud.callFunction({ name: 'getMessageDetail', data: { id: this.data.id } })
      const result = (res && res.result) || {}
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
    const user = wx.getStorageSync('cloudUser')
    if (!user || !user._id) { wx.showToast({ title: '请先登录', icon: 'none' }); setTimeout(()=>wx.switchTab({ url: '/pages/mine/mine' }), 600); return }
    this.setData({ joining: true })
    try {
      const res = await wx.cloud.callFunction({ name: 'joinMessage', data: { messageId: this.data.id } })
      const result = (res && res.result) || {}
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
  onInput(e) {
    this.setData({ commentText: (e && e.detail && e.detail.value) || '' })
  },
  async onSend() {
    const text = (this.data.commentText || '').trim()
    if (!text) return
    const user = wx.getStorageSync('cloudUser')
    if (!user || !user._id) { wx.showToast({ title: '请先登录', icon: 'none' }); setTimeout(()=>wx.switchTab({ url: '/pages/mine/mine' }), 600); return }
    if (this.data.sending) return
    this.setData({ sending: true })
    try {
      const res = await wx.cloud.callFunction({ name: 'addMessageComment', data: { messageId: this.data.id, content: text } })
      const result = (res && res.result) || {}
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
  formatTime(t) {
    return formatTimeRange(t)
  }
})

function formatTimeRange(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const mm = String(d.getMonth()+1).padStart(2,'0')
  const dd = String(d.getDate()).padStart(2,'0')
  const hh = String(d.getHours()).padStart(2,'0')
  const mi = String(d.getMinutes()).padStart(2,'0')
  return `${mm}-${dd} ${hh}:${mi}`
}
