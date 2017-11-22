let preDefService = require("./ZHBTServiceDef.js")
let cmdPreDef = require("./ZHBTCmdPreDef.js")
let common = require("./ZHCommon.js")
let preModel = require("./ZHBTModel.js")

//properties
var discovering = false  //是否处于搜索状态
var characteristicValueWrtieBlocks = []        //回调函数
var bluetoolthavailable = false //蓝牙适配器是否可用
var connectedDeviceId = null  //已连接设备ID
var connectedDevice = null //已连接设备
var receiveData = null //接收的数据
var receivePayloadLength = 0 //接收数据时的数据长度，用于判断Notify的数据是否接收完整
var receiveDataSeq = 0 //接收数据时的序列号


var allServices = null //该设备所有服务
var writeCharObj = null //发送命令特征
var notifyCharObj = null //接收命令或数据的特征
var immediateCharObj = null //查找手环特征
var alertLevelCharObj = null //查找手环的特征
var deviceNameCharObj = null //手环名称相关特征
var batterylevelCharObj = null //电池电量特征
var OTAPatchVersioCharObj = null //OTA Patch版本特征
var OTAAppVersionCharObj = null //OTA App 版本特征
var functionsCharObj = null // 功能列表特征 暂时无用
var macAddressCharObj = null //固件蓝牙地址特征

var OTApatchVersion = 0 //OTA Patch version
var OTAappVersion = 0 //OTA App version
var macAddress = null //OTA macAddress


var functionsHaveUpdated = null

// 大小端模式判定
var littleEndian = (function () {
  var buffer = new ArrayBuffer(2);
  new DataView(buffer).setInt16(0, 256, true);
  return new Int16Array(buffer)[0] === 256;
})();

// 组合buffer
function appendBuffer(buffer1, buffer2) {
  var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
  tmp.set(new Uint8Array(buffer1), 0);
  tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
  return tmp.buffer;
}

// functions
function initialBTManager(obj){
  
  openBluetoothAdapter({
    success: function(res) {
      bluetoolthavailable = true
    },
    fail: function(res) {
      bluetoolthavailable = false

    }
  })

  //监听蓝牙适配器状态改变
  onBluetoothAdapterStateChange(function (res){
    if (!res.discovering){
      discovering = false
    }else{
      discovering = true
    }
    if (!res.available){
      console.log("bluetooth adapter is not valid")
      bluetoolthavailable = false
    }else{
      bluetoolthavailable = true
      console.log("bluetooth adapter is valid")
    }
  })

  // 监听低功耗蓝牙连接的错误事件，包括设备丢失，连接异常断开等等。
  onBLEConnectionStateChange(function (res){
    if (!res.connected){
      console.log("bluetooth have disconnected with deviceId:${res.deviceId}")
    }
  })

  onBLECharacteristicValueChange()

}


/*
* 清除所有缓存
*/
function clearCaches()
{
  discovering = false  
  characteristicValueWrtieBlocks = []
  bluetoolthavailable = false
  connectedDeviceId = null
  connectedDevice = null
  receiveData = null 
  receivePayloadLength = 0 
  receiveDataSeq = 0 

  allServices = null 
  writeCharObj = null 
  notifyCharObj = null 
  immediateCharObj = null
  alertLevelCharObj = null 
  deviceNameCharObj = null 
  batterylevelCharObj = null 
  OTAPatchVersioCharObj = null 
  OTAAppVersionCharObj = null 
  functionsCharObj = null 
  macAddressCharObj = null 

  OTApatchVersion = 0 
  OTAappVersion = 0 
  macAddress = null 
}


/* - 清除接收到数据的缓存 - */
function clearReceiveDataCaches(){
  receivePayloadLength = 0
  receiveData = null
  receiveDataSeq = 0

}

/*
* 删除缓存的callback函数
*/
function removeCacheBlockWithKey(key){
  if(characteristicValueWrtieBlocks[key]){
    delete characteristicValueWrtieBlocks[key]
  }
}

/* - 蓝牙接口模块 - *／


/*
* 初始化蓝牙适配器
*/
function openBluetoothAdapter(obj) {
  wx.openBluetoothAdapter({
    success: function (res) {
      if (obj.success) {
        obj.success(res)
      }
    },
    fail: function (res) {
      if (obj.fail) {
        obj.fail(res)
      }

    },
    complete: function (res) {
      if (obj.complete) {
        obj.complete(res)
      }
    }
  })
}


/*
* 关闭蓝牙模块调用该方法将断开所有已建立的链接并释放系统资源
*/

function closeBluetoothAdapter(obj){
  wx.closeBluetoothAdapter({
    success: function(res) {
      if(obj.success){
        obj.success(res)
      }
    },
    fail: function(res){
      if(obj.fail){
        obj.fail(res)
      }
    },
    complete: function(res){
      if(obj.complete){
        obj.complete(res);
      }
    }
  })

}


/*
* 获取本机蓝牙适配器状态
*/

function getBluetoothAdapterState(obj){
  wx.getBluetoothAdapterState({
    success: function(res) {
      if(obj.success){
        obj.success(res)
      }
    },
    fail: function(res){
      if(obj.fail){
        obj.fail(res)
      }
    },
    complete: function(res){
      if(obj.complete){
        obj.complete(res)
      }
    }
  })
}


/*
*监听蓝牙适配器状态变化事件
*/

function onBluetoothAdapterStateChange(obj){
  wx.onBluetoothAdapterStateChange(function(res){
    if(obj){
      obj(res);
    }
  })
}


/*
* 开始搜寻附近的蓝牙外围设备。注意，该操作比较耗费系统资源，请在搜索并连接到设备后调用 stop 方法停止搜索。
*/

function startBluetoothDevicesDiscovery(obj){
  wx.startBluetoothDevicesDiscovery({
    success: function(res) {
      if(obj.success){
        obj.success(res)
      }
    },
    fail: function(res){
      if(obj.fail){
        obj.fail(res);
      }
    },
    complete: function(res){
      if (obj.complete){
        obj.complete(res);
      }
    },
    services: obj.services,
    interval: obj.interval
    
  })
}


/*
* 停止搜寻附近的蓝牙外围设备。请在确保找到需要连接的设备后调用该方法停止搜索。
*/

function stopBluetoothDevicesDiscovery(obj){
  wx.stopBluetoothDevicesDiscovery({
    success: function(res) {
      if(obj.success){
        obj.success(res)
      }
    },
    fail: function(res){
      if(obj.fail){
        obj.fail(res)
      }
    },
    complete: function(res){
      if(obj.complete){
        obj.complete(res)
      }
    }
  })
}


/*
*获取所有已发现的蓝牙设备，包括已经和本机处于连接状态的设备
*/

function getBluetoothDevices(obj){
  wx.getBluetoothDevices({
    success: function(res) {
      if(obj.success){
        obj.success(res)
      }
    },
    fail: function(res){
      if(obj.fail){
        obj.fail(res)
      }
    },
    complete: function(res){
      if(obj.complete){
        obj.complete(res)
      }
    }
  })
}

/*
* 根据 uuid 获取处于已连接状态的设备
*/

function getConnectedBluetoothDevices(obj){
  wx.getConnectedBluetoothDevices({
    services: obj.services,
    success: function(res) {
      if(obj.success){
        obj.success(res)
      }
    },
    fail: function(res){
      if(obj.fail){
        obj.fail(res)
      }
    },
    complete: function(res){
      if(obj.complete){
        obj.complete(res)
      }
    }
  })
}


/*
* 连接低功耗蓝牙设备
*/

