// 云函数：dedupeUsers
// 用途：清理 users 集合中重复或缺失 _openid 的文档，便于建立唯一索引

const cloud = require('wx-server-sdk')

cloud.init({ env: 'cloud1-0gn4ixonf3b9d5de' })
const db = cloud.database()
const _ = db.command

async function getAllUsers() {
  const users = db.collection('users')
  const { total } = await users.count()
  const pageSize = 100
  const pages = Math.ceil(total / pageSize)
  const list = []
  for (let i = 0; i < pages; i++) {
    const res = await users.skip(i * pageSize).limit(pageSize).get()
    list.push(...res.data)
  }
  return list
}

exports.main = async (event, context) => {
  const users = db.collection('users')

  // 1) 拉取全量
  const all = await getAllUsers()

  // 2) 分组：按 _openid（无 _openid 的分到 special 组）
  const byOpenid = new Map()
  const noOpenid = []
  for (const u of all) {
    if (u._openid) {
      const arr = byOpenid.get(u._openid) || []
      arr.push(u)
      byOpenid.set(u._openid, arr)
    } else {
      noOpenid.push(u)
    }
  }

  let removed = 0
  let patched = 0

  // 3) 对每个 openid 分组，只保留 updatedAt 最大（若无则 createdAt 最大）的那条
  for (const [openid, arr] of byOpenid.entries()) {
    if (arr.length <= 1) continue
    arr.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))
    const keep = arr[0]
    const dropList = arr.slice(1)
    for (const d of dropList) {
      try {
        await users.doc(d._id).remove()
        removed++
      } catch (e) {
        console.warn('删除重复用户失败', d._id, e)
      }
    }
  }

  // 4) 对无 _openid 的文档：若能从同一用户的其它记录推断 openid 就补齐；否则建议人工处理
  for (const u of noOpenid) {
    // 简单策略：若同昵称+头像能在有 openid 的集合中唯一匹配，则补齐
    const candidates = all.filter(x => !!x._openid && x.nickName === u.nickName && (x.avatarUrl === u.avatarUrl || x.avatarFileID === u.avatarFileID))
    if (candidates.length === 1) {
      try {
        await users.doc(u._id).update({ data: { _openid: candidates[0]._openid, updatedAt: Date.now() } })
        patched++
      } catch (e) {
        console.warn('补齐 _openid 失败', u._id, e)
      }
    }
  }

  return { total: all.length, removed, patched }
}


