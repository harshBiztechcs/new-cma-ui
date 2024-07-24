import React, { createContext, useState } from 'react';

// Create the context with a default value (an empty array)
const InstanceConnectionContext = createContext([]);

const InstanceConnectionProvider = ({ children }) => {
  // State to hold instance connection details
  const [instanceConnectionDetails, setInstanceConnectionDetails] = useState([]);

  return (
    <InstanceConnectionContext.Provider value={{ instanceConnectionDetails, setInstanceConnectionDetails }}>
      {children}
    </InstanceConnectionContext.Provider>
  );
};

export { InstanceConnectionContext, InstanceConnectionProvider };