function createBLEConnection(obj){
  wx.createBLEConnection({
    deviceId: obj.deviceId,
    success: function(res) {
      connectedDeviceId = obj.deviceId
      connectedDevice = preModel.initDevice()
      connectedDevice.identifier = connectedDeviceId
      connectedDevice.connected = true
      //获取所有特征服务
      getAllServices()
      if(obj.success){
        obj.success(res);
      }
    },
    fail: function (res) {
      if (obj.fail) {
        obj.fail(res)
      }
    },
    complete: function (res) {
      if (obj.complete) {
        obj.complete(res)
      }
    }
  })
}


/*
* 断开与低功耗蓝牙设备的连接
*/

function closeBLEConnection(obj){
  wx.closeBLEConnection({
    deviceId: obj.deviceId,
    success: function(res) {
      if (obj.success) {
        obj.success(res);
      }
    },
    fail: function (res) {
      if (obj.fail) {
        obj.fail(res)
      }
    },
    complete: function (res) {
      if (obj.complete) {
        obj.complete(res)
      }
    }

  })
}


/*
* 获取蓝牙设备所有 service（服务）
*/

function getBLEDeviceServices(obj){
  wx.getBLEDeviceServices({
    deviceId: obj.deviceId,
    success: function(res) {
      if (obj.success) {
        obj.success(res);
      }
    },
    fail: function (res) {
      if (obj.fail) {
        obj.fail(res)
      }
    },
    complete: function (res) {
      if (obj.complete) {
        obj.complete(res)
      }
    }
  })
}

/*
* 获取蓝牙设备所有 characteristic（特征值）
*/

function getBLEDeviceCharacteristics(obj){
  wx.getBLEDeviceCharacteristics({
    deviceId: obj.deviceId,
    serviceId: obj.serviceId,
    success: function(res) {
      if (obj.success) {
        obj.success(res);
      }
    },
    fail: function (res) {
      if (obj.fail) {
        obj.fail(res)
      }
    },
    complete: function (res) {
      if (obj.complete) {
        obj.complete(res)
      }
    }
  })
}

/*
* 读取低功耗蓝牙设备的特征值的二进制数据值。注意：必须设备的特征值支持read才可以成功调用，具体参照 characteristic 的 properties 属性
*/

function readBLECharacteristicValue(obj){
  wx.readBLECharacteristicValue({
    deviceId: obj.deviceId,
    serviceId: obj.serviceId,
    characteristicId: obj.characteristicId,
    success: function(res) {
      if (obj.success) {
        obj.success(res);
      }
    },
    fail: function (res) {
      if (obj.fail) {
        obj.fail(res)
      }
    },
    complete: function (res) {
      if (obj.complete) {
        obj.complete(res)
      }
    }
  })
}


/*
* 向低功耗蓝牙设备特征值中写入二进制数据。注意：必须设备的特征值支持write才可以成功调用，具体参照 characteristic 的 properties 属性

tips: 并行调用多次读写接口存在读写失败的可能性
*/

function writeBLECharacteristicValue(obj){
  common.printLogWithBuffer(obj.value, "writeBLECharacteristicValue")
  wx.writeBLECharacteristicValue({
    deviceId: obj.deviceId,
    serviceId: obj.serviceId,
    characteristicId: obj.characteristicId,
    value: obj.value,
    success: function(res) {
      if (obj.success) {
        obj.success(res);
      }
    },
    fail: function (res) {
      if (obj.fail) {
        obj.fail(res)
      }
    },
    complete: function (res) {
      if (obj.complete) {
        obj.complete(res)
      }
    }
  })
}

/*
* 启用低功耗蓝牙设备特征值变化时的 notify 功能。注意：必须设备的特征值支持notify才可以成功调用，具体参照 characteristic 的 properties 属性

另外，必须先启用notify才能监听到设备 characteristicValueChange 事件
*/

function notifyBLECharacteristicValueChange(obj){
  wx.notifyBLECharacteristicValueChange({
    deviceId: obj.deviceId,
    serviceId: obj.serviceId,
    characteristicId: obj.characteristicId,
    state: obj.state,
    success: function(res) {
      if (obj.success) {
        obj.success(res);
      }
    },
    fail: function (res) {
      if (obj.fail) {
        obj.fail(res)
      }
    },
    complete: function (res) {
      if (obj.complete) {
        obj.complete(res)
      }
    }
  })
}


/*
*监听低功耗蓝牙连接的错误事件，包括设备丢失，连接异常断开等等。
*/

function onBLEConnectionStateChange(obj){
  wx.onBLEConnectionStateChange(function(res){
    if(obj){
      obj(res)
    }
  })
}

/*
* 监听低功耗蓝牙设备的特征值变化。必须先启用notify接口才能接收到设备推送的notification。
*/

function onBLECharacteristicValueChange(){
  wx.onBLECharacteristicValueChange(function(res){
    handleCharacteristicValue(res)
  })
}

/*
* 操作特征值的改变（Read Notify)
*/
function handleCharacteristicValue(obj){
  var deviceId = obj.deviceId
  var serviceId = obj.serviceId
  var charUUIDString = obj.characteristicId
  var value = obj.value
  var label = "Characteristic UUID: " + charUUIDString + " Value Changed: "
  common.printLogWithBuffer(value,label)

  if(deviceId == connectedDeviceId){
    var preDefChar = preDefService.CharacteristicUUIDs
    var deviceId = connectedDeviceId
    if (charUUIDString.indexOf(preDefChar.RealTek_Write_CharUUID) != -1) {
     
    }
    if (charUUIDString.indexOf(preDefChar.RealTek_Notify_CharUUID) != -1) {
      handleReceivedData(value)
    }
    if (charUUIDString.indexOf(preDefChar.RealTek_Immediate_Remind_CharUUID) != -1) {
      
    }
    if (charUUIDString.indexOf(preDefChar.RealTek_AlertLevel_CharUUID) != -1) {
      
    }
    if (charUUIDString.indexOf(preDefChar.RealTek_DeviceName_CharUUID) != -1) {
      
    }
    if (charUUIDString.indexOf(preDefChar.RealTek_BatteryLevel_CharUUID) != -1) {
      
    }

    if (charUUIDString.indexOf(preDefChar.RealTek_OTAPatchVersion_CharUUID) != -1) {
      var resultValue = value
      var dev = new DataView(resultValue)
      var version = dev.getUint16(0, littleEndian)
      OTApatchVersion = version   
      var info = "read RealTek_OTAPatchVersion_CharUUID Success-" + version

      console.log("read RealTek_OTAPatchVersion_CharUUIDchcSuccess-",version)

    }
    if (charUUIDString.indexOf(preDefChar.RealTek_OTAAppVersion_CharUUID) != -1) {
      console.log("read RealTek_OTAAppVersion_CharUUID Success")
      var resultValue = value
      var dev = new DataView(resultValue)
      var version = dev.getUint16(0, littleEndian)
      OTAappVersion = version
      console.log("read RealTek_OTAAppVersion_CharUUID Success-", version)
    }

    if (charUUIDString.indexOf(preDefChar.RealTek_Functions_CharUUID) != -1) {
      functionsCharObj = characteristic
    }
  }
}

/*
* 操作接收到的命令数据 RealTek_Notify_CharUUID
*/

