const realTekBTManager = require('../../utils/ZHBTManager.js')
const preDef = require('../../utils/ZHBTServiceDef.js')
const common = require("../../utils/ZHCommon.js")
const cmdPreDef = require("../../utils/ZHBTCmdPreDef.js")
const SHAHMAC = require("../../utils/ZHSHAHMAC.js")
const PreAES = require("../../utils/ZHAES.js")

Page({
  /**
   * 页面的初始数据
   */
  data: {
    serviceUUIDs: [preDef.RealTek_ServiceUUIDs.RealTek_BroadServiceUUID],
    loadingHidden: true,
    discoverDevices: []
    
  },

  /*
  * 点击列表事件
  */
  clickCell: function(event){
    var deviceId = event.target.dataset.deviceid
    console.log("click deviceId",deviceId)
    wx.showLoading({
      title: '正在连接...',
    })

    // 连接
    realTekBTManager.connectPeripheral(deviceId,function (device, error, result){
      wx.hideLoading()
      if(error){
        wx.showToast({
          title: res.errMsg,
        })
      }else{
        if (device){
          console.log("connected device have", device.deviceId)
        }else{
          console.log("connected device not have")
        }
        wx.navigateTo({
          url: '../deviceFunctions/deviceFunctions?deviceId=' + deviceId,
        })
      }
    })
    
  },

  /*
  * 兼容判定
  */
   
 getSystemInfo:function(){
   var that = this
   wx.getSystemInfo({
     success: function(res) {
       var sdkVersion = res.SDKVersion
       var version = parseFloat(sdkVersion)
       if(version < 1.1){
         wx.showModal({
           title: '提示',
           content: '当前微信版本过低，无法使用该功能，请升级到最新微信版本后重试。'
         })
       }else{
         that.openBluetoothAdaper()
       }
       
     },
   })

 },

  /**
  * 打开蓝牙适配器
  */
  openBluetoothAdaper: function(){
    var that = this
    realTekBTManager.openBluetoothAdapter({
       success: function (res) {
         that.scanDevice()
       },
       fail: function (res) {
         wx.stopPullDownRefresh()
         wx.showToast({
           title: res.errMsg,

         })
       }
    })

  },
  
  /**
  * 搜索设备
  */
  scanDevice: function(){
    wx.showLoading({
      title: '搜索中...',
    })
    let that = this
    console.log("startBluetoothDevicesDiscovery")
    // 开始检索设备
    realTekBTManager.startBluetoothDevicesDiscovery({
      services: that.data.serviceUUIDs,
      allowDuplicatesKey: true,
      interval: 0,
      success: function (res) {//成功后则去获取已发现的蓝牙设备
        realTekBTManager.getBluetoothDevices({
          success: function(res){
            if (res.devices && (res.devices.length > 0)){
              wx.hideLoading()
              that.setData({
                discoverDevices: res.devices
              })
            }else{
              var info = "device count is 0 Please Pull Down Refresh" 
              wx.showToast({
                title: info,
              })
            }

          },
          fail: function(res){
            wx.hideLoading()
            wx.showToast({
              title: res.errMsg,
            })

          },
          complete: function (res){
            wx.stopPullDownRefresh()
          }
        })


      }

    })
  },


  /*
  * test load firmware data
  */
  testloadFirmwareData: function(){
    var minute = 140
    var hour = minute / 60
    hour = parseInt(hour)
    var min = minute % 60
    var info = "hour:" + hour + " minute:" + min

    var url = "https://fota.aimoketechnology.com/download/firmware/iMCO-k9-app-release-16221-2e97055fceea6757cb9ab9aac8ac3204.bin"
    const downLoadTask = wx.downloadFile({
      url: url,
      success: function (res) {
        var filePath = res.tempFilePath


      },
      fail: function (res) {
        console.log('fail')
        console.log(res)
      },
      complete: function (res) {
        console.log('complete')
        console.log(res)
      }
    })

    downLoadTask.onProgressUpdate((res) => {
      console.log('下载进度', res.progress)
      console.log('已经下载的数据长度', res.totalBytesWritten)
      console.log('预期需要下载的数据总长度', res.totalBytesExpectedToWrite)
    })

   /* wx.request({
      url: url,
      success: function (res) {
        console.log("request success:",res)


      },
      fail: function (res) {
        console.log('request fail',res)
      },
      
    })*/

  },

  /*
  * test SHAHMAC
  */

  testHMAC: function(){
    var appKey = "keyOPCjEL08cCCIgm33y8cmForWXLSR9uLT"
    var appSecret = "secaab78b9d7dbe11e7a420ee796be10e85-i6ff579j49afj5"
    var date = new Date()
    var timeInterval = Date.parse(date)
    var radom = Math.floor(Math.random() * 1000000 + 1)
    var nonce = radom
    var message = appKey + timeInterval + nonce
    var sign = SHAHMAC.b64_hmac_sha1(appSecret, message)

  
    var info = "Secret:" + appSecret + "---Message:" + message + "---result:" + sign
    console.log(info)
  },

 /*
 * test AES
 */

  testAES: function (){
    var password = '111111'
    var key = 'sharejs.com'
    var result = PreAES.Aes.Ctr.encrypt(password, key, 128)
    console.log("AES Result:",result)

    
    var secret_key =[0x4E, 0x46, 0xF8, 0xC5, 0x09, 0x2B, 0x29, 0xE2,
        0x9A, 0x97, 0x1A, 0x0C, 0xD1, 0xF6, 0x10, 0xFB,
        0x1F, 0x67, 0x63, 0xDF, 0x80, 0x7A, 0x7E, 0x70,
        0x96, 0x0D, 0x4C, 0xD3, 0x11, 0x8E, 0x60, 0x1A]
    var subKey = PreAES.Aes.keyExpansion(secret_key)
    
    var buffer = new ArrayBuffer(6)
    var dataView = new DataView(buffer)
    dataView.setUint8(0,10)

    var dataArray = new Uint8Array(buffer)
    var result = PreAES.Aes.cipher(buffer,subKey)
    console.log("subKey:",subKey)

    console.log("result:",result)



  },

  
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {

  },



  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {
    console.log("page onReady")
  },

  


  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    this.getSystemInfo()
    //this.testAES()
  },



  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {
    console.log("page onHide")
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {
    console.log("page onUnLoad")
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {
    console.log("page onPullDownReresh")
    this.getSystemInfo()

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {
    console.log("page onReachBottom")
  },

})