import React, { useCallback, useEffect, useState } from 'react';
import DevicePageTitle from 'renderer/components/DeviceHeader';
import DeviceLicense from 'renderer/components/DeviceLicense';
import Pagination from 'renderer/components/Pagination';
import Timeline from 'renderer/components/Timeline';
import ConnectModal from 'renderer/components/ConnectModal';
import DisConnectModal from 'renderer/components/DisConnectModal';
import {
  CLOSE_PB_DEVICE,
  DEVICE_DISCONNECT_TIMEOUT,
  GET_DEVICE_AND_LICENSES,
  GET_DEVICE_INSTANCE_URL,
  DEVICE_DISCONNECTION,
  VERIFY_DEVICE_CONNECTION,
  COLOR_GATE_API_REQ,
  COLOR_GATE_API_BUTTON_CLICK,
  DISCONNECT_DEVICE,
  DEVICE_DISCONNECT_API_CALL,
  DEVICE_CONNECTION,
  CHECK_DEVICE_CONNECTION,
  CHECK_PB_DEVICE_CONNECTION,
  CURRENT_TAB_UPDATE,
} from 'utility/constants';
import DeviceList from 'renderer/components/DeviceList';
import PopupModal from 'renderer/components/PopupModal';
import ThirdPartyAPI from 'renderer/components/ThirdPartyAPI';
import HomeFooter from 'renderer/components/HomeFooter';
import PBDeviceList from 'renderer/components/PBDeviceList';

