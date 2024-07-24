import React, { useEffect, useState } from 'react';
import DevicePageTitle from 'renderer/components/DeviceHeader';
import DeviceLicense from 'renderer/components/DeviceLicense';
import Pagination from 'renderer/components/Pagination';
import Timeline from 'renderer/components/Timeline';
import ConnectModal from 'renderer/components/ConnectModal';
import DisConnectModal from 'renderer/components/DisConnectModal';
import {
  CLOSE_DEVICE,
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
  CURRENT_TAB_UPDATE,
  GET_MAC_ADDRESS,
  SWITCH_TO_YS3060_CONNECTION_MODE,
  CHECK_DEVICE_CONNECTION,
  CHECK_ROP_DEVICE_CONNECTION,
} from 'utility/constants';
import DeviceList from 'renderer/components/DeviceList';
import PopupModal from 'renderer/components/PopupModal';
import ThirdPartyAPI from 'renderer/components/ThirdPartyAPI';
import HomeFooter from 'renderer/components/HomeFooter';
import DeviceScanModal from 'renderer/components/DeviceScanModal';

const { ipcRenderer } = window.require('electron');

function DeviceSelection({
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
  connectedDevice,
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
  const [currentDevice, setCurrentDevice] = useState();
  const [deviceType, setDeviceType] = useState('');
  const [error, setError] = useState('');
  const [isPBActive, setIsPBActive] = useState(false);
  const [scanDeviceListModal, setScanDeviceListModal] = useState(false);
  const [deviceAddress, setDeviceAddress] = useState(null);
  const [isConnectedWithBT, setIsConnectedWithBT] = useState(false);

  useEffect(() => {
    //register on verify device connection event
    //after device has been stored on server with username
    ipcRenderer.on(VERIFY_DEVICE_CONNECTION, onVerifyDeviceConnection);
    ipcRenderer.on(CHECK_ROP_DEVICE_CONNECTION, onCheckDeviceConnection);
    ipcRenderer.on(CLOSE_DEVICE, onCloseDevice);
    ipcRenderer.on(DEVICE_DISCONNECT_TIMEOUT, onDeviceDisconnectTimeout);
    ipcRenderer.on(GET_DEVICE_AND_LICENSES, onDeviceAndLicensesRes);
    ipcRenderer.on(GET_DEVICE_INSTANCE_URL, onGetDeviceInstanceLink);
    ipcRenderer.on(DEVICE_CONNECTION, onDeviceConnection);
    ipcRenderer.on(DEVICE_DISCONNECTION, onDeviceRelease);
    //get latest device list and licenses
    handleRefresh();

    return () => {
      ipcRenderer.removeListener(
        VERIFY_DEVICE_CONNECTION,
        onVerifyDeviceConnection
      );
      ipcRenderer.removeListener(
        CHECK_ROP_DEVICE_CONNECTION,
        onCheckDeviceConnection
      );

      ipcRenderer.removeListener(CLOSE_DEVICE, onCloseDevice);
      ipcRenderer.removeListener(
        DEVICE_DISCONNECT_TIMEOUT,
        onDeviceDisconnectTimeout
      );
      ipcRenderer.removeListener(
        GET_DEVICE_AND_LICENSES,
        onDeviceAndLicensesRes
      );
      ipcRenderer.removeListener(
        GET_DEVICE_INSTANCE_URL,
        onGetDeviceInstanceLink
      );
      ipcRenderer.removeListener(DEVICE_CONNECTION, onDeviceConnection);
      ipcRenderer.removeListener(DEVICE_DISCONNECTION, onDeviceRelease);
    };
  }, []);

  useEffect(() => {
    ipcRenderer.send(GET_MAC_ADDRESS, deviceAddress);
  }, [deviceAddress]);

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

  const onCheckDeviceConnection = (event, args) => {
    if (args) {
      setScanDeviceListModal(true);
      setCurrentPage(3);
    } else {
      setDisconnectModal(true);
      setCurrentPage(3);
    }
  };

  const onCloseDevice = (event, args) => {
    if (args.res) {
      //TODO : send release license call to main after device close
      onDeviceDisConnect(connectedDevice);
    } else {
      setError(args.error ?? 'Device Disconnection Failed !!');
    }
  };

  const onDeviceDisconnectTimeout = (_, args) => {
    if (args && connectedDevice) {
      onDisconnectCurrentDevice(connectedDevice);
    }
  };

  const connectionMode = async (args) => {
    ipcRenderer.send(SWITCH_TO_YS3060_CONNECTION_MODE, { args, instanceURL });
  };

  const onDisconnectCurrentDevice = (deviceId) => {
    const device = deviceList.find((dev) => dev.deviceId == deviceId);

    ipcRenderer.send(CLOSE_DEVICE, {
      forceClose: true,
      deviceType: device?.deviceType,
      deviceId,
      instanceURL,
    });
    handleRefresh();
  };

  const onConnect = async (deviceId) => {
    await connectionMode(false);
    const device = deviceList.find((dev) => dev.deviceId == deviceId);
    setCurrentDevice(deviceId);
    setIsConnectedWithBT(false);
    await connectionMode(false);
    setDeviceType(device?.deviceType);
    if (device) {
      ipcRenderer.send(VERIFY_DEVICE_CONNECTION, device);
    }
  };

  const openLinkInBrowser = async () => {
    ipcRenderer.send(GET_DEVICE_INSTANCE_URL, instanceURL);
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
    onDeviceConnected(currentDevice);
  };

  const handleNext = (checked) => {
    //device disconnection timeout checked
    onHasDeviceDisconnectTimeout(checked);
    setConnectModal(false);
    onDeviceConnected(currentDevice);
  };

  const handleRetry = () => {
    const device = deviceList.find((x) => x.deviceId == currentDevice);
    if (
      device &&
      (device.deviceType === 'I1IO3' || device.deviceType === 'I1IO2')
    ) {
      ipcRenderer.send(DISCONNECT_DEVICE, device);
      ipcRenderer.send(DEVICE_DISCONNECT_API_CALL, {
        instanceURL,
        deviceName: device?.deviceType,
        deviceId: device?.deviceId,
      });
    }
    ipcRenderer.send(VERIFY_DEVICE_CONNECTION, device);
    setDisconnectModal(false);
  };

  const handleBack = () => {
    setCurrentPage(2);
    setDisconnectModal(false);
    setScanDeviceListModal(false);
  };

  const handleSelectDevice = (address) => {
    setDeviceAddress(address);
    setScanDeviceListModal(false);
    const device = deviceList.find((dev) => dev.deviceId == currentDevice);

    if (device) {
      ipcRenderer.send(VERIFY_DEVICE_CONNECTION, device);
    }
  };

  const handleRefresh = () => {
    ipcRenderer.send(GET_DEVICE_AND_LICENSES, { instanceURL, username, token });
  };

  const onDeviceAndLicensesRes = (_, args) => {
    onGetDeviceAndLicenses(args);
  };

  const onDeviceConnection = (_, args) => {
    //if device connected successfully from equipment app then refresh device list and licenses
    if (args) {
      setTimeout(() => {
        handleRefresh();
      }, 3000);
    }
  };

  function onBluetoothConnection(deviceId) {
    const device = deviceList.find((dev) => dev.deviceId == deviceId);
    setCurrentDevice(deviceId);
    setDeviceType(device?.deviceType);
    setIsConnectedWithBT(true);
    connectionMode(true);
    if (device) {
      ipcRenderer.send(CHECK_ROP_DEVICE_CONNECTION, 'CMA-ROP64E-UV-BT');
    }
  }
  const SpectroDeviceButton = () => {
    ipcRenderer.send(CURRENT_TAB_UPDATE, 1);
    setisPrecisionShow(false);
    setIsBarcodeOnShow(false);
    setIsZebraOnShow(false);
  };
  const precisionBalanceButton = () => {
    ipcRenderer.send(CURRENT_TAB_UPDATE, 2);
    setisPrecisionShow(true);
    setIsBarcodeOnShow(false);
    setIsZebraOnShow(false);
  };
  const barcodeScannerButton = () => {
    ipcRenderer.send(CURRENT_TAB_UPDATE, 3);
    setIsBarcodeOnShow(true);
    setisPrecisionShow(false);
    setIsZebraOnShow(false);
  };
  const zebraPrinterButton = () => {
    ipcRenderer.send(CURRENT_TAB_UPDATE, 4);
    setIsZebraOnShow(true);
    setisPrecisionShow(false);
    setIsBarcodeOnShow(false);
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

              <DeviceList
                deviceList={deviceList}
                onConnect={onConnect}
                onDisconnect={onDisconnectCurrentDevice}
                onGoBackToMeasure={onGoBackToMeasure}
                connectedDevice={connectedDevice}
                onBluetoothConnection={onBluetoothConnection}
              />
              <Pagination currentStep={currentPage} />
              <HomeFooter />
              {connectModal && (
                <ConnectModal
                  onConfirm={handleGotoInstance}
                  onCancel={handleNext}
                />
              )}
              {disconnectModal && (
                <DisConnectModal
                  onConfirm={handleRetry}
                  onCancel={handleBack}
                  deviceType={deviceType}
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
              {scanDeviceListModal && (
                <DeviceScanModal
                  onConfirm={handleSelectDevice}
                  onCancel={handleBack}
                  setDisconnectModal={setDisconnectModal}
                  disconnectModal={disconnectModal}
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

export default DeviceSelection;
