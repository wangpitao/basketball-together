Page({
  data: {
    loading: true,
    list: [] as any[],
  },
  onLoad() {
    this.loadList();
  },
  async loadList() {
    this.setData({ loading: true });
    try {
      const res: any = await wx.cloud.callFunction({ name: 'listMyMessages', data: { type: 'publish' } });
      const result = res?.result || {};
      const list = (result.list || []).map((item: any) => ({
        ...item,
        displayTime: formatTimeRange(item.gameTime),
        displayCount: `${item.maxPlayers}人`,
      }));
      this.setData({ list });
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },
});

function formatTimeRange(ts: number): string {
  if (!ts) return '';
  const d = new Date(ts);
  const mm = (d.getMonth() + 1).toString().padStart(2, '0');
  const dd = d.getDate().toString().padStart(2, '0');
  const hh = d.getHours().toString().padStart(2, '0');
  const mi = d.getMinutes().toString().padStart(2, '0');
  return `${mm}-${dd} ${hh}:${mi}`;
}
