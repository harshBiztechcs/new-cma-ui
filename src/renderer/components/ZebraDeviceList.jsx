import React, { useEffect, useRef, useState } from 'react';
import { GET_DEVICE_INSTANCE_URL, deviceStatusType } from 'utility/constants';
import i1pro3Icon from '../assets/image/i1pro3.jpeg';
import i1pro2Icon from '../assets/image/i1pro2.jpeg';
import ci64Icon from '../assets/image/ci64.jpeg';
import exactIcon from '../assets/image/exact.png';
import exact2Icon from '../assets/image/exact2.png';
import i1ioIcon from '../assets/image/i1io.jpeg';
import precisionBalanceIcon from '../assets/image/Precision-balance.png';
import onlineIndicatorImg from '../assets/image/online-indicator.svg';
import labelPrinterIcon from '../assets/image/zebra.jpg';

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
    case 'label_printer':
      return labelPrinterIcon;
      break;
    default:
      return i1pro3Icon;
      break;
  }
};

function ZebraDeviceList({
  zebraDeviceList,
  onConnectZebraDevice,
  onDisconnectcurrentZebraeDevice,
  lastConnectedZebra,
  onGoBackToMeasure,
  instanceURL,
}) {
  const [device, setDevice] = useState(lastConnectedZebra);

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
    ipcRenderer.send(GET_DEVICE_INSTANCE_URL, instanceURL);
  };

  const render =
    zebraDeviceList.length == 0 ? (
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
            {zebraDeviceList.map((dev, index) => (
              <tr
                key={dev.deviceId}
                style={getListStyle(
                  dev.status,
                  dev.deviceId == lastConnectedZebra
                )}
              >
                <td>
                  <div className="d-flex align-items-center">
                    <label className="custom-checkbox">
                      <input
                        type="radio"
                        name="deviceSelection"
                        defaultChecked={dev.deviceId == lastConnectedZebra}
                        // defaultChecked={dev.status == 'connected'}
                        // disabled={dev.status !== 'available'}
                        disabled={
                          lastConnectedZebra || dev.status !== 'available'
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
                  {dev.deviceId == lastConnectedZebra &&
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
                {device && !lastConnectedZebra && (
                  <button
                    className="btn-primary mr-12"
                    onClick={() => onConnectZebraDevice(device)}
                    disabled={!device}
                  >
                    Connect
                  </button>
                )}
                {lastConnectedZebra && (
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
                      onClick={() => onDisconnectcurrentZebraeDevice(device)}
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

export default ZebraDeviceList;
