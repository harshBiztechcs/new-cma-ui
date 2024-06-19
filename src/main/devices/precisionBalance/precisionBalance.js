const { SerialPort } = require('serialport');
const ReadlineParser = require('@serialport/parser-readline');

async function listAvailableSerialPorts() {
  try {
    const ports = await SerialPort.list();
    const com6Port = ports.find((port) => port.vendorId === '0483' && port.manufacturer === 'Microsoft');

    if (!com6Port) {
      throw new Error('Port not found. Please check your device connection.');
    }

    const port = new SerialPort({
      path: com6Port.path,
      baudRate: 57600,
      dataBits: 8,
      stopBits: 1,
      parity: 'none',
    });

    return port;
  } catch (err) {
    throw new Error(`Error listing available serial ports: ${err.message}`);
  }
}

function textToHex(text) {
  const buffer = Buffer.from(text, 'utf8');
  return buffer
    .toString('hex')
    .match(/.{1,2}/g)
    .join('-');
}

function extractNumbersFromArray(inputArray) {
  const regex = /([-+]?\d*\.\d+|\d+)/;

  const numbers = inputArray.map((str) => {
    const match = str.match(regex);
    return match ? parseFloat(match[0]) : null;
  });

  return numbers;
}

async function extractFirstNumberFromArray(inputArray) {
  const regex = /([-+]?\d*\.\d+|\d+)/;

  for (const str of inputArray) {
    const match = str.match(regex);
    if (match) {
      return parseFloat(match[0]);
    }
  }

  // Return a default value if no number is found
  return null;
}

function hexStringToBuffer(hexString) {
  return Buffer.from(hexString.replace(/-/g, ''), 'hex');
}

function getStringAfterSearchWord(inputString, searchWord) {
  const regex = new RegExp(searchWord + '(?! null)', 'i');
  const match = inputString.match(regex);
  return match ? inputString.slice(match.index + match[0].length) : null;
}

async function writeToSerialPort(port, commandBuffer) {
  return new Promise((resolve, reject) => {
    port.write(commandBuffer, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
    port.on('error', (err) => {
      console.error('Serial port error:', err);
      reject(err);
    });
  });
}

async function readFromSerialPortArr(port, command) {
  return new Promise((resolve, reject) => {
    let dataBuffer = '';

    port.on('data', (data) => {
      dataBuffer += data.toString();
      const lines = dataBuffer.split('\n');

      const results = [];

      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i];
        const result = getStringAfterSearchWord(line, command);
        results.push(result);
      }

      port.close((err) => {
        if (err) {
          console.error('Error closing serial port:', err);
          reject(err);
        } else {
          console.log('Serial port closed.');
          const trimmedResults = results.filter(result => result !== null).map(result => result.trim());

          if (trimmedResults.length > 0) {
            resolve(trimmedResults[0]);
          } else {
            resolve();
          }
        }
      });

      dataBuffer = '';
    });

    port.on('error', (err) => {
      console.error('Serial port error:', err);
      reject(err);
    });
  });
}

async function readFromSerialPort(port, command) {
  return new Promise((resolve, reject) => {
    let dataBuffer = '';

    port.on('data', (data) => {
      dataBuffer += data.toString();
      const lines = dataBuffer.split('\n');

      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i];
        const result = getStringAfterSearchWord(line, command);

          port.close((err) => {
            if (err) {
              console.error('Error closing serial port:', err);
              reject(err);
            } else {
              console.log('Serial port closed.');
              if(result){
                resolve(result.trim());
              }
              else{
              reject("no data found");
              }
            }
          });
          return;
      }

      dataBuffer = '';
    });

    port.on('error', (err) => {
      console.error('Serial port error:', err);
      reject(err);
    });
  });
}

