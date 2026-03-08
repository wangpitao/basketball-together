// 云函数：listMyMessages
// 作用：返回当前用户“我的发布”或“我的参与”的留言列表

const cloud = require('wx-server-sdk')

cloud.init({ env: 'cloud1-0gn4ixonf3b9d5de' })
const db = cloud.database()
const messages = db.collection('messages')

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const {
    type = 'publish', // publish | join
    limit = 50
  } = event || {}
  const _ = db.command

  try {
    let query
    if (type === 'join') {
      // 我加入的：兼容旧数据（旧消息可能未将作者加入 participants），因此包含：
      // 1) participants 包含我；或 2) 我自己发布的
      query = messages.where(_.or([
        { participants: _.all([openid]) },
        { _openid: openid }
      ]))
    } else {
      // 我发布的
      query = messages.where({ _openid: openid })
    }
    const { data } = await query.orderBy('createdAt', 'desc').limit(Math.max(1, Math.min(100, parseInt(limit,10) || 50))).get()
    return { success: true, list: data || [] }
  } catch (e) {
    return { success: false, message: e && e.message ? e.message : '查询失败' }
  }
}


