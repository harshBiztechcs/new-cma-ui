import React from 'react';
function DeviceLicense({ licenses }) {
  return (
    <ul className="count-list">
      <li>
        <span className="count-heading">Lic. Cat 1</span>
        <span className="count">{licenses?.category1 ?? 0}</span>
      </li>
      <li>
        <span className="count-heading">Lic. Cat 2</span>
        <span className="count">{licenses?.category2 ?? 0}</span>
      </li>
      <li>
        <span className="count-heading">Connected</span>
        <span className="count">{licenses?.connected ?? 0}</span>
      </li>
      <li>
        <span className="count-heading">Available</span>
        <span className="count">{licenses?.available ?? 0}</span>
      </li>
      <li>
        <span className="count-heading">Not available</span>
        <span className="count">{licenses?.not_available ?? 0}</span>
      </li>
    </ul>
  );
}

export default DeviceLicense;
