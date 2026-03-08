import { tencentMapKey } from '../../utils/config';

type Nullable<T> = T | null;

type LocalMapMarker = {
  id: string | number;
  latitude: number;
  longitude: number;
  width?: number;
  height?: number;
  iconPath?: string;
  title?: string;
  callout?: {
    content: string;
    color?: string;
    fontSize?: number;
    borderRadius?: number;
    bgColor?: string;
    padding?: number;
    display?: 'ALWAYS' | 'BYCLICK';
    borderColor?: string;
    textAlign?: 'left' | 'right' | 'center';
  };
};

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function haversineDistanceMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const a =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

Page({
  data: {
    activeTab: 'index',
    latitude: 39.909,
    longitude: 116.397,
    scale: 15,
    markers: [] as LocalMapMarker[],
    loading: false,
    locationSuccess: false,
    locationError: false,
    errorMessage: ''
  },

  mapCtx: null as Nullable<WechatMiniprogram.MapContext>,
  lastFetch: { centerLat: 0, centerLng: 0, timestampMs: 0 },
  cache: null as Nullable<{
    centerLat: number;
    centerLng: number;
    timestampMs: number;
    markers: LocalMapMarker[];
    metas: Array<{ id: number; placeId: string; name: string; latitude: number; longitude: number; address: string }>;
  }>,
  fetchInFlight: false,
  moveDistanceThresholdM: 500,
  minFetchIntervalMs: 30000,
  searchRadiusM: 2000,
  markerIdCounter: 1000,
  markerIdToMeta: {} as Record<number, { placeId: string; name: string; latitude: number; longitude: number; address: string }>,

  onLoad() {
    this.mapCtx = wx.createMapContext('myMap', this);
    this.getLocation();
  },

  // IP 定位兜底：用于 getFuzzyLocation 不可用或未授权时
  resolveByIpLocation() {
    const url = `https://apis.map.qq.com/ws/location/v1/ip?key=${tencentMapKey}`;
    return new Promise<void>((resolve) => {
      wx.request({
        url,
        method: 'GET',
        success: (res: any) => {
          const body = res?.data;
          const loc = body?.result?.location;
          if (body?.status === 0 && loc && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
            const latitude = loc.lat;
            const longitude = loc.lng;
            this.setData({ latitude, longitude });
            // 设置当前位置(粗略)标记
            const selfMarker: LocalMapMarker = {
              id: 1,
              latitude,
              longitude,
              width: 24,
              height: 24,
              iconPath: '/assets/tabbar/location.png',
              callout: {
                content: '大致位置',
                color: '#111111',
                fontSize: 12,
                borderRadius: 6,
                bgColor: '#ffffff',
                padding: 6,
                display: 'ALWAYS',
              },
            } as LocalMapMarker;
            this.setData({ markers: [selfMarker] });
            this.fetchNearbyVenues(latitude, longitude, true);
            resolve();
          } else {
            // 失败则交给下游默认中心
            this.fetchNearbyVenues(this.data.latitude, this.data.longitude, true);
            resolve();
          }
        },
        fail: () => {
          this.fetchNearbyVenues(this.data.latitude, this.data.longitude, true);
          resolve();
        }
      });
    });
  },

  getLocation() {
    let loadingShown = false;
    this.setData({
      loading: true,
      locationSuccess: false,
      locationError: false,
      errorMessage: ''
    });

    try {
      wx.showLoading({ title: '获取位置中', mask: true });
      loadingShown = true;
    } catch (_) {}

    // 先尝试获取/请求定位权限，再调用模糊定位；若失败则兜底默认中心
    const callFuzzy = () => {
      try {
        (wx as any).getFuzzyLocation({
          type: 'wgs84',
          success: (res: any) => {
            const { latitude, longitude } = res;
            this.setData({
              latitude,
              longitude,
              locationSuccess: true,
            });

            // 设置当前位置标记
            const selfMarker: LocalMapMarker = {
              id: 1,
              latitude,
              longitude,
              width: 24,
              height: 24,
              iconPath: '/assets/tabbar/location.png',
              callout: {
                content: '当前位置',
                color: '#111111',
                fontSize: 12,
                borderRadius: 6,
                bgColor: '#ffffff',
                padding: 6,
                display: 'ALWAYS',
              },
            } as LocalMapMarker;

            this.setData({ markers: [selfMarker] });

            // 移动视野至当前位置（开发者工具不支持 moveToMapLocation，做兼容处理）
            try {
              const { platform } = wx.getSystemInfoSync();
              if (platform === 'devtools') {
                this.setData({ latitude, longitude });
              } else {
                this.mapCtx?.moveToLocation({ latitude, longitude });
              }
            } catch (_) {
              this.setData({ latitude, longitude });
            }

            // 拉取附近球馆
            this.fetchNearbyVenues(latitude, longitude, true);

            wx.showToast({ title: '定位成功', icon: 'success', duration: 1500 });
          },
          fail: (_err: any) => {
            this.setData({ locationError: true, errorMessage: '未授权或不可用的定位' });
            wx.showToast({ title: '未授权定位，已为你展示附近球馆', icon: 'none' });
            // 先尝试 IP 定位兜底，再不行用默认中心
            this.resolveByIpLocation().then(() => {});
          },
          complete: () => {
            this.setData({ loading: false });
            if (loadingShown) {
              try { wx.hideLoading() } catch (_) {}
              loadingShown = false;
            }
          }
        });
      } catch (_) {
        this.setData({ loading: false, locationError: true, errorMessage: '定位能力不可用' });
        if (loadingShown) {
          try { wx.hideLoading() } catch (_) {}
          loadingShown = false;
        }
        // 先尝试 IP 定位兜底，再不行用默认中心
        this.resolveByIpLocation().then(() => {});
      }
    };

    try {
      wx.getSetting({
        success: (s) => {
          const granted = !!(s.authSetting && s.authSetting['scope.userFuzzyLocation']);
          if (granted) {
            callFuzzy();
          } else {
            wx.authorize({
              scope: 'scope.userFuzzyLocation',
              success: () => callFuzzy(),
              fail: () => {
                this.setData({ loading: false, locationError: true, errorMessage: '未授权定位' });
                if (loadingShown) {
                  try { wx.hideLoading() } catch (_) {}
                  loadingShown = false;
                }
                wx.showToast({ title: '未授权定位，已为你展示附近球馆', icon: 'none' });
            // 先尝试 IP 定位兜底，再不行用默认中心
            this.resolveByIpLocation().then(() => {});
              }
            });
          }
        },
        fail: () => callFuzzy()
      });
    } catch (_) {
      callFuzzy();
    }
  },

  locateMe() {
    try {
      const { platform } = wx.getSystemInfoSync();
      if (platform === 'devtools') {
        this.setData({ latitude: this.data.latitude, longitude: this.data.longitude });
      } else {
        this.mapCtx?.moveToLocation({
          latitude: this.data.latitude,
          longitude: this.data.longitude,
        });
      }
    } catch (_) {
      this.setData({ latitude: this.data.latitude, longitude: this.data.longitude });
    }
  },

  onRegionChange(e: any) {
    if (e.type !== 'end') return;
    this.mapCtx?.getCenterLocation({
      success: (res) => {
        const centerLat = res.latitude;
        const centerLng = res.longitude;
        const movedM = haversineDistanceMeters(
          centerLat,
          centerLng,
          this.lastFetch.centerLat,
          this.lastFetch.centerLng
        );
        const now = Date.now();
        if (
          movedM >= this.moveDistanceThresholdM &&
          now - this.lastFetch.timestampMs >= this.minFetchIntervalMs
        ) {
          this.fetchNearbyVenues(centerLat, centerLng, false);
        }
      },
    });
  },

  fetchNearbyVenues(centerLat: number, centerLng: number, force: boolean) {
    if (this.fetchInFlight) return;

    const now = Date.now();

    // Key 未配置时直接提示并返回
    if (!tencentMapKey || typeof tencentMapKey !== 'string' || !tencentMapKey.trim()) {
      this.setData({ errorMessage: '地图Key未配置，请在 utils/config 中设置 tencentMapKey' });
      wx.showToast({ title: '地图Key未配置', icon: 'none' });
      return;
    }

    // 缓存命中
    if (!force && this.cache) {
      const dist = haversineDistanceMeters(centerLat, centerLng, this.cache.centerLat, this.cache.centerLng);
      if (dist < this.moveDistanceThresholdM && now - this.cache.timestampMs < this.minFetchIntervalMs) {
        // 保留第一个为当前位置标记
        const selfMarker = this.data.markers.find(m => m.id === 1);
        const merged = selfMarker ? [selfMarker, ...this.cache.markers.filter(m => m.id !== 1)] : this.cache.markers;
        this.setData({ markers: merged });
        // 恢复元数据映射
        this.markerIdToMeta = {}
        for (const meta of this.cache.metas || []) {
          this.markerIdToMeta[meta.id] = meta
        }
        return;
      }
    }

    this.lastFetch = { centerLat, centerLng, timestampMs: now };

    const keywords = encodeURIComponent('篮球场');
    const boundary = `nearby(${centerLat},${centerLng},${this.searchRadiusM})`;
    const url = `https://apis.map.qq.com/ws/place/v1/search?keyword=${keywords}&boundary=${boundary}&key=${tencentMapKey}&orderby=_distance&page_size=20`;

    this.fetchInFlight = true;
    this.setData({ loading: true, errorMessage: '' });
    wx.request({
      url,
      method: 'GET',
      success: (res) => {
        const body: any = res.data || {};
        if (res.statusCode !== 200) {
          console.warn('Place API HTTP error:', res.statusCode, body);
          this.setData({ errorMessage: `地图接口HTTP错误：${res.statusCode}` });
          wx.showToast({ title: '球馆数据获取失败', icon: 'none' });
          return;
        }
        if (body.status !== 0 || !Array.isArray(body.data)) {
          console.warn('Place API business error:', body);
          const msg = typeof body.message === 'string' ? body.message : '';
          this.setData({ errorMessage: `地图接口错误(${body.status}): ${msg}` });
          wx.showToast({ title: '球馆数据获取失败', icon: 'none' });
          return;
        }
        const nowTs = Date.now();
        const list = (body.data as any[]).slice(0, 30);
        const metas: Array<{ id: number; placeId: string; name: string; latitude: number; longitude: number; address: string }> = []
        const venueMarkers: LocalMapMarker[] = list
          .filter((item) => item && item.location && typeof item.location.lat === 'number' && typeof item.location.lng === 'number')
          .map((item, idx) => {
            const name: string = item.title || item.name || '篮球场';
            const placeId = item.id ? String(item.id) : `${nowTs}-${idx}`;
            const newId = this.markerIdCounter++;
            metas.push({ id: newId, placeId, name, latitude: item.location.lat, longitude: item.location.lng, address: item.address || '' })
            return {
              id: newId,
              latitude: item.location.lat,
              longitude: item.location.lng,
              width: 32,
              height: 32,
              iconPath: '/assets/images/basketball.svg',
              title: name,
              callout: {
                content: name,
                display: 'ALWAYS',
                padding: 6,
                borderRadius: 6,
                borderColor: '#0052D9',
                color: '#111111',
                bgColor: '#ffffff',
                textAlign: 'center',
              },
            } as LocalMapMarker;
          });

        const selfMarker = this.data.markers.find(m => m.id === 1);
        const mergedMarkers = selfMarker ? [selfMarker, ...venueMarkers] : venueMarkers;
        this.setData({ markers: mergedMarkers });
        // 更新元数据映射
        this.markerIdToMeta = {}
        for (const meta of metas) this.markerIdToMeta[meta.id] = meta

        this.cache = {
          centerLat,
          centerLng,
          timestampMs: Date.now(),
          markers: mergedMarkers,
          metas,
        };
      },
      fail: (e) => {
        console.warn('Place API request failed:', e);
        this.setData({ errorMessage: '网络异常或未配置合法域名（apis.map.qq.com）' });
        wx.showToast({ title: '网络异常', icon: 'none' });
      },
      complete: () => {
        this.fetchInFlight = false;
        this.setData({ loading: false });
      },
    });
  },

  onMarkerTap(e: any) {
    const markerId: number = Number(e.detail?.markerId)
    if (!markerId || markerId === 1) return
    const meta = this.markerIdToMeta[markerId]
    if (!meta) return
    try {
      wx.setStorageSync('selectedVenueMeta', meta)
    } catch (_) {}
    wx.switchTab({ url: '/pages/venue/venue' })
  },

  // 底部导航
  onTabChange(e: any) {
    const value = e.detail.value;
    this.setData({ activeTab: value });
    if (value === 'index') {
      return;
    } else if (value === 'venue') {
      wx.reLaunch({ url: '/pages/venue/venue' });
    } else if (value === 'mine') {
      wx.reLaunch({ url: '/pages/mine/mine' });
    }
  }
});