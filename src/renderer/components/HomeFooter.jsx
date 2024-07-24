import React from 'react';
import { GET_APP_VERSION } from 'utility/constants';
import emailIcon from '../assets/image/email_icon.svg';

const { ipcRenderer } = window.require('electron');
const currentAppVersion = ipcRenderer.sendSync(GET_APP_VERSION);

function HomeFooter() {
  const currentYear = new Date().getFullYear();
  return (
    <div className='right_side-footer'>
      <div>
        <span>{`© CMA IMAGING ${currentYear}.`}</span>
        <span>{`CMA Connect Version ${currentAppVersion}`}</span>
        <span>
          Support :{' '}
          <a
            href="mailto:help@cmaimaging.com">
            <img
              src={emailIcon}
              alt="Email Icon"
            />{' '}
            help@cmaimaging.com
          </a>
        </span>
      </div>
    </div>
  );
}

export default HomeFooter;
