import React from 'react';
import cmaConnectIcon from '../assets/image/cma-connect-icon.png';
function DevicePageTitle({
  title,
  subtitle,
  onLogout,
  onRefresh,
  onThirdPartyAPI,
  onGoBack,
  username,
  instanceURL,
}) {
  return (
    <div className="title-header">
      <div className="d-flex justify-content-between">
        <div className="title-header-left">
          <div className="d-flex">
            <div><img src={cmaConnectIcon} alt="CMA Connect Icon" /></div>
            <div className="title-box">
              <h1>{title}</h1>
              <p className="sub-title">{subtitle}</p>
            </div>
          </div>
        </div>
        <div className="title-header-right">
          {onThirdPartyAPI && (
            <button
              className="btn-secondary mr-12"
              onClick={() => onThirdPartyAPI(true)}
            >
              API Connector
            </button>
          )}
          {onGoBack && (
            <button className="btn-secondary mr-12" onClick={onGoBack}>
              Go Back
            </button>
          )}
          <button className="btn-secondary mr-12" onClick={onRefresh}>
            Refresh
          </button>
          <div className="dropdown">
            <button className="btn-primary dropbtn">My Profile</button>
            <div className="dropdown-content">
              <div>{username}</div>
              <div>{instanceURL.replace(/(^\w+:|^)\/\//, '')}</div>
              <div
                role="button"
                onClick={onLogout}
                style={{ color: 'red', cursor: 'pointer' }}
              >
                Log out
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DevicePageTitle;