async function connectPrecisionBalance() {
  try {
    const port = await listAvailableSerialPorts();
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
    const connectedPort = ports.find((port) => port.vendorId === '0483' && port.manufacturer === 'Microsoft');

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

async function setZero() {
  // Define the maximum number of reset attempts
  const maxAttempts = 5;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`Attempt ${attempt} to reset device...`);

    const result = await makeResetDevice();

    if (result.res) {
      return result;
    }

    // Add a delay between attempts (e.g., 1 second)
    await delay(1000);
  }

 return null;
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function makeResetDevice() {
  try {
    const port = await listAvailableSerialPorts();
    const commandHex = '5A-0D-0A';
    const commandBuffer = hexStringToBuffer(commandHex);

    await writeToSerialPort(port, commandBuffer);

    let response = await readFromSerialPort(port, 'Z');

    if (response === 'A') {
      return {
        res: true,
        errorMessage: null,
        data: true,
      };
    } else {
      return {
        res: false,
        errorMessage: response,
        data: false,
      };
    }
  } catch (error) {
    return {
      res: false,
      errorMessage: `Command comprehended but cannot be executed for reset`,
    };
  }
}



async function getPBSerialNumber() {
  try {
    const port = await listAvailableSerialPorts();
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
      errorMessage: `Error connecting to the getPBSerialNumber: ${error.message}`,
    };
  }
}


async function setTareValue(number) {
  const maxAttempts = 5; // Set your maximum number of attempts
  let attempt = 0;
  while (attempt < maxAttempts) {
    try {
      const response = await setTareValueInDevice(number);
      if (response.res) {
        // Success, break out of the loop
        console.log("Working mode set successfully.");
        return response;
        break;
      }
      // Add a delay before the next attempt
      await delay(1000);
    } catch (error) {
      console.error("Error in setWorkingMode:", error.message);
    }
    attempt++;
  }
  if (attempt === maxAttempts) {
    console.error("Failed to set working mode after maximum attempts.");
    // Handle the failure case here if needed
  }
}

function setTareValueInDevice(number) {
  return new Promise(async (resolve, reject) => {
    try {
      const port = await listAvailableSerialPorts();
      const commandHex = textToHex(`UT ${number}`);
      const commandBuffer = hexStringToBuffer(`${commandHex}-0D-0A`);

      await writeToSerialPort(port, commandBuffer);
      let result = await readFromSerialPortArr(port, "UT");
      if (result) {
        resolve({
          res: true,
          errorMessage: null,
          data: result,
        });
      } else {
        resolve({
          res: false,
          errorMessage: null,
          data: result,
        });
      }
    } catch (error) {
      reject({
        res: false,
        errorMessage: `Error connecting to the setTareValue: ${error.message}`,
      });
    }
  });
}

async function getStableResultCurrentUnit() {
  await weightDataWithPromise();
  await new Promise(resolve => setTimeout(resolve, 600));
  await weightDataWithPromise();
  await new Promise(resolve => setTimeout(resolve, 600));
  let weightDataValue =  await weightDataWithPromise();

 return  weightDataValue ;
}


function weightDataWithPromise() {
  return new Promise(async (resolve, reject) => {
    try {
      const port = await listAvailableSerialPorts();
      const commandHex = '53-55-49-0D-0A';
      const commandBuffer = hexStringToBuffer(commandHex);

      await new Promise(resolve => setTimeout(resolve, 900));
      await writeToSerialPort(port, commandBuffer);
      const mesResult = await readFromSerialPortArr(port, "SUI");
      const results = (mesResult || '').split(' ').filter(item => item !== '');

      resolve({
        res: true,
        errorMessage: null,
        data: results,
      });
    } catch (error) {
      reject({
        res: false,
        errorMessage: `Please try again. No output is received from the device`,
      });
    }
  });
}

async function findCurrentWorkingMode() {
  try {
    const port = await listAvailableSerialPorts();
    const commandHex = '4F-4D-47-0D-0A'; //'4F-4D-53-20-31-32-0D-0A';
    const commandBuffer = hexStringToBuffer(commandHex);

    await writeToSerialPort(port, commandBuffer);
    let result = await readFromSerialPort(port, 'OMG');

    return {
      res: true,
      errorMessage: null,
      data: result,
    };
  } catch (error) {
    return {
      res: false,
      errorMessage: `Error connecting to the scale device from findCurrentWorkingMode: ${error.message}`,
    };
  }
}

async function setWorkingModeInDevice() {
  try {
    const port = await listAvailableSerialPorts();
    const commandHex = '4F-4D-53-20-31-32-0D-0A';
    const commandBuffer = hexStringToBuffer(commandHex);

    await writeToSerialPort(port, commandBuffer);

    // Add a delay before reading to give the device some time to respond
    await delay(1000);

    let result = await readFromSerialPort(port, 'OMS');

    if (result) {
      return {
        res: true,
        errorMessage: null,
        data: result,
      };
    } else {
      return {
        res: false,
        errorMessage: result,
        data: result,
      };
    }
  } catch (error) {
    return {
      res: false,
      errorMessage: `Error connecting to the scale device from setWorkingMode: ${error.message}`,
    };
  }
}

