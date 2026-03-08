// 云函数：authLogin
// 作用：根据 openid 建档用户，返回用户文档

const cloud = require('wx-server-sdk')

cloud.init({ env: 'cloud1-0gn4ixonf3b9d5de' })
const db = cloud.database()
const users = db.collection('users')

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  // 确保有用户文档（如存在重复，优先取最近更新的一条）
  const { data } = await users.where({ _openid: openid }).orderBy('updatedAt', 'desc').limit(1).get()
  let userDoc
  if (!data || data.length === 0) {
    const now = Date.now()
    const defaultUser = {
      _openid: openid,
      nickName: event.nickName || '',
      avatarUrl: event.avatarUrl || '',
      avatarFileID: event.avatarFileID || '',
      phone: '',
      createdAt: now,
      updatedAt: now,
      stats: { publishCount: 0, joinCount: 0, creditScore: 100 },
    }
    const addRes = await users.add({ data: defaultUser })
    userDoc = { _id: addRes._id, ...defaultUser, _openid: openid }
  } else {
    userDoc = data[0]
    // 兼容历史数据：若缺少 _openid，补齐
    if (!userDoc._openid) {
      try {
        await users.doc(userDoc._id).update({ data: { _openid: openid, updatedAt: Date.now() } })
        userDoc._openid = openid
      } catch (e) {
        console.warn('补齐 _openid 失败:', e)
      }
    }
    // 若已存在用户，仅在以下情况更新：
    // 1) 昵称：仅当数据库为空或为占位符“微信用户”时，才用前端传入覆盖
    // 2) 头像：如传入了 avatarFileID 则更新；否则仅在数据库为空时用 avatarUrl 覆盖
    const shouldUpdateNick = (
      !!event.nickName && event.nickName !== userDoc.nickName && (!userDoc.nickName || userDoc.nickName === '微信用户')
    )
    const shouldUpdateAvatarFileID = (
      !!event.avatarFileID && event.avatarFileID !== userDoc.avatarFileID
    )
    const shouldUpdateAvatarUrl = (
      !!event.avatarUrl && event.avatarUrl !== userDoc.avatarUrl && !userDoc.avatarFileID && !userDoc.avatarUrl
    )
    const needUpdate = shouldUpdateNick || shouldUpdateAvatarFileID || shouldUpdateAvatarUrl
    if (needUpdate) {
      const patch = { updatedAt: Date.now() }
      if (shouldUpdateNick) patch.nickName = event.nickName
      if (shouldUpdateAvatarFileID) patch.avatarFileID = event.avatarFileID
      if (shouldUpdateAvatarUrl) patch.avatarUrl = event.avatarUrl
      await users.doc(userDoc._id).update({ data: patch })
      userDoc = { ...userDoc, ...patch }
    }
  }

  return {
    openid,
    user: userDoc,
  }
}


