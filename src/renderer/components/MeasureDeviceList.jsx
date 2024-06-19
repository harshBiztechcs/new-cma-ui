import React from 'react';
import { deviceStatusType } from 'utility/constants';
import i1pro3Icon from '../assets/image/i1pro3.jpeg';
import i1pro2Icon from '../assets/image/i1pro2.jpeg';
import ci64Icon from '../assets/image/ci64.jpeg';
import exactIcon from '../assets/image/exact.png';
import exact2Icon from '../assets/image/exact2.png';
import CMAROP64EUVIcon from '../assets/image/CMA-ROP64E-UV.png';
import i1ioIcon from '../assets/image/i1io.jpeg';
import onlineIndicatorImg from '../assets/image/online-indicator.svg';

const getDeviceImg = (deviceType) => {
  switch (deviceType) {
    case 'I1PRO3':
      return i1pro3Icon;
    case 'I1PRO2':
      return i1pro2Icon;
    case 'CI64':
      return ci64Icon;
    case 'CI64UV':
      return ci64Icon;
    case 'CI62':
      return ci64Icon;
    case 'EXACT':
      return exactIcon;
    case 'EXACT2':
      return exact2Icon;
    case 'I1IO3':
      return i1ioIcon;
    case 'I1IO2':
      return i1ioIcon;
    case 'CMA-ROP64E-UV':
    case 'CMA-ROP64E-UV-BT':
      return CMAROP64EUVIcon;
    default:
      return i1pro3Icon;
  }
};

function MeasureDeviceList({ deviceList, currentDevice }) {
  const statusClassList = {
    connected: 'status connected',
    available: 'status available',
    not_available: 'status not-available',
  };

  return (
    <tbody>
      {deviceList.map((dev) => (
        <tr key={dev.deviceId}>
          <td>
            <div className="d-flex align-items-center">
              <label className="custom-checkbox">
                <input
                  type="radio"
                  name="deviceSelection"
                  disabled
                  defaultChecked={dev.deviceId == currentDevice}
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
          <td>
            <div className="product-detail">
              <p className="user-serial">{dev.serial ?? ''}</p>
            </div>
          </td>
          <td>
            <div className="product-detail">
              <p className="user-name">{dev.username ?? ''}</p>
              <p className="user-id">{dev.email ?? ''}</p>
            </div>
          </td>
          <td>
            {dev.status == 'available' ? (
              <div
                className="status waiting-to-connect"
                style={{ fontSize: '8px' }}
              >
                Waiting To Connect
              </div>
            ) : (
              <div className={statusClassList[dev.status]}>
                {deviceStatusType[`${dev.status}`]}
              </div>
            )}
          </td>
        </tr>
      ))}
    </tbody>
  );
}

export default MeasureDeviceList;
