//Check baud rate
const checkBaudRateQ = '; 208 36 <CR><LF>';

// Initialization
const deviceInitializeQ = '; 208 10\r\n';
const scanQ = '; 208 11 <CR><LF>';
const initPositionQ = '; 208 12 <CR><LF>';

// set Device type
const setExactTypeQ = '; 208 64 0 27 34\r\n';
const setCi6xTypeQ = '; 208 64 0 29 36\r\n';
const set3NHTypeQ = '; 208 64 0 43 110\r\n';

// Reset Devie
const totalResetDeviceWithoutRemoteQ = '; 90 1 4 5';
const totalResetDeviceAllQ = '; 90 1 4 0';

// Set measurement mode
const setReflectanceModeQ = '; 77 155';

// Device on / off
const setDeviceOnlineQ = '; 208 16\r\n';
const setDeviceOfflineQ = '; 208 17\r\n';

// Hold or release paper
const holdPaperQ = '; 208 18 <CR><LF>';
const releasePaperQ = '; 208 19 <CR><LF>';

// acctually Pressed Key
const actuallyPressedKeyQ = '; 208 34\r\n';

// Clear Last Position
const lastEnterPositionClearQ = '; 208 20\r\n';

// get last enter position coordination
const lastEnterPositionCoordinationQ = '; 208 21 1\r\n';

// Set table mode
const setTableReflectanceModeQ = '; 208 13 0 <CR><LF>';
const setTableTransmissionModeQ = '; 208 13 1 <CR><LF>';

//set parameters
const setParametersQ = (density, wBase, illum, obs) =>
  `;22 ${density} ${wBase} ${illum} ${obs} <CR><LF>`;

//move axis
const moveHomeQ = '; 208 2\r\n';
const moveHeadUpQ = '; 208 3\r\n';
const moveDownQ = '; 208 4\r\n';
const moveFurtherToWhiteRefPosQ = '; 208 6 0 <CR><LF>';
const moveCloserToWhiteRefPosQ = '; 208 6 1 <CR><LF>';
const moveAbsoluteQ = '; 208 0 0 500 500 <CR><LF>';
const moveAndMeasureQ = (xCord, yCord) => `; 208 7 ${xCord} ${yCord} <CR><LF>`;
const moveRelativeQ = (xDistance, yDistance) =>
  `; 208 1 ${xDistance} ${yDistance} <CR><LF>`;

//Types
// density standard
const DStdType = {
  ANSIA: '0',
  ANSIT: '1',
  DIN: '2',
  DINNB: '3',
  DS1: '4',
};

// color spaces standard
const CType = {
  XyY: '0',
  Lab: '1',
  LChab: '2',
  Luv: '3',
  XYZ: '4',
  RxRyRz: '5',
  HLab: '6',
  LABmg: '11',
  LCHmg: '12',
  LChuv: '13',
};

// filter standard
const filterType = {
  NoDefined: '0',
  NoFilter: '1',
  PolFilter: '2',
  D65Filter: '3',
  UVCutFilter: '5',
  CustomFilter: '6',
};

const whiteBaseType = {
  Pap: '0',
  Abs: '1',
};

const illuminantType = {
  IlluminantA: '0 ',
  IlluminantC: '1 ',
  IlluminantD65: '2 ',
  IlluminantD50: '3 ',
  Il1: '8 ',
  Dxx1: '16',
  IlluminantF1: '24',
  IlluminantF2: '25',
  IlluminantF3: '26',
  IlluminantF4: '27',
  IlluminantF5: '28',
  IlluminantF6: '29',
  IlluminantF7: '30',
  IlluminantF8: '31',
  IlluminantF9: '32',
  IlluminantF10: '33',
  IlluminantF11: '34',
  IlluminantF12: '35',
};

const obsType = {
  TwoDeg: '0',
  TenDeg: '1',
};

module.exports = {
  checkBaudRateQ,
  deviceInitializeQ,
  setCi6xTypeQ,
  setExactTypeQ,
  initPositionQ,
  scanQ,
  setDeviceOfflineQ,
  setDeviceOnlineQ,
  holdPaperQ,
  releasePaperQ,
  setTableReflectanceModeQ,
  setTableTransmissionModeQ,
  totalResetDeviceWithoutRemoteQ,
  totalResetDeviceAllQ,
  setReflectanceModeQ,
  DStdType,
  CType,
  filterType,
  whiteBaseType,
  illuminantType,
  obsType,
  setParametersQ,
  moveCloserToWhiteRefPosQ,
  moveFurtherToWhiteRefPosQ,
  moveAbsoluteQ,
  moveHomeQ,
  moveHeadUpQ,
  moveDownQ,
  actuallyPressedKeyQ,
  lastEnterPositionClearQ,
  lastEnterPositionCoordinationQ,
  set3NHTypeQ
};
