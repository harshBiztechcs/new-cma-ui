const { ipcRenderer } = require('electron');
const {
  CONNECTION,
  SETTINGS,
  CALIBRATION,
  MEASUREMENT,
  CONNECTION_STATUS,
  CURRENT_ACTION,
  CONNECT_SOCKET,
  DISCONNECT_SOCKET,
  DEVICE_CONNECTION,
  VERIFY_DEVICE_CONNECTION,
  SHOW_DIALOG,
  DISCONNECT_DEVICE,
  SOCKET_CONNECTION,
  SOCKET_DISCONNECT_CLEANLY,
  UPDATE_DEVICE_RECONNECTION,
  CLIENT_SOCKET_ALREADY_EXIST,
  DEVICE_DISCONNECTION,
  DISCONNECT_DEVICE_FROM_SERVER,
  COLOR_GATE_API_REQ,
  COLOR_GATE_API_RES,
  COLOR_GATE_SERVER_CONNECTION_REQ,
  COLOR_GATE_SERVER_CONNECTION_RES,
  COLOR_GATE_CONNECTION_CHECK,
  COLOR_GATE_UPDATE_LICENSE,
  ALWAN_API_REQ,
  ALWAN_API_RES,
  ALWAN_SERVER_CONNECTION_RES,
  ALWAN_CONNECTION_CHECK,
  ALWAN_SERVER_CONNECTION_REQ,
  ALWAN_UPDATE_LICENSE,
  CHART_POSITION,
  GRAB_INITIAL_POSITION,
  WEIGHT_MEASUREMENT,
  MAKE_RESET_DEVICE,
  GET_TARE_VALUE,
  SET_TARE_VALUE,
  ZEBRA_PRINTER_HANDLER,
  BAR_CODE_READER_HANDLER,
  SWITCH_TO_YS3060_CONNECTION_MODE,
} = require('./constants');

const ipcLog = (msg) => ipcRenderer.send('log', msg);
const ipcConnectionStatus = (msg) => ipcRenderer.send(CONNECTION_STATUS, msg);
const ipcCurrentAction = (msg) => ipcRenderer.send(CURRENT_ACTION, msg);
const ipcDeviceConnection = (msg) => ipcRenderer.send(DEVICE_CONNECTION, msg);
const ipcDeviceDisconnection = (msg) =>
  ipcRenderer.send(DEVICE_DISCONNECTION, msg);
const ipcSettings = (settings) => ipcRenderer.send(SETTINGS, settings);
const ipcCalibration = (calibration) =>
  ipcRenderer.send(CALIBRATION, calibration);
const ipcMeasurement = (measurement) =>
  ipcRenderer.send(MEASUREMENT, measurement);
const ipcWeightMeasurement = (weight) =>
  ipcRenderer.send(WEIGHT_MEASUREMENT, weight);
const ipcMakeResetDevice = (resetData) =>
  ipcRenderer.send(MAKE_RESET_DEVICE, resetData);
const ipcGetTareValue = (tareData) =>
  ipcRenderer.send(GET_TARE_VALUE, tareData);
const ipcSetTareValue = (tareData) =>
  ipcRenderer.send(SET_TARE_VALUE, tareData);
const ipcShowDialog = (title, message) =>
  ipcRenderer.send(SHOW_DIALOG, { title, message });
const ipcSocketConnection = (isConnected) =>
  ipcRenderer.send(SOCKET_CONNECTION, isConnected);
const ipcSocketDisconnectCleanly = (isConnected) =>
  ipcRenderer.send(SOCKET_DISCONNECT_CLEANLY, isConnected);
const ipcClientSocketAlreadyExist = (args) =>
  ipcRenderer.send(CLIENT_SOCKET_ALREADY_EXIST, args);

// zebra printer
const ipcSendToZebraHandler = (zebraPrinterData) =>
  ipcRenderer.send(ZEBRA_PRINTER_HANDLER, zebraPrinterData);

// bar code
const ipcSendToBarcodeReader = (barCodeReaderData) =>
  ipcRenderer.send(BAR_CODE_READER_HANDLER, barCodeReaderData);

// colorgate
const ipcSendColorGateAPIReq = (args) =>
  ipcRenderer.send(COLOR_GATE_API_REQ, args);
const ipcColorGateServerConnectionRes = (args) =>
  ipcRenderer.send(COLOR_GATE_SERVER_CONNECTION_RES, args);
const ipcColorGateConnectionCheck = (args) =>
  ipcRenderer.send(COLOR_GATE_CONNECTION_CHECK, args);

