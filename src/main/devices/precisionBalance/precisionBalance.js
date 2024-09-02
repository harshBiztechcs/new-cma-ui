/* eslint-disable no-console */
/* eslint-disable no-promise-executor-return */
/* eslint-disable no-plusplus */
/* eslint-disable no-await-in-loop */
const SerialPort = require('serialport');

// Utility to extract the string after a specified command
const extractStringAfterCommand = (input, command) => {
  const regex = new RegExp(`${command}`, 'i');
  const match = input.match(regex);
  return match ? input.slice(match.index + match[0].length) : null;
};

// Function to read data from the serial port
async function readFromSerialPort(
  port,
  command,
  expectMultipleResponses = false,
) {
  return new Promise((resolve, reject) => {
    let dataBuffer = '';
    const responseArray = [];

    port.on('data', (data) => {
      dataBuffer += data.toString();
      const lines = dataBuffer.split('\n');

      lines.slice(0, -1).forEach((line) => {
        const response = extractStringAfterCommand(line, command);
        if (response) {
          responseArray.push(response.trim());
        }
      });

      if (!expectMultipleResponses && responseArray.length > 0) {
        port.close((err) => {
          if (err) {
            console.error('Error closing serial port:', err);
            reject(err);
          } else {
            console.log('Serial port closed.');
            resolve(responseArray[0]);
          }
        });
        return;
      }

      dataBuffer = '';
    });

    port.on('close', () => {
      if (expectMultipleResponses) {
        const filteredResponses = responseArray.filter(Boolean);
        resolve(filteredResponses.length > 0 ? filteredResponses : null);
      }
    });

    port.on('error', (err) => {
      console.error('Serial port error:', err);
      reject(err);
    });
  });
}

// Function to write data to the serial port
function writeToSerialPort(port, dataBuffer) {
  return new Promise((resolve, reject) => {
    port.write(dataBuffer, (err) => {
      if (err) {
        reject(new Error(`Error writing to serial port: ${err.message}`));
      } else {
        resolve();
      }
    });

    port.on('error', (err) => {
      reject(new Error(`Serial port error: ${err.message}`));
    });
  });
}

// Utility to convert a hex string to a buffer
function hexStringToBuffer(hexString) {
  return Buffer.from(hexString.replace(/-/g, ''), 'hex');
}

// Function to list available serial ports and select the correct one
async function getAvailableSerialPort() {
  try {
    const ports = await SerialPort.list();
    const targetPort = ports.find(
      (port) => port.vendorId === '0483' && port.manufacturer === 'Microsoft',
    );

    if (!targetPort) {
      throw new Error(
        'Target serial port not found. Please check your device connection.',
      );
    }

    return new SerialPort({
      path: targetPort.path,
      baudRate: 57600,
      dataBits: 8,
      stopBits: 1,
      parity: 'none',
    });
  } catch (err) {
    throw new Error(`Error listing available serial ports: ${err.message}`);
  }
}

// Utility to convert text to a hex string
function textToHexString(text) {
  return Buffer.from(text, 'utf8')
    .toString('hex')
    .match(/.{1,2}/g)
    .join('-');
}

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
// Configure lower threshold value function
async function configureLowerThresholdValue(thresholdValue) {
  try {
    const port = await getAvailableSerialPort();
    const commandHex = textToHexString(`DH ${parseFloat(thresholdValue)}`);
    const commandBuffer = hexStringToBuffer(`${commandHex}-0D-0A`);
    await writeToSerialPort(port, commandBuffer);
    const response = await readFromSerialPort(port, 'DH', true);

    return {
      res: !!response,
      error: null,
      data: response || null,
    };
  } catch (error) {
    return {
      res: false,
      error: `Failed to connect to the scale device in configureLowerThresholdValue: ${error.message}`,
    };
  }
}

async function connectPrecisionBalance() {
  try {
    const port = await getAvailableSerialPort();
    const commandHex = '4F-4D-49-0D-0A';
    const commandBuffer = hexStringToBuffer(commandHex);

    await writeToSerialPort(port, commandBuffer);
    await readFromSerialPort(port, '');

    return {
      res: true,
      errorMessage: null,
    };
  } catch (error) {
    return {
      res: false,
      errorMessage: `Error connecting to the connectPrecisionBalance: ${error.message}`,
    };
  }
}

async function checkPrecisionConnection() {
  try {
    const ports = await SerialPort.list();
    const connectedPort = ports.find(
      (port) => port.vendorId === '0483' && port.manufacturer === 'Microsoft',
    );

    return {
      res: !!connectedPort,
      errorMessage: null,
    };
  } catch (error) {
    return {
      res: false,
      errorMessage: `Error connecting to the checkPrecisionConnection: ${error.message}`,
    };
  }
}

