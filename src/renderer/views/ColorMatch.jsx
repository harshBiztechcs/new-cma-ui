import React, { useCallback, useEffect, useRef, useState } from 'react';
import DevicePageTitle from 'renderer/components/DeviceHeader';
import DeviceLicense from 'renderer/components/DeviceLicense';
import Pagination from 'renderer/components/Pagination';
import Timeline from 'renderer/components/Timeline';
import {
  CHECK_DEVICE_CONNECTION,
  CLEAR_SAMPLES,
  CLOSE_DEVICE,
  CURRENT_ACTION,
  DEVICE_CONNECTION,
  DEVICE_DISCONNECT_API_CALL,
  DEVICE_DISCONNECT_TIMEOUT,
  DEVICE_RECONNECT_API_CALL,
  DISCONNECT_DEVICE,
  GET_DEVICE_AND_LICENSES,
  GET_DEVICE_INSTANCE_URL,
  GET_SAMPLES_DATA,
  SHOW_DIALOG,
  UPDATE_DEVICE_RECONNECTION,
  DEVICE_DISCONNECTION,
  MEASURE_IN_PROGRESS,
  REFRESH_DEVICES_AND_LICENSES,
  MEASUREMENT,
  SCAN_MEASUREMENT_RES,
  EXPORT_LAST_SCAN_DATA,
} from 'utility/constants';
import MeasureDeviceList from 'renderer/components/MeasureDeviceList';
import PopupModal from 'renderer/components/PopupModal';
import { downloadCSV } from 'utility/DownloadCSV';
import Loader from 'renderer/components/Loader';
import MultiFilesSelector from 'renderer/components/MultiFilesSelector';
import ThirdPartyAPI from 'renderer/components/ThirdPartyAPI';
import HomeFooter from 'renderer/components/HomeFooter';