function handleReceivedData(value){
  var dataLength = value.byteLength
  var l1HeaderSize = cmdPreDef.DF_RealTek_L1_Header.DF_RealTek_L1_Header_Size
  var l2HeaderSize = cmdPreDef.DF_RealTek_L2_Header.DF_RealTek_L2_Header_Size
  if(dataLength < l1HeaderSize){
    var info = "Receive data length is small L1 Header Size"
    common.printDebugInfo(info, common.ZH_Log_Level.ZH_Log_Error)
    return
  }
  common.printLogWithBuffer(value,"handleReceivedData")
  
  var l1HeaderMagicBuf = new DataView(value,0,1) //value.slice(0, 1)

  var l1AckVersionBuf = new DataView(value, 1, 1)//value.slice(1,2)
  var l1PayloadBuf = new DataView(value, 2, 2) //value.slice(2,4)
  var l1CRCBuf = new DataView(value, 4, 2)//value.slice(4,6)
  var l1SeqIdBuf = new DataView(value, 6, 2) //value.slice(6)
  

  var l1HeaderMagic = l1HeaderMagicBuf.getUint8(0)
  var l1AckVersion = l1AckVersionBuf.getUint8(0)

  var l1Payload = l1PayloadBuf.getUint16(0,false)
  var l1CRC = l1CRCBuf.getUint16(0, false)
  var l1SeqId = l1SeqIdBuf.getUint16(0, false)
  var errFlag = (l1AckVersion >> 5) & 0x1
  var ackFlag = (l1AckVersion >> 4) & 0x1

  var l1PayloadLength = l1Payload

  

  var info = "SeqId:" + l1SeqId + " CRC16:" + l1CRC + " errFlag:" + errFlag + " ackFlag:" + ackFlag + " l1PayloadLength: " + l1PayloadLength 
  common.printDebugInfo(info, common.ZH_Log_Level.ZH_Log_Info)

  if (l1HeaderMagic != cmdPreDef.DF_RealTek_L1_Header.DF_RealTek_L1_Header_Magic){
    sendErrorAck(l1SeqId,null)
    info = "l1HeaderMagic is error" + l1HeaderMagic
    common.printDebugInfo(info, common.ZH_Log_Level.ZH_Log_Error)
    return
  }

  //CRC16 Check
  if(l1PayloadLength > 0){
    var l1PayloadData = value.slice(l1HeaderSize)
    var checkCRC16Bool =  checkCRC16WithData(l1PayloadData,l1CRC)
    if(!checkCRC16Bool){
      sendErrorAck(l1SeqId,null)
      info = "checkCRC16Bool is not equal" + l1CRC 
      common.printDebugInfo(info, common.ZH_Log_Level.ZH_Log_Error)
      return
    }
  }else{
    info = "l1PayloadLength is zero" + l1SeqId
    common.printDebugInfo(info, common.ZH_Log_Level.ZH_Log_Info)
  }

  if (errFlag == 0 && ackFlag == 1) { //Suc ACK
    if (l1PayloadLength == 0) {//命令相应的Ack表示已经收到并且无payload所以只需直接回调
        var blockkey = l1SeqId
        var callBack = characteristicValueWrtieBlocks[blockkey]
        if(callBack){
          var cmd = (l1SeqId >> 8) & 0xFF;
          var key = l1SeqId & 0xFF;
          var haveRes = haveResDataWithCmd(cmd,key)
          if(haveRes){
            info = "haveRes immediate callBack"  + blockkey
            common.printDebugInfo(info, common.ZH_Log_Level.ZH_Log_Info)
            callBack(connectedDevice,null,null)
          }else{
            info = "haveRes not immediate callBack" + blockkey
            common.printDebugInfo(info, common.ZH_Log_Level.ZH_Log_Info)
          }
        }

     }else{
       //TODO: 待扩展  //继续发送下一个packet
      var info = "Need send next packet"
      common.printDebugInfo(info, common.ZH_Log_Level.ZH_Log_Info)
     }
     return

  } else if (errFlag == 0 && ackFlag == 0) {// Packet
    //应答Packet 已经接收到。这里可能是接收完整个Packet应答也有可能是每接收一个packet应答
    sendSuccessAck(l1SeqId,null)
  } else if (errFlag == 0, ackFlag == 1) {//Err ACK (resend pre packet data) 这里主要是如果发送的数据包有错误重新发送
  //TODO: 待扩展
    var info = "Receive err Ack Need Resend pre packet"
    common.printDebugInfo(info, common.ZH_Log_Level.ZH_Log_Error)
    return
  }

  //这里假设每个包都含有L1Header+L2Header 所以组合时后面的包需要去掉Header
  if (!receiveData) {// First Receive Data
    receivePayloadLength = l1PayloadLength
    receiveData = value
    var resInfo = "First Receive Packet"
    common.printDebugInfo(info, common.ZH_Log_Level.ZH_Log_Info)
  }else{
    var info = "Append Value"
    common.printDebugInfo(info, common.ZH_Log_Level.ZH_Log_Warning)
    var headerSize = l1HeaderSize + l2HeaderSize
    if(dataLength > headerSize){
      var l2PayloadLength = dataLength - headerSize
      if(l2PayloadLength > 0){
        var l2ValueData = value.slice(headerSize)
        receiveData = appendBuffer(receiveData,l2ValueData)
      }

    }
  }

  if (receiveData.byteLength == (receivePayloadLength + l1HeaderSize)) {//已经接收完数据
    var info = "Receive all Packet"
    common.printDebugInfo(info, common.ZH_Log_Level.ZH_Log_Info)
    
    parseReceivedData(receiveData)

  }else{
    var info = "Receive Packet is not finished:" +  receiveData.byteLength + receivePayloadLength
    common.printDebugInfo(info, common.ZH_Log_Level.ZH_Log_Info)
  }

}


/*
* 解析接收到的数据
*/

function parseReceivedData(data){
  var l1HeaderSize = cmdPreDef.DF_RealTek_L1_Header.DF_RealTek_L1_Header_Size
  var l2HeaderSize = cmdPreDef.DF_RealTek_L2_Header.DF_RealTek_L2_Header_Size
  var l1PayloadLength = data.byteLength - l1HeaderSize
  if(l1PayloadLength > l2HeaderSize){
    var blockKey = getCommandIDAndKeyWithPacketData(data)
    var l1Payload = data.slice(l1HeaderSize)

    common.printLogWithBuffer(l1Payload,"paser l1Payload")
    

    var keyInfo = "Parse Block key is:" + blockKey
    common.printDebugInfo(keyInfo, common.ZH_Log_Level.ZH_Log_Verblose)
    var cmdBuffer = new DataView(data, l1HeaderSize, 1)//data.slice(l1HeaderSize,l1HeaderSize+1)
    var keyBuffer = new DataView(data, l1HeaderSize+2,1)
    var cmd = cmdBuffer.getUint8(0)
    var key = keyBuffer.getUint8(0)
     
    var CMD_IDs = cmdPreDef.ZH_RealTek_CMD_ID
    switch(cmd){
      case (CMD_IDs.RealTek_CMD_Firmware):{

      }
      break;
      case (CMD_IDs.RealTek_CMD_Setting):{
        parseSetCmdData(l1Payload, blockKey)



      }
      break;
      case (CMD_IDs.RealTek_CMD_Bind):{
         parseBindCmdData(l1Payload,blockKey)

      }
      break;

    }

  }
clearReceiveDataCaches()

}

/* - Parse Set Cmd Data - */

function getL2PayloadKeyWithL1PayLoad(l1Payload){
  var l2HeaderSize = cmdPreDef.DF_RealTek_L2_Header.DF_RealTek_L2_Header_Size
  var keyBuffer = new DataView(l1Payload,l2HeaderSize , 1)
  var key = keyBuffer.getUint8(0)
  return key
}


/*
* 解析绑定包
*/

