interface VenueItem {
  id: number;
  name: string;
  address: string;
  selected: boolean;
}

interface TimeOption {
  value: string;
  label: string;
  selected: boolean;
}

interface PlayerCountOption {
  label: string;
  value: string;
}

interface SkillOption {
  value: string;
  label: string;
  selected: boolean;
}

Page({
  data: {
    activeTab: 'create',
    venues: [] as VenueItem[],
    timeOptions: [] as TimeOption[],
    customDate: '',
    customTime: '',
    isPublishing: false,
    // 内联选择器数据
    dateList: [] as string[],
    dateIndex: 0,
    hourList: [] as string[],
    hourIndex: 0,
    minuteList: [] as string[],
    minuteIndex: 0,
    dateStart: '',
    dateEnd: '',
    playerCountIndex: 0,
    playerCountOptions: [
      { label: '2人', value: '2' },
      { label: '3人', value: '3' },
      { label: '4人', value: '4' },
      { label: '5人', value: '5' },
      { label: '6人', value: '6' },
      { label: '7人', value: '7' },
      { label: '8人', value: '8' },
      { label: '9人', value: '9' }
    ] as PlayerCountOption[],
    skillOptions: [
      { value: 'beginner', label: '新手友好', selected: true },
      { value: 'intermediate', label: '中等水平', selected: false },
      { value: 'advanced', label: '高水平', selected: false },
      { value: 'any', label: '不限水平', selected: false }
    ] as SkillOption[],
    notes: '',
    reminderEnabled: true,
    publicVisible: true,
    venueId: '',
    venueName: '',
    selectedVenueAddress: '',
    selectedVenueLat: 0,
    selectedVenueLng: 0
  },

  onLoad(options) {
    // 设定可选日期范围（今天起30天内）
    const today = formatDate(new Date())
    const endDate = formatDate(new Date(Date.now() + 30*24*60*60*1000))
    // 初始化内联选择器数据
    const dateList = generateDateList(30)
    // 小时限制 06-23
    const hourList = Array.from({ length: 18 }, (_, i) => pad2(6 + i))
    // 分钟 00-59
    const minuteList = Array.from({ length: 60 }, (_, i) => pad2(i))
    const now = new Date()
    const nowHour = now.getHours()
    const hourIndex = Math.max(0, Math.min(hourList.length - 1, nowHour - 6))
    const minuteIndex = now.getMinutes()
    this.setData({
      dateStart: today,
      dateEnd: endDate,
      dateList,
      dateIndex: 0,
      hourList,
      hourIndex,
      minuteList,
      minuteIndex,
      customDate: dateList[0] || today,
      customTime: `${hourList[hourIndex] || '06'}:${minuteList[minuteIndex] || '00'}`,
    })
    // 扩大人数选择范围（2-20人）
    this.setData({ playerCountOptions: generatePlayerCountOptions(2, 20) })
    // 优先读取场馆页写入的元数据
    try {
      const meta = wx.getStorageSync('selectedVenueMeta')
      if (meta && meta.placeId) {
        const name = meta.name || ''
        const id = String(meta.placeId)
        const address = meta.address || '来自场馆详情页'
        // 更新基本信息
        this.setData({ 
          venueId: id, 
          venueName: name,
          selectedVenueAddress: address,
          selectedVenueLat: typeof meta.latitude === 'number' ? meta.latitude : 0,
          selectedVenueLng: typeof meta.longitude === 'number' ? meta.longitude : 0,
        })
        try { wx.removeStorageSync('selectedVenueMeta') } catch (_) {}
      }
    } catch (_) {}

    // 如果从场馆详情页跳转过来，预选对应场馆
    if (options.venueId) {
      this.setData({ venueId: options.venueId });
    }
    if (options.venueName) {
      this.setData({ venueName: options.venueName });
    }
  },
  // 内联日期选择
  onDatePickerChange(e: any) {
    const val = e && e.detail && e.detail.value
    const idx = Array.isArray(val) ? Number(val[0]) : Number(val)
    const safeIdx = isNaN(idx) ? 0 : Math.max(0, Math.min((this.data.dateList.length || 1) - 1, idx))
    const dateStr = this.data.dateList[safeIdx] || ''
    this.setData({ dateIndex: safeIdx, customDate: dateStr })
  },

  // 内联时间选择（小时/分钟）
  onTimePickerChange(e: any) {
    const val = e && e.detail && e.detail.value
    const hourIdx = Array.isArray(val) ? Number(val[0]) : 0
    const minuteIdx = Array.isArray(val) ? Number(val[1]) : 0
    const safeHourIdx = isNaN(hourIdx) ? 0 : Math.max(0, Math.min((this.data.hourList.length || 1) - 1, hourIdx))
    const safeMinuteIdx = isNaN(minuteIdx) ? 0 : Math.max(0, Math.min((this.data.minuteList.length || 1) - 1, minuteIdx))
    const hour = this.data.hourList[safeHourIdx] || '06'
    const minute = this.data.minuteList[safeMinuteIdx] || '00'
    this.setData({ hourIndex: safeHourIdx, minuteIndex: safeMinuteIdx, customTime: `${hour}:${minute}` })
  },
  onDateChange(e: any) {
    this.setData({ customDate: e.detail.value })
    wx.showToast({ title: `已选日期 ${e.detail.value}`, icon: 'none' })
  },

  onTimeChange(e: any) {
    this.setData({ customTime: e.detail.value })
    wx.showToast({ title: `已选时间 ${e.detail.value}`, icon: 'none' })
  },

  // 返回上一页
  goBack() {
    wx.navigateBack();
  },

  // 选择场馆
  selectVenue(e: any) {
    const id = e.currentTarget.dataset.id;
    const venues = this.data.venues.map(venue => ({
      ...venue,
      selected: venue.id === id
    }));
    this.setData({ venues });
    console.log('选择场馆:', id);
  },

  // 通过选择POI选择真实球馆
  chooseVenuePoi() {
    (wx as any).choosePoi({
      success: (res: any) => {
        const name = res?.name || '';
        const address = res?.address || '';
        const latitude = typeof res?.latitude === 'number' ? res.latitude : 0;
        const longitude = typeof res?.longitude === 'number' ? res.longitude : 0;
        const placeId = String(res?.id || res?.poiId || '');
        if (!placeId || !name) {
          wx.showToast({ title: '未获取到有效场馆', icon: 'none' });
          return;
        }
        this.setData({
          venueId: placeId,
          venueName: name,
          selectedVenueAddress: address,
          selectedVenueLat: latitude,
          selectedVenueLng: longitude,
        });
      },
      fail: (_err: any) => {
        wx.showToast({ title: '未选择场馆', icon: 'none' });
      }
    });
  },

  // 选择时间
  selectTime(e: any) {
    const value = e.currentTarget.dataset.value;
    const timeOptions = this.data.timeOptions.map(option => ({
      ...option,
      selected: option.value === value
    }));
    this.setData({ timeOptions });
    
    // 如果选择自定义时间，弹出日期时间选择器
    if (value === 'custom') {
      wx.showToast({
        title: '自定义时间功能开发中',
        icon: 'none'
      });
    }
    
    console.log('选择时间:', value);
  },

  // 选择人数
  onPlayerCountChange(e: any) {
    const index = Number(e.detail.value);
    this.setData({ playerCountIndex: index });
    const label = (this.data.playerCountOptions[index] && this.data.playerCountOptions[index].label) || ''
    wx.showToast({ title: `人数：${label}`, icon: 'none' })
    console.log('选择人数:', this.data.playerCountOptions[index]?.value);
  },

  // 内联人数选择
  onPlayerPickerChange(e: any) {
    const val = e && e.detail && e.detail.value
    const idx = Array.isArray(val) ? Number(val[0]) : Number(val)
    const safeIdx = isNaN(idx) ? 0 : Math.max(0, Math.min((this.data.playerCountOptions.length || 1) - 1, idx))
    this.setData({ playerCountIndex: safeIdx })
  },

  // 阻止滚动冲突（空实现即可）
  onPickerTouchMove() {},

  // 选择技术水平
  selectSkill(e: any) {
    const value = e.currentTarget.dataset.value;
    const skillOptions = this.data.skillOptions.map(option => ({
      ...option,
      selected: option.value === value
    }));
    this.setData({ skillOptions });
    console.log('选择水平:', value);
  },

  // 备注信息变化
  onNotesChange(e: any) {
    this.setData({ notes: e.detail.value });
  },

  // 提醒开关变化
  onReminderChange(e: any) {
    this.setData({ reminderEnabled: e.detail.value });
  },

  // 公开可见开关变化
  onPublicChange(e: any) {
    this.setData({ publicVisible: e.detail.value });
  },

  // 发布约球
  async publishGame() {
    if (this.data.isPublishing) return
    this.setData({ isPublishing: true })
    let loadingShown = false
    // 自定义时间（必填）
    if (!this.data.customDate || !this.data.customTime) {
      wx.showToast({ title: '请选择日期和时间', icon: 'none' })
      this.setData({ isPublishing: false })
      return
    }
    const selectedSkill = this.data.skillOptions.find(s => s.selected);
    const playerCount = this.data.playerCountOptions[this.data.playerCountIndex].value;
    
    if (!this.data.notes.trim()) {
      wx.showToast({
        title: '请输入备注信息',
        icon: 'none'
      });
      this.setData({ isPublishing: false })
      return;
    }

    const gameTimeTs = composeDateTimeTs(this.data.customDate, this.data.customTime)
    // 读取上游写入的 meta 以带入地址与经纬度
    const address = this.data.selectedVenueAddress || '从场馆详情页选择'
    const hasValidLatLng = typeof this.data.selectedVenueLat === 'number' && typeof this.data.selectedVenueLng === 'number' && this.data.selectedVenueLat !== 0 && this.data.selectedVenueLng !== 0
    const location: any = hasValidLatLng ? { lat: this.data.selectedVenueLat, lng: this.data.selectedVenueLng } : null

    const payload = {
      placeId: String(this.data.venueId || ''),
      venueName: String(this.data.venueName || ''),
      address,
      location,
      content: this.data.notes,
      gameTime: gameTimeTs,
      maxPlayers: Math.max(2, Number(playerCount) || 0),
      skillLevel: selectedSkill?.value || '',
      notes: this.data.notes,
      isPublic: !!this.data.publicVisible,
    }

    if (!payload.placeId || !payload.venueName) {
      wx.showToast({ title: '缺少场馆信息', icon: 'none' })
      this.setData({ isPublishing: false })
      return
    }
    if (!payload.location || typeof payload.location.lat !== 'number' || typeof payload.location.lng !== 'number') {
      wx.showToast({ title: '缺少或无效的经纬度', icon: 'none' })
      this.setData({ isPublishing: false })
      return
    }

    try {
      if (this.isActivePage && this.isActivePage()) {
        wx.showLoading({ title: '发布中...', mask: true })
        loadingShown = true
      }
    } catch (_) {}
    try {
      const res: any = await wx.cloud.callFunction({ name: 'createMessage', data: payload })
      if (res.result && res.result.success) {
        wx.showToast({ title: '发布成功', icon: 'success' })
        // 在跳转前优先关闭加载框，避免页面切换后 hideLoading 报未配对
        if (loadingShown) {
          try { wx.hideLoading() } catch (_) {}
          loadingShown = false
        }
        setTimeout(() => {
          if (this.data.venueId) {
            wx.navigateBack()
          } else {
            wx.switchTab({ url: '/pages/index/index' })
          }
        }, 800)
      } else {
        wx.showToast({ title: (res?.result && res.result.message) || '发布失败', icon: 'none' })
      }
    } catch (e) {
      wx.showToast({ title: '发布失败', icon: 'none' })
    } finally {
      if (loadingShown && (!this.isActivePage || this.isActivePage())) {
        try { wx.hideLoading() } catch (_) {}
      }
      this.setData({ isPublishing: false })
    }
  },

  // 判断当前页面是否仍为栈顶，避免页面切换后 hideLoading 报未配对
  isActivePage(): boolean {
    try {
      const pages = getCurrentPages()
      if (!pages || !pages.length) return true
      const top = pages[pages.length - 1] as any
      // this.route 在小程序中可用
      return !!(top && top.route === (this as any).route)
    } catch (_) {
      return true
    }
  },

  // 底部导航切换
  onTabChange(e: any) {
    const value = e.detail.value;
    this.setData({ activeTab: value });
    
    if (value === 'index') {
      wx.reLaunch({ url: '/pages/index/index' });
    } else if (value === 'venue') {
      wx.reLaunch({ url: '/pages/venue/venue' });
    } else if (value === 'create') {
      return;
    } else if (value === 'mine') {
      wx.reLaunch({ url: '/pages/mine/mine' });
    }
  }
});

