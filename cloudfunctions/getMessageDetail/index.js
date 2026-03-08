const cloud = require('wx-server-sdk')
cloud.init({ env: 'cloud1-0gn4ixonf3b9d5de' })
const db = cloud.database()

exports.main = async (event, context) => {
  const { id } = event || {}
  if (!id) return { success: false, message: '缺少参数：id' }
  try {
    const res = await db.collection('messages').doc(id).get()
    const msg = res && res.data
    if (!msg) return { success: false, message: '不存在' }
    return { success: true, message: msg }
  } catch (e) {
    return { success: false, message: e.message || '获取失败' }
  }
}