function parseBindCmdData(l1Payload,blockkey){
  console.log("call parseBindCmdData")
  var key = getL2PayloadKeyWithL1PayLoad(l1Payload)
  var l2HeaderSize = cmdPreDef.DF_RealTek_L2_Header.DF_RealTek_L2_Header_Size
  var l2PayLoad = l1Payload.slice(2)
  var Bind_Keys = cmdPreDef.ZH_RealTek_Bind_Key
  switch(key){
    case Bind_Keys.RealTek_Key_Bind_Rep:{
      var statusCode = new DataView(l2PayLoad, 3, 1).getUint8(0)
      var info = "Bind Res status:" + statusCode
      common.printDebugInfo(info, common.ZH_Log_Level.ZH_Log_Info)
      var callBack = characteristicValueWrtieBlocks[blockkey]
      if (callBack) {
        callBack(connectedDevice, null, statusCode)
        removeCacheBlockWithKey(blockkey)
      }

    }
    break;

    case Bind_Keys.RealTek_Key_Login_Rep:{
      var statusCode = new DataView(l2PayLoad, 3, 1).getUint8(0)
      var info = "Bind Res status:" + statusCode
      common.printDebugInfo(info, common.ZH_Log_Level.ZH_Log_Info)
      var callBack = characteristicValueWrtieBlocks[blockkey]
      if (callBack) {
        callBack(connectedDevice, null, statusCode)
        removeCacheBlockWithKey(blockkey)
      }
    }
    break;
  }

}

/*
*  Parse Set Cmd Data
*/

function parseSetCmdData(l1Payload, blockkey){
  var key = getL2PayloadKeyWithL1PayLoad(l1Payload)
  var l2HeaderSize = cmdPreDef.DF_RealTek_L2_Header.DF_RealTek_L2_Header_Size
  var l2PayLoad = l1Payload.slice(2)
  var Setting_Keys = cmdPreDef.ZH_RealTek_Setting_Key
  switch(key){
    case (Setting_Keys.RealTek_Key_Get_ALarmList_Rep):{
      var alarms = getAlarmsWithValue(l2PayLoad)
      var callBack = characteristicValueWrtieBlocks[blockkey]
      if(callBack){
        callBack(connectedDevice,null,alarms)
        removeCacheBlockWithKey(blockkey)
      }
         
    }
    break;
    case (Setting_Keys.RealTek_Key_Get_Sit_Long_Rep):{
      var statusCode = new DataView(l2PayLoad, 3, 1).getUint8(0)
      var onEnable = true
      if(statusCode == 0){
        onEnable = false
      }
      var callBack = characteristicValueWrtieBlocks[blockkey]
      if (callBack) {
        callBack(connectedDevice, null, onEnable)
        removeCacheBlockWithKey(blockkey)
      }

    }
    break;

    case (Setting_Keys.RealTek_Key_Get_TurnLight_Rep):{
      var statusCode = new DataView(l2PayLoad, 3, 1).getUint8(0)
      var onEnable = true
      if (statusCode == 0) {
        onEnable = false
      }
      var callBack = characteristicValueWrtieBlocks[blockkey]
      if (callBack) {
        callBack(connectedDevice, null, onEnable)
        removeCacheBlockWithKey(blockkey)
      }

    }
    break;

    case (Setting_Keys.RealTek_Key_Get_ScreenOrientationRep):{
      var orientation = new DataView(l2PayLoad, 3, 1).getUint8(0)
      var callBack = characteristicValueWrtieBlocks[blockkey]
      if (callBack) {
        callBack(connectedDevice, null, orientation)
        removeCacheBlockWithKey(blockkey)
      }
    }
    break;

    case (Setting_Keys.RealTek_Key_Get_FunctionsRep):{
      getAllFunctionsWithValue(l2PayLoad)
      var callBack = characteristicValueWrtieBlocks[blockkey]
      if (callBack) {
        callBack(connectedDevice, null, orientation)
        removeCacheBlockWithKey(blockkey)
      }
    }
    break;
  }


}


/*
* 获取所有闹钟列表
*/
function getAlarmsWithValue(value){
  common.printLogWithBuffer(value,"alarms")
  var arlarmValueLength = cmdPreDef.DF_RealTek_Header_Predef.DF_RealTek_AlarmValue_Length
  var l2PayloadHeaderSize = cmdPreDef.DF_RealTek_L2_Header.DF_RealTek_L2_Payload_Header_Size

  var valueLengthPreBuffer = new DataView(value,1, 1)
  var valueLengthLateBuffer = new DataView(value,2,1)
  var valueLength = ((valueLengthPreBuffer.getUint8(0) & 0x1) << 8) + valueLengthLateBuffer.getUint8(0)
  
  var alarmsNum = valueLength/arlarmValueLength
  if(alarmsNum > 3){
    var info = "Warn Alarms count more than 3"
    common.printDebugInfo(info, common.ZH_Log_Level.ZH_Log_Warning)
    alarmsNum = 3
  }
  var alarms = new Array()
  var alarmValue = value.slice(l2PayloadHeaderSize)
  for(var index = 0; index < alarmsNum; index++){
    var year = (new DataView(alarmValue, index * arlarmValueLength, 1).getUint8(0) & 0xfc) >> 2
    var month = ((new DataView(alarmValue, index * arlarmValueLength, 1).getUint8(0) & 0x3) << 2) + ((new DataView(alarmValue, index * arlarmValueLength + 1, 1).getUint8(0) & 0xc0) >> 6)
    var day = (new DataView(alarmValue, index * arlarmValueLength+1, 1).getUint8(0) & 0x3f) >> 1
    var hour = ((new DataView(alarmValue, index * arlarmValueLength + 1, 1).getUint8(0) & 0x1) << 4) + ((new DataView(alarmValue, index * arlarmValueLength + 2, 1).getUint8(0) & 0xf0) >> 4)
    var minute = ((new DataView(alarmValue, index * arlarmValueLength + 2, 1).getUint8(0) & 0x0f) << 2) + ((new DataView(alarmValue, index * arlarmValueLength + 3, 1).getUint8(0) & 0xc0) >> 6)

    var index = (new DataView(alarmValue, index * arlarmValueLength + 3, 1).getUint8(0) & 0x38) >> 3
    var dayFlags = new DataView(alarmValue, index * arlarmValueLength + 4, 1).getUint8(0) & 0x7f
    year = year + preModel.DF_RealTek_Date_Cut_Year


    var alarm = preModel.initAlarm()
    alarm.year = year
    alarm.month = month
    alarm.day = day
    alarm.hour = hour
    alarm.minute = minute
    alarm.index = index
    alarm.dayFlags = dayFlags
    alarms[index] = alarm
    
    var info = "alarm year:" + year + " month:" + month + " day:" + day + " hour" + hour + " minute" + minute + " index:" + index + " dayFlags:" + dayFlags
    common.printDebugInfo(info, common.ZH_Log_Level.ZH_Log_Warning)

  }

  return alarms

}


/*
* 获取设备所有功能
*/