// alwan
const ipcSendAlwanAPIReq = (args) => ipcRenderer.send(ALWAN_API_REQ, args);
const ipcAlwanServerConnectionRes = (args) =>
  ipcRenderer.send(ALWAN_SERVER_CONNECTION_RES, args);
const ipcAlwanConnectionCheck = (args) =>
  ipcRenderer.send(ALWAN_CONNECTION_CHECK, args);

// chart scanning
const ipcGrabInitialPosition = (args) =>
  ipcRenderer.send(GRAB_INITIAL_POSITION, args);
const ipcChartPosition = (args) => ipcRenderer.send(CHART_POSITION, args);

const onConnectionStatus = (fn) => ipcRenderer.on(CONNECTION_STATUS, fn);
const onCurrentAction = (fn) => ipcRenderer.on(CURRENT_ACTION, fn);
const onDeviceConnection = (fn) => ipcRenderer.on(DEVICE_CONNECTION, fn);
const onSettings = (fn) => ipcRenderer.on(SETTINGS, fn);
const onCalibration = (fn) => ipcRenderer.on(CALIBRATION, fn);
const onMeasurement = (fn) => ipcRenderer.on(MEASUREMENT, fn);
const onWeightMeasurement = (fn) => ipcRenderer.on(WEIGHT_MEASUREMENT, fn);
const onMakeResetDevice = (fn) => ipcRenderer.on(MAKE_RESET_DEVICE, fn);
const onGetTareValue = (fn) => ipcRenderer.on(GET_TARE_VALUE, fn);
const onSetTareValue = (fn) => ipcRenderer.on(SET_TARE_VALUE, fn);
const onConnectSocket = (fn) => ipcRenderer.on(CONNECT_SOCKET, fn);
const onDisconnectSocket = (fn) => ipcRenderer.on(DISCONNECT_SOCKET, fn);
const onVerifyDeviceConnection = (fn) =>
  ipcRenderer.on(VERIFY_DEVICE_CONNECTION, fn);
const onDeviceReconnection = (fn) =>
  ipcRenderer.on(UPDATE_DEVICE_RECONNECTION, fn);
const onDisconnectDevice = (fn) => ipcRenderer.on(DISCONNECT_DEVICE, fn);
const onDisconnectDeviceFromServer = (fn) =>
  ipcRenderer.on(DISCONNECT_DEVICE_FROM_SERVER, fn);

// colorgate
const onColorGateAPIReq = (fn) => ipcRenderer.on(COLOR_GATE_API_REQ, fn);
const onColorGateAPIRes = (fn) => ipcRenderer.on(COLOR_GATE_API_RES, fn);
const onColorGateServerConnectionReq = (fn) =>
  ipcRenderer.on(COLOR_GATE_SERVER_CONNECTION_REQ, fn);
const onColorGateConnectionCheck = (fn) =>
  ipcRenderer.on(COLOR_GATE_CONNECTION_CHECK, fn);
const onColorGateUpdateLicense = (fn) =>
  ipcRenderer.on(COLOR_GATE_UPDATE_LICENSE, fn);

// colorgate multi instance
const onConnectSocketMultiInstance1 = (fn) =>
  ipcRenderer.on('CONNECT_SOCKET_INSTANCE_1', fn);
const onConnectSocketMultiInstance2 = (fn) =>
  ipcRenderer.on('CONNECT_SOCKET_INSTANCE_2', fn);
const onDisconnectSocketMultiInstance1 = (fn) =>
  ipcRenderer.on('DISCONNECT_SOCKET_INSTANCE_1', fn);
const onDisconnectSocketMultiInstance2 = (fn) =>
  ipcRenderer.on('DISCONNECT_SOCKET_INSTANCE_2', fn);
const onColorGateApiResMultiInstance1 = (fn) =>
  ipcRenderer.on('COLOR_GATE_API_RES_MULTI_INSTANCE_1', fn);
const onColorGateApiResMultiInstance2 = (fn) =>
  ipcRenderer.on('COLOR_GATE_API_RES_MULTI_INSTANCE_2', fn);
const onColorGateServerConnectionReqMultiInstance1 = (fn) =>
  ipcRenderer.on('COLOR_GATE_SERVER_CONNECTION_REQ_MULTI_INSTANCE_1', fn);
const onColorGateServerConnectionReqMultiInstance2 = (fn) =>
  ipcRenderer.on('COLOR_GATE_SERVER_CONNECTION_REQ_MULTI_INSTANCE_2', fn);
const onColorGateConnectionCheckMultiInstance1 = (fn) =>
  ipcRenderer.on('COLOR_GATE_CONNECTION_CHECK_MULTI_INSTANCE_1', fn);
