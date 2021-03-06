
// preDef
let RealTek_ServiceUUIDs = {
  RealTek_BroadServiceUUID: '000001FF-3C17-D293-8E48-14FE2E4DA212', //广播ServiceUUID 写服务
  RealTek_Immediate_Remind_ServiceUUID: '1802', //立即提醒即查找手环ServiceUUID
  RealTek_Link_Loss_ServiceUUID: '1803', //防丢Service UUID
  RealTek_Battery_ServiceUUID: '180F', //电量Service UUID
  RealTek_OTAInfo_ServiceUUID: '0000D0FF-3C17-D293-8E48-14FE2E4DA212', //获取OTA信息的Service UUID
  RealTek_DFU_ServiceUUID: '00006287-3C17-D293-8E48-14FE2E4DA212' //用于升级固件时的广播和交互Service UUID
}


let CharacteristicUUIDs = {
  RealTek_Write_CharUUID: 'FF02', //写命令特征UUID （设置及登录绑定等命令通过写数据）
  RealTek_Notify_CharUUID: 'FF03', //Notify 特征UUID (接收数据通过Notify）
  RealTek_Immediate_Remind_CharUUID: '2A06', //立即响应特征UUID
  RealTek_AlertLevel_CharUUID: '2A06',  //防丢特征UUID
  RealTek_DeviceName_CharUUID: 'FF04', //手环名称特征UUID
  RealTek_BatteryLevel_CharUUID: '2A19', //手环电池特征UUID
  RealTek_EnterOTAMode_CharUUID: 'FFD1', // 进入OTA模式特征UUID
  RealTek_OTABDAddress_CharUUID: 'FFD2', // 获取固件BD address 特征UUID
  RealTek_OTAPatchVersion_CharUUID: 'FFD3', //获取固件Patch version 特征UUID
  RealTek_OTAAppVersion_CharUUID: 'FFD4', // 获取固件App version 特征UUID
  RealTek_DFUTransferData_CharUUID: '00006387-3C17-D293-8E48-14FE2E4DA212', //DFU时传输数据 特征UUID
  RealTek_DFUControlCmd_CharUUID: '00006487-3C17-D293-8E48-14FE2E4DA212', //DFU时与进行估计升级交互命令 特征UUID
  RealTek_Functions_CharUUID: 'FFD6' //获取设备功能列表 特征UUID
}



module.exports = {
  RealTek_ServiceUUIDs: RealTek_ServiceUUIDs,
  CharacteristicUUIDs: CharacteristicUUIDs
}