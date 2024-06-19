const CONNECTION = 'CONNECTION';
const SETTINGS = 'SETTINGS';
const CALIBRATION = 'CALIBRATION';
const MEASUREMENT = 'MEASUREMENT';
const SCAN_MEASUREMENT_RES = 'SCAN_MEASUREMENT_RES';
const EXPORT_LAST_SCAN_DATA = 'EXPORT_LAST_SCAN_DATA';
const DISCONNECTION = 'DISCONNECTION';
const CONNECTION_STATUS = 'CONNECTION_STATUS';
const CURRENT_ACTION = 'CURRENT_ACTION';
const CONNECT_SOCKET = 'CONNECT_SOCKET';
const DISCONNECT_SOCKET = 'DISCONNECT_SOCKET';
const DEVICE_CONNECTION = 'DEVICE_CONNECTION';
const DEVICE_DISCONNECTION = 'DEVICE_DISCONNECTION';
const DISCONNECT_DEVICE = 'DISCONNECT_DEVICE';
const VERIFY_DEVICE_CONNECTION = 'VERIFY_DEVICE_CONNECTION';
const VERIFY_PB_DEVICE_CONNECTION = 'VERIFY_PB_DEVICE_CONNECTION';
const SHOW_DIALOG = 'SHOW_DIALOG';
const CHECK_DEVICE_CONNECTION = 'CHECK_DEVICE_CONNECTION';
const CHECK_ROP_DEVICE_CONNECTION = 'CHECK_ROP_DEVICE_CONNECTION';
const CHECK_PB_DEVICE_CONNECTION = 'CHECK_PB_DEVICE_CONNECTION';
const CHECK_ZEBRA_DEVICE_CONNECTION = 'CHECK_ZEBRA_DEVICE_CONNECTION';
const CHECK_BARCODE_DEVICE_CONNECTION = 'CHECK_BARCODE_DEVICE_CONNECTION';
const SOCKET_CONNECTION = 'SOCKET_CONNECTION';
const NETWORK_CONNECTION = 'NETWORK_CONNECTION';
const SOCKET_DISCONNECT_CLEANLY = 'SOCKET_DISCONNECT_CLEANLY';
const UPDATE_DEVICE_RECONNECTION = 'UPDATE_DEVICE_RECONNECTION';
const CLIENT_SOCKET_ALREADY_EXIST = 'CLIENT_SOCKET_ALREADY_EXIST';
const DEVICE_DISCONNECT_API_CALL = 'DEVICE_DISCONNECT_API_CALL';
const DEVICE_RECONNECT_API_CALL = 'DEVICE_RECONNECT_API_CALL';
const DEVICE_STATUS_UPDATE_CALL = 'DEVICE_STATUS_UPDATE_CALL';
const CLOSE_DEVICE = 'CLOSE_DEVICE';
const CLOSE_PB_DEVICE = 'CLOSE_PB_DEVICE';
const MEASURE_IN_PROGRESS = 'MEASURE_IN_PROGRESS';
const GET_SAMPLES_DATA = 'GET_SAMPLES_DATA';
const CLEAR_SAMPLES = 'CLEAR_SAMPLES';
const DEVICE_DISCONNECT_TIMEOUT = 'DEVICE_DISCONNECT_TIMEOUT';
const GET_DEVICE_AND_LICENSES = 'GET_DEVICE_AND_LICENSES';
const GET_TOKEN = 'GET_TOKEN';
const ACQUIRE_LICENSE = 'ACQUIRE_LICENSE';
const RELEASE_LICENSE = 'RELEASE_LICENSE';
const GET_DEVICE_INSTANCE_URL = 'GET_DEVICE_INSTANCE_URL';
const DISCONNECT_DEVICE_FROM_SERVER = 'DISCONNECT_DEVICE_FROM_SERVER';
const REFRESH_DEVICES_AND_LICENSES = 'REFRESH_DEVICES_AND_LICENSES';
const LOGIN = 'LOGIN';
const CHECK_FOR_UPDATE = 'CHECK_FOR_UPDATE';
const DOWNLOAD_UPDATE = 'DOWNLOAD_UPDATE';
const QUIT_AND_INSTALL = 'QUIT_AND_INSTALL';
const UPDATE_ERROR = 'UPDATE_ERROR';
const DOWNLOAD_PROGRESS = 'DOWNLOAD_PROGRESS';
const GET_IP = 'GET_IP';
const GET_APP_VERSION = 'GET_APP_VERSION';
const APP_CLOSE_CONFIRMED = 'app_close_confirmed';
const APP_REQUEST_CLOSE = 'app_request_close';
const CURRENT_TAB_UPDATE = 'CURRENT_TAB_UPDATE';
const BLUETOOTH_SCAN_DEVICE = 'BLUETOOTH_SCAN_DEVICE';
const SWITCH_TO_YS3060_CONNECTION_MODE = 'SWITCH_TO_YS3060_CONNECTION_MODE';
const GET_MAC_ADDRESS = 'GET_MAC_ADDRESS';

// precision balance
const WEIGHT_MEASUREMENT = 'WEIGHT_MEASUREMENT';
const MAKE_RESET_DEVICE = 'MAKE_RESET_DEVICE';
const GET_TARE_VALUE = 'GET_TARE_VALUE';
const SET_TARE_VALUE = 'SET_TARE_VALUE';

// zebra printer
const ZEBRA_PRINTER_HANDLER = 'ZEBRA_PRINTER_HANDLER';
const BAR_CODE_READER_HANDLER = 'BAR_CODE_READER_HANDLER';
const SEND_OPEN_URL_TO_INPUT = 'SEND_OPEN_URL_TO_INPUT';
const URL_OPENED_BROWSER = 'URL_OPENED_BROWSER';

// thirdParty api
const CHECK_THIRD_PARTY_API_CONNECTION = 'CHECK_THIRD_PARTY_API_CONNECTION';

// colorgate
const CHECK_COLOR_GATE_API_CONNECTION = 'CHECK_COLOR_GATE_API_CONNECTION';
const COLOR_GATE_API_REQ = 'COLOR_GATE_API_REQ';
const COLOR_GATE_API_RES = 'COLOR_GATE_API_RES';
const COLOR_GATE_SERVER_CONNECTION_REQ = 'COLOR_GATE_SERVER_CONNECTION_REQ';
const COLOR_GATE_SERVER_CONNECTION_RES = 'COLOR_GATE_SERVER_CONNECTION_RES';
const COLOR_GATE_API_LOG = 'COLOR_GATE_API_LOG';
const CMA_API_FOR_COLOR_GATE_STATUS_UPDATE =
  'CMA_API_FOR_COLOR_GATE_STATUS_UPDATE';
const COLOR_GATE_CONNECTION_CHECK = 'COLOR_GATE_CONNECTION_CHECK';
const COLOR_GATE_CONNECTION_CHECK_REQ = 'COLOR_GATE_CONNECTION_CHECK_REQ';
const COLOR_GATE_CONNECTION_CHECK_RES = 'COLOR_GATE_CONNECTION_CHECK_RES';
const COLOR_GATE_UPDATE_LICENSE = 'COLOR_GATE_UPDATE_LICENSE';

// alwan
const CHECK_ALWAN_API_CONNECTION = 'CHECK_ALWAN_API_CONNECTION';
const TEST_ALWAN_API_CONNECTION = 'TEST_ALWAN_API_CONNECTION';
const ALWAN_API_REQ = 'ALWAN_API_REQ';
const ALWAN_API_RES = 'ALWAN_API_RES';
const ALWAN_SERVER_CONNECTION_REQ = 'ALWAN_SERVER_CONNECTION_REQ';
const ALWAN_SERVER_CONNECTION_RES = 'ALWAN_SERVER_CONNECTION_RES';
const ALWAN_API_LOG = 'ALWAN_API_LOG';
const CMA_API_FOR_ALWAN_STATUS_UPDATE = 'CMA_API_FOR_ALWAN_STATUS_UPDATE';
const ALWAN_CONNECTION_CHECK = 'ALWAN_CONNECTION_CHECK';
const ALWAN_CONNECTION_CHECK_REQ = 'ALWAN_CONNECTION_CHECK_REQ';
const ALWAN_CONNECTION_CHECK_RES = 'ALWAN_CONNECTION_CHECK_RES';
const ALWAN_UPDATE_LICENSE = 'ALWAN_UPDATE_LICENSE';

// chartScanning
const CHART_POSITION = 'CHART_POSITION';
const GRAB_INITIAL_POSITION = 'GRAB_INITIAL_POSITION';

const winDevices = [
  'I1PRO3',
  'I1PRO2',
  'CI62',
  'CI64',
  'EXACT',
  'I1IO3',
  'I1IO2',
];
const macDevices = ['I1PRO3', 'I1PRO2', 'EXACT', 'I1IO3', 'I1IO2'];

const deviceStatusType = {
  connected: 'Connected',
  available: 'Available',
  not_available: 'Not Available',
  waiting_to_connect: 'Waiting To Connect',
};

const URLRegex = new RegExp(
  '^https?://(www.)?[-a-zA-Z0-9@:%._+~#=]{1,256}.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$'
);