function getAllFunctionsWithValue(value){
  var l2PayloadHeaderSize = cmdPreDef.DF_RealTek_L2_Header.DF_RealTek_L2_Payload_Header_Size
  var valueLengthPreBuffer = new DataView(value, 1, 1)
  var valueLengthLateBuffer = new DataView(value, 2, 1)
  var valueLength = ((valueLengthPreBuffer.getUint8(0) & 0x1) << 8) + valueLengthLateBuffer.getUint8(0)
  if(valueLength < 4){
    var info = "Get All Functions length is less than 4"
    common.printDebugInfo(info, common.ZH_Log_Level.ZH_Log_Warning)
  }

  var hasFakeBloodPressure = new DataView(value, 3, 1).getUint8(0) & 0x1
  var hasRealBloodPressure = (new DataView(value, 3, 1).getUint8(0) >> 1) & 0x1
  var hasHRM = (new DataView(value, 3, 1).getUint8(0) >> 2) & 0x1
  var hasScreenSwitch = (new DataView(value, 3, 1).getUint8(0) >> 3) & 0x1
  var hasStep = (new DataView(value, 3, 1).getUint8(0) >> 4) & 0x1
  var hasSleep = (new DataView(value, 3, 1).getUint8(0) >> 5) & 0x1

  connectedDevice.hasBloodPressureFunc = hasFakeBloodPressure || hasRealBloodPressure
  connectedDevice.hasHRMFunc = hasHRM
  connectedDevice.hasStepFunc = hasStep
  connectedDevice.hasOrientationSwitchFunc = hasScreenSwitch
  connectedDevice.hasSleepFunc = hasSleep
  connectedDevice.hasGetFuncVlaue = true
  if(functionsHaveUpdated){
    functionsHaveUpdated(connectedDevice,null,null)
  }

}

/*
* 获取所有服务
*/
function getAllServices(){
  console.log("call getAllServices")
  getBLEDeviceServices({
    deviceId: connectedDeviceId,
    success: function (serRes) {
      var services = serRes.services
      allServices = services
      for(var i=0;i<services.length;i++){
        var service = services[i]
        getAllCharacteristics(service.uuid)
      }
    },
    fail: function (serRes) {
      var info = "getAllServices fail" + serRes.errMsg
      common.printDebugInfo(info, common.ZH_Log_Level.ZH_Log_Error)

    }
  })
}


/*
* 获取所有特征
*/

function getAllCharacteristics(serviceUUID){
  var deviceId = connectedDeviceId
   getBLEDeviceCharacteristics({
    deviceId: deviceId,
    serviceId: serviceUUID,
    success: function(res){
      var characteristics = res.characteristics
      for(var i=0;i<characteristics.length;i++){
        var characteristic = characteristics[i]
        handleCharacteristic(serviceUUID,characteristic)
      }

    },
    fail: function(res){
      var info = "getAllCharacteristics fail" + serRes.errMsg + "ServiceUUID:" + serviceUUID
      common.printDebugInfo(info, common.ZH_Log_Level.ZH_Log_Error)
    }
  })

}

/*
* 操作服务特征
*/
function handleCharacteristic(serviceUUID,characteristic){

  var charUUIDString = characteristic.uuid
  var charProperties = characteristic.properties
  var preDefChar = preDefService.CharacteristicUUIDs
  var deviceId = connectedDeviceId
  if (charUUIDString.indexOf(preDefChar.RealTek_Write_CharUUID) != -1){
    console.log("find RealTek_Write_CharUUID -", characteristic.uuid)
    writeCharObj = characteristic
  } 
  if (charUUIDString.indexOf(preDefChar.RealTek_Notify_CharUUID) != -1){
    notifyCharObj = characteristic
    handleNotifyCharacteristic(serviceUUID, characteristic)
  } 
  if (charUUIDString.indexOf(preDefChar.RealTek_Immediate_Remind_CharUUID) != -1 ){
    immediateCharObj = characteristic

  } 
  if (charUUIDString.indexOf(preDefChar.RealTek_AlertLevel_CharUUID) != -1 ){
    alertLevelCharObj = characteristic
  } 
  if (charUUIDString.indexOf(preDefChar.RealTek_DeviceName_CharUUID) != -1 ){
    deviceNameCharObj = characteristic
  } 
  if (charUUIDString.indexOf(preDefChar.RealTek_BatteryLevel_CharUUID) != -1){
    batterylevelCharObj = characteristic
    handleNotifyCharacteristic(serviceUUID, characteristic)
  } 

  if (charUUIDString.indexOf(preDefChar.RealTek_OTAPatchVersion_CharUUID) != -1){
    OTAPatchVersioCharObj = characteristic
    if (characteristic.properties.read) {
      readBLECharacteristicValue({
        deviceId: deviceId,
        serviceId: serviceUUID,
        characteristicId: characteristic.uuid,
        success: function (res) {
          console.log("Read OTAPatchVersion Success:", JSON.stringify(res))
        },
        fail: function (res) {
          var info = "Read OTAPatchVersion fail" + res.errMsg + "characteristicUUID:" + characteristic.uuid
          common.printDebugInfo(info, common.ZH_Log_Level.ZH_Log_Error)

        },
        complete: function (res) {

        },
      })

    }
  }
  if (charUUIDString.indexOf(preDefChar.RealTek_OTAAppVersion_CharUUID) != -1 ){
    OTAAppVersionCharObj = characteristic
    if (characteristic.properties.read){
      readBLECharacteristicValue({
        deviceId: deviceId,
        serviceId: serviceUUID,
        characteristicId: characteristic.uuid,
        success: function (res) {
          console.log("Read OTAAppVersion Success:", JSON.stringify(res))
        },
        fail: function (res) {
          var info = "Read OTAAppVersion fail" + res.errMsg + "characteristicUUID:" + characteristic.uuid
          common.printDebugInfo(info, common.ZH_Log_Level.ZH_Log_Error)

         },
        complete: function (res) { 

        },
      })

    }
    
  }

  if (charUUIDString.indexOf(preDefChar.RealTek_Functions_CharUUID) != -1 ){
    functionsCharObj = characteristic
  }
   
}


/* - Notify特征 - */

function handleNotifyCharacteristic(serviceId, characteristic){
  
  if (characteristic.properties.notify){
    var deviceId = connectedDeviceId
    notifyBLECharacteristicValueChange({
      deviceId:deviceId,
      serviceId: serviceId,
      characteristicId: characteristic.uuid,
      state: true,
      success: function(res){
        var info = "NotifyCharacteristics success" + characteristic.uuid
        common.printDebugInfo(info, common.ZH_Log_Level.ZH_Log_Info)
      },
      fail: function(res){
        var info = "NotifyCharacteristics fail" + res.errMsg + "characteristicUUID:" + characteristic.uuid
        common.printDebugInfo(info, common.ZH_Log_Level.ZH_Log_Error)

      }


    })

  }else{
    console.log("call handleNotifyCharacteristic is have not notify", characteristic.uuid)
  }
}

/* - 组合协议包 - */


/*
* 获取发送的数据包
*/
function getL0PacketWithCommandId(commandId, key, keyValue, keyValueLength, errFlagBool, ackFlagBool, sequenceId){
  var l2Header = getL2HeaderWithCommandId(commandId)
  var l2Payload = getL2Payload(key,keyValueLength,keyValue)
  var l2HeaderSize = cmdPreDef.DF_RealTek_L2_Header.DF_RealTek_L2_Header_Size;
  var l2PayloadHeaderSize = cmdPreDef.DF_RealTek_L2_Header.DF_RealTek_L2_Payload_Header_Size
  var l1PayloadLength = l2HeaderSize + l2PayloadHeaderSize + keyValueLength
  var l1Payload = new Uint8Array(l1PayloadLength)
  if(l1Payload.byteLength != l1PayloadLength){
    common.printDebugInfo("L1 payload init fail", common.ZH_Log_Level.ZH_Log_Error)
  }else{
    l1Payload.set(new Uint8Array(l2Header),0)
    l1Payload.set(new Uint8Array(l2Payload), l2HeaderSize)
    var l1Header = getL1HeaderWithAckFlagBool(ackFlagBool,errFlagBool,l1Payload,l1PayloadLength,sequenceId)
    var l1HeaderLength = cmdPreDef.DF_RealTek_L1_Header.DF_RealTek_L1_Header_Size
    var l1PacketLength = l1HeaderLength + l1PayloadLength
    var l1Packet = new Uint8Array(l1PacketLength)
    if(l1Packet.byteLength != l1PacketLength){
      common.printDebugInfo("L1 packet init fail", common.ZH_Log_Level.ZH_Log_Error)
    }else{
      l1Packet.set(new Uint8Array(l1Header),0)
      l1Packet.set(l1Payload, l1HeaderLength)
      
    }
    common.printLogWithBuffer(l1Packet.buffer, "Send Packet")
    return l1Packet.buffer

  }

}