// Function to set the lower threshold value on the device
async function setLowerThreshold(threshold) {
  const maxAttempts = 5; // Maximum number of retry attempts
  const delayMs = 1000; // Delay between retries in milliseconds

  let attempt = 0;

  while (attempt < maxAttempts) {
    try {
      const response = await configureLowerThresholdValue(threshold);

      if (response.res) {
        console.log('Lower threshold set successfully.');
        return response;
      }

      // Delay before the next retry attempt
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      attempt++;
    } catch (error) {
      console.error('Error in setLowerThreshold:', error.message);
      // Optionally break the loop or continue depending on the error
      attempt++;
    }
  }

  console.error('Failed to set lower threshold after maximum attempts.');
  return {
    res: false,
    error: 'Maximum retry attempts reached.',
  };
}

async function configureUpperThresholdValue(thresholdValue) {
  try {
    const port = await getAvailableSerialPort();
    const commandHex = textToHexString(`UH ${parseFloat(thresholdValue)}`);
    const commandBuffer = hexStringToBuffer(`${commandHex}-0D-0A`);
    await writeToSerialPort(port, commandBuffer);
    const response = await readFromSerialPort(port, 'UH', true);

    return {
      res: !!response,
      error: null,
      data: response || null,
    };
  } catch (error) {
    return {
      res: false,
      error: `Failed to connect to the scale device in configureLowerThresholdValue: ${error.message}`,
    };
  }
}

async function setUpperThreshold(threshold) {
  const maxAttempts = 5; // Maximum number of retry attempts
  const delayMs = 1000; // Delay between retries in milliseconds

  let attempt = 0;

  while (attempt < maxAttempts) {
    try {
      const response = await configureUpperThresholdValue(threshold);

      if (response.res) {
        console.log('Upper threshold set successfully.');
        return response;
      }

      // Delay before the next retry attempt
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      attempt++;
    } catch (error) {
      console.error('Error in setUpperThreshold:', error.message);
      // Optionally break the loop or continue depending on the error
      attempt++;
    }
  }

  console.error('Failed to set Upper threshold after maximum attempts.');
  return {
    res: false,
    error: 'Maximum retry attempts reached.',
  };
}

async function configureSetWorkingMode() {
  try {
    const port = await getAvailableSerialPort();
    const commandHex = '4F-4D-53-20-31-32-0D-0A';
    const commandBuffer = hexStringToBuffer(commandHex);
    await writeToSerialPort(port, commandBuffer);
    await delay(1000);
    const response = await readFromSerialPort(port, 'OMS');

    return {
      res: !!response,
      error: null,
      data: response || null,
    };
  } catch (error) {
    return {
      res: false,
      error: `Failed to connect to the scale device in configureLowerThresholdValue: ${error.message}`,
    };
  }
}

async function setWorkingMode() {
  const maxAttempts = 5; // Maximum number of retry attempts
  const delayMs = 1000; // Delay between retries in milliseconds

  let attempt = 0;

  while (attempt < maxAttempts) {
    try {
      const response = await configureSetWorkingMode();

      if (response.res) {
        console.log('Working mode set successfully.');
        return response;
      }

      // Delay before the next retry attempt
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      attempt++;
    } catch (error) {
      console.error('Error in setWorkingMode:', error.message);
      // Optionally break the loop or continue depending on the error
      attempt++;
    }
  }

  console.error('Failed to setWorkingMode after maximum attempts.');
  return {
    res: false,
    error: 'Maximum retry attempts reached.',
  };
}

async function findCurrentWorkingMode() {
  try {
    const port = await getAvailableSerialPort();
    const commandHex = '4F-4D-47-0D-0A'; // '4F-4D-53-20-31-32-0D-0A';
    const commandBuffer = hexStringToBuffer(commandHex);
    await writeToSerialPort(port, commandBuffer);
    await delay(1000);
    const response = await readFromSerialPort(port, 'OMG');

    return {
      res: !!response,
      error: null,
      data: response || null,
    };
  } catch (error) {
    return {
      res: false,
      error: `Failed to connect to the scale device in findWorkingMode: ${error.message}`,
    };
  }
}

