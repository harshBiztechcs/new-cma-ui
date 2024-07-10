import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import HomeFooter from 'renderer/components/HomeFooter';
import Pagination from 'renderer/components/Pagination';
import PopupModal from 'renderer/components/PopupModal';
import Timeline from 'renderer/components/Timeline';
import cmaConnectIcon from '../assets/image/cma-connect-icon.png';

function InternetConnectionLost({
  onRetry,
  showThirdPartyAPIPage,
  networkConnection,
}) {
  const [secondsLeft, setSecondsLeft] = useState(30);

  useEffect(() => {
    const networkInterval = setInterval(() => {
      setSecondsLeft((prevState) => {
        if (prevState > 0) {
          return prevState - 1;
        }
        clearInterval(networkInterval);
        return 0;
      });
    }, 1000);

    return () => {
      clearInterval(networkInterval);
    };
  }, []);

  function getThirdPartyAPIPageMessage() {
    return secondsLeft > 0
      ? `Please reconnect to the network and try after ${secondsLeft} seconds`
      : `Please reconnect to the network`;
  }

  function getEquipmentAppPageMessage() {
    return secondsLeft > 0
      ? `Please reconnect to the network and try after ${secondsLeft} seconds to refresh Equipment App page`
      : `Please reconnect to the network and refresh Equipment App page`;
  }

  const message = showThirdPartyAPIPage
    ? getThirdPartyAPIPageMessage()
    : getEquipmentAppPageMessage();

  const isConfirmEnabled = networkConnection && secondsLeft <= 0;
  const confirmBtnText = isConfirmEnabled ? 'Retry' : undefined;

  return (
    <div id="main" className="cma-connect-page">
      <div className="container-fluid">
        <div className="d-flex flex-wrap h-100">
          <Timeline currentStep={1} />
          <div className="right-side">
            <div className="center-section">
              <div className="server-connection-screen">
                <img src={cmaConnectIcon} alt="CMA Connect Icon" />
                <span>Please wait while retrieving your licences</span>
              </div>
            </div>
            <Pagination currentStep={1} />
            <HomeFooter />
            <PopupModal
              isSuccess={false}
              title="Network Connection Lost !!"
              message={message}
              onConfirm={isConfirmEnabled ? onRetry : undefined}
              confirmBtnText={confirmBtnText}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

InternetConnectionLost.propTypes = {
  onRetry: PropTypes.func.isRequired,
  showThirdPartyAPIPage: PropTypes.bool.isRequired,
  networkConnection: PropTypes.bool.isRequired,
};

export default InternetConnectionLost;