/*
* 获取L1 Header
*/
function getL1HeaderWithAckFlagBool(ackBool, errorBool, L1Payload, L1PayloadLength, sequenceId){
  var l1HeaderSize = cmdPreDef.DF_RealTek_L1_Header.DF_RealTek_L1_Header_Size
  var buffer = new ArrayBuffer(l1HeaderSize)
  if(buffer.byteLength != l1HeaderSize){
    common.printDebugInfo("L1 Header init fail", common.ZH_Log_Level.ZH_Log_Error)
  }else{
    var magic = cmdPreDef.DF_RealTek_L1_Header.DF_RealTek_L1_Header_Magic
    var ackVersion = getVersionACKErrorValueWithAck(ackBool,errorBool)
    var l1HeaderOrder = cmdPreDef.L1_Header_ByteOrder
    var view8 = new Uint8Array(buffer,0,2)
    var payloadView = new DataView(buffer,2,2)
    var crcView = new DataView(buffer,4,2)
    var seqView = new DataView(buffer,6,2)


    //l1Header[l1HeaderOrder.DF_RealTek_L1_Header_Magic_Pos] = magic
    //l1Header[l1HeaderOrder.DF_RealTek_L1_Header_Protocol_Version_Pos] = ackVersion
    view8[0] = magic
    view8[1] = ackVersion
    payloadView.setInt16(0,L1PayloadLength,false)
    
    // l1Header[1] = ackVersion
    // l1Header[l1HeaderOrder.DF_RealTek_L1_Header_PayloadLength_HighByte_Pos] = (L1PayloadLength >> 8) & 0xFF
    // l1Header[l1HeaderOrder.DF_RealTek_L1_Header_PayloadLength_LowByte_Pos] = L1PayloadLength & 0xFF

    if((L1PayloadLength > 0) && L1Payload){
      var L1PayloadArray = new Uint8Array(L1Payload)
      var crc16 = common.getCRC16WithValue(L1PayloadArray)
      crcView.setInt16(0,crc16,false)

    
      //l1Header[l1HeaderOrder.DF_RealTek_L1_Header_CRC16_HighByte_Pos] = (crc16 >> 8) & 0xFF
      //l1Header[l1HeaderOrder.DF_RealTek_L1_Header_CRC16_LowByte_Pos] = crc16 & 0xFF

    }else{
      // l1Header[l1HeaderOrder.DF_RealTek_L1_Header_CRC16_HighByte_Pos] = 0
      // l1Header[l1HeaderOrder.DF_RealTek_L1_Header_CRC16_LowByte_Pos] = 0
      crcView.setInt16(0,0,false)
    }


    // l1Header[l1HeaderOrder.DF_RealTek_L1_Header_SeqID_HighByte_Pos] = (sequenceId >> 8) & 0xFF
    // l1Header[l1HeaderOrder.DF_RealTek_L1_Header_SeqID_LowByte_Pos] = sequenceId & 0xFF
    seqView.setInt16(0,sequenceId,false)

  }
  return buffer
}

/*
* 获取ACK Error Version 组合字节
*/
function getVersionACKErrorValueWithAck(ackBool, errorBool){
  var ackEr = 0
  if (!ackBool && !errorBool) {
    ackEr = 0;
  } else if (ackBool && !errorBool) {
    ackEr = 0x10;
  } else {
    ackEr = 0x30;
  }
  var version = cmdPreDef.DF_RealTek_L1_Header.DF_RealTek_L1_Header_Version
  var result = ackEr | version
  return result
}



/*
* 获取L2 Header
*/
function getL2HeaderWithCommandId(commandId)
{
  var length = cmdPreDef.DF_RealTek_L2_Header.DF_RealTek_L2_Header_Size
  var l2Header = new Uint8Array(length)
  if(l2Header.byteLength != length){
    common.printDebugInfo("L2 Header init fail", common.ZH_Log_Level.ZH_Log_Error)

  }else{
    l2Header[0] = commandId
    l2Header[1] = cmdPreDef.DF_RealTek_L2_Header.DF_RealTek_L2_Header_Version
  }
  return l2Header.buffer
}


/*
*获取L2 payload
*/
function getL2Payload(key, keyValueLength, keyValue)
{
  var l2Payload_Header_Size = cmdPreDef.DF_RealTek_L2_Header.DF_RealTek_L2_Payload_Header_Size
  var loadSize = l2Payload_Header_Size
  var l2PayLoadHeader = new Uint8Array(loadSize)
  var l2PayLoad = null
  if (l2PayLoadHeader.byteLength != loadSize) {
    common.printDebugInfo("l2 PayLoadHeader init fail", common.ZH_Log_Level.ZH_Log_Error)
  } else {
    l2PayLoadHeader[0] = key
    l2PayLoadHeader[1] = keyValueLength >> 8 & 0x1;
    l2PayLoadHeader[2] = keyValueLength & 0xFF;
    if((keyValueLength >0) && keyValue){
     l2PayLoad =  appendBuffer(l2PayLoadHeader.buffer,keyValue)
    }
  }
  //common.printLogWithBuffer(l2PayLoad, "l2Payload buffer ")
  return l2PayLoad

}

/*
* 发送错误ack
*/
function sendErrorAck(seq,callBack){
  var errorPacket = getL1HeaderWithAckFlagBool(true,true,null,0,seq)
  sendDataToBandDevice({
    data: errorPacket,
    ackBool: true,
    callBack: function(deviceId,error,result){
       if(callBack){
         callBack(deviceId,error,result)
       }
    }
  })
}

function sendSuccessAck(seq,callBack){
  var info = "sendSuccessAck seq: " + seq
  common.printDebugInfo(info, common.ZH_Log_Level.ZH_Log_Info)

  var sucPacket = getL1HeaderWithAckFlagBool(true,false,null,0,seq)
  sendDataToBandDevice({
    data: sucPacket,
    ackBool: true,
    callBack: function (deviceId, error, result) {
      if (callBack) {
        callBack(deviceId, error, result)
      }
    }
  })
}

/* - 公共函数 - */

// ArrayBuffer转为字符串，参数为ArrayBuffer对象

function getStringWithBuffer(buf) {
   return String.fromCharCode.apply(null, new Uint16Array(buf));
}

// 字符串转为ArrayBuffer对象，参数为字符串
function getBufferWithString(str) {
    var strLength = GetBytes(str)
    var buf = new ArrayBuffer(strLength) 
    var bufView = new Uint8Array(buf)
    var strLen = str.length
    for (var i=0; i<strLen; i++) {
         bufView[i] = str.charCodeAt(i);
    }
    return buf

  // var uintArray = [];
  // var strLen = str.length
  // for (var i = 0; i < strLen; i++) {
  //   uintArray.push(str.charCodeAt(i))
  // }
  // var bufView = Uint8Array(uintArray)
  // return bufView.buffer

    
}


