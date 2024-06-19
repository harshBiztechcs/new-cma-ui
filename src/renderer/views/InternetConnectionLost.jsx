import React, { useEffect, useState } from 'react';
import HomeFooter from 'renderer/components/HomeFooter';
import Pagination from 'renderer/components/Pagination';
import PopupModal from 'renderer/components/PopupModal';
import Timeline from 'renderer/components/Timeline';
import cmaConnectIcon from '../assets/image/cma-connect-icon.png';

function InternetConnectionLost({ onRetry, showThirdPartyAPIPage, networkConnection }) {
  const [secondsLeft, setSecondsLeft] = useState(30);

  useEffect(() => {
    let counter = 30;
    let networkInterval = setInterval(() => {
      setSecondsLeft((prevState) => {
        if (prevState > 0) {
          return prevState - 1;
        } else {
          clearInterval(networkInterval);
          return 0;
        }
      });
    }, 1000);

    return () => {
      clearInterval(networkInterval);
    };
  }, []);

  return (
    <div id="main" className="cma-connect-page">
      <div className="container-fluid">
        <div className="d-flex flex-wrap h-100">
          <Timeline currentStep={1} />
          <div className="right-side">
            <div className="center-section">
              <div className="server-connection-screen">
                <img src={cmaConnectIcon} alt="CMA Connect Icon"></img>
                <span>Please wait while retrieving your licences 02</span>
              </div>
            </div>
            <Pagination currentStep={1} />
            <HomeFooter />
            <PopupModal
              isSuccess={false}
              title="Network Connection Lost !!"
              message={
                secondsLeft > 0
                  ? showThirdPartyAPIPage
                    ? `Please reconnect to the network and try after ${secondsLeft} seconds`
                    : `Please reconnect to the network and try after ${secondsLeft} seconds to refresh Equipment App page`
                  : showThirdPartyAPIPage
                  ? `Please reconnect to the network`
                  : `Please reconnect to the network and refresh Equipment App page`
              }
              onConfirm={networkConnection === false ? false : (secondsLeft > 0 ? false : onRetry)}
              confirmBtnText={secondsLeft > 0 ? false : 'Retry'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default InternetConnectionLost;