const onColorGateConnectionCheckMultiInstance2 = (fn) =>
  ipcRenderer.on('COLOR_GATE_CONNECTION_CHECK_MULTI_INSTANCE_2', fn);

const ipcClientSocketAlreadyExistInstance1 = (args) =>
  ipcRenderer.send('CLIENT_SOCKET_ALREADY_EXIST_INSTANCE_1', args);
const ipcClientSocketAlreadyExistInstance2 = (args) =>
  ipcRenderer.send('CLIENT_SOCKET_ALREADY_EXIST_INSTANCE_2', args);
const ipcConnectionStatusInstance1 = (msg) =>
  ipcRenderer.send('CONNECTION_STATUS_INSTANCE_1', msg);
const ipcConnectionStatusInstance2 = (msg) =>
  ipcRenderer.send('CONNECTION_STATUS_INSTANCE_2', msg);

// alwan
const onAlwanAPIReq = (fn) => ipcRenderer.on(ALWAN_API_REQ, fn);
const onAlwanAPIRes = (fn) => ipcRenderer.on(ALWAN_API_RES, fn);
const onAlwanServerConnectionReq = (fn) =>
  ipcRenderer.on(ALWAN_SERVER_CONNECTION_REQ, fn);
const onAlwanConnectionCheck = (fn) =>
  ipcRenderer.on(ALWAN_CONNECTION_CHECK, fn);
const onAlwanUpdateLicense = (fn) => ipcRenderer.on(ALWAN_UPDATE_LICENSE, fn);

// chart scanning
const onGrabInitialPosition = (fn) => ipcRenderer.on(GRAB_INITIAL_POSITION, fn);
const onChartPosition = (fn) => ipcRenderer.on(CHART_POSITION, fn);

// zebra printer
const onZebraPrinterHandler = (fn) => ipcRenderer.on(ZEBRA_PRINTER_HANDLER, fn);

// bar code
const onBarCodeReader = (fn) => ipcRenderer.on(BAR_CODE_READER_HANDLER, fn);

const onChnageConnectionType = (fn) =>
  ipcRenderer.on(SWITCH_TO_YS3060_CONNECTION_MODE, fn);

module.exports = {
  ipcConnectionStatus,
  ipcCurrentAction,
  ipcSettings,
  ipcDeviceConnection,
  ipcCalibration,
  ipcMeasurement,
  ipcWeightMeasurement,
  ipcMakeResetDevice,
  ipcGetTareValue,
  ipcSetTareValue,
  ipcShowDialog,
  onConnectionStatus,
  onCurrentAction,
  onDeviceConnection,
  onSettings,
  onCalibration,
  onMeasurement,
  onWeightMeasurement,
  onMakeResetDevice,
  onGetTareValue,
  onSetTareValue,
  onConnectSocket,
  onDisconnectSocket,
  onVerifyDeviceConnection,
  onDisconnectDevice,
  ipcSocketConnection,
  ipcSocketDisconnectCleanly,
  onDeviceReconnection,
  ipcClientSocketAlreadyExist,
  ipcDeviceDisconnection,
  onDisconnectDeviceFromServer,
  ipcLog,
  onColorGateAPIReq,
  ipcSendColorGateAPIReq,
  onColorGateAPIRes,
  onColorGateServerConnectionReq,
  ipcColorGateServerConnectionRes,
  ipcColorGateConnectionCheck,
  onColorGateConnectionCheck,
  onColorGateUpdateLicense,
  onAlwanAPIReq,
  onAlwanAPIRes,
  ipcSendAlwanAPIReq,
  onAlwanServerConnectionReq,
  onAlwanConnectionCheck,
  onAlwanUpdateLicense,
  ipcAlwanServerConnectionRes,
  ipcAlwanConnectionCheck,
  ipcChartPosition,
  ipcGrabInitialPosition,
  onChartPosition,
  onGrabInitialPosition,
  ipcSendToZebraHandler,
  ipcSendToBarcodeReader,
  onZebraPrinterHandler,
  onBarCodeReader,
  onChnageConnectionType,
  onConnectSocketMultiInstance1,
  onConnectSocketMultiInstance2,
  onDisconnectSocketMultiInstance1,
  onDisconnectSocketMultiInstance2,
  onColorGateApiResMultiInstance1,
  onColorGateApiResMultiInstance2,
  onColorGateServerConnectionReqMultiInstance1,
  onColorGateServerConnectionReqMultiInstance2,
  onColorGateConnectionCheckMultiInstance1,
  onColorGateConnectionCheckMultiInstance2,
  ipcClientSocketAlreadyExistInstance1,
  ipcClientSocketAlreadyExistInstance2,
  ipcConnectionStatusInstance1,
  ipcConnectionStatusInstance2,
};