//求一个字符串的字节长度
function GetBytes(str) {
  var len = str.length;
  var bytes = len;
  for (var i = 0; i < len; i++) {
    //console.log(str[i],str.charCodeAt(i));
    if (str.charCodeAt(i) > 255) bytes++;
  }
  return bytes;
}
/*
* 无连接发送命令时回调
*/
function hasConnectDevice(callBack) {
  if (connectedDeviceId) {
    return true
  } else {
    if (callBack) {
      var error = getDisconnectedError()
      callBack(connectedDevice, error, null)
    }
  }
}


/*
* 获取断开连接错误回调
*/
function getDisconnectedError() {
  var error = new Object()
  error.errMsg = "The device is disconnected"
  error.code = preModel.ZH_RealTek_Error_Code.ZHDisConnectedErrorCode
  return error
}

/*
* 获取微信自定义错误
*/
function getWechatCustomError(res){
  var error = new Object()
  error.errMsg = res.errMsg
  error.errCode = res.errCode
}

/*
* 获取自定义SeqID 
*/
function getSeqIDWithCommand(cmd,key){
  var result = (cmd << 8) + key;
  return result;
}


function checkCRC16WithData(data, crc){
  var l1PayloadLength = data.byteLength
  var uint8Array = new Uint8Array(data)
  var crc16 = common.getCRC16WithValue(uint8Array)
  if(crc == crc16){

    return true
  }else{
    return false
  }

}

/* - 命令函数 - */




/*
* Bind 
*/

function bindDeviceWithIdentifier(identifier,callBack){
  var connected = hasConnectDevice(callBack)
  if(!connected){
    return
  }
  var dataBuffer = getBufferWithString(identifier)
  var maxLength = cmdPreDef.DF_RealTek_Header_Predef.DF_RealTek_Max_BoundIdntifier_Length
  if (dataBuffer.byteLength > maxLength){
    dataBuffer = dataBuffer.slice(0,maxLength)
  }

  var bindByte = new Uint8Array(maxLength)
  bindByte.set(dataBuffer,0)

  var keyValue = bindByte;
  var cmd = cmdPreDef.ZH_RealTek_CMD_ID.RealTek_CMD_Bind
  var key = cmdPreDef.ZH_RealTek_Bind_Key.RealTek_Key_Bind_Req
  var seqId = getSeqIDWithCommand(cmd,key)
  var packet = getL0PacketWithCommandId(cmd, key, keyValue, maxLength,false,false,seqId)
  sendDataToBandDevice({
    data: packet,
    ackBool: false,
    callBack: function(device, error, result){
      if(!error && result){
        if (result == preModel.ZH_RealTek_Bind_Status.RealTek_Bind_Success){
          if (connectedDevice) {
            connectedDevice.bound = true;
          }
          getDeviceFunstions(null)

        }
        

      }
      if(callBack){
        callBack(device,error,result)
      }
    }
  })

}


/*
* UnBind
*/

function unBindDeviceonFinished(callBack){
  var connected = hasConnectDevice(callBack)
  if (!connected) {
    return
  }
  var cmd = cmdPreDef.ZH_RealTek_CMD_ID.RealTek_CMD_Bind
  var key = cmdPreDef.ZH_RealTek_Bind_Key.RealTek_Key_UnBind
  var seqId = getSeqIDWithCommand(cmd, key)
  var packet = getL0PacketWithCommandId(cmd, key, null, 0, false, false, seqId)
  sendDataToBandDevice({
    data: packet,
    ackBool: false,
    callBack: function (device, error, result) {
      if (!error && result) {
        if (connectedDevice) {
          connectedDevice.bound = false;
        }

      }
      if (callBack) {
        callBack(device, error, result)
      }
    }
  })
}


/*
* Login
*/

function loginDeviceWithIdentifier(identifier,callBack){
  var connected = hasConnectDevice(callBack)
  if (!connected) {
    return
  }
  console.log("call loginDeviceWithIdentifier:",identifier)
  var dataBuffer = getBufferWithString(identifier)
  var maxLength = cmdPreDef.DF_RealTek_Header_Predef.DF_RealTek_Max_BoundIdntifier_Length
  if (dataBuffer.byteLength > maxLength) {
    dataBuffer = dataBuffer.slice(0, maxLength)
  }

  var keyValue = dataBuffer;
  common.printLogWithBuffer(dataBuffer,"login value")
  var cmd = cmdPreDef.ZH_RealTek_CMD_ID.RealTek_CMD_Bind
  var key = cmdPreDef.ZH_RealTek_Bind_Key.RealTek_Key_Login_Req
  var seqId = getSeqIDWithCommand(cmd, key)
  console.log("login seq: ",seqId)
  var packet = getL0PacketWithCommandId(cmd, key, keyValue, maxLength, false, false, seqId)

  sendDataToBandDevice({
    data: packet,
    ackBool: false,
    callBack: function (device, error, result) {
      if (!error && result) {
        if (result == preModel.ZH_RealTek_Login_Status.RealTek_Login_Success){
          if (connectedDevice) {
            connectedDevice.bound = true;
          }
          getDeviceFunstions(null)

        }
      }
      if (callBack) {
        callBack(device, error, result)
      }
    }
  })

}

/*
* Get Functions
*/
function getDeviceFunstions(callBack){
  var cmd = cmdPreDef.ZH_RealTek_CMD_ID.RealTek_CMD_Setting
  var key = cmdPreDef.ZH_RealTek_Setting_Key.RealTek_Key_Get_FunctionsReq
  var seqId = getSeqIDWithCommand(cmd, key)
  var keyValueLength = 0;
  var packet = getL0PacketWithCommandId(cmd, key, null, keyValueLength, false, false, seqId)
  sendDataToBandDevice({
    data: packet,
    ackBool: false,
    callBack: null
  })
}



//function getL0Packet(commandId, key, keyValue)

function sendDataToBandDevice(obj){
  console.log("call sendDataToBandDevice")
  if(writeCharObj){
    var data = obj.data
    var ackBool = obj.ackBool
    var callBack = obj.callBack

    var deviceUUID = connectedDeviceId
    var serviceUUID = preDefService.RealTek_ServiceUUIDs.RealTek_BroadServiceUUID
    var writeCharUUID = writeCharObj.uuid
    if(!ackBool && callBack){
      
      var key = getCommandIDAndKeyWithPacketData(data) //获取command and key 组合数字作为回调函数的key
      var keyInfo = "Save Block key is: " + key
      common.printDebugInfo(keyInfo, common.ZH_Log_Level.ZH_Log_Info)
      characteristicValueWrtieBlocks[key] = callBack
    }else if (ackBool){
      common.printLogWithBuffer(data, "Send ack")
    }else {
      common.printLogWithBuffer(data, "Send Packet")
    }
    
    writeBLECharacteristicValue({
      deviceId: connectedDeviceId,
      serviceId: serviceUUID,
      characteristicId: writeCharUUID,
      value: data,
      success: function(res) {
        if(callBack){
          if(ackBool){
            callBack(connectedDevice,null,null)
          }
        }
      },
      fail: function(res) {
        if(callBack){
          var error = getWechatCustomError(res)
          if(ackBool){
            var info = "Write Ack Packet error: " + res.errMsg
            common.printDebugInfo(info, common.ZH_Log_Level.ZH_Log_Error)
            callBack(connectedDevice,error,null)

          }else{
            var info = "Write Command Packet error: " + res.errMsg
            common.printDebugInfo(info, common.ZH_Log_Level.ZH_Log_Error)
            callBack(connectedDevice,error,null)
          }
        }
      },
      complete: function(res) {},
    })

  }
}



