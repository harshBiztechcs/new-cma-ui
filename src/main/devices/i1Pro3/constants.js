const I1PRO3_LAST_ERROR_TEXT = 'LastErrorText';
const I1PRO3_LAST_ERROR_NUMBER = 'LastErrorNumber';
const I1PRO3_SERIAL_NUMBER = 'SerialNumber';
const I1PRO3_AVAILABLE_ILLUMINATIONS_KEY = 'AvailableIlluminationsKey';
const I1PRO3_964_REPORTING_KEY = '964Reporting';
const I1PRO3_HAS_WAVELENGTH_LED_KEY = 'HasWavelengthLed';
const I1PRO3_HAS_ZEBRA_RULER_SENSOR_KEY = 'HasZebraRulerSensor';
const I1PRO3_HAS_HEAD_SENSOR_KEY = 'HasHeadSensor';
const I1PRO3_HAS_INDICATOR_LED_KEY = 'HasIndicatorLed';
const I1PRO3_HAS_AMBIENT_LIGHT_KEY = 'HasAmbientLight';
const I1PRO3_HAS_POLARIZER_KEY = 'HasPolarizer';
const I1PRO3_HAS_LOW_RESOLUTION_KEY = 'HasLowResolution';
const I1PRO3_MAX_RULER_LENGTH_KEY = 'MaxRulerLength';
const I1PRO3_HW_REVISION_KEY = 'HWRevision';
const I1PRO3_SUPPLIER_NAME_KEY = 'SupplierName';
const I1PRO3_DEVICE_TYPE_KEY = 'DeviceTypeKey';
const I1PRO3_MEASUREMENT_GEOMETRY_KEY = 'MeasurementGeometryKey';
const I1PRO3_TIME_SINCE_LAST_CALIBRATION = 'TimeSinceLastCalibration';
const I1PRO3_TIME_UNTIL_CALIBRATION_EXPIRE = 'TimeUntilCalibrationExpire';
const I1PRO3_AVAILABLE_RESULT_INDEXES_KEY = 'AvailableResultIndexesKey';
const I1PRO3_RESULT_INDEX_KEY = 'ResultIndexKey';
const I1PRO3_MEASURE_COUNT = 'MeasureCount';
const I1PRO3_NUMBER_OF_PATCHES_PER_LINE = 'PatchesPerLine';
const I1PRO3_SDK_VERSION = 'SDKVersion';
const I1PRO3_SDK_VERSION_REVISION = 'SDKVersionRevision';

// Measurement Modes
const I1PRO3_AVAILABLE_MEASUREMENT_MODES = 'AvailableMeasurementModes';
const I1PRO3_MEASUREMENT_MODE = 'MeasurementMode';
const I1PRO3_MEASUREMENT_MODE_UNDEFINED = 'MeasurementModeUndefined';
const I1PRO3_REFLECTANCE_SPOT = 'ReflectanceSpot';
const I1PRO3_REFLECTANCE_SCAN = 'ReflectanceScan';
const I1PRO3_REFLECTANCE_M3_SPOT = 'ReflectanceM3Spot';
const I1PRO3_REFLECTANCE_M3_SCAN = 'ReflectanceM3Scan';
const I1PRO3_EMISSION_SPOT = 'EmissionSpot';
const I1PRO3_EMISSION_SCAN = 'EmissionScan';
const I1PRO3_AMBIENT_LIGHT_SPOT = 'AmbientLightSpot';

// Patch Recognization Mode
const I1PRO3_PATCH_RECOGNITION_KEY = "RecognitionKey";
const I1PRO3_PATCH_RECOGNITION_BASIC =  "RecognitionBasic";
const I1PRO3_PATCH_RECOGNITION_CORRELATION = "RecognitionCorrelation";
const I1PRO3_PATCH_RECOGNITION_POSITION = "RecognitionPosition";
const I1PRO3_PATCH_RECOGNITION_POSITION_DARK = "RecognitionPositionDark";
const I1PRO3_PATCH_RECOGNITION_FLASH = "RecognitionFlash";
const I1PRO3_PATCH_RECOGNITION_RECOGNIZED_PATCHES = "RecognitionRecognizedPatches";

//color space
const COLOR_SPACE_KEY = 'ColorSpaceDescription.Type';
const COLOR_SPACE_CIELab = 'CIELab';
const COLOR_SPACE_RGB = 'RGB';

//illumination key
const ILLUMINATION_KEY = 'Colorimetric.Illumination';
const ILLUMINATION_A = 'A';
const ILLUMINATION_B = 'B';
const ILLUMINATION_C = 'C';
const ILLUMINATION_D50 = 'D50';
const ILLUMINATION_D55 = 'D55';
const ILLUMINATION_D65 = 'D65';
const ILLUMINATION_D75 = 'D75';
const ILLUMINATION_F2 = 'F2';
const ILLUMINATION_F7 = 'F7';
const ILLUMINATION_F11 = 'F11';
const ILLUMINATION_EMISSION = 'Emission';

//observer key
const OBSERVER_KEY = 'Colorimetric.Observer';
const OBSERVER_TWO_DEGREE = 'TwoDegree';
const OBSERVER_TEN_DEGREE = 'TenDegree';

