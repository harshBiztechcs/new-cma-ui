import React from 'react';
function Pagination({ currentStep }) {
  return (
    <div className="pagination">
      <ul>
        <li className={currentStep == 1 ? 'active' : ''}>
          <span></span>
        </li>
        <li className={currentStep == 2 ? 'active' : ''}>
          <span></span>
        </li>
        <li className={currentStep == 3 ? 'active' : ''}>
          <span></span>
        </li>
        <li className={currentStep == 4 ? 'active' : ''}>
          <span></span>
        </li>
      </ul>
    </div>
  );
}

export default Pagination;
