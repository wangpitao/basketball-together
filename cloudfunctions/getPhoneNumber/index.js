// 云函数：getPhoneNumber
// 作用：解析手机号码并更新到用户资料

const cloud = require('wx-server-sdk')

cloud.init({ env: 'cloud1-0gn4ixonf3b9d5de' })
const db = cloud.database()
const users = db.collection('users')

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { phoneCode } = event

  if (!phoneCode) {
    return {
      success: false,
      message: '缺少手机号码凭证'
    }
  }

  try {
    // 解析手机号
    const result = await cloud.openapi.phonenumber.getPhoneNumber({
      code: phoneCode
    })

    if (!result.phoneInfo || !result.phoneInfo.phoneNumber) {
      return {
        success: false,
        message: '获取手机号失败'
      }
    }

    const phone = result.phoneInfo.phoneNumber
    
    // 更新用户资料
    await users.where({ _openid: openid }).update({
      data: {
        phone,
        updatedAt: Date.now()
      }
    })

    return {
      success: true,
      phone,
      message: '手机号获取成功'
    }
  } catch (err) {
    console.error('获取手机号失败:', err)
    return {
      success: false,
      message: '获取手机号失败: ' + err.message
    }
  }
}
