import React from 'react';
import TimelineFooter from './TimelineFooter';
import TimelineHeader from './TimelineHeader';
import checkSvg from '../assets/image/tick.svg';
import { css } from '@emotion/css';

const checkSvgStyle = css`
  &::before {
    background: #fff url(${checkSvg}) no-repeat center !important;
    z-index: 5;
    transition: none !important;
  }
`;

function Timeline({ currentStep, handleCheckUpdate, isNewUpdateAvailable }) {
  const serverConnClass =
    currentStep > 1 ? checkSvgStyle : currentStep == 1 ? 'checked' : '';
  const selectDeviceClass =
    currentStep > 2 ? checkSvgStyle : currentStep == 2 ? 'checked' : '';
  const connectDeviceClass =
    currentStep > 3 ? checkSvgStyle : currentStep == 3 ? 'checked' : '';
  const measureClass =
    currentStep > 4 ? checkSvgStyle : currentStep == 4 ? 'checked' : '';

  return (
    <div className="left-side">
      <TimelineHeader />
      <div className="middle-section">
        <div className="custom-timeline">
          <ul>
            <li className={serverConnClass}>
              <p className="item-title">Server connection</p>
              <p className="item-sub-title">Retrieve your licence</p>
            </li>
            <li className={selectDeviceClass}>
              <p className="item-title">Select device</p>
              <p className="item-sub-title">Choose the spectro device</p>
            </li>
            <li className={connectDeviceClass}>
              <p className="item-title">Connect</p>
              <p className="item-sub-title">Verify device connection</p>
            </li>
            <li className={measureClass}>
              <p className="item-title">Ready to measure</p>
              <p className="item-sub-title">Measure from your instance</p>
            </li>
          </ul>
        </div>
      </div>
      <TimelineFooter
        onCheckUpdate={handleCheckUpdate}
        isNewUpdateAvailable={isNewUpdateAvailable}
      />
    </div>
  );
}

export default Timeline;