//illumination conditions
const I1PRO3_ILLUMINATION_CONDITION_M0 = 'M0';
const I1PRO3_ILLUMINATION_CONDITION_M1 = 'M1';
const I1PRO3_ILLUMINATION_CONDITION_M2 = 'M2';
const I1PRO3_ILLUMINATION_CONDITION_M3 = 'M3';

//others
const I1PRO3_VALUE_DELIMITER = ';';
const I1PRO3_YES = '1';
const I1PRO3_NO = '0';
const I1PRO3_RESET = 'Reset';
const I1PRO3_ALL = 'All';
const I1PRO3_PRECISION_CALIBRATION_KEY = 'PrecisionCalibration';

//device events
const eventCode = {
  eI1Pro3Arrival: 0x11,
  eI1Pro3Departure: 0x12,
  eI1Pro3ButtonPressed: 0x01,
  eI1Pro3ScanReadyToMove: 0x02,
  eI1Pro3HeadChanged: 0x03,
};

const buttonType = {
  e3ButtonIsPressed: 1000,
  e3ButtonNotPressed: 1001,
};

module.exports = {
  I1PRO3_LAST_ERROR_TEXT,
  I1PRO3_LAST_ERROR_NUMBER,
  I1PRO3_SERIAL_NUMBER,
  I1PRO3_AVAILABLE_ILLUMINATIONS_KEY,
  I1PRO3_964_REPORTING_KEY,
  I1PRO3_HAS_WAVELENGTH_LED_KEY,
  I1PRO3_HAS_ZEBRA_RULER_SENSOR_KEY,
  I1PRO3_HAS_HEAD_SENSOR_KEY,
  I1PRO3_HAS_INDICATOR_LED_KEY,
  I1PRO3_HAS_AMBIENT_LIGHT_KEY,
  I1PRO3_HAS_POLARIZER_KEY,
  I1PRO3_HAS_LOW_RESOLUTION_KEY,
  I1PRO3_MAX_RULER_LENGTH_KEY,
  I1PRO3_HW_REVISION_KEY,
  I1PRO3_SUPPLIER_NAME_KEY,
  I1PRO3_DEVICE_TYPE_KEY,
  I1PRO3_MEASUREMENT_GEOMETRY_KEY,
  I1PRO3_TIME_SINCE_LAST_CALIBRATION,
  I1PRO3_TIME_UNTIL_CALIBRATION_EXPIRE,
  I1PRO3_AVAILABLE_RESULT_INDEXES_KEY,
  I1PRO3_RESULT_INDEX_KEY,
  I1PRO3_MEASURE_COUNT,
  I1PRO3_NUMBER_OF_PATCHES_PER_LINE,
  I1PRO3_AVAILABLE_MEASUREMENT_MODES,
  I1PRO3_MEASUREMENT_MODE,
  I1PRO3_MEASUREMENT_MODE_UNDEFINED,
  I1PRO3_REFLECTANCE_SPOT,
  I1PRO3_REFLECTANCE_SCAN,
  I1PRO3_REFLECTANCE_M3_SPOT,
  I1PRO3_REFLECTANCE_M3_SCAN,
  I1PRO3_EMISSION_SPOT,
  I1PRO3_EMISSION_SCAN,
  I1PRO3_AMBIENT_LIGHT_SPOT,
  COLOR_SPACE_KEY,
  COLOR_SPACE_CIELab,
  COLOR_SPACE_RGB,
  ILLUMINATION_KEY,
  ILLUMINATION_A,
  ILLUMINATION_B,
  ILLUMINATION_C,
  ILLUMINATION_D50,
  ILLUMINATION_D55,
  ILLUMINATION_D65,
  ILLUMINATION_D75,
  ILLUMINATION_F2,
  ILLUMINATION_F7,
  ILLUMINATION_F11,
  ILLUMINATION_EMISSION,
  OBSERVER_KEY,
  OBSERVER_TWO_DEGREE,
  OBSERVER_TEN_DEGREE,
  I1PRO3_ILLUMINATION_CONDITION_M0,
  I1PRO3_ILLUMINATION_CONDITION_M1,
  I1PRO3_ILLUMINATION_CONDITION_M2,
  I1PRO3_ILLUMINATION_CONDITION_M3,
  I1PRO3_VALUE_DELIMITER,
  I1PRO3_YES,
  I1PRO3_NO,
  I1PRO3_RESET,
  I1PRO3_ALL,
  I1PRO3_PRECISION_CALIBRATION_KEY,
  eventCode,
  buttonType,
  I1PRO3_SDK_VERSION,
  I1PRO3_SDK_VERSION_REVISION,
  I1PRO3_PATCH_RECOGNITION_KEY,
  I1PRO3_PATCH_RECOGNITION_BASIC,
  I1PRO3_PATCH_RECOGNITION_CORRELATION,
  I1PRO3_PATCH_RECOGNITION_POSITION,
  I1PRO3_PATCH_RECOGNITION_POSITION_DARK,
  I1PRO3_PATCH_RECOGNITION_FLASH,
  I1PRO3_PATCH_RECOGNITION_RECOGNIZED_PATCHES,
};
