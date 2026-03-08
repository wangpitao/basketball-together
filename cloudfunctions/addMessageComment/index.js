const cloud = require('wx-server-sdk')
cloud.init({ env: 'cloud1-0gn4ixonf3b9d5de' })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { messageId, content } = event || {}

  if (!messageId || !content || !content.trim()) {
    return { success: false, message: '参数无效' }
  }

  try {
    // 获取用户资料
    const ures = await db.collection('users').where({ _openid: openid }).orderBy('updatedAt','desc').limit(1).get()
    const user = (ures.data && ures.data[0]) || {}
    const nickName = user.nickName || '球友'
    let avatarUrl = ''
    if (user.avatarFileID) {
      try {
        const t = await cloud.getTempFileURL({ fileList: [user.avatarFileID] })
        avatarUrl = (t.fileList && t.fileList[0] && t.fileList[0].tempFileURL) || ''
      } catch (_) {}
    }
    if (!avatarUrl) avatarUrl = user.avatarUrl || ''

    const comment = {
      _openid: openid,
      nickName,
      avatarUrl,
      content: String(content).slice(0, 500),
      createdAt: Date.now(),
    }

    await db.collection('messages').doc(messageId).update({
      data: {
        comments: _.push(comment),
        updatedAt: Date.now(),
      }
    })

    return { success: true, comment }
  } catch (e) {
    return { success: false, message: e.message || '评论失败' }
  }
}
