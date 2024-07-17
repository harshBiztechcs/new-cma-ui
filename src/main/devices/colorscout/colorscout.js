const fs = require('fs');
const path = require('path');
var { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const { getAssetPath } = require('../../util');

const {
  connectCi62Device,
  execQuery: execQueryCi62,
  performMeasurement: performMeasurementCi62,
  getCi62AllSamples,
} = require('../ci62/ci62');
const {
  connectCi64Device,
  execQuery: execQueryCi64,
  performMeasurement: performMeasurementCi64,
  getCi64AllSamples,
} = require('../ci64/ci64');
const {
  connectCi64UVDevice,
  execQuery: execQueryCi64UV,
  performMeasurement: performMeasurementCi64UV,
  getCi64UVAllSamples,
} = require('../ci64UV/ci64UV');
const {
  checkCMAROP64EConnection,
  measureDeviceAutomatic,
} = require('../CMA-ROP64E-UV/CMA-ROP64E-UV-USB');
const {
  checkBluetoothConnection,
  measureDeviceAutomaticWithBT,
} = require('../CMA-ROP64E-UV/CMA-ROP64E-UV-BT');
const { validateScanProps } = require('../i1iO/i1iO');
const {
  setDeviceOnlineQ,
  setDeviceOfflineQ,
  deviceInitializeQ,
  setCi6xTypeQ,
  setExactTypeQ,
  moveHomeQ,
  moveHeadUpQ,
  moveDownQ,
  actuallyPressedKeyQ,
  lastEnterPositionClearQ,
  lastEnterPositionCoordinationQ,
  set3NHTypeQ,
} = require('../colorscout/colorScoutQueries');

// global variable file specific
let startMeasure = false;
let Apoint = [];
let Bpoint = [];
let Cpoint = [];

let csvFilePath = getAssetPath('SDK', 'measurement_data.csv');
let fileCreated = false;

const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

function listSerialPorts() {
  return new Promise((resolve) => {
    SerialPort.list().then(function (ports, err) {
      if (err) {
        resolve({ res: false, error: err.message, data: null });
      } else {
        resolve({ res: true, error: null, data: ports });
      }
    });
  });
}

const getColorScoutMeasureStatus = () => startMeasure;

const updateColorScoutStartMeasure = (value) => {
  startMeasure = value;
};

const connectColorScoutDevice = async (deviceTypeFromColorPortalSide) => {
  return await new Promise(async (resolve) => {
    console.log('====== Connect ColorScout Device ====');
    let CloseThePort, port;
    try {
      const portPromise = (query) => {
        return new Promise((resolve) => {
          port.write(query, (err) => {
            if (err) {
              queryInProgress = false;
              resolve({ success: false, error: err.message });
            } else {
              queryInProgress = true;
              resolve({ success: true, error: null });
            }
          });
        });
      };

      CloseThePort = () => {
        return new Promise((resolve) => {
          port.close((error) => {
            if (error) {
              console.log(`Error closing port: ${error.message}`);
              resolve({ success: false, error: error.message });
            } else {
              console.log('Port closed successfully');
              resolve({ success: true, error: null });
            }
          });
        });
      };

      // connection for ci6x devices
      let deviceType = deviceTypeFromColorPortalSide.split('_')[0];

      if (deviceType == 'CI62') {
        // connection
        const result = connectCi62Device();
        if (!result.res) return resolve({ res: false, error: result.error });
      } else if (deviceType == 'CI64') {
        const result = connectCi64Device();
        if (!result.res) return resolve({ res: false, error: result.error });
      } else if (deviceType == 'CI64UV') {
        const result = connectCi64UVDevice();
        if (!result.res) return resolve({ res: false, error: result.error });
      } else if (deviceType == 'CMA-ROP64E-UV') {
        const result = await checkCMAROP64EConnection();
        if (!result.res) return resolve({ res: false, error: result.error });
      } else if (deviceType == 'CMA-ROP64E-UV-BT') {
        const result = await checkBluetoothConnection();
        if (!result.res) return resolve({ res: false, error: result.error });
      }

      // List the port
      const portsDetail = await listSerialPorts();

      if (!portsDetail.res) {
        return resolve({
          res: false,
          error: `Error in listing port : ${portsDetail.error}`,
        });
      }

      const filteredPorts = portsDetail.data.filter(
        (port) => port.manufacturer === 'FTDI' || port.vendorId === '0403'
      );

      if (filteredPorts.length == 0) {
        return resolve({ res: false, error: 'Please Connect The ColorScout.' });
      }

      const portName = filteredPorts[0].path;

      try {
        port = new SerialPort({
          path: `${portName}`,
          baudRate: 9600,
          dataBits: 8,
          stopBits: 1,
          parity: 'none',
        });
      } catch (error) {
        return resolve({
          res: false,
          error: `Error opening port: ${error.message}`,
        });
      }

      let status = '';
      let queryInProgress = false;

      const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

      parser.on('data', (data) => {
        queryInProgress = false;
        status = data;
      });

      port.on('open', async function (err) {
        if (err) {
          return resolve({
            res: false,
            error: `'Error opening port:', ${err.message}`,
          });
        }

        await sleep(5000);
        if (status == 'Running!!!') {
        }

        // intialization and setup
        let checkDeviceOnlineRes = await portPromise(setDeviceOnlineQ);
        if (!checkDeviceOnlineRes.success) {
          await CloseThePort();
          return resolve({ res: false, error: checkDeviceOnlineRes.error });
        }
        await sleep(500);
        if (queryInProgress && status == '') await sleep(500);
        if (!status.startsWith(': 209')) {
          await CloseThePort();
          return resolve({
            res: false,
            error:
              'ColorScout Table is not online. Please check the Switch is ON and try to connect after 5 seconds.',
          });
        }
        status = '';

        //  Initialize device
        let checkIntializeRes = await portPromise(deviceInitializeQ);
        if (!checkIntializeRes.success) {
          await CloseThePort();
          return resolve({ res: false, error: checkIntializeRes.error });
        }
        await sleep(500);
        if (queryInProgress && status == '') await sleep(500);
        if (!status.startsWith(': 209')) {
          await CloseThePort();
          return resolve({
            res: false,
            error: 'Something went wrong while ColorScout is being initialize.',
          });
        }
        status = '';

        // set device type
        let setDeviceRes;
        if (
          deviceType == 'CI62' ||
          deviceType == 'CI64' ||
          deviceType == 'CI64UV'
        ) {
          setDeviceRes = await portPromise(setCi6xTypeQ);
        } else if (deviceType == 'EXACT' || deviceType == 'EXACT2') {
          setDeviceRes = await portPromise(setExactTypeQ);
        } else if (
          deviceType == 'CMA-ROP64E-UV' ||
          deviceType == 'CMA-ROP64E-UV-BT'
        ) {
          setDeviceRes = await portPromise(set3NHTypeQ);
        }

        if (!setDeviceRes.success) {
          await CloseThePort();
          return resolve({ res: false, error: setDeviceRes.error });
        }
        await sleep(500);
        if (queryInProgress && status == '') await sleep(500);
        if (!status.startsWith(': 209')) {
          await CloseThePort();
          return resolve({
            res: false,
            error: `Something went wrong while ${deviceType} is being set.`,
          });
        }
        status = '';

        let portCloseRes = await CloseThePort();
        if (!portCloseRes.success)
          return resolve({ res: false, error: portCloseRes.error });

        resolve({ res: true, error: null });
      });
    } catch (error) {
      if (port) {
        await CloseThePort();
      }
      resolve({ res: false, error: error.message });
    }
  });
};

const grabInitialPositionColorScout = async (args) => {
  return await new Promise(async (resolve) => {
    console.log('====== Grab Initial Position ColorScout ====');
    let CloseThePort, port;
    try {
      const portPromise = (query) => {
        return new Promise((resolve) => {
          port.write(query, (err) => {
            if (err) {
              queryInProgress = false;
              resolve({ success: false, error: err.message });
            } else {
              queryInProgress = true;
              resolve({ success: true, error: null });
            }
          });
        });
      };

      CloseThePort = () => {
        return new Promise((resolve) => {
          port.close((error) => {
            if (error) {
              const errorMessage = `Error closing port: ${error.message}`;
              console.log(errorMessage);
              resolve({ success: false, error: errorMessage });
            } else {
              resolve({ success: true, error: null });
            }
          });
        });
      };

      // connection for ci6x devices
      let deviceType = args.deviceConnection.deviceType.split('_')[0];

      if (deviceType == 'CI62') {
        // connection
        const result = connectCi62Device();
        if (!result.res) return resolve({ res: false, error: result.error });
      } else if (deviceType == 'CI64') {
        const result = connectCi64Device();
        if (!result.res) return resolve({ res: false, error: result.error });
      } else if (deviceType == 'CI64UV') {
        const result = connectCi64UVDevice();
        if (!result.res) return resolve({ res: false, error: result.error });
      } else if (deviceType == 'CMA-ROP64E-UV') {
        const result = await checkCMAROP64EConnection();
        if (!result.res) return resolve({ res: false, error: result.error });
      } else if (deviceType == 'CMA-ROP64E-UV-BT') {
        const result = await checkBluetoothConnection();
        if (!result.res) return resolve({ res: false, error: result.error });
      }

      // List the port
      const portsDetail = await listSerialPorts();

      if (!portsDetail.res) {
        return resolve({
          res: false,
          error: `Error in listing port : ${portsDetail.error}`,
        });
      }

      const filteredPorts = portsDetail.data.filter(
        (port) => port.manufacturer === 'FTDI' || port.vendorId === '0403'
      );

      if (filteredPorts.length == 0) {
        return resolve({ res: false, error: 'Please Connect The ColorScout.' });
      }

      const portName = filteredPorts[0].path;

      try {
        port = new SerialPort({
          path: `${portName}`,
          baudRate: 9600,
          dataBits: 8,
          stopBits: 1,
          parity: 'none',
        });
      } catch (error) {
        return resolve({
          res: false,
          error: `Error opening port: ${error.message}`,
        });
      }

      let status = '';
      let queryInProgress = false;

      const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

      parser.on('data', (data) => {
        queryInProgress = false;
        status = data;
      });

      port.on('open', async function (err) {
        if (err) {
          return resolve({
            res: false,
            error: `'Error opening port:', ${err.message}`,
          });
        }

        await sleep(1000);

        // intialization and setup
        let checkDeviceOnlineRes = await portPromise(setDeviceOnlineQ);
        if (!checkDeviceOnlineRes.success) {
          await CloseThePort();
          return resolve({ res: false, error: checkDeviceOnlineRes.error });
        }
        await sleep(500);
        if (queryInProgress && status == '') await sleep(500);
        if (!status.startsWith(': 209')) {
          await CloseThePort();
          return resolve({
            res: false,
            error:
              'Something went wrong while ColorScout is being online. Please check your ColorScout connection and Try again.',
          });
        }
        status = '';

        //  Initialize device
        let checkIntializeRes = await portPromise(deviceInitializeQ);
        if (!checkIntializeRes.success) {
          await CloseThePort();
          return resolve({ res: false, error: checkIntializeRes.error });
        }
        await sleep(500);
        if (queryInProgress && status == '') await sleep(500);
        if (!status.startsWith(': 209')) {
          await CloseThePort();
          return resolve({
            res: false,
            error: 'Something went wrong while ColorScout is being initialize.',
          });
        }
        status = '';

        // set device type
        let setDeviceRes;
        if (
          deviceType == 'CI62' ||
          deviceType == 'CI64' ||
          deviceType == 'CI64UV'
        ) {
          setDeviceRes = await portPromise(setCi6xTypeQ);
        } else if (deviceType == 'EXACT' || deviceType == 'EXACT2') {
          setDeviceRes = await portPromise(setExactTypeQ);
        } else if (
          deviceType == 'CMA-ROP64E-UV' ||
          deviceType == 'CMA-ROP64E-UV-BT'
        ) {
          setDeviceRes = await portPromise(set3NHTypeQ);
        }
        if (!setDeviceRes.success) {
          await CloseThePort();
          return resolve({ res: false, error: setDeviceRes.error });
        }
        await sleep(500);
        if (queryInProgress && status == '') await sleep(500);
        if (!status.startsWith(': 209')) {
          await CloseThePort();
          return resolve({
            res: false,
            error: `Something went wrong while ${deviceType} is being set.`,
          });
        }
        status = '';

        // Head up device
        let moveHeadUpRes = await portPromise(moveHeadUpQ);
        if (!moveHeadUpRes.success) {
          await CloseThePort();
          return resolve({ res: false, error: moveHeadUpRes.error });
        }
        await sleep(500);
        if (queryInProgress && status == '') await sleep(500);
        if (!status.startsWith(': 209')) {
          await CloseThePort();
          return resolve({
            res: false,
            error:
              'Something went wrong while ColorScout head is lifting up. Please Try again.',
          });
        }
        status = '';

        // move in homeposition
        let moveToHomePosRes = await portPromise(moveHomeQ);
        if (!moveToHomePosRes.success) {
          await CloseThePort();
          return resolve({ res: false, error: moveToHomePosRes.error });
        }
        await sleep(500);
        if (queryInProgress && status == '') await sleep(500);
        if (!status.startsWith(': 209')) {
          await CloseThePort();
          return resolve({
            res: false,
            error:
              'Something went wrong while ColorScout move to the home position. Please Try again.',
          });
        }
        status = '';

        // close the port
        let portCloseRes = await CloseThePort();
        if (!portCloseRes.success)
          return resolve({ res: false, error: portCloseRes.error });

        resolve({ res: true, error: null });
      });
    } catch (error) {
      if (port) {
        await CloseThePort();
      }
      resolve({ res: false, error: error.message });
    }
  });
};

// Wait for button pressed
async function waitForButtonPressedColorScout(index, typeOfDevice, row) {
  return await new Promise(async (resolve) => {
    console.log('======waitForButtonPressedColorScout====');
    let CloseThePort, port;
    try {
      async function waitForButtonPressed() {
        return new Promise(async (res, rej) => {
          let buttonPressed = false;
          do {
            if (!startMeasure) {
              const resMsg = {
                res: false,
                error: 'Measurement Failed : Device Timed-out',
              };
              await CloseThePort();
              resolve(resMsg);
              return;
            }
            await sleep(100);
            let getActuallyPressedKeyRes = await portPromise(
              actuallyPressedKeyQ
            );
            if (getActuallyPressedKeyRes.success) {
              await sleep(100);
              if (status == '') await sleep(500);
              // console.log({ "wait Status: ": status });
              if (status.startsWith(': 209 130 1 ')) {
                buttonPressed = true;
              }
              status = '';
            }
            // console.log({ buttonPressed });
          } while (!buttonPressed);
          res();
        });
      }

      const portPromise = (query) => {
        return new Promise((resolve) => {
          port.write(query, (err) => {
            if (err) {
              queryInProgress = false;
              resolve({ success: false, error: err.message });
            }
            queryInProgress = true;
            resolve({ success: true, error: null });
          });
        });
      };

      CloseThePort = () => {
        return new Promise((resolve) => {
          port.close(function (error) {
            if (error) {
              console.log(`Error close port: ${error.message}`);
              resolve({ success: false, error: error.message });
            } else {
              resolve({ success: true, error: null });
            }
          });
        });
      };

      // connection for ci6x devices
      let deviceType = typeOfDevice.split('_')[0];

      if (deviceType == 'CI62') {
        // connection
        const result = connectCi62Device();
        if (!result.res) return resolve({ res: false, error: result.error });
      } else if (deviceType == 'CI64') {
        const result = connectCi64Device();
        if (!result.res) return resolve({ res: false, error: result.error });
      } else if (deviceType == 'CI64UV') {
        const result = connectCi64UVDevice();
        if (!result.res) return resolve({ res: false, error: result.error });
      } else if (deviceType == 'CMA-ROP64E-UV') {
        const result = await checkCMAROP64EConnection();
        if (!result.res) return resolve({ res: false, error: result.error });
      } else if (deviceType == 'CMA-ROP64E-UV-BT') {
        const result = await checkBluetoothConnection();
        if (!result.res) return resolve({ res: false, error: result.error });
      }

      // List the port
      const portsDetail = await listSerialPorts();

      if (!portsDetail.res) {
        return resolve({
          res: false,
          error: `Error in listing port : ${portsDetail.error}`,
        });
      }

      // If manufacturer & vendorId will be changed you have to change this code.
      const filteredPorts = portsDetail.data.filter(
        (port) => port.manufacturer === 'FTDI' || port.vendorId === '0403'
      );

      if (filteredPorts.length == 0) {
        return resolve({ res: false, error: 'Please Connect The ColorScout.' });
      }

      // portsDetail.data.forEach((element) => {
      //   console.log(element.path);
      // });

      const portName = filteredPorts[0].path;

      // let port;

      // connection for colorScout table
      try {
        port = new SerialPort({
          path: `${portName}`,
          baudRate: 9600,
          dataBits: 8,
          stopBits: 1,
          parity: 'none',
        });
      } catch (error) {
        return resolve({
          res: false,
          error: `Error opening port: ${error.message}`,
        });
      }

      let status = '';
      let queryInProgress = false;

      const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

      parser.on('data', (data) => {
        queryInProgress = false;
        status = data;
      });

      port.on('open', async function (err) {
        if (err) {
          return resolve({
            res: false,
            error: `'Error opening port:', ${err.message}`,
          });
        }

        // await sleep(5000);
        if (status == 'Running!!!') {
        }

        if (index == 1) {
          // intialization and setup
          let checkDeviceOnlineRes = await portPromise(setDeviceOnlineQ);
          if (!checkDeviceOnlineRes.success) {
            await CloseThePort();
            return resolve({ res: false, error: checkDeviceOnlineRes.error });
          }
          await sleep(500);
          if (queryInProgress && status == '') await sleep(500);
          if (!status.startsWith(': 209')) {
            await CloseThePort();
            return resolve({
              res: false,
              error:
                'Something went wrong while ColorScout is being online. Please check your ColorScout connection and Try again.',
            });
          }
          status = '';

          //  Initialize device
          let checkIntializeRes = await portPromise(deviceInitializeQ);
          if (!checkIntializeRes.success) {
            await CloseThePort();
            return resolve({ res: false, error: checkIntializeRes.error });
          }
          await sleep(500);
          if (queryInProgress && status == '') await sleep(500);
          if (!status.startsWith(': 209')) {
            await CloseThePort();
            return resolve({
              res: false,
              error:
                'Something went wrong while ColorScout is being initialize.',
            });
          }
          status = '';

          // set device type
          let setDeviceRes;
          if (
            deviceType == 'CI62' ||
            deviceType == 'CI64' ||
            deviceType == 'CI64UV'
          ) {
            setDeviceRes = await portPromise(setCi6xTypeQ);
          } else if (deviceType == 'EXACT' || deviceType == 'EXACT2') {
            setDeviceRes = await portPromise(setExactTypeQ);
          } else if (
            deviceType == 'CMA-ROP64E-UV' ||
            deviceType == 'CMA-ROP64E-UV-BT'
          ) {
            setDeviceRes = await portPromise(set3NHTypeQ);
          }
          if (!setDeviceRes.success) {
            await CloseThePort();
            return resolve({ res: false, error: setDeviceRes.error });
          }
          await sleep(500);
          if (queryInProgress && status == '') await sleep(500);
          if (!status.startsWith(': 209')) {
            await CloseThePort();
            return resolve({
              res: false,
              error: `Something went wrong while ${deviceType} is being set.`,
            });
          }
          status = '';

          // Clear last position
          let lastEnterPosClearRes = await portPromise(lastEnterPositionClearQ);
          if (!lastEnterPosClearRes.success) {
            await CloseThePort();
            return resolve({ res: false, error: lastEnterPosClearRes.error });
          }
          await sleep(500);
          if (queryInProgress && status == '') await sleep(500);
          if (!status.startsWith(': 209 128 0')) {
            await CloseThePort();
            return resolve({
              res: false,
              error:
                'Something went wrong while clearing last position. Please Try again.',
            });
          }
          status = '';
        }

        // Set Device offline
        let setDeviceOfflineRes = await portPromise(setDeviceOfflineQ);
        if (!setDeviceOfflineRes.success) {
          await CloseThePort();
          return resolve({ res: false, error: setDeviceOfflineRes.error });
        }
        await sleep(500);
        if (queryInProgress && status == '') await sleep(500);
        if (!status.startsWith(': 209')) {
          await CloseThePort();
          return resolve({
            res: false,
            error:
              'Something went wrong while ColorScout being offline. Please Try again.',
          });
        }
        status = '';

        console.log('Waiting for coordination');
        await waitForButtonPressed();

        let getLastEnterPosRes = await portPromise(
          lastEnterPositionCoordinationQ
        );
        if (!getLastEnterPosRes.success) {
          await CloseThePort();
          return resolve({ res: false, error: getLastEnterPosRes.error });
        }
        await sleep(500);
        if (queryInProgress && status == '') await sleep(500);
        if (!status.startsWith(': 209 129')) {
          await CloseThePort();
          return resolve({
            res: false,
            error:
              'Something went wrong while getting last Entered position. Please Try again.',
          });
        }
        let a = status.split(' ');
        status = '';

        if (index == 1 && row != 1) {
          Apoint = [];
          Apoint.push(Number(a[5]));
          Apoint.push(Number(a[6]));
          console.log({ Apoint });
        } else if (index == 1 && row == 1) {
          Apoint = [];
          Bpoint = [];
          Apoint.push(Number(a[5]));
          Apoint.push(Number(a[6]));
          Bpoint = Apoint;
          console.log({ Apoint });
          console.log({ Bpoint });
        } else if (index == 2) {
          Bpoint = [];
          Bpoint.push(Number(a[5]));
          Bpoint.push(Number(a[6]));
          console.log({ Bpoint });
        } else if (index == 3) {
          Cpoint = [];
          Cpoint.push(Number(a[5]));
          Cpoint.push(Number(a[6]));
          console.log({ Cpoint });
        }

        a = [];

        // close the port
        let portCloseRes = await CloseThePort();
        if (!portCloseRes.success)
          return resolve({ res: false, error: portCloseRes.error });

        resolve({ res: true, error: null });
      });
    } catch (error) {
      Apoint = [];
      Bpoint = [];
      Cpoint = [];
      if (port) {
        await CloseThePort();
      }
      resolve({ res: false, error: error.message });
    }
  });
}

async function scanChartAutomaticColorScout(
  typeOfDevice,
  row,
  column,
  patchGap,
  patchesToIgnoreInLastRow,
  patchWidth,
  patchHeight,
  settingsData
) {
  fileCreated = false;
  return await new Promise(async (resolve) => {
    console.log('======scanChartAutomaticColorScout====');
    let CloseThePort, port;
    try {
      const portPromise = (query) => {
        return new Promise((resolve) => {
          port.write(query, (err) => {
            if (err) {
              queryInProgress = false;
              resolve({ success: false, error: err.message });
            }
            queryInProgress = true;
            resolve({ success: true, error: null });
          });
        });
      };

      CloseThePort = () => {
        return new Promise((resolve) => {
          port.close(function (error) {
            if (error) {
              console.log(`Error close port: ${error.message}`);
              resolve({ success: false, error: error.message });
            } else {
              resolve({ success: true, error: null });
            }
          });
        });
      };

      const valRes = validateScanProps(column, row, patchGap);
      if (!valRes.res) return resolve({ res: false, error: valRes.error });

      // connection for ci6x devices
      let deviceType = typeOfDevice.split('_')[0];

      if (deviceType == 'CI62') {
        // connection
        const result = connectCi62Device();
        if (!result.res) return resolve({ res: false, error: result.error });
      } else if (deviceType == 'CI64') {
        const result = connectCi64Device();
        if (!result.res) return resolve({ res: false, error: result.error });
      } else if (deviceType == 'CI64UV') {
        const result = connectCi64UVDevice();
        if (!result.res) return resolve({ res: false, error: result.error });
      } else if (deviceType == 'CMA-ROP64E-UV') {
        const result = await checkCMAROP64EConnection();
        if (!result.res) return resolve({ res: false, error: result.error });
      } else if (deviceType == 'CMA-ROP64E-UV-BT') {
        const result = await checkBluetoothConnection();
        if (!result.res) return resolve({ res: false, error: result.error });
      }
      // List the port
      const portsDetail = await listSerialPorts();

      if (!portsDetail.res) {
        return resolve({
          res: false,
          error: `Error in listing port : ${portsDetail.error}`,
        });
      }

      const filteredPorts = portsDetail.data.filter(
        (port) => port.manufacturer === 'FTDI' || port.vendorId === '0403'
      );

      if (filteredPorts.length == 0) {
        return resolve({ res: false, error: 'Please Connect The ColorScout.' });
      }

      const portName = filteredPorts[0].path;

      // connection for colorScout table
      try {
        port = new SerialPort({
          path: `${portName}`,
          baudRate: 9600,
          dataBits: 8,
          stopBits: 1,
          parity: 'none',
        });
      } catch (error) {
        return resolve({
          res: false,
          error: `Error opening port: ${error.message}`,
        });
      }

      let status = '';
      let queryInProgress = false;

      const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

      parser.on('data', (data) => {
        queryInProgress = false;
        status = data;
      });

      port.on('open', async function (err) {
        if (err) {
          return resolve({
            res: false,
            error: `'Error opening port:', ${err.message}`,
          });
        }

        await sleep(2000);
        if (status == 'Running!!!') {
        }

        // intialization and setup
        let checkDeviceOnlineRes = await portPromise(setDeviceOnlineQ);
        if (!checkDeviceOnlineRes.success) {
          await CloseThePort();
          return resolve({ res: false, error: checkDeviceOnlineRes.error });
        }
        await sleep(500);
        if (queryInProgress && status == '') await sleep(500);
        if (!status.startsWith(': 209')) {
          await CloseThePort();
          return resolve({
            res: false,
            error:
              'Something went wrong while ColorScout is being online. Please check your ColorScout connection and Try again.',
          });
        }
        status = '';

        //  Initialize device
        let checkIntializeRes = await portPromise(deviceInitializeQ);
        if (!checkIntializeRes.success) {
          await CloseThePort();
          return resolve({ res: false, error: checkIntializeRes.error });
        }
        await sleep(500);
        if (queryInProgress && status == '') await sleep(500);
        if (!status.startsWith(': 209')) {
          await CloseThePort();
          return resolve({
            res: false,
            error: 'Something went wrong while ColorScout is being initialize.',
          });
        }
        status = '';

        // set device type
        let setDeviceRes;
        if (
          deviceType == 'CI62' ||
          deviceType == 'CI64' ||
          deviceType == 'CI64UV'
        ) {
          setDeviceRes = await portPromise(setCi6xTypeQ);
        } else if (deviceType == 'EXACT' || deviceType == 'EXACT2') {
          setDeviceRes = await portPromise(setExactTypeQ);
        } else if (
          deviceType == 'CMA-ROP64E-UV' ||
          deviceType == 'CMA-ROP64E-UV-BT'
        ) {
          setDeviceRes = await portPromise(set3NHTypeQ);
        }
        if (!setDeviceRes.success) {
          await CloseThePort();
          return resolve({ res: false, error: setDeviceRes.error });
        }
        await sleep(500);
        if (queryInProgress && status == '') await sleep(500);
        if (!status.startsWith(': 209')) {
          await CloseThePort();
          return resolve({
            res: false,
            error: `Something went wrong while ${deviceType} is being set.`,
          });
        }
        status = '';

        // Clear All Samples in Ci62
        if (deviceType == 'CI62') {
          const clearRes = execQueryCi62('SAMPLE CLEAR ALL');
          if (!clearRes) {
            await CloseThePort();
            return resolve({
              res: false,
              error: 'Error occurred while Clearing samples.',
            });
          }
        } else if (deviceType == 'CI64') {
          const clearRes = execQueryCi64('SAMPLE CLEAR ALL');
          if (!clearRes) {
            await CloseThePort();
            return resolve({
              res: false,
              error: 'Error occurred while Clearing samples.',
            });
          }
        } else if (deviceType == 'CI64UV') {
          const clearRes = execQueryCi64UV('SAMPLE CLEAR ALL');
          if (!clearRes) {
            await CloseThePort();
            return resolve({
              res: false,
              error: 'Error occurred while Clearing samples.',
            });
          }
        }

        let tenThetaValueForVerticalLine = parseFloat(
          ((Bpoint[1] - Apoint[1]) / (Bpoint[0] - Apoint[0])).toFixed(9)
        );
        if (isNaN(tenThetaValueForVerticalLine)) {
          tenThetaValueForVerticalLine = 0;
        }

        let angleOfVerticalLine =
          (180 / Math.PI) * Math.atan(tenThetaValueForVerticalLine);

        let xForVerticalLine =
          patchHeight *
          10 *
          Math.cos((angleOfVerticalLine * Math.PI) / 180).toFixed(9);

        let yForVerticalLine =
          patchHeight *
          10 *
          Math.sin((angleOfVerticalLine * Math.PI) / 180).toFixed(9);

        let tenThetaValueForHorizontalLine = parseFloat(
          ((Cpoint[1] - Bpoint[1]) / (Cpoint[0] - Bpoint[0])).toFixed(9)
        );
        if (isNaN(tenThetaValueForHorizontalLine)) {
          tenThetaValueForHorizontalLine = 0;
        }

        let angleOfHorizontalLine =
          (180 / Math.PI) * Math.atan(tenThetaValueForHorizontalLine);

        let xForHorizontalLine =
          (patchWidth * 10 + patchGap * 10) *
          Math.cos((angleOfHorizontalLine * Math.PI) / 180).toFixed(9);

        let yForHorizontalLine =
          (patchWidth * 10 + patchGap * 10) *
          Math.sin((angleOfHorizontalLine * Math.PI) / 180).toFixed(9);

        checkDeviceOnlineRes = await portPromise(setDeviceOnlineQ);
        if (!checkDeviceOnlineRes.success) {
          await CloseThePort();
          return resolve({ res: false, error: checkDeviceOnlineRes.error });
        }
        await sleep(500);
        if (queryInProgress && status == '') await sleep(500);
        if (!status.startsWith(': 209')) {
          await CloseThePort();
          return resolve({
            res: false,
            error:
              'Something went wrong while ColorScout is being online. Please check your ColorScout connection and Try again.',
          });
        }
        status = '';

        async function MoveXYPositionFunction(Xcord, Ycord, firstPatch) {
          return new Promise(async (resolve, reject) => {
            let moveHeadUpRes = await portPromise(moveHeadUpQ);
            if (!moveHeadUpRes.success) {
              await CloseThePort();
              return reject({ message: moveHeadUpRes.error });
            }
            await sleep(500);
            if (queryInProgress && status == '') await sleep(500);
            if (!status.startsWith(': 209')) {
              await CloseThePort();
              return reject({
                message:
                  'Something went wrong while ColorScout head is lifting up. Please Try again.',
              });
            }
            status = '';

            let moveTableToXYPos = await portPromise(
              `; 208 0 0 ${Xcord} ${Ycord}\r\n`
            );
            if (!moveTableToXYPos.success) {
              await CloseThePort();
              return reject({ message: moveTableToXYPos.error });
            }
            await sleep(500);
            if (queryInProgress && status == '') await sleep(500);
            if (!status.startsWith(': 209')) {
              await CloseThePort();
              return reject({
                message:
                  'Something went wrong while moving next patch. Please Try again.',
              });
            }
            if (status == ': 209 128 2') {
              await CloseThePort();
              return reject({
                message:
                  'Coordination is out of range. Please take coordination again.',
              });
            }
            status = '';

            if (firstPatch) {
              await sleep(5000);
            }

            let moveHeadDownRes = await portPromise(moveDownQ);
            if (!moveHeadDownRes.success) {
              await CloseThePort();
              return reject({ message: moveHeadDownRes.error });
            }
            await sleep(500);
            if (queryInProgress && status == '') await sleep(500);
            if (!status.startsWith(': 209')) {
              await CloseThePort();
              return reject({
                message:
                  'Something went wrong while ColorScout head is down. Please Try again.',
              });
            }
            status = '';

            let measureRes;
            if (deviceType == 'CI62') {
              measureRes = performMeasurementCi62();
            } else if (deviceType == 'CI64') {
              measureRes = performMeasurementCi64();
            } else if (deviceType == 'CI64UV') {
              measureRes = performMeasurementCi64UV();
            } else if (deviceType == 'CMA-ROP64E-UV') {
              measureRes = await measureDeviceAutomatic({
                'Colorimetric.Observer': settingsData['Colorimetric.Observer'],
                'Colorimetric.Illumination':
                  settingsData['Colorimetric.Illumination'],
                Specular: settingsData.Specular,
                UV: settingsData.UV,
              });
              measureDeviceAutomaticWithBT;

              if (measureRes.res) {
                if (!fileCreated) {
                  await generateCSVFileFromData(
                    [measureRes.data],
                    csvFilePath,
                    fileCreated
                  );
                  fileCreated = true;
                } else {
                  await generateCSVFileFromData(
                    [measureRes.data],
                    csvFilePath,
                    fileCreated
                  );
                }
              }
            } else if (deviceType == 'CMA-ROP64E-UV-BT') {
              measureRes = await measureDeviceAutomaticWithBT({
                'Colorimetric.Observer': settingsData['Colorimetric.Observer'],
                'Colorimetric.Illumination':
                  settingsData['Colorimetric.Illumination'],
                Specular: settingsData.Specular,
                UV: settingsData.UV,
              });
              if (measureRes.res) {
                if (!fileCreated) {
                  await generateCSVFileFromData(
                    [measureRes.data],
                    csvFilePath,
                    fileCreated
                  );
                  fileCreated = true;
                } else {
                  await generateCSVFileFromData(
                    [measureRes.data],
                    csvFilePath,
                    fileCreated
                  );
                }
              }
            }
            if (!measureRes.res) {
              if (
                measureRes.error?.errorCode == 108 ||
                measureRes.error?.errorString == 'FAILED: Status Error 6C'
              ) {
                await CloseThePort();
                return reject({
                  message:
                    'Temperature is very high. Need to re-calibrate device.',
                });
              }
              await CloseThePort();
              return reject({
                message: `Error while measuring sample: ${measureRes.error.errorString}`,
              });
            }

            resolve();
          });
        }

        let firstPatch = false;
        MainLoop: for (let i = 1; i <= row; i++) {
          for (let j = 0; j < column; j++) {
            if (i == 1 && j == 0) {
              firstPatch = true;
            } else {
              firstPatch = false;
            }
            if (
              (Math.sign(angleOfVerticalLine) == -1 &&
                Math.sign(angleOfHorizontalLine) == 1) ||
              (Math.sign(angleOfVerticalLine) == -1 &&
                Math.sign(angleOfHorizontalLine) == 0)
            ) {
              if (i % 2 == 0) {
                // even row
                try {
                  await MoveXYPositionFunction(
                    Math.round(
                      Apoint[0] +
                        xForVerticalLine * (i - 1) +
                        -xForHorizontalLine * (column - j - 1)
                    ),
                    Math.round(
                      Apoint[1] +
                        yForVerticalLine * (i - 1) +
                        -yForHorizontalLine * (column - j - 1)
                    ),
                    firstPatch
                  );
                } catch (error) {
                  return resolve({ res: false, error: error.message });
                }
              } else {
                // odd row
                try {
                  await MoveXYPositionFunction(
                    Math.round(
                      Apoint[0] +
                        xForVerticalLine * (i - 1) +
                        -xForHorizontalLine * j
                    ),
                    Math.round(
                      Apoint[1] +
                        yForVerticalLine * (i - 1) +
                        -yForHorizontalLine * j
                    ),
                    firstPatch
                  );
                } catch (error) {
                  return resolve({ res: false, error: error.message });
                }
              }
            } else if (
              (Math.sign(angleOfVerticalLine) == 1 &&
                Math.sign(angleOfHorizontalLine) == -1) ||
              (Math.sign(angleOfVerticalLine) == 0 &&
                Math.sign(angleOfHorizontalLine) == -1)
            ) {
              if (i % 2 == 0) {
                // even row
                try {
                  await MoveXYPositionFunction(
                    Math.round(
                      Apoint[0] +
                        -xForVerticalLine * (i - 1) +
                        -xForHorizontalLine * (column - j - 1)
                    ),
                    Math.round(
                      Apoint[1] +
                        -yForVerticalLine * (i - 1) +
                        -yForHorizontalLine * (column - j - 1)
                    ),
                    firstPatch
                  );
                } catch (error) {
                  return resolve({ res: false, error: error.message });
                }
              } else {
                // odd row
                try {
                  await MoveXYPositionFunction(
                    Math.round(
                      Apoint[0] +
                        -xForVerticalLine * (i - 1) +
                        -xForHorizontalLine * j
                    ),
                    Math.round(
                      Apoint[1] +
                        -yForVerticalLine * (i - 1) +
                        -yForHorizontalLine * j
                    ),
                    firstPatch
                  );
                } catch (error) {
                  return resolve({ res: false, error: error.message });
                }
              }
            } else if (
              tenThetaValueForVerticalLine == -Infinity ||
              tenThetaValueForHorizontalLine == -Infinity ||
              (tenThetaValueForVerticalLine == 0 &&
                tenThetaValueForHorizontalLine == 0)
            ) {
              if (i % 2 == 0) {
                // even row
                try {
                  await MoveXYPositionFunction(
                    Math.round(
                      Apoint[0] -
                        (column - j - 1) * (patchWidth * 10 + patchGap * 10)
                    ),
                    Math.round(Apoint[1] - (i - 1) * patchHeight * 10),
                    firstPatch
                  );
                } catch (error) {
                  return resolve({ res: false, error: error.message });
                }
              } else {
                // odd row
                try {
                  await MoveXYPositionFunction(
                    Math.round(
                      Apoint[0] - j * (patchWidth * 10 + patchGap * 10)
                    ),
                    Math.round(Apoint[1] - (i - 1) * patchHeight * 10),
                    firstPatch
                  );
                } catch (error) {
                  return resolve({ res: false, error: error.message });
                }
              }
            } else {
              await CloseThePort();
              return resolve({
                res: false,
                error:
                  'Something went wrong while taking coordinates. Please place the chart in correct position and try it again.',
              });
            }
          }
        }

        // move in homeposition
        let moveToHomePosRes = await portPromise(moveHomeQ);
        if (!moveToHomePosRes.success) {
          await CloseThePort();
          return resolve({ res: false, error: moveToHomePosRes.error });
        }
        await sleep(500);
        if (queryInProgress && status == '') await sleep(500);
        if (!status.startsWith(': 209')) {
          await CloseThePort();
          return resolve({
            res: false,
            error:
              'Something went wrong while ColorScout move to the home position. Please Try again.',
          });
        }
        status = '';

        // close the port
        let portCloseRes = await CloseThePort();
        if (!portCloseRes.success)
          return resolve({ res: false, error: portCloseRes.error });

        resolve({ res: true, error: null });
      });
    } catch (error) {
      Apoint = [];
      Bpoint = [];
      Cpoint = [];
      if (port) {
        await CloseThePort();
      }
      resolve({ res: false, error: error.message });
    }
  });
}

async function getOutputFileDataColoScout(
  typeOfDevice,
  row,
  column,
  patchesToIgnoreInLastRow
) {
  return await new Promise(async (resolve) => {
    console.log('====== Get Output FileData ColoScout ====');
    try {
      let ci62SampleRes, ci64SampleRes, ci64UVSampleRes, header, data, error;

      // connection for ci6x devices
      let deviceType = typeOfDevice.split('_')[0];

      if (deviceType == 'CI62') {
        // connection
        const result = connectCi62Device();
        if (!result.res)
          return resolve({ res: false, data: null, error: result.error });

        let output = await getCi62AllSamples();
        header = output.header;
        data = output.data;
        error = output.error;
        if (error) return resolve({ res: false, data: null, error });
      } else if (deviceType == 'CI64') {
        const result = connectCi64Device();
        if (!result.res)
          return resolve({ res: false, data: null, error: result.error });

        let output = await getCi64AllSamples();
        header = output.header;
        data = output.data;
        error = output.error;
        if (error) return resolve({ res: false, data: null, error });
      } else if (deviceType == 'CI64UV') {
        const result = connectCi64UVDevice();
        if (!result.res)
          return resolve({ res: false, data: null, error: result.error });

        let output = await getCi64UVAllSamples();
        header = output.header;
        data = output.data;
        error = output.error;
        if (error) return resolve({ res: false, data: null, error });
      }

      let scanDataString = header.join(',') + '\n';
      data.forEach((row) => {
        scanDataString += row.join(',') + '\n';
      });

      data = Buffer.from(scanDataString).toString('base64');
      resolve({ res: true, data, error: null });
    } catch (error) {
      resolve({ res: false, data: null, error: error.message });
    }
  });
}

function writeToFile(filePath, content) {
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, content, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function appendToFile(filePath, content) {
  return new Promise((resolve, reject) => {
    fs.appendFile(filePath, content, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

async function generateCSVFileFromData(jsonData, filePath, fileCreated) {
  const additionalHeaders = [
    'Name',
    'TimeStamp',
    'Aperture',
    'NetProfiler Status',
    'Transform',
    'Trigger Mode',
    'Project ID',
    'Job ID',
    'Standard',
    '400 nm (SPIN)',
    '410 nm (SPIN)',
    '420 nm (SPIN)',
    '430 nm (SPIN)',
    '440 nm (SPIN)',
    '450 nm (SPIN)',
    '460 nm (SPIN)',
    '470 nm (SPIN)',
    '480 nm (SPIN)',
    '490 nm (SPIN)',
    '500 nm (SPIN)',
    '510 nm (SPIN)',
    '520 nm (SPIN)',
    '530 nm (SPIN)',
    '540 nm (SPIN)',
    '550 nm (SPIN)',
    '560 nm (SPIN)',
    '570 nm (SPIN)',
    '580 nm (SPIN)',
    '590 nm (SPIN)',
    '600 nm (SPIN)',
    '610 nm (SPIN)',
    '620 nm (SPIN)',
    '630 nm (SPIN)',
    '640 nm (SPIN)',
    '650 nm (SPIN)',
    '660 nm (SPIN)',
    '670 nm (SPIN)',
    '680 nm (SPIN)',
    '690 nm (SPIN)',
    '700 nm (SPIN)',
    '400 nm (SPEX)',
    '410 nm (SPEX)',
    '420 nm (SPEX)',
    '430 nm (SPEX)',
    '440 nm (SPEX)',
    '450 nm (SPEX)',
    '460 nm (SPEX)',
    '470 nm (SPEX)',
    '480 nm (SPEX)',
    '490 nm (SPEX)',
    '500 nm (SPEX)',
    '510 nm (SPEX)',
    '520 nm (SPEX)',
    '530 nm (SPEX)',
    '540 nm (SPEX)',
    '550 nm (SPEX)',
    '560 nm (SPEX)',
    '570 nm (SPEX)',
    '580 nm (SPEX)',
    '590 nm (SPEX)',
    '600 nm (SPEX)',
    '610 nm (SPEX)',
    '620 nm (SPEX)',
    '630 nm (SPEX)',
    '640 nm (SPEX)',
    '650 nm (SPEX)',
    '660 nm (SPEX)',
    '670 nm (SPEX)',
    '680 nm (SPEX)',
    '690 nm (SPEX)',
    '700 nm (SPEX)',
    'L value (SPIN)LAB',
    'A value (SPIN)LAB',
    'B value (SPIN)LAB',
    'L value (SPEX)LAB',
    'A value (SPEX)LAB',
    'B value (SPEX)LAB',
  ];

  // Check if the file already exists
  const fileExists = fs.existsSync(filePath);

  // If fileCreated is false, delete the file
  if (!fileCreated && fileExists) {
    fs.unlinkSync(filePath);
  }
  // Write headers to the CSV file if it's the first call or if the file was deleted
  if (!fileExists || !fileCreated) {
    const headerRow = additionalHeaders.join(',') + '\n';
    await writeToFile(filePath, headerRow);
  }
  // Process data
  const csvRows = [];
  for (let i = 0; i < jsonData.length; i++) {
    const data = jsonData[i];
    // Generate CSV row from data
    const indexNumber = 1; // Always use 1 as the index number
    const sciData = data.SCI.data.join(',');
    const sceData = data.SCE.data.join(',');
    const sciL = data.SCI['L*'];
    const sciA = data.SCI['a*'];
    const sciB = data.SCI['b*'];
    const sceL = data.SCE['L*'];
    const sceA = data.SCE['a*'];
    const sceB = data.SCE['b*'];
    const csvRow = `, , , , , , , , , ${sciData},${sceData},${sciL},${sciA},${sciB},${sceL},${sceA},${sceB}`;
    csvRows.push(csvRow);
  }

  // Append to CSV file
  const csvContent = csvRows.join('\n') + '\n';
  await appendToFile(filePath, csvContent);

  if (!fileExists) {
    console.log('CSV file created successfully:', filePath);
  }
}

function loadDataFromCSV() {
  return new Promise((resolve, reject) => {
    fs.readFile(csvFilePath, (err, data) => {
      if (err) {
        resolve({ res: false, data: null, error: err.message });
        return;
      }

      try {
        const buffer = Buffer.from(data).toString('base64');
        resolve({ res: true, data: buffer, error: null });
      } catch (error) {
        resolve({ res: false, data: null, error: error.message });
      }
    });
  });
}

module.exports = {
  connectColorScoutDevice,
  grabInitialPositionColorScout,
  getColorScoutMeasureStatus,
  updateColorScoutStartMeasure,
  waitForButtonPressedColorScout,
  scanChartAutomaticColorScout,
  getOutputFileDataColoScout,
  loadDataFromCSV,
};
