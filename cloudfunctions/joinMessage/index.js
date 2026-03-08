// 云函数：joinMessage
// 作用：加入某条约球留言（原子性）

const cloud = require('wx-server-sdk')
cloud.init({ env: 'cloud1-0gn4ixonf3b9d5de' })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { messageId } = event || {}

  if (!messageId) {
    return { success: false, message: '缺少参数：messageId' }
  }

  try {
    const msgRes = await db.collection('messages').doc(messageId).get()
    const msg = msgRes && msgRes.data
    if (!msg) return { success: false, message: '消息不存在' }

    const participants = Array.isArray(msg.participants) ? msg.participants : []
    const maxPlayers = Number(msg.maxPlayers) || 0

    if (participants.includes(openid)) {
      return { success: true, joined: true, message: '已加入' }
    }

    if (maxPlayers && participants.length >= maxPlayers) {
      return { success: false, message: '已满员' }
    }

    await db.collection('messages').doc(messageId).update({
      data: { participants: _.push(openid), updatedAt: Date.now() }
    })

    return { success: true, joined: true }
  } catch (e) {
    return { success: false, message: e.message || '加入失败' }
  }
}


