import React, { useEffect, useRef, useState } from 'react';
import Papa from 'papaparse';
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
  CURRENT_TAB_UPDATE,
} from 'utility/constants';
import MeasureDeviceList from 'renderer/components/MeasureDeviceList';
import PopupModal from 'renderer/components/PopupModal';
import { downloadCSV } from 'utility/DownloadCSV';
import Loader from 'renderer/components/Loader';
import MultiFilesSelector from 'renderer/components/MultiFilesSelector';
import ThirdPartyAPI from 'renderer/components/ThirdPartyAPI';
import HomeFooter from 'renderer/components/HomeFooter';
const { ipcRenderer } = window.require('electron');

function DeviceMeasurement({
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
  setisPrecisionShow,
  balanceDeviceList,
  barcodeDeviceList,
  setIsBarcodeOnShow,
  zebraDeviceList,
  setIsZebraOnShow,
}) {
  const [currentAction, setCurrentAction] = useState('');
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
  const [deviceConnectionInterval, setDeviceConnectionInterval] = useState(0);
  const csvFileRef = useRef(null);

  useEffect(() => {
    // register current action event
    ipcRenderer.on(GET_DEVICE_AND_LICENSES, onDeviceAndLicensesRes);
    ipcRenderer.on(CURRENT_ACTION, onCurrentAction);
    ipcRenderer.on(CHECK_DEVICE_CONNECTION, onCheckDeviceConnection);
    ipcRenderer.on(CLOSE_DEVICE, onCloseDevice);
    ipcRenderer.on(SHOW_DIALOG, onShowDialog);
    ipcRenderer.on(GET_SAMPLES_DATA, onSamplesData);
    ipcRenderer.on(CLEAR_SAMPLES, onClearSamplesRes);
    ipcRenderer.on(DEVICE_DISCONNECT_TIMEOUT, onDeviceDisconnectTimeout);
    ipcRenderer.on(GET_DEVICE_INSTANCE_URL, onGetDeviceInstanceLink);
    ipcRenderer.on(DEVICE_CONNECTION, onDeviceConnection);
    ipcRenderer.on(DEVICE_DISCONNECTION, onDeviceRelease);
    ipcRenderer.on(MEASURE_IN_PROGRESS, onMeasureInProgress);
    ipcRenderer.on(REFRESH_DEVICES_AND_LICENSES, onRefreshDevicesLicenses);
    //get latest device list and licenses
    handleRefresh();

    //unregister current action event
    return () => {
      ipcRenderer.removeListener(
        GET_DEVICE_AND_LICENSES,
        onDeviceAndLicensesRes
      );
      ipcRenderer.removeListener(CURRENT_ACTION, onCurrentAction);
      ipcRenderer.removeListener(
        CHECK_DEVICE_CONNECTION,
        onCheckDeviceConnection
      );
      ipcRenderer.removeListener(CLOSE_DEVICE, onCloseDevice);
      ipcRenderer.removeListener(SHOW_DIALOG, onShowDialog);
      ipcRenderer.removeListener(GET_SAMPLES_DATA, onSamplesData);
      ipcRenderer.removeListener(CLEAR_SAMPLES, onClearSamplesRes);
      ipcRenderer.removeListener(
        DEVICE_DISCONNECT_TIMEOUT,
        onDeviceDisconnectTimeout
      );
      ipcRenderer.removeListener(
        GET_DEVICE_INSTANCE_URL,
        onGetDeviceInstanceLink
      );
      ipcRenderer.removeListener(DEVICE_CONNECTION, onDeviceConnection);
      ipcRenderer.removeListener(DEVICE_DISCONNECTION, onDeviceRelease);
      ipcRenderer.removeListener(MEASURE_IN_PROGRESS, onMeasureInProgress);
      ipcRenderer.removeListener(
        REFRESH_DEVICES_AND_LICENSES,
        onRefreshDevicesLicenses
      );
      stopCheckDeviceConnectionInterval();
    };
  }, []);

  useEffect(() => {
    if (deviceList.length && currentDevice) {
      const device = deviceList.find((x) => x.deviceId == currentDevice);
      if (device) startCheckDeviceConnectionInterval(device.deviceType);
    }
  }, [deviceList, currentDevice]);

  useEffect(() => {
    const device = deviceList.find((x) => x.deviceId == currentDevice);
    if (updateDeviceStatus && isDisconnected) {
      ipcRenderer.send(UPDATE_DEVICE_RECONNECTION, device);
      ipcRenderer.send(DEVICE_RECONNECT_API_CALL, {
        instanceURL,
        deviceName: device?.deviceType,
        deviceId: device?.deviceId,
      });
      handleRefresh();
      setIsDisconnected(false);
    }
    if (!updateDeviceStatus) {
      ipcRenderer.send(DISCONNECT_DEVICE, device);
      ipcRenderer.send(DEVICE_DISCONNECT_API_CALL, {
        instanceURL,
        deviceName: device?.deviceType,
        deviceId: device?.deviceId,
      });
      handleRefresh();
      setIsDisconnected(true);
    }
  }, [updateDeviceStatus]);

  const startCheckDeviceConnectionInterval = (deviceType) => {
    setDeviceConnectionInterval((interval) => {
      clearInterval(interval);
      const intervalCount = setInterval(() => {
        if (
          deviceType !== 'I1IO3' ||
          deviceType !== 'I1IO2' ||
          device.deviceType !== 'CI62_COLORSCOUT' ||
          device.deviceType !== 'CI64_COLORSCOUT'
        ) {
          ipcRenderer.send(CHECK_DEVICE_CONNECTION, deviceType);
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
  const onShowDialog = (_, args) => {
    if (args.message == 'Requested CMA client not found') {
      // setError('Requested action not completed!!');
      // setErrorBtnText('Retry On Instance');
      // Do nothing
    } else if (
      args.message == 'Requested CMA-connect client is already available'
    ) {
      //do nothing
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
    startCheckDeviceConnectionInterval(args.deviceType);
    setIsSampleInProgress(false);
  };

  const onCurrentAction = (event, args) => {
    setCurrentAction(args);
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
    ipcRenderer.send(GET_SAMPLES_DATA, device?.deviceType);
  };

  const onClearSamples = () => {
    stopCheckDeviceConnectionInterval();
    setLoadingMsg('Clearing samples, please wait...');
    setIsSampleInProgress(true);
    const device = deviceList.find((x) => x.deviceId == currentDevice);
    ipcRenderer.send(CLEAR_SAMPLES, device?.deviceType);
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
      //TODO : release device licenses here by calling main
      onDeviceDisConnect(currentDevice);
    } else {
      setError(args.error ?? 'Device Disconnection Failed !!');
      setErrorBtnText('OK');
    }
  };

  const onGoToInstance = async () => {
    ipcRenderer.send(GET_DEVICE_INSTANCE_URL, instanceURL);
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
    ipcRenderer.send(CLOSE_DEVICE, {
      forceClose: false,
      deviceType,
      deviceId: currentDevice,
      instanceURL,
    });
  };

  const onDisconnectCurrentDevice = () => {
    const device = deviceList.find((x) => x.deviceId == currentDevice);
    ipcRenderer.send(CLOSE_DEVICE, {
      forceClose: false,
      deviceType: device?.deviceType,
      deviceId: device?.deviceId,
      instanceURL,
    });
  };

  const handleRefresh = () => {
    ipcRenderer.send(GET_DEVICE_AND_LICENSES, { instanceURL, username, token });
  };

  const onRefreshDevicesLicenses = (_, args) => {
    setTimeout(() => {
      handleRefresh();
    }, 3000);
  };

  const onDeviceAndLicensesRes = (_, args) => {
    onGetDeviceAndLicenses(args);
  };

  const onDeviceConnection = (_, args) => {
    //if device connected successfully from equipment app then refresh device list and licenses
    if (args) {
      const device = deviceList.find((x) => x.deviceId == currentDevice);
      if (
        device?.deviceType == 'CMA-ROP64E-UV-BT' ||
        device?.deviceType == 'CMA-ROP64E-UV-BT_COLORSCOUT'
      ) {
        function delayedAction(delay) {
          setTimeout(() => {
            handleRefresh();
          }, delay);
        }

        delayedAction(3000);
        delayedAction(6000);
        delayedAction(8000);
        delayedAction(10000);
      }
      setTimeout(() => {
        handleRefresh();
      }, 3000);
      setTimeout(() => {
        handleRefresh();
      }, 10000);
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
    ipcRenderer.send(CLOSE_DEVICE, {
      forceClose: true,
      deviceType: device?.deviceType,
      deviceId: device?.deviceId,
      instanceURL,
    });
  };

  //combine multiple csv files
  const onCombineFiles = async () => {
    const combinedData = [];
    if (csvFileRef.current?.files) {
      //check minimum 2 files requirement, if not return from function
      if (csvFileRef.current?.files.length < 2) {
        setErrorTitle('Files Combine Error');
        setError('Please select at least 2 files');
        return;
      }

      //continue if at least 2 files provided
      setLoadingMsg(`Combining ${csvFileRef.current.files.length} files...`);
      setIsSampleInProgress(true);

      let hasIncompatibleFile = false;
      const fileList = Array.from(csvFileRef.current.files);

      //check if file other than csv type
      fileList.every((file) => {
        if (file.type != 'text/csv') {
          hasIncompatibleFile = true;
          return false;
        }
        return true;
      });

      //if there are files type other than csv, give error and return from function
      if (hasIncompatibleFile) {
        setIsSampleInProgress(false);
        setErrorTitle('Files Combine Error');
        setError('All files should be in csv format');
        return;
      }

      //continue if no error
      let commonHeaderArray = null;
      let errorCombiningFiles = false;
      for (let index = 0; index < fileList.length; index++) {
        //wait for every file to complete parsing
        const parseResult = await new Promise((resolve) =>
          Papa.parse(fileList[index], {
            skipEmptyLines: true,
            header: true,
            error: (err, file, inputElem, reason) => {
              // executed if an error occurs while loading the file,
              setIsSampleInProgress(false);
              setErrorTitle('Files Combine Error');
              setError('Error while parsing file');
              resolve(false);
            },
            complete: (results, file) => {
              //after completing parsing file
              if (results.errors.length > 0) {
                setIsSampleInProgress(false);
                setErrorTitle('Files Combine Error');
                setError('Incompatible File(s)');
                resolve(false);
              }

              //push in common array and update the statusenvironment
              combinedData.push(...results.data);
              setLoadingMsg(`File processed ${index + 1}`);

              if (index == 0) {
                //get first file header array as common header array
                commonHeaderArray = results.meta.fields;
              } else {
                //compare all other files header with first file header
                const hasSameHeader =
                  JSON.stringify(commonHeaderArray) ==
                  JSON.stringify(results.meta.fields);
                if (!hasSameHeader) {
                  setIsSampleInProgress(false);
                  setErrorTitle('Files Combine Error');
                  setError(`File ${file.name} headers are not same`);
                  resolve(false);
                }
              }
              //if no error resolve true for current file
              resolve(true);
            },
          })
        );

        //if any error parsing any file stop processing further and break from the loop
        if (!parseResult) {
          errorCombiningFiles = true;
          break;
        }
      }

      //if any error combining file return
      if (errorCombiningFiles) return;

      //combined results after all files complete
      await new Promise((resolve) => setTimeout(() => resolve(true), 10));
      setLoadingMsg(`All Files Combined`);
      await new Promise((resolve) => setTimeout(() => resolve(true), 10));
      const combinedCSV = Papa.unparse(combinedData, { header: true });
      const csvData = new Blob([combinedCSV], {
        type: 'text/csv;charset=utf-8;',
      });
      var tempLink = document.createElement('a');
      tempLink.href = window.URL.createObjectURL(csvData);
      tempLink.setAttribute('download', `samples(${combinedData.length}).csv`);
      setIsSampleInProgress(false);
      setInfoTitle('Sample files combined successfully');
      setInfo(`Total ${combinedData.length} color samples combined`);
      tempLink.click();
    }
  };

  //combine multiple csv files
  const handleFileCombine = async (files) => {
    const combinedData = [];
    if (files) {
      //check minimum 2 files requirement, if not return from function
      if (files.length < 2) {
        setErrorTitle('Files Combine Error');
        setError('Please select at least 2 files');
        return;
      }

      //continue if at least 2 files provided
      setLoadingMsg(`Combining ${files.length} files...`);
      setIsSampleInProgress(true);

      let hasIncompatibleFile = false;
      const fileList = Array.from(files);

      //check if file other than csv type
      fileList.every((file) => {
        if (!file.name.endsWith('csv')) {
          hasIncompatibleFile = true;
          return false;
        }
        return true;
      });

      //if there are files type other than csv, give error and return from function
      if (hasIncompatibleFile) {
        setIsSampleInProgress(false);
        setErrorTitle('Files Combine Error');
        setError('All files should be in csv format');
        return;
      }

      //continue if no error
      let commonHeaderArray = null;
      let errorCombiningFiles = false;
      for (let index = 0; index < fileList.length; index++) {
        //wait for every file to complete parsing
        const parseResult = await new Promise((resolve) =>
          Papa.parse(fileList[index], {
            skipEmptyLines: true,
            header: true,
            error: (err, file, inputElem, reason) => {
              // executed if an error occurs while loading the file,
              setIsSampleInProgress(false);
              setErrorTitle('Files Combine Error');
              setError('Error while parsing file');
              resolve(false);
            },
            complete: (results, file) => {
              //after completing parsing file
              if (results.errors.length > 0) {
                setIsSampleInProgress(false);
                setErrorTitle('Files Combine Error');
                setError('Incompatible File(s)');
                resolve(false);
              }

              //push in common array and update the status
              combinedData.push(...results.data);
              setLoadingMsg(`File processed ${index + 1}`);

              if (index == 0) {
                //get first file header array as common header array
                commonHeaderArray = results.meta.fields;
              } else {
                //compare all other files header with first file header
                const hasSameHeader =
                  JSON.stringify(commonHeaderArray) ==
                  JSON.stringify(results.meta.fields);
                if (!hasSameHeader) {
                  setIsSampleInProgress(false);
                  setErrorTitle('Files Combine Error');
                  setError(`File ${file.name} headers are not same`);
                  resolve(false);
                }
              }
              //if no error resolve true for current file
              resolve(true);
            },
          })
        );

        //if any error parsing any file stop processing further and break from the loop
        if (!parseResult) {
          errorCombiningFiles = true;
          break;
        }
      }

      //if any error combining file return
      if (errorCombiningFiles) return;

      //combined results after all files complete
      await new Promise((resolve) => setTimeout(() => resolve(true), 10));
      setLoadingMsg(`All Files Combined`);
      await new Promise((resolve) => setTimeout(() => resolve(true), 10));
      const combinedCSV = Papa.unparse(combinedData, { header: true });
      const csvData = new Blob([combinedCSV], {
        type: 'text/csv;charset=utf-8;',
      });
      var tempLink = document.createElement('a');
      tempLink.href = window.URL.createObjectURL(csvData);
      tempLink.setAttribute('download', `samples(${combinedData.length}).csv`);
      setOpenMultiFileModal(false);
      setIsSampleInProgress(false);
      setInfoTitle('Sample files combined successfully');
      setInfo(`Total ${combinedData.length} color samples combined`);
      tempLink.click();
    }
  };

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
            currentStep={4}
            handleCheckUpdate={handleCheckUpdate}
            isNewUpdateAvailable={isNewUpdateAvailable}
          />
          {!showThirdPartyAPIPage && (
            <div className="right-side">
              <DevicePageTitle
                onLogout={onLogout}
                onRefresh={handleRefresh}
                title="Select the device to connect"
                subtitle="List of licenced devices"
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
              <input type="file" ref={csvFileRef} multiple hidden />
              <div className="products-list">
                <table
                  className="table productselect-table ready-measure-table"
                  cellSpacing="0"
                >
                  <thead>
                    <tr>
                      <th>Device name and licence id</th>
                      <th>Serial #</th>
                      <th>Connected by user</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <MeasureDeviceList
                    deviceList={deviceList}
                    currentDevice={currentDevice}
                  />
                  <tfoot>
                    <tr>
                      <td
                        colSpan="4"
                        style={
                          ['CI62', 'CI64', 'CI64UV'].includes(
                            deviceList.find((x) => x.deviceId == currentDevice)
                              ?.deviceType
                          )
                            ? { padding: '16px 18px' }
                            : {}
                        }
                      >
                        <button
                          className="btn-primary mr-12"
                          onClick={onGoToInstance}
                        >
                          Go to instance
                        </button>
                        <button
                          className="btn-danger mr-12"
                          onClick={onDisconnectCurrentDevice}
                        >
                          Disconnect device
                        </button>
                        <button
                          className="btn-default mr-12"
                          onClick={onChangeDevice}
                        >
                          Change device
                        </button>
                        {process.env.NODE_ENV === 'development' && false && (
                          <button
                            className="btn-default mr-12"
                            onClick={() => setUpdateDeviceStatus(false)}
                          >
                            USB disconnect
                          </button>
                        )}
                        {['CI62', 'CI64', 'CI64UV'].includes(
                          deviceList.find((x) => x.deviceId == currentDevice)
                            ?.deviceType
                        ) && (
                          <>
                            <button
                              className="btn-default mr-12"
                              onClick={onExportSamples}
                              disabled={isSampleInProgress}
                            >
                              Export all samples
                            </button>
                            <button
                              className="btn-default mr-12 mt-12"
                              onClick={onClearSamples}
                              disabled={isSampleInProgress}
                            >
                              Clear all samples
                            </button>
                            <button
                              className="btn-default mt-12"
                              onClick={() => setOpenMultiFileModal(true)}
                              disabled={isSampleInProgress}
                            >
                              Combine samples
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              {process.env.NODE_ENV === 'development' && (
                <div style={{ textAlign: 'center' }}>{currentAction}</div>
              )}
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
                  isSuccess={true}
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
              {openMultiFileModal && (
                <MultiFilesSelector
                  onCancel={() => setOpenMultiFileModal(false)}
                  onConfirm={handleFileCombine}
                  cancelBtnText="Cancel"
                  confirmBtnText="Combine"
                  error={error}
                  isLoading={isSampleInProgress}
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
              currentPage={4}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default DeviceMeasurement;
