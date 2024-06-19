import React, { useEffect, useRef, useState } from 'react';
import {
  GET_DEVICE_INSTANCE_URL,
  SEND_OPEN_URL_TO_INPUT,
  URL_OPENED_BROWSER,
  deviceStatusType,
} from 'utility/constants';
import i1pro3Icon from '../assets/image/i1pro3.jpeg';
import i1pro2Icon from '../assets/image/i1pro2.jpeg';
import ci64Icon from '../assets/image/ci64.jpeg';
import exactIcon from '../assets/image/exact.png';
import exact2Icon from '../assets/image/exact2.png';
import i1ioIcon from '../assets/image/i1io.jpeg';
import precisionBalanceIcon from '../assets/image/Precision-balance.png';
import barcodeReaderIcon from '../assets/image/scanner.jpg';
import onlineIndicatorImg from '../assets/image/online-indicator.svg';

const getDeviceImg = (deviceType) => {
  switch (deviceType) {
    case 'I1PRO3':
      return i1pro3Icon;
      break;
    case 'I1PRO2':
      return i1pro2Icon;
      break;
    case 'CI64':
      return ci64Icon;
      break;
    case 'CI64UV':
      return ci64Icon;
      break;
    case 'CI62':
      return ci64Icon;
      break;
    case 'EXACT':
      return exactIcon;
      break;
    case 'EXACT2':
      return exact2Icon;
      break;
    case 'I1IO3':
      return i1ioIcon;
      break;
    case 'I1IO2':
      return i1ioIcon;
      break;
    case 'PRECISION_BALANCE':
      return precisionBalanceIcon;
      break;
    case 'barcode_reader':
      return barcodeReaderIcon;
      break;
    default:
      return i1pro3Icon;
      break;
  }
};

function BarcodeDeviceList({
  barcodeDeviceList,
  onConnectBarcodeDevice,
  onDisconnectCurrentBarcodeDevice,
  lastConnectedBarcode,
  onGoBackToMeasure,
  instanceURL,
}) {
  const [device, setDevice] = useState(lastConnectedBarcode);

  const statusClassList = {
    connected: 'status connected',
    available: 'status available',
    not_available: 'status not-available',
  };

  const getListStyle = (status, isCurrent) => {
    if (status == 'not_available') {
      return { backgroundColor: 'whitesmoke' };
    }
    if (status == 'connected' && !isCurrent) {
      return { backgroundColor: 'whitesmoke' };
    }
    return {};
  };

  const onGoToInstance = async () => {
    window.electron.ipcRenderer.send(GET_DEVICE_INSTANCE_URL, instanceURL);
  };

  const render =
    barcodeDeviceList.length == 0 ? (
      <p style={{ textAlign: 'center' }}>No Devices Available Currently</p>
    ) : (
      <div className="products-list">
        <table
          className="table productselect-table scrolling-table"
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
          <tbody>
            {barcodeDeviceList.map((dev, index) => (
              <tr
                key={dev.deviceId}
                style={getListStyle(
                  dev.status,
                  dev.deviceId == lastConnectedBarcode
                )}
              >
                <td>
                  <div className="d-flex align-items-center">
                    <label className="custom-checkbox">
                      <input
                        type="radio"
                        name="deviceSelection"
                        defaultChecked={dev.deviceId == lastConnectedBarcode}
                        // defaultChecked={dev.status == 'connected'}
                        // disabled={dev.status !== 'available'}
                        disabled={
                          lastConnectedBarcode || dev.status !== 'available'
                        }
                        onChange={() => {
                          setDevice(dev.deviceId);
                        }}
                      />
                      <span className="checkmark"></span>
                    </label>
                    <div className="product-thumbnail">
                      <img
                        className="product-img"
                        src={getDeviceImg(dev.deviceType)}
                        alt="Product"
                      ></img>
                      {dev.status == 'connected' && (
                        <img
                          className="connected_indicator"
                          src={onlineIndicatorImg}
                          alt="Online Indicator"
                        ></img>
                      )}
                    </div>
                    <div className="product-detail">
                      <p className="device-name">{dev.name ?? ''}</p>
                      <p className="licence-id">{dev.license ?? ''}</p>
                    </div>
                  </div>
                </td>
                <td>{dev.serial_id ?? ''}</td>
                <td>
                  <p className="user-name">{dev.username ?? ''}</p>
                  <p className="user-id">{dev.email ?? ''}</p>
                </td>
                <td>
                  {dev.deviceId == lastConnectedBarcode &&
                  dev.status == 'available' ? (
                    <div
                      className="status waiting-to-connect"
                      style={{ fontSize: '8px' }}
                    >
                      Waiting To Connect
                    </div>
                  ) : (
                    <div className={statusClassList[dev.status]}>
                      {deviceStatusType[`${dev.status}`] ?? ''}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="4">
                {device && !lastConnectedBarcode && (
                  <button
                    className="btn-primary mr-12"
                    onClick={() => onConnectBarcodeDevice(device)}
                    disabled={!device}
                  >
                    Connect
                  </button>
                )}
                {lastConnectedBarcode && (
                  <>
                    <button
                      className="btn-primary mr-12"
                      onClick={onGoToInstance}
                    >
                      Go to instance
                    </button>
                    <button
                      className="btn-primary mr-12"
                      disabled={!device}
                      onClick={() => onDisconnectCurrentBarcodeDevice(device)}
                    >
                      Disconnect
                    </button>
                  </>
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    );

  return render;
}

export default BarcodeDeviceList;