function estimateGameTime(value?: string): number {
  const now = Date.now()
  if (!value) return now + 2*60*60*1000
  // 简易映射：today-19 / tomorrow-14 / tomorrow-19 / weekend-09 / weekend-16
  const d = new Date()
  const setHm = (h:number,m:number)=>{ const t=new Date(d); t.setHours(h,m,0,0); return t.getTime() }
  switch (value) {
    case 'today-19':
      return setHm(19,0) > now ? setHm(19,0) : now + 2*60*60*1000
    case 'tomorrow-14':
      d.setDate(d.getDate()+1); return setHm(14,0)
    case 'tomorrow-19':
      d.setDate(d.getDate()+1); return setHm(19,0)
    case 'weekend-09': {
      // 找到最近周六/周日9点
      const day = d.getDay() // 0周日
      let add = 6 - day; if (add < 0) add += 7
      d.setDate(d.getDate()+add); return setHm(9,0)
    }
    case 'weekend-16': {
      const day = d.getDay()
      let add = 6 - day; if (add < 0) add += 7
      d.setDate(d.getDate()+add); return setHm(16,0)
    }
    default:
      return now + 2*60*60*1000
  }
}

function formatDate(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = (d.getMonth()+1).toString().padStart(2,'0')
  const dd = d.getDate().toString().padStart(2,'0')
  return `${yyyy}-${mm}-${dd}`
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

function generateDateList(days: number): string[] {
  const list: string[] = []
  const names = ['日','一','二','三','四','五','六']
  const now = new Date()
  for (let i = 0; i < Math.max(1, days|0); i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i)
    const yyyy = d.getFullYear()
    const mm = pad2(d.getMonth() + 1)
    const dd = pad2(d.getDate())
    const wk = names[d.getDay()]
    list.push(`${yyyy}-${mm}-${dd} 周${wk}`)
  }
  return list
}

function composeDateTimeTs(dateStr: string, timeStr: string): number {
  // dateStr: YYYY-MM-DD, timeStr: HH:mm
  const pureDate = dateStr.split(' ')[0] || dateStr
  const [y,m,d] = pureDate.split('-').map(n=>Number(n))
  const [hh,mi] = timeStr.split(':').map(n=>Number(n))
  const dt = new Date(y, (m||1)-1, d||1, hh||0, mi||0, 0, 0)
  const now = Date.now()
  if (dt.getTime() < now) {
    // 若选择了过去时间，默认 +2 小时
    return now + 2*60*60*1000
  }
  return dt.getTime()
}

function generatePlayerCountOptions(min: number, max: number): PlayerCountOption[] {
  const start = Math.max(2, Math.floor(min))
  const end = Math.max(start, Math.floor(max))
  const list: PlayerCountOption[] = []
  for (let i = start; i <= end; i++) {
    list.push({ label: `${i}人`, value: String(i) })
  }
  return list
}