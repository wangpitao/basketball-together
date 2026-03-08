// 云函数：updateUser
// 作用：更新用户资料/统计

const cloud = require('wx-server-sdk')

cloud.init({ env: 'cloud1-0gn4ixonf3b9d5de' })
const db = cloud.database()
const users = db.collection('users')
const images = db.collection('images')

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { userId, nickName, avatarUrl, avatarFileID, phone, stats, imageMeta } = event

  const updateData = { updatedAt: Date.now() }
  if (typeof nickName === 'string') updateData.nickName = nickName
  if (typeof avatarUrl === 'string') updateData.avatarUrl = avatarUrl
  if (typeof avatarFileID === 'string') updateData.avatarFileID = avatarFileID
  if (typeof phone === 'string') updateData.phone = phone
  if (stats && typeof stats === 'object') updateData.stats = stats

  // 精确更新：优先使用 userId；否则用 openid 查出一条并按 _id 更新
  let targetId = userId
  if (!targetId) {
    const found = await users.where({ _openid: openid }).limit(1).get()
    targetId = found && found.data && found.data[0] ? found.data[0]._id : ''
  }

  if (!targetId) {
    return { success: false, message: '未找到用户文档', openid }
  }

  await users.doc(targetId).update({ data: updateData })

  // 记录头像文件到 images 集合作为元数据归档
  try {
    if (typeof avatarFileID === 'string' && avatarFileID) {
      await images.add({
        data: {
          _openid: openid,
          fileID: avatarFileID,
          scene: 'avatar',
          meta: imageMeta || {},
          createdAt: Date.now(),
        }
      })
    }
  } catch (e) {
    console.warn('记录头像元数据失败', e)
  }

  const latest = await users.doc(targetId).get().catch(() => ({ data: null }))
  return {
    success: true,
    openid,
    user: latest && latest.data ? latest.data : null,
  }
}