async function setWorkingMode() {
  const maxAttempts = 5; // Set your maximum number of attempts
  let attempt = 0;

  while (attempt < maxAttempts) {
    try {
      const response = await setWorkingModeInDevice();
      if (response.res) {
        // Success, break out of the loop
        console.log("Working mode set successfully.");
        return response;
        break;
      }

      // Add a delay before the next attempt
      await delay(1000);
    } catch (error) {
      console.error("Error in setWorkingMode:", error.message);
    }

    attempt++;
  }

  if (attempt === maxAttempts) {
    console.error("Failed to set working mode after maximum attempts.");
    // Handle the failure case here if needed
  }
}

async function setUpperThreshold(threshold) {
  const maxAttempts = 5; // Set your maximum number of attempts
  let attempt = 0;
  while (attempt < maxAttempts) {
    try {
      const response = await setUpperThresholdValue(threshold);
      if (response.res) {
        // Success, break out of the loop
        console.log("Working mode set successfully.");
        return response;
        break;
      }
      // Add a delay before the next attempt
      await delay(1000);
    } catch (error) {
      console.error("Error in setWorkingMode:", error.message);
    }
    attempt++;
  }
  if (attempt === maxAttempts) {
    console.error("Failed to set working mode after maximum attempts.");
    // Handle the failure case here if needed
  }
}

function setUpperThresholdValue(thresholdValue) {
  return new Promise(async (resolve, reject) => {
    try {
      const port = await listAvailableSerialPorts();
      const commandHex = textToHex(`UH ${parseFloat(thresholdValue)}`);
      const commandBuffer = hexStringToBuffer(`${commandHex}-0D-0A`);
      await writeToSerialPort(port, commandBuffer);
      let result = await readFromSerialPortArr(port, "UH");
      if (result) {
        resolve({
          res: true,
          errorMessage: null,
          data: result,
        });
      } else {
        resolve({
          res: false,
          errorMessage: null,
          data: result,
        });
      }
    } catch (error) {
      reject({
        res: false,
        errorMessage: `Error connecting to the scale device from setLowerThreshold: ${error.message}`,
      });
    }
  });
}


async function setLowerThreshold(threshold) {
  const maxAttempts = 5; // Set your maximum number of attempts
  let attempt = 0;

  while (attempt < maxAttempts) {
    try {
      const response = await setLowerThresholdValue(threshold);
      if (response.res) {
        // Success, break out of the loop
        console.log("Working mode set successfully.");
        return response;
        break;
      }

      // Add a delay before the next attempt
      await delay(1000);
    } catch (error) {
      console.error("Error in setWorkingMode:", error.message);
    }

    attempt++;
  }

  if (attempt === maxAttempts) {
    console.error("Failed to set working mode after maximum attempts.");
    // Handle the failure case here if needed
  }
}

function setLowerThresholdValue(thresholdValue) {
  return new Promise(async (resolve, reject) => {
    try {
      const port = await listAvailableSerialPorts();
      const commandHex = textToHex(`DH ${parseFloat(thresholdValue)}`);
      const commandBuffer = hexStringToBuffer(`${commandHex}-0D-0A`);
      await writeToSerialPort(port, commandBuffer);
      let result = await readFromSerialPortArr(port, "DH");
      if (result) {
        resolve({
          res: true,
          errorMessage: null,
          data: result,
        });
      } else {
        resolve({
          res: false,
          errorMessage: null,
          data: result,
        });
      }
    } catch (error) {
      reject({
        res: false,
        errorMessage: `Error connecting to the scale device from setLowerThreshold: ${error.message}`,
      });
    }
  });
}

module.exports = {
  connectPrecisionBalance,
  getPBSerialNumber,
  setZero,
  setTareValue,
  getStableResultCurrentUnit,
  checkPrecisionConnection,
  setUpperThreshold,
  setWorkingMode,
  findCurrentWorkingMode,
  setLowerThreshold,
  extractNumbersFromArray,
  extractFirstNumberFromArray
};
