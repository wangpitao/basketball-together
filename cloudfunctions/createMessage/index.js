// 云函数：createMessage
// 作用：创建场馆约球留言

const cloud = require('wx-server-sdk')

cloud.init({ env: 'cloud1-0gn4ixonf3b9d5de' })
const db = cloud.database()
const messages = db.collection('messages')

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  const now = Date.now()
  // 读取发布者昵称与头像（取最近一次更新的用户记录）
  let authorNickname = ''
  let authorAvatarUrl = ''
  const {
    placeId,
    venueName,
    address = '',
    location, // { lat, lng }
    content = '',
    gameTime, // timestamp
    maxPlayers = 6,
    skillLevel = '',
    notes = '',
    isPublic = true
  } = event || {}

  try {
    const usersCol = db.collection('users')
    const { data: userList } = await usersCol.where({ _openid: openid }).orderBy('updatedAt', 'desc').limit(1).get()
    if (userList && userList.length > 0) {
      const u = userList[0]
      authorNickname = typeof u.nickName === 'string' ? u.nickName : ''
      authorAvatarUrl = (typeof u.avatarFileID === 'string' && u.avatarFileID)
        ? u.avatarFileID
        : (typeof u.avatarUrl === 'string' ? u.avatarUrl : '')
    }
  } catch (e) {
    // 忽略读取失败，保持默认空
  }

  if (!placeId || !venueName) {
    return { success: false, message: '参数缺失：placeId 或 venueName' }
  }

  const startTs = typeof gameTime === 'number' && gameTime > now ? gameTime : now + 2 * 60 * 60 * 1000 // 默认2小时后
  const expireAt = startTs + 6 * 60 * 60 * 1000 // 默认活动开始后6小时过期

  const doc = {
    placeId,
    venueName,
    address,
    location: location && typeof location.lat === 'number' && typeof location.lng === 'number'
      ? new db.Geo.Point(location.lng, location.lat) : null,
    authorNickname,
    authorAvatarUrl,
    status: 'open',
    content,
    gameTime: startTs,
    maxPlayers: Math.max(2, Number(maxPlayers) || 6),
    participants: [openid],
    skillLevel,
    notes,
    isPublic: !!isPublic,
    _openid: openid,
    createdAt: now,
    updatedAt: now,
    expireAt,
  }

  const addRes = await messages.add({ data: doc })
  return {
    success: true,
    _id: addRes._id,
    message: { _id: addRes._id, ...doc }
  }
}