const filePathRegex = new RegExp(/^([a-zA-Z]:\\[\\\S|*\S]?.*)+\.\S+$/);
const filePathRegexCCT = new RegExp(
  /^[a-zA-Z]:[\\\/](?:[\w !#&()-]+[\\\/])*([\w !#&()-]+\.cct)$/
);

module.exports = {
  CONNECTION,
  SETTINGS,
  CALIBRATION,
  MEASUREMENT,
  DISCONNECTION,
  CONNECTION_STATUS,
  CURRENT_ACTION,
  CONNECT_SOCKET,
  DISCONNECT_SOCKET,
  DEVICE_CONNECTION,
  VERIFY_DEVICE_CONNECTION,
  VERIFY_PB_DEVICE_CONNECTION,
  SHOW_DIALOG,
  winDevices,
  macDevices,
  deviceStatusType,
  DISCONNECT_DEVICE,
  CHECK_DEVICE_CONNECTION,
  CHECK_ROP_DEVICE_CONNECTION,
  CHECK_PB_DEVICE_CONNECTION,
  CHECK_ZEBRA_DEVICE_CONNECTION,
  CHECK_BARCODE_DEVICE_CONNECTION,
  SOCKET_CONNECTION,
  NETWORK_CONNECTION,
  SOCKET_DISCONNECT_CLEANLY,
  UPDATE_DEVICE_RECONNECTION,
  CLIENT_SOCKET_ALREADY_EXIST,
  DEVICE_DISCONNECT_API_CALL,
  DEVICE_RECONNECT_API_CALL,
  DEVICE_STATUS_UPDATE_CALL,
  CLOSE_DEVICE,
  CLOSE_PB_DEVICE,
  GET_SAMPLES_DATA,
  CLEAR_SAMPLES,
  DEVICE_DISCONNECT_TIMEOUT,
  GET_DEVICE_AND_LICENSES,
  GET_TOKEN,
  ACQUIRE_LICENSE,
  RELEASE_LICENSE,
  GET_DEVICE_INSTANCE_URL,
  LOGIN,
  URLRegex,
  DEVICE_DISCONNECTION,
  MEASURE_IN_PROGRESS,
  DISCONNECT_DEVICE_FROM_SERVER,
  REFRESH_DEVICES_AND_LICENSES,
  CHECK_FOR_UPDATE,
  DOWNLOAD_UPDATE,
  QUIT_AND_INSTALL,
  UPDATE_ERROR,
  DOWNLOAD_PROGRESS,
  COLOR_GATE_API_REQ,
  COLOR_GATE_API_RES,
  CHECK_THIRD_PARTY_API_CONNECTION,
  COLOR_GATE_SERVER_CONNECTION_RES,
  COLOR_GATE_SERVER_CONNECTION_REQ,
  COLOR_GATE_API_LOG,
  GET_IP,
  CMA_API_FOR_COLOR_GATE_STATUS_UPDATE,
  COLOR_GATE_CONNECTION_CHECK,
  COLOR_GATE_CONNECTION_CHECK_REQ,
  COLOR_GATE_CONNECTION_CHECK_RES,
  CHECK_COLOR_GATE_API_CONNECTION,
  COLOR_GATE_UPDATE_LICENSE,
  GET_APP_VERSION,
  APP_CLOSE_CONFIRMED,
  APP_REQUEST_CLOSE,
  ALWAN_API_REQ,
  ALWAN_API_RES,
  ALWAN_API_LOG,
  CHECK_ALWAN_API_CONNECTION,
  TEST_ALWAN_API_CONNECTION,
  ALWAN_SERVER_CONNECTION_REQ,
  ALWAN_SERVER_CONNECTION_RES,
  CMA_API_FOR_ALWAN_STATUS_UPDATE,
  ALWAN_CONNECTION_CHECK,
  ALWAN_CONNECTION_CHECK_REQ,
  ALWAN_CONNECTION_CHECK_RES,
  ALWAN_UPDATE_LICENSE,
  SCAN_MEASUREMENT_RES,
  EXPORT_LAST_SCAN_DATA,
  CHART_POSITION,
  GRAB_INITIAL_POSITION,
  filePathRegex,
  filePathRegexCCT,
  WEIGHT_MEASUREMENT,
  MAKE_RESET_DEVICE,
  GET_TARE_VALUE,
  SET_TARE_VALUE,
  ZEBRA_PRINTER_HANDLER,
  BAR_CODE_READER_HANDLER,
  SEND_OPEN_URL_TO_INPUT,
  URL_OPENED_BROWSER,
  CURRENT_TAB_UPDATE,
  BLUETOOTH_SCAN_DEVICE,
  SWITCH_TO_YS3060_CONNECTION_MODE,
  GET_MAC_ADDRESS
};
