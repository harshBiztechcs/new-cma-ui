import React, { useEffect, useState } from 'react';
import AlwanAPI from './AlwanAPI';
import ColorGate from './ColorGate';
import DevicePageTitle from './DeviceHeader';
import HomeFooter from './HomeFooter';
import Pagination from './Pagination';
import PopupModal from './PopupModal';

export default function ThirdPartyAPI({
  onLogout,
  handleRefresh,
  username,
  instanceURL,
  onThirdPartyAPI,
  colorGateAPILog,
  socketConnection,
  colorGateConnection,
  setColorGateConnection,
  colorGateSocketConnection,
  colorGatePopupTitle,
  colorGatePopupError,
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
  currentPage,
}) {
  const [activeTab, setActiveTab] = useState('colorgate');

  return (
    <div className="right-side">
      <DevicePageTitle
        title="API Connector"
        subtitle="Software connection settings"
        onLogout={onLogout}
        onRefresh={handleRefresh}
        onGoBack={() => onThirdPartyAPI(false)}
        username={username}
        instanceURL={instanceURL}
      />
      <h3 className="page-title">
        API connection settings for Colorportal Enterprise
      </h3>
      <div className="tab">
        <button
          className={activeTab == 'colorgate' ? 'active' : ''}
          onClick={() => setActiveTab('colorgate')}
        >
          CMA ColorPack
        </button>
        <button
          className={activeTab == 'alwan' ? 'active' : ''}
          onClick={() => setActiveTab('alwan')}
        >
          CMA ColorServer
        </button>
      </div>
      <div className="tab-content">
        <div
          style={{
            display: activeTab == 'colorgate' ? 'block' : 'none',
          }}
        >
          <ColorGate
            {...{
              instanceURL,
              colorGateAPILog,
              socketConnection,
              colorGateConnection,
              setColorGateConnection,
              colorGateSocketConnection,
              socketConnectionInProgress,
              setSocketConnectionInProgress,
            }}
          />
        </div>
        <div
          style={{
            display: activeTab == 'alwan' ? 'block' : 'none',
          }}
        >
          <AlwanAPI
            {...{
              instanceURL,
              alwanAPILog,
              socketConnection,
              alwanConnection,
              setAlwanConnection,
              alwanSocketConnection,
              alwanSocketConnectionInProgress,
              setAlwanSocketConnectionInProgress,
            }}
          />
        </div>
      </div>
      <Pagination currentStep={currentPage} />
      <HomeFooter />
      {colorGatePopupError && (
        <PopupModal
          isSuccess={false}
          title={colorGatePopupTitle}
          message={colorGatePopupError}
          onConfirm={() => setColorGatePopupError('')}
          confirmBtnText="OK"
        />
      )}
      {alwanPopupError && (
        <PopupModal
          isSuccess={false}
          title={alwanPopupTitle}
          message={alwanPopupError}
          onConfirm={() => setAlwanPopupError('')}
          confirmBtnText="OK"
        />
      )}
    </div>
  );
}