function DevicePrecision({
  username,
  deviceList,
  licenses,
  instanceURL,
  token,
  onGetDeviceAndLicenses,
  onDeviceDisConnect,
  onDeviceConnected,
  onGoBackToMeasure,
  onLogout,
  connectedPBDevice,
  onHasDeviceDisconnectTimeout,
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
  setisPrecisionShow,
  balanceDeviceList,
  barcodeDeviceList,
  setIsBarcodeOnShow,
  zebraDeviceList,
  setIsZebraOnShow,
}) {
  const [connectModal, setConnectModal] = useState(false);
  const [disconnectModal, setDisconnectModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(2);
  const [currentPBDevice, setCurrentPBDevice] = useState();
  const [pbDeviceType, setPBDeviceType] = useState('');
  const [error, setError] = useState('');
  const [currentDevice, setCurrentDevice] = useState(connectedPBDevice);
  const [deviceConnectionInterval, setDeviceConnectionInterval] = useState(0);
  const [deviceConnectionStatus, setDeviceConnectionStatus] = useState(false);

  useEffect(() => {
    //register on verify device connection event
    //after device has been stored on server with username
    window.electron.ipcRenderer.on(VERIFY_DEVICE_CONNECTION, onVerifyDeviceConnection);
    window.electron.ipcRenderer.on(CLOSE_PB_DEVICE, onCloseDevice);
    window.electron.ipcRenderer.on(DEVICE_DISCONNECT_TIMEOUT, onDeviceDisconnectTimeout);
    window.electron.ipcRenderer.on(GET_DEVICE_AND_LICENSES, onDeviceAndLicensesRes);
    window.electron.ipcRenderer.on(GET_DEVICE_INSTANCE_URL, onGetDeviceInstanceLink);
    window.electron.ipcRenderer.on(DEVICE_CONNECTION, onDeviceConnection);
    window.electron.ipcRenderer.on(DEVICE_DISCONNECTION, onDeviceRelease);
    window.electron.ipcRenderer.on(CHECK_PB_DEVICE_CONNECTION, onCheckDeviceConnection);
    //get latest device list and licenses
    handleRefresh();

    return () => {
      window.electron.ipcRenderer.removeListener(
        VERIFY_DEVICE_CONNECTION,
        onVerifyDeviceConnection
      );
      window.electron.ipcRenderer.removeListener(CLOSE_PB_DEVICE, onCloseDevice);
      window.electron.ipcRenderer.removeListener(
        DEVICE_DISCONNECT_TIMEOUT,
        onDeviceDisconnectTimeout
      );
      window.electron.ipcRenderer.removeListener(
        GET_DEVICE_AND_LICENSES,
        onDeviceAndLicensesRes
      );
      window.electron.ipcRenderer.removeListener(
        GET_DEVICE_INSTANCE_URL,
        onGetDeviceInstanceLink
      );
      window.electron.ipcRenderer.removeListener(DEVICE_CONNECTION, onDeviceConnection);
      window.electron.ipcRenderer.removeListener(
        CHECK_PB_DEVICE_CONNECTION,
        onCheckDeviceConnection
      );
      window.electron.ipcRenderer.removeListener(DEVICE_DISCONNECTION, onDeviceRelease);

      stopCheckDeviceConnectionInterval();
    };
  }, []);

  useEffect(() => {
    if (balanceDeviceList.length && connectedPBDevice) {
      const device = balanceDeviceList.find(
        (x) => x.deviceId == connectedPBDevice
      );
      if (device) startCheckDeviceConnectionInterval(device);
    }
  }, [balanceDeviceList, connectedPBDevice]);

  const onDeviceRelease = (_, args) => {
    // if device disconnected from equipment app then refresh device list and licenses
    if (args) {
      setTimeout(() => {
        handleRefresh();
      }, 3000);
    }
  };

  const onVerifyDeviceConnection = (event, args) => {
    if (args) {
      //TODO : send device acquire license call here to main and if response yes then go to next page
      setConnectModal(true);
      setCurrentPage(3);
    } else {
      setDisconnectModal(true);
      setCurrentPage(3);
    }
  };
  const onCloseDevice = (event, args) => {
    if (args.res) {
      //TODO : send release license call to main after device close
      onDeviceDisConnect(args.deviceId);
    } else {
      setError(args.error ?? 'Device Disconnected!!');
    }
  };

  const onDeviceDisconnectTimeout = (_, args) => {
    if (args && currentPBDevice) {
      stopCheckDeviceConnectionInterval();
      onDisconnectCurrentPBDevice(currentPBDevice);
    }
  };

  // const onDisconnectCurrentDevice = (deviceId) => {
  //   const device = balanceDeviceList.find((dev) => dev.deviceId == deviceId);

  //   window.electron.ipcRenderer.send(CLOSE_DEVICE, {
  //     forceClose: true,
  //     deviceType: device?.deviceType,
  //     deviceId,
  //     instanceURL
  //   });
  //   handleRefresh();
  // };

  const onDisconnectCurrentPBDevice = (deviceId) => {
    const device = balanceDeviceList.find((dev) => dev.deviceId == deviceId);
    stopCheckDeviceConnectionInterval();
    window.electron.ipcRenderer.send(CLOSE_PB_DEVICE, {
      forceClose: true,
      deviceType: device?.deviceType,
      deviceId: deviceId,
    });
    handleRefresh();
  };

  const onConnectPBDevice = (deviceId) => {
    const device = balanceDeviceList.find((dev) => dev.deviceId == deviceId);
    setCurrentPBDevice(deviceId);
    setPBDeviceType(device?.deviceType);
    if (device) {
      window.electron.ipcRenderer.send(VERIFY_DEVICE_CONNECTION, device);
    }
  };

  const openLinkInBrowser = async () => {
    window.electron.ipcRenderer.send(GET_DEVICE_INSTANCE_URL, instanceURL);
  };

  const onGetDeviceInstanceLink = (_, args) => {
    if (args.res) {
      window.open(args.url);
    } else {
      setError(args.error);
    }
  };

  const handleGotoInstance = async (checked) => {
    await openLinkInBrowser();
    //device disconnection timeout checked
    onHasDeviceDisconnectTimeout(checked);
    setConnectModal(false);
    onDeviceConnected(currentPBDevice);
  };

  const handleNext = (checked) => {
    //device disconnection timeout checked
    onHasDeviceDisconnectTimeout(checked);
    setConnectModal(false);
    if (currentDevice) {
      onDeviceConnected(currentDevice);
    } else {
      onDeviceConnected(currentPBDevice);
    }
  };

  const onCheckDeviceConnection = (event, args) => {
    if (args.status) {
      setDeviceConnectionStatus(false);
    } else {
      onDisconnectCurrentPBDevice(args.deviceId);
      setDisconnectModal(true);
      setCurrentPage(3);
      stopCheckDeviceConnectionInterval();
      // setDeviceConnectionStatus(true);
    }
  };

  const handleRetry = () => {
    const device = balanceDeviceList.find((x) => x.deviceId == currentPBDevice);
    if (
      device &&
      (device.deviceType === 'I1IO3' || device.deviceType === 'I1IO2')
    ) {
      window.electron.ipcRenderer.send(DISCONNECT_DEVICE, device);
      window.electron.ipcRenderer.send(DEVICE_DISCONNECT_API_CALL, {
        instanceURL,
        deviceName: device?.deviceType,
        deviceId: device?.deviceId,
      });
    }
    window.electron.ipcRenderer.send(VERIFY_DEVICE_CONNECTION, device);
    setDisconnectModal(false);
    setDeviceConnectionStatus(false);
  };

  const handleBack = () => {
    setCurrentPage(2);
    setDisconnectModal(false);
    setDeviceConnectionStatus(false);
  };

  const handleRefresh = () => {
    window.electron.ipcRenderer.send(GET_DEVICE_AND_LICENSES, { instanceURL, username, token });
  };

  const onDeviceAndLicensesRes = useCallback((args) => {
    console.log('args 85412', args)
    onGetDeviceAndLicenses(args);
  }, []);

  const onDeviceConnection = (_, args) => {
    //if device connected successfully from equipment app then refresh device list and licenses
    if (args) {
      setTimeout(() => {
        handleRefresh();
      }, 3000);
    }
  };

  const handleSendAPIReq = () => {
    window.electron.ipcRenderer.send(COLOR_GATE_API_BUTTON_CLICK, null);
  };

  const SpectroDeviceButton = () => {
    window.electron.ipcRenderer.send(CURRENT_TAB_UPDATE, 1);
    setisPrecisionShow(false);
    setIsBarcodeOnShow(false);
    setIsZebraOnShow(false);
  };
  const precisionBalanceButton = () => {
    window.electron.ipcRenderer.send(CURRENT_TAB_UPDATE, 2);
    setisPrecisionShow(true);
    setIsBarcodeOnShow(false);
    setIsZebraOnShow(false);
  };
  const barcodeScannerButton = () => {
    window.electron.ipcRenderer.send(CURRENT_TAB_UPDATE, 3);
    setIsBarcodeOnShow(true);
    setisPrecisionShow(false);
    setIsZebraOnShow(false);
  };
  const zebraPrinterButton = () => {
    window.electron.ipcRenderer.send(CURRENT_TAB_UPDATE, 4);
    setIsZebraOnShow(true);
    setisPrecisionShow(false);
    setIsBarcodeOnShow(false);
  };

  const startCheckDeviceConnectionInterval = (device) => {
    setDeviceConnectionInterval((interval) => {
      clearInterval(interval);
      const intervalCount = setInterval(() => {
        if (
          device.deviceType !== 'I1IO3' &&
          device.deviceType !== 'I1IO2' &&
          device.deviceType !== 'CI62_COLORSCOUT' &&
          device.deviceType !== 'CI64_COLORSCOUT'
        ) {
          window.electron.ipcRenderer.send(CHECK_PB_DEVICE_CONNECTION, device);
        }
      }, 3000);
      return intervalCount;
    });
  };
  const stopCheckDeviceConnectionInterval = () => {
    setDeviceConnectionInterval((interval) => {
      if (interval) {
        clearInterval(interval);
        return 0;
      }
      return 0;
    });
  };
  return (
    <div id="main" className="cma-connect-page">
      <div className="container-fluid">
        <div className="d-flex flex-wrap h-100">
          <Timeline
            currentStep={currentPage}
            handleCheckUpdate={handleCheckUpdate}
            isNewUpdateAvailable={isNewUpdateAvailable}
          />
          {!showThirdPartyAPIPage && (
            <div className="right-side">
              <DevicePageTitle
                title="Select the device to connect"
                subtitle="List of licenced devices"
                onLogout={onLogout}
                onRefresh={handleRefresh}
                onThirdPartyAPI={thirdPartyAPIUser ? onThirdPartyAPI : null}
                username={username}
                instanceURL={instanceURL}
              />
              {/* <h3 className="page-title">Device & licence overview</h3>
              <DeviceLicense licenses={licenses} /> */}
              <div className="d-flex mb-10">
                <button
                  className="btn-secondary mr-12"
                  onClick={SpectroDeviceButton}
                >
                  Spectro Device
                </button>
                {balanceDeviceList.length > 0 && (
                  <button
                    className="btn-secondary mr-12"
                    onClick={precisionBalanceButton}
                  >
                    Precision Balance
                  </button>
                )}
                {barcodeDeviceList.length > 0 && (
                  <button
                    className="btn-secondary mr-12"
                    onClick={barcodeScannerButton}
                  >
                    Barcode Scanner
                  </button>
                )}
                {zebraDeviceList.length > 0 && (
                  <button
                    className="btn-secondary mr-12"
                    onClick={zebraPrinterButton}
                  >
                    Label Printer
                  </button>
                )}
              </div>
              <PBDeviceList
                pbDeviceList={balanceDeviceList}
                onConnectPBDevice={onConnectPBDevice}
                onDisconnectPBDevice={onDisconnectCurrentPBDevice}
                onGoBackToMeasure={onGoBackToMeasure}
                connectedPBDevice={connectedPBDevice}
                instanceURL={instanceURL}
              />
              <Pagination currentStep={currentPage} />
              <HomeFooter />
              {connectModal && (
                <ConnectModal
                  onConfirm={handleGotoInstance}
                  onCancel={handleNext}
                />
              )}
              {deviceConnectionStatus && (
                <PopupModal
                  isSuccess={false}
                  title="Device Disconnected !!"
                  message="Please verify the device connection or select another device !!"
                  onConfirm={handleRetry}
                  confirmBtnText="Reconnect"
                  onCancel={handleBack}
                  cancelBtnText="Select Device"
                />
              )}
              {disconnectModal && (
                <DisConnectModal
                  onConfirm={handleRetry}
                  onCancel={handleBack}
                  deviceType={pbDeviceType}
                />
              )}
              {error && (
                <PopupModal
                  isSuccess={false}
                  title="Error"
                  message={error}
                  onConfirm={() => setError('')}
                  confirmBtnText="OK"
                />
              )}
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
              currentPage={currentPage}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default DevicePrecision;