function ColorMatch({
  username,
  instanceURL,
  token,
  onLogout,
  deviceList,
  onGetDeviceAndLicenses,
  licenses,
  onChangeDevice,
  connectedDevice,
  onDeviceDisConnect,
  onSelectOtherDevice,
  handleCheckUpdate,
  isNewUpdateAvailable,
  onThirdPartyAPI,
  showThirdPartyAPIPage,
  colorGateAPILog,
  socketConnection,
  thirdPartyAPIUser,
  colorGateConnection,
  setColorGateConnection,
  colorGateSocketConnection,
  colorGatePopupError,
  colorGatePopupTitle,
  setColorGatePopupError,
  socketConnectionInProgress,
  setSocketConnectionInProgress,
  alwanAPILog,
  alwanConnection,
  setAlwanConnection,
  alwanSocketConnection,
  alwanPopupError,
  alwanPopupTitle,
  setAlwanPopupError,
  alwanSocketConnectionInProgress,
  setAlwanSocketConnectionInProgress,
  scanRes,
  setScanRes,
  currentAction,
  setCurrentAction,
}) {
  const [currentDevice, setCurrentDevice] = useState(connectedDevice);
  const [deviceConnectionStatus, setDeviceConnectionStatus] = useState(true);
  const [updateDeviceStatus, setUpdateDeviceStatus] = useState(true);
  const [isDisconnected, setIsDisconnected] = useState(false);
  const [errorBtnText, setErrorBtnText] = useState('OK');
  const [error, setError] = useState('');
  const [errorTitle, setErrorTitle] = useState('Error');
  const [forceDisconnectError, setForceDisconnectError] = useState('');
  const [infoTitle, setInfoTitle] = useState('');
  const [info, setInfo] = useState('');
  const [isSampleInProgress, setIsSampleInProgress] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('Please wait..');
  const [openMultiFileModal, setOpenMultiFileModal] = useState(false);
  const csvFileRef = useRef(null);
  const [deviceInfo, setDeviceInfo] = useState(null);

  useEffect(() => {
    // register current action event
    window.electron.ipcRenderer.on(GET_DEVICE_AND_LICENSES, onDeviceAndLicensesRes);
    window.electron.ipcRenderer.on(CHECK_DEVICE_CONNECTION, onCheckDeviceConnection);
    window.electron.ipcRenderer.on(CLOSE_DEVICE, onCloseDevice);
    window.electron.ipcRenderer.on(SHOW_DIALOG, onShowDialog);
    window.electron.ipcRenderer.on(GET_SAMPLES_DATA, onSamplesData);
    window.electron.ipcRenderer.on(CLEAR_SAMPLES, onClearSamplesRes);
    window.electron.ipcRenderer.on(DEVICE_DISCONNECT_TIMEOUT, onDeviceDisconnectTimeout);
    window.electron.ipcRenderer.on(GET_DEVICE_INSTANCE_URL, onGetDeviceInstanceLink);
    window.electron.ipcRenderer.on(DEVICE_CONNECTION, onDeviceConnection);
    window.electron.ipcRenderer.on(DEVICE_DISCONNECTION, onDeviceRelease);
    window.electron.ipcRenderer.on(MEASURE_IN_PROGRESS, onMeasureInProgress);
    window.electron.ipcRenderer.on(REFRESH_DEVICES_AND_LICENSES, onRefreshDevicesLicenses);
    window.electron.ipcRenderer.on(SCAN_MEASUREMENT_RES, onScanMeasurementRes);
    window.electron.ipcRenderer.on(EXPORT_LAST_SCAN_DATA, onExportLastScanData);
    // get latest device list and licenses
    handleRefresh();

    // unregister current action event
    return () => {
      window.electron.ipcRenderer.removeListener(
        GET_DEVICE_AND_LICENSES,
        onDeviceAndLicensesRes
      );
      window.electron.ipcRenderer.removeListener(
        CHECK_DEVICE_CONNECTION,
        onCheckDeviceConnection
      );
      window.electron.ipcRenderer.removeListener(CLOSE_DEVICE, onCloseDevice);
      window.electron.ipcRenderer.removeListener(SHOW_DIALOG, onShowDialog);
      window.electron.ipcRenderer.removeListener(GET_SAMPLES_DATA, onSamplesData);
      window.electron.ipcRenderer.removeListener(CLEAR_SAMPLES, onClearSamplesRes);
      window.electron.ipcRenderer.removeListener(
        DEVICE_DISCONNECT_TIMEOUT,
        onDeviceDisconnectTimeout
      );
      window.electron.ipcRenderer.removeListener(
        GET_DEVICE_INSTANCE_URL,
        onGetDeviceInstanceLink
      );
      window.electron.ipcRenderer.removeListener(DEVICE_CONNECTION, onDeviceConnection);
      window.electron.ipcRenderer.removeListener(DEVICE_DISCONNECTION, onDeviceRelease);
      window.electron.ipcRenderer.removeListener(MEASURE_IN_PROGRESS, onMeasureInProgress);
      window.electron.ipcRenderer.removeListener(
        REFRESH_DEVICES_AND_LICENSES,
        onRefreshDevicesLicenses
      );
      window.electron.ipcRenderer.removeListener(SCAN_MEASUREMENT_RES, onScanMeasurementRes);
      window.electron.ipcRenderer.removeListener(EXPORT_LAST_SCAN_DATA, onExportLastScanData);
    };
  }, []);

  useEffect(() => {
    const device = deviceList.find((x) => x.deviceId == currentDevice);
    setDeviceInfo(device);
  }, [currentDevice, deviceList]);

  useEffect(() => {
    let deviceConnectionInterval = null;
    if (deviceList.length && currentDevice) {
      const device = deviceList.find((x) => x.deviceId == currentDevice);
      if (device) {
        deviceConnectionInterval = setInterval(() => {
          if(device.deviceType !== 'I1IO3' || device.deviceType !== 'I1IO2' || device.deviceType !== 'CI62_COLORSCOUT' || device.deviceType !== 'CI64_COLORSCOUT'){
            window.electron.ipcRenderer.send(CHECK_DEVICE_CONNECTION, device?.deviceType);
          }
        }, 3000);
      }
    }
    return () => {
      clearInterval(deviceConnectionInterval);
    };
  }, [deviceList, currentDevice]);

  useEffect(() => {
    const device = deviceList.find((x) => x.deviceId == currentDevice);
    if (updateDeviceStatus && isDisconnected) {
      window.electron.ipcRenderer.send(UPDATE_DEVICE_RECONNECTION, device);
      window.electron.ipcRenderer.send(DEVICE_RECONNECT_API_CALL, {
        instanceURL,
        deviceName: device?.deviceType,
        deviceId: device?.deviceId,
      });
      handleRefresh();
      setIsDisconnected(false);
    }
    if (!updateDeviceStatus) {
      window.electron.ipcRenderer.send(DISCONNECT_DEVICE, device);
      window.electron.ipcRenderer.send(DEVICE_DISCONNECT_API_CALL, {
        instanceURL,
        deviceName: device?.deviceType,
        deviceId: device?.deviceId,
      });
      handleRefresh();
      setIsDisconnected(true);
    }
  }, [updateDeviceStatus]);

  const onShowDialog = (_, args) => {
    if (args.message == 'Requested CMA client not found') {
      // setError('Requested action not completed!!');
      // setErrorBtnText('Retry On Instance');
      // do nothing
    } else if (
      args.message == 'Requested CMA-connect client is already available'
    ) {
      // do nothing
    } else {
      setError(args.message);
      setErrorBtnText('OK');
    }
  };

  const onDeviceDisconnectTimeout = (_, args) => {
    if (args.hasTimeout) {
      onDisconnectDeviceAfterTimeout(args.deviceType);
    }
  };

  const onClearSamplesRes = (_, args) => {
    if (!args.res) {
      setError(args.message);
      setErrorBtnText('OK');
    } else {
      setInfoTitle('Samples cleared');
      setInfo(args.message);
    }
    setIsSampleInProgress(false);
  };

  const onSamplesData = (_, args) => {
    const { header, data, error } = args;
    if (error) {
      setError(error);
    } else if (data.length > 0) {
      const res = downloadCSV(header, data);
      if (!res) setError('Error Generating CSV File');
    } else {
      setError('No samples found from the device');
    }
    setIsSampleInProgress(false);
  };

  const onExportSamples = () => {
    setLoadingMsg('Exporting samples, please wait...');
    setIsSampleInProgress(true);
    const device = deviceList.find((x) => x.deviceId == currentDevice);
    window.electron.ipcRenderer.send(GET_SAMPLES_DATA, device?.deviceType);
  };

  const onClearSamples = () => {
    setLoadingMsg('Clearing samples, please wait...');
    setIsSampleInProgress(true);
    const device = deviceList.find((x) => x.deviceId == currentDevice);
    window.electron.ipcRenderer.send(CLEAR_SAMPLES, device?.deviceType);
  };

  const onCheckDeviceConnection = (event, args) => {
    if (args) {
      setDeviceConnectionStatus(true);
    } else {
      setDeviceConnectionStatus(false);
      setUpdateDeviceStatus(false);
    }
  };

  const onRetry = () => {
    if (deviceConnectionStatus) {
      setUpdateDeviceStatus(true);
    }
  };

  const onCloseDevice = (event, args) => {
    if (args.res) {
      // TODO : release device licenses here by calling main
      onDeviceDisConnect(currentDevice);
    } else {
      setError(args.error ?? 'Device Disconnection Failed !!');
      setErrorBtnText('OK');
    }
  };

  const onGoToInstance = async () => {
    window.electron.ipcRenderer.send(GET_DEVICE_INSTANCE_URL, instanceURL);
  };

  const onGetDeviceInstanceLink = (_, args) => {
    if (args.res) {
      window.open(args.url);
    } else {
      setError(args.error);
      setErrorBtnText('OK');
    }
  };

  const onDisconnectDeviceAfterTimeout = (deviceType) => {
    window.electron.ipcRenderer.send(CLOSE_DEVICE, {
      forceClose: false,
      deviceType,
      deviceId: currentDevice,
      instanceURL
    });
  };

  const onDisconnectCurrentDevice = () => {
    const device = deviceList.find((x) => x.deviceId == currentDevice);
    window.electron.ipcRenderer.send(CLOSE_DEVICE, {
      forceClose: false,
      deviceType: device?.deviceType,
      deviceId: device?.deviceId,
      instanceURL
    });
  };

  const handleRefresh = () => {
    window.electron.ipcRenderer.send(GET_DEVICE_AND_LICENSES, { instanceURL, username, token });
  };

  const onRefreshDevicesLicenses = (_, args) => {
    setTimeout(() => {
      handleRefresh();
    }, 3000);
  };

  const onDeviceAndLicensesRes = useCallback((args) => {
    console.log('args 0123', args)
    onGetDeviceAndLicenses(args);
  },[]);

  const onDeviceConnection = (_, args) => {
    // if device connected successfully from equipment app then refresh device list and licenses
    if (args) {
      setTimeout(() => {
        handleRefresh();
      }, 3000);
    }
  };

  const onDeviceRelease = (_, args) => {
    // if device disconnected from equipment app then refresh device list and licenses
    if (args) {
      setTimeout(() => {
        handleRefresh();
      }, 3000);
    }
  };

  const onMeasureInProgress = (_, args) => {
    setForceDisconnectError(
      'Measurement is in progress, are you sure you want to disconnect ?'
    );
  };

  const onForceDisconnect = () => {
    const device = deviceList.find((x) => x.deviceId == currentDevice);
    window.electron.ipcRenderer.send(CLOSE_DEVICE, {
      forceClose: true,
      deviceType: device?.deviceType,
      deviceId: device?.deviceId,
      instanceURL
    });
  };

  const onMeasure = () => {
    setScanRes(null);
    const deviceConnection = {
      type: 'measurement',
      deviceConnection: {
        deviceType: deviceInfo.deviceType,
        deviceName: deviceInfo.name,
        isConnected: false,
      },
      measurement: { hasMeasured: false, measurementData: {}, error: '' },
    };
    window.electron.ipcRenderer.send(MEASUREMENT, deviceConnection);
  };

  const onClickExportLastScanData = () => {
    if (scanRes && scanRes.measurement && scanRes.measurement.hasMeasured) {
      window.electron.ipcRenderer.send(EXPORT_LAST_SCAN_DATA, null);
    }
  };

  const downloadTxtFile = (data, filename) => {
    const element = document.createElement('a');
    const file = new Blob([data], {
      type: 'text/plain',
    });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element); // Required for this to work in FireFox
    element.click();
  };

  const onExportLastScanData = (_, exportRes) => {
    if (exportRes.res) {
      downloadTxtFile(exportRes.fileData, 'i1io3_scan_LAB_data.txt');
    } else {
      setErrorTitle('Error');
      setError('Exporting scan data failed');
    }
  };

  const onScanMeasurementRes = (_, res) => setScanRes(res);

  return (
    <div id="main" className="cma-connect-page">
      <div className="container-fluid">
        <div className="d-flex flex-wrap h-100">
          <Timeline
            currentStep={4}
            handleCheckUpdate={handleCheckUpdate}
            isNewUpdateAvailable={isNewUpdateAvailable}
          />
          {!showThirdPartyAPIPage && (
            <div className="right-side">
              <DevicePageTitle
                onLogout={onLogout}
                onRefresh={handleRefresh}
                title="ColorMatch"
                subtitle="ColorMatch"
                onThirdPartyAPI={thirdPartyAPIUser ? onThirdPartyAPI : null}
                username={username}
                instanceURL={instanceURL}
              />
              <h3 className="page-title">ColorMatch</h3>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '10px',
                }}
              >
                <div style={{ float: 'left' }}>
                  <div className="product-detail">
                    <p className="device-name">
                      {(deviceInfo && deviceInfo.name) || ''}
                    </p>
                  </div>
                </div>
                <div>
                  <button
                    className="btn-default mr-12"
                    onClick={onChangeDevice}
                  >
                    Change device
                  </button>
                  <button
                    className="btn-danger mr-12"
                    onClick={onDisconnectCurrentDevice}
                  >
                    Disconnect device
                  </button>
                </div>
              </div>
              <hr />
              <div
                style={{ marginTop: '5px' }}
              >{`Instruction : ${currentAction}`}</div>
              <hr />
              <div style={{ marginTop: '10px' }}>
                <p>Scan Response</p>
                <pre style={{ height: '300px', overflow: 'auto' }}>
                  {scanRes
                    ? JSON.stringify(scanRes, null, 2)
                    : JSON.stringify({}, null, 2)}
                </pre>
              </div>

              <Pagination currentStep={4} />
              <HomeFooter />
              {!updateDeviceStatus && (
                <PopupModal
                  isSuccess={false}
                  title="Device Disconnected !!"
                  message="Please verify the device connection or select another device !!"
                  onConfirm={deviceConnectionStatus ? onRetry : false}
                  confirmBtnText="Reconnect"
                  onCancel={() => onSelectOtherDevice(currentDevice)}
                  cancelBtnText="Select Device"
                />
              )}
              {error && (
                <PopupModal
                  isSuccess={false}
                  title={errorTitle}
                  message={error}
                  onConfirm={() => setError('')}
                  confirmBtnText={errorBtnText}
                />
              )}
              {info && (
                <PopupModal
                  isSuccess
                  title={infoTitle}
                  message={info}
                  onConfirm={() => setInfo('')}
                  confirmBtnText="OK"
                />
              )}
              {forceDisconnectError && (
                <PopupModal
                  isSuccess={false}
                  title="Error"
                  message={forceDisconnectError}
                  onCancel={() => setForceDisconnectError('')}
                  onConfirm={onForceDisconnect}
                  confirmBtnText="Force Disconnect"
                  cancelBtnText="Cancel"
                />
              )}
              {isSampleInProgress && <Loader message={loadingMsg} />}
              {colorGatePopupError && (
                <PopupModal
                  isSuccess={false}
                  title="Error"
                  message={colorGatePopupError}
                  onConfirm={() => setColorGatePopupError('')}
                  confirmBtnText="OK"
                />
              )}
            </div>
          )}
          {showThirdPartyAPIPage && (
            <ThirdPartyAPI
              onLogout={onLogout}
              username={username}
              instanceURL={instanceURL}
              handleRefresh={handleRefresh}
              onThirdPartyAPI={onThirdPartyAPI}
              colorGateAPILog={colorGateAPILog}
              socketConnection={socketConnection}
              colorGateConnection={colorGateConnection}
              setColorGateConnection={setColorGateConnection}
              colorGateSocketConnection={colorGateSocketConnection}
              colorGatePopupTitle={colorGatePopupTitle}
              colorGatePopupError={colorGatePopupError}
              setColorGatePopupError={setColorGatePopupError}
              socketConnectionInProgress={socketConnectionInProgress}
              setSocketConnectionInProgress={setSocketConnectionInProgress}
              alwanAPILog={alwanAPILog}
              alwanConnection={alwanConnection}
              setAlwanConnection={setAlwanConnection}
              alwanSocketConnection={alwanSocketConnection}
              alwanPopupError={alwanPopupError}
              alwanPopupTitle={alwanPopupTitle}
              setAlwanPopupError={setAlwanPopupError}
              alwanSocketConnectionInProgress={alwanSocketConnectionInProgress}
              setAlwanSocketConnectionInProgress={
                setAlwanSocketConnectionInProgress
              }
              currentPage={4}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default ColorMatch;
