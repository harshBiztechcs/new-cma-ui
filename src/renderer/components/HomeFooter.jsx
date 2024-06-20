import React, { useState, useEffect } from 'react';
import { GET_APP_VERSION } from 'utility/constants';
import emailIcon from '../assets/image/email_icon.svg';

function HomeFooter() {
  const [currentAppVersion, setCurrentAppVersion] = useState('');
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const { ipcRenderer } = window.electron;
    ipcRenderer.on(GET_APP_VERSION, (version) => {
      setCurrentAppVersion(version);
    });
    ipcRenderer.send(GET_APP_VERSION);
    return () => {
      ipcRenderer.removeAllListeners(GET_APP_VERSION);
    };
  }, []);

  return (
    <div className="right_side-footer">
      <div>
        <span>{`© CMA IMAGING ${currentYear}.`}</span>
        <span>{`CMA Connect Version ${currentAppVersion}`}</span>
        <span>
          Support :{' '}
          <a href="mailto:help@cmaimaging.com">
            <img src={emailIcon} alt="Email Icon" /> help@cmaimaging.com
          </a>
        </span>
      </div>
    </div>
  );
}

export default HomeFooter;
