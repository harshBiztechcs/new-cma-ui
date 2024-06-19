import React, { useEffect, useState } from 'react';

const headers = [
  'Date',
  'Time',
  'Duration',
  'Client',
  'Method',
  'URL',
  'Parameters',
  'Status',
  'Result',
];

export default function APILogList({ logData }) {
  const [sortedLogData, setSortedLogData] = useState([]);

  const getStatusColor = (status) => {
    if (status >= 200 && status < 300) return '#027a48';
    else if (status >= 400 && status < 600) return '#b42318';
    else return '#667085';
  };

  useEffect(() => {
    const newLogData = [...logData];
    newLogData.sort((a, b) => {
      if (a.timeStamp > b.timeStamp) return -1;
      if (a.timeStamp < b.timeStamp) return 1;
      return 0;
    });
    setSortedLogData(newLogData);
  }, [logData]);

  return (
    <div className="products-list">
      <table
        className="table productselect-table scrolling-table"
        cellSpacing="0"
      >
        <thead>
          <tr>
            {headers.map((x, i) => (
              <th key={i} style={{ width: 'auto' }}>
                {x}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {!Boolean(sortedLogData.length) && (
            <tr style={{ textAlign: 'center' }}>
              <td>No logs are available</td>
            </tr>
          )}
          {Boolean(sortedLogData.length) &&
            sortedLogData.map((data, index) => (
              <tr key={index} style={{ color: getStatusColor(+data.status) }}>
                <td style={{ width: 'auto' }}>{data.date}</td>
                <td style={{ width: 'auto' }}>{data.time}</td>
                <td style={{ width: 'auto' }}>{data.duration}</td>
                <td style={{ width: 'auto' }}>{data.client}</td>
                <td style={{ width: 'auto' }}>{data.method}</td>
                <td style={{ width: 'auto' }}>{data.url}</td>
                <td style={{ width: 'auto' }}>{data.parameters}</td>
                <td style={{ width: 'auto' }}>{data.status}</td>
                <td style={{ width: 'auto' }}>{data.result}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
