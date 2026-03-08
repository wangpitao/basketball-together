// 云函数：listVenueMessages
// 作用：按场馆列出有效的约球留言

const cloud = require('wx-server-sdk')

cloud.init({ env: 'cloud1-0gn4ixonf3b9d5de' })
const db = cloud.database()
const messages = db.collection('messages')

exports.main = async (event, context) => {
  const { placeId } = event || {}
  if (!placeId) return { success: false, message: '缺少 placeId' }

  const now = Date.now()
  const { data } = await messages
    .where({ placeId, status: 'open', expireAt: db.command.gt(now) })
    .orderBy('gameTime', 'asc')
    .orderBy('createdAt', 'desc')
    .limit(100)
    .get()

  return {
    success: true,
    list: data || []
  }
}