/* 
* 根据接收到的数据获取发送命令时的SeqID
*/
function getCommandIDAndKeyWithPacketData(data){
  var uint8View = new Uint8Array(data)
  if (uint8View.length > 10){
    var cmd = uint8View[8]
    var key = uint8View[10]
    var preInfo = "replace before cmd:" + cmd + "---key:" + key
    common.printDebugInfo(preInfo, common.ZH_Log_Level.ZH_Log_Info)

    key = replaceReskey(key,cmd)
    var lastInfo = "replace end cmd:" + cmd + "---key:" + key
    common.printDebugInfo(lastInfo, common.ZH_Log_Level.ZH_Log_Info)

    var result = (cmd << 8) + key

    return result

  }
}

/*
* 根据cmd 和 key 看是否需要替换key
*/
function replaceReskey(key,cmd){
  var CMD_IDs = cmdPreDef.ZH_RealTek_CMD_ID
  if (cmd == CMD_IDs.RealTek_CMD_Setting){
    var Setting_Keys = cmdPreDef.ZH_RealTek_Setting_Key
    switch (key){
      case Setting_Keys.RealTek_Key_Get_TurnLight_Rep:
        return Setting_Keys.RealTek_Key_Get_TurnLight_Req
      case Setting_Keys.RealTek_Key_Get_ALarmList_Rep:
        return Setting_Keys.RealTek_Key_Get_ALarmList_Rep
      case Setting_Keys.RealTek_Key_Get_Sit_Long_Rep:
        return Setting_Keys.RealTek_Key_Get_Sit_Long_Req
      case Setting_Keys.RealTek_Key_Get_ScreenOrientationRep:
        return Setting_Keys.RealTek_Key_Get_ScreenOrientationReq
      case Setting_Keys.RealTek_Key_Get_FunctionsRep:
        return Setting_Keys.RealTek_Key_Get_FunctionsReq

    }
  } else if (cmd == CMD_IDs.RealTek_CMD_Bind){
    var Bind_Keys = cmdPreDef.ZH_RealTek_Bind_Key
    switch(key){
      case Bind_Keys.RealTek_Key_Bind_Rep:
        return Bind_Keys.RealTek_Key_Bind_Req
      case Bind_Keys.RealTek_Key_Login_Rep:
        return Bind_Keys.RealTek_Key_Login_Req
    }
  } else if (cmd == CMD_IDs.RealTek_CMD_SportData){
    var SportData_Keys = cmdPreDef.ZH_RealTek_Sport_Key
    switch(key){
      case SportData_Keys.RealTek_Key_His_SportData_Syc_End:
        return SportData_Keys.RealTek_Key_Sport_Req
      case SportData_Keys.RealTek_Key_HR_GetContinuousSet_Rep:
        return SportData_Keys.RealTek_Key_HR_GetContinuousSet
    }
  } else if (cmd == CMD_IDs.RealTek_CMD_Control){

  }

  return key
}

/*
* 当命令发送成功后手环端发送ACK后，根据此函数判断是否立即回调相应
*/
function haveResDataWithCmd(cmd,key){
  var CMD_IDs = cmdPreDef.ZH_RealTek_CMD_ID
  if (cmd == CMD_IDs.RealTek_CMD_Setting){
    var Setting_Keys = cmdPreDef.ZH_RealTek_Setting_Key
    switch(key){
      case Setting_Keys.RealTek_Key_Set_Time:
        return true
      case Setting_Keys.RealTek_Key_Set_Alarm:
        return true
      case Setting_Keys.RealTek_Key_Set_StepTarget:
        return true
      case Setting_Keys.RealTek_Key_Set_UserProfile:
        return true
      case Setting_Keys.RealTek_Key_Set_Sit_Long_OnOff:
        return true
      case Setting_Keys.RealTek_Key_Set_PhoneOS:
        return true
      case Setting_Keys.RealTek_Key_Set_TurnLight_OnOff:
       return true
      case Setting_Keys.RealTek_Key_Set_IncomingTel_OnOff:
       return true
      case Setting_Keys.RealTek_Key_Set_ScreenOrientation:
       return true
      

    }
  } else if (cmd == CMD_IDs.RealTek_CMD_FactoryTest){
    var Factory_Keys = cmdPreDef.ZH_RealTek_FacTest_Key
    switch(key){
      case Factory_Keys.ZH_RealTek_FacTest_Key:
        return true
    }
  } else if (cmd == CMD_IDs.RealTek_CMD_SportData){
    var SportData_Keys = cmdPreDef.ZH_RealTek_Sport_Key
    switch(key){
      case SportData_Keys.RealTek_Key_Set_SportData_Syc_OnOff:
        return true
      case SportData_Keys.RealTek_Key_HR_OneTime:
        return true
      case SportData_Keys.RealTek_Key_HR_Continuous:
        return true
      case SportData_Keys.RealTek_Key_Today_SportStatus_Syc:
        return true
      case SportData_Keys.RealTek_Key_Last_SportStatus_Syn:
        return true
      case SportData_Keys.RealTek_Key_BP_Req:
        return true
    }
  } else if (cmd == CMD_IDs.RealTek_CMD_Control){
    var Control_Keys = cmdPreDef.ZH_RealTek_Control_Key
    switch(key){
      case Control_Keys.RealTek_Key_Control_Camera_Status_Req:
        return true
    }
  } else if (cmd == CMD_IDs.RealTek_CMD_Bind){
    var Bind_Keys = cmdPreDef.ZH_RealTek_Bind_Key
    switch(key){
      case Bind_Keys.RealTek_Key_UnBind:
       return true
    }
  } else if (cmd == CMD_IDs.RealTek_CMD_Remind){
    var Remind_Keys = cmdPreDef.ZH_RealTek_Remind_Key
    switch(key){
      case Remind_Keys.RealTek_Key_Universal_Message:
        return true
    }
  }

}

// 对外可见模块
module.exports = {
  initialBTManager: initialBTManager,
  openBluetoothAdapter : openBluetoothAdapter,
  closeBluetoothAdapter: closeBluetoothAdapter,
  getBluetoothAdapterState: getBluetoothAdapterState,
  onBluetoothAdapterStateChange: onBluetoothAdapterStateChange,
  startBluetoothDevicesDiscovery: startBluetoothDevicesDiscovery,
  stopBluetoothDevicesDiscovery: stopBluetoothDevicesDiscovery,
  getBluetoothDevices: getBluetoothDevices,
  getConnectedBluetoothDevices: getConnectedBluetoothDevices,
  createBLEConnection: createBLEConnection,
  closeBLEConnection: closeBLEConnection,
  getBLEDeviceServices: getBLEDeviceServices,
  getBLEDeviceCharacteristics: getBLEDeviceCharacteristics,
  readBLECharacteristicValue: readBLECharacteristicValue,
  writeBLECharacteristicValue: writeBLECharacteristicValue,
  notifyBLECharacteristicValueChange: notifyBLECharacteristicValueChange,
  onBLEConnectionStateChange: onBLEConnectionStateChange,
  onBLECharacteristicValueChange: onBLECharacteristicValueChange,
  getL0PacketWithCommandId: getL0PacketWithCommandId,
  getL1HeaderWithAckFlagBool: getL1HeaderWithAckFlagBool,
  getVersionACKErrorValueWithAck: getVersionACKErrorValueWithAck,
  getL2HeaderWithCommandId: getL2HeaderWithCommandId,
  getL2Payload: getL2Payload,
  bindDeviceWithIdentifier: bindDeviceWithIdentifier,
  unBindDeviceonFinished: unBindDeviceonFinished,
  loginDeviceWithIdentifier: loginDeviceWithIdentifier

  
}