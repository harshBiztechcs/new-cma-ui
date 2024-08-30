/* eslint-disable react/prop-types */
import React, { useEffect, useState } from 'react';
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

  const getMessage = () => {
    if (secondsLeft > 0) {
      return showThirdPartyAPIPage
        ? `Please reconnect to the network and try again in ${secondsLeft} seconds`
        : `Please reconnect to the network and try again in ${secondsLeft} seconds to refresh the Equipment App page`;
    }
    return showThirdPartyAPIPage
      ? 'Please reconnect to the network'
      : 'Please reconnect to the network and refresh the Equipment App page';
  };

  let handleConfirm = null;
  let confirmBtnText = null;

  if (networkConnection !== false && secondsLeft === 0) {
    handleConfirm = onRetry;
    confirmBtnText = 'Retry';
  }

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
              message={getMessage()}
              onConfirm={handleConfirm}
              confirmBtnText={confirmBtnText}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default InternetConnectionLost;
