// 云函数：getUserStats
// 作用：返回当前用户的发布次数与参与次数

const cloud = require('wx-server-sdk')

cloud.init({ env: 'cloud1-0gn4ixonf3b9d5de' })
const db = cloud.database()
const messages = db.collection('messages')

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const _ = db.command

  try {
    const [pubRes, joinRes] = await Promise.all([
      messages.where({ _openid: openid }).count(),
      messages.where(_.or([
        { participants: _.all([openid]) },
        { _openid: openid }
      ])).count(),
    ])

    return {
      success: true,
      publishCount: (pubRes && typeof pubRes.total === 'number') ? pubRes.total : 0,
      joinCount: (joinRes && typeof joinRes.total === 'number') ? joinRes.total : 0,
    }
  } catch (e) {
    return { success: false, message: e && e.message ? e.message : '统计失败' }
  }
}