async function configureTareValue(number) {
  try {
    const port = await getAvailableSerialPort();
    const commandHex = textToHexString(`UT ${number}`);
    const commandBuffer = hexStringToBuffer(`${commandHex}-0D-0A`);

    await writeToSerialPort(port, commandBuffer);
    const response = await readFromSerialPort(port, 'UT', true);

    return {
      res: !!response,
      error: null,
      data: response || null,
    };
  } catch (error) {
    return {
      res: false,
      error: `Failed to connect to the scale device in configureTareValue: ${error.message}`,
    };
  }
}

async function setTareValue(number) {
  const maxAttempts = 5; // Maximum number of retry attempts
  const delayMs = 1000; // Delay between retries in milliseconds

  let attempt = 0;

  while (attempt < maxAttempts) {
    try {
      const response = await configureTareValue(number);

      if (response.res) {
        console.log('Tare value set successfully.');
        return response;
      }

      // Delay before the next retry attempt
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      attempt++;
    } catch (error) {
      console.error('Error in setTareValue:', error.message);
      // Optionally break the loop or continue depending on the error
      attempt++;
    }
  }

  console.error('Failed to set tare after maximum attempts.');
  return {
    res: false,
    error: 'Maximum retry attempts reached.',
  };
}

async function configureMakeResetDevice() {
  try {
    const port = await getAvailableSerialPort();
    const commandHex = '5A-0D-0A';
    const commandBuffer = hexStringToBuffer(commandHex);
    await writeToSerialPort(port, commandBuffer);
    const response = await readFromSerialPort(port, 'Z');

    if (response === 'A') {
      return {
        res: true,
        errorMessage: null,
        data: true,
      };
    }
    return {
      res: false,
      errorMessage: response,
      data: false,
    };
  } catch (error) {
    return {
      res: false,
      error: `Failed to connect to the scale device in configureMakeResetDevice: ${error.message}`,
    };
  }
}

async function makeResetDevice() {
  const maxAttempts = 5; // Maximum number of retry attempts
  const delayMs = 1000; // Delay between retries in milliseconds

  let attempt = 0;

  while (attempt < maxAttempts) {
    try {
      const response = await configureMakeResetDevice();

      if (response.res) {
        console.log('Device reset successfully.');
        return response;
      }

      // Delay before the next retry attempt
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      attempt++;
    } catch (error) {
      console.error('Error in makeResetDevice:', error.message);
      // Optionally break the loop or continue depending on the error
      attempt++;
    }
  }

  console.error('Failed to makeResetDevice after maximum attempts.');
  return {
    res: false,
    error: 'Maximum retry attempts reached.',
  };
}

function extractNumbersFromArray(inputArray, returnFirst = false) {
  const regex = /([-+]?\d*\.\d+|\d+)/;

  const numbers = inputArray.map((str) => {
    const match = str.match(regex);
    return match ? parseFloat(match[0]) : null;
  });

  if (returnFirst) {
    return numbers.find((num) => num !== null) || null;
  }
  return numbers;
}

async function getPBSerialNumber() {
  try {
    const port = await getAvailableSerialPort();
    const commandHex = '4E-42-0D-0A';
    const commandBuffer = hexStringToBuffer(commandHex);
    await writeToSerialPort(port, commandBuffer);
    let result = await readFromSerialPort(port, 'NB A');
    result = parseFloat(result.replace(/"/g, ''), 10);

    return {
      res: true,
      errorMessage: null,
      data: result,
    };
  } catch (error) {
    return {
      res: false,
      error: `Failed to connect to the scale device in configureMakeResetDevice: ${error.message}`,
    };
  }
}

async function weightDataWithPromise() {
  try {
    const port = await getAvailableSerialPort();
    const commandHex = '53-55-49-0D-0A';
    const commandBuffer = hexStringToBuffer(commandHex);

    await delay(900);
    await writeToSerialPort(port, commandBuffer);

    const mesResult = await readFromSerialPort(port, 'SUI', true);
    const results = (mesResult || '').split(' ').filter(Boolean);

    return {
      res: true,
      errorMessage: null,
      data: results,
    };
  } catch (error) {
    return {
      res: false,
      errorMessage: `Please try again. No output is received from the device`,
    };
  }
}

async function getStableResultCurrentUnit() {
  await weightDataWithPromise();
  await delay(600);
  await weightDataWithPromise();
  await delay(600);

  const weightDataValue = await weightDataWithPromise();
  return weightDataValue;
}

module.exports = {
  connectPrecisionBalance,
  checkPrecisionConnection,
  setLowerThreshold,
  setUpperThreshold,
  setWorkingMode,
  findCurrentWorkingMode,
  setTareValue,
  makeResetDevice,
  extractNumbersFromArray,
  getPBSerialNumber,
  getStableResultCurrentUnit,
};
