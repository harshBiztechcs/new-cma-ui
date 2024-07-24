import React from 'react';
import { css } from '@emotion/css';
import emailIcon from '../assets/image/email_icon.svg';
import checkSvg from '../assets/image/tick.svg';
import { GET_APP_VERSION } from 'utility/constants';

const { ipcRenderer } = window.require('electron');
const currentAppVersion = ipcRenderer.sendSync(GET_APP_VERSION, null);

const checkSvgStyle = css`
  &::before {
    background: #fff url(${checkSvg}) no-repeat center !important;
    z-index: 5;
    transition: none !important;
  }
`;

function TimelineFooter({ onCheckUpdate, isNewUpdateAvailable }) {
  const updateClass = isNewUpdateAvailable ? 'checked' : checkSvgStyle;
  return (
    <div className="footer-section">
      <ul>
        <li>
          <div className={`auto-update ${updateClass}`} onClick={onCheckUpdate}>
            <p className="title">Software Update</p>
            {isNewUpdateAvailable ? (
              <p className="sub-title">New version available</p>
            ) : (
              <p className="sub-title">No updates</p>
            )}
          </div>
        </li>
      </ul>
    </div>
  );
}

export default TimelineFooter;
