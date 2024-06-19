const handleSetTareValueInDevice = async (args) => {
  try {
    if (args.pb_tare_data.tare_value_colorportal) {
      const tareValue = parseFloat(args.pb_tare_data.tare_value_colorportal);

      if (!isNaN(tareValue)) {
        const setTareValueResult = await setTareValue(tareValue);

        if (setTareValueResult.res) {
          args.pb_tare_data.is_set_tare = setTareValueResult.res;
          args.pb_tare_data.tare_value_colorportal = tareValue;
          updateCurrentAction('Set Tare Value complete');
        } else {
          args.error = { message: setTareValueResult.errorMessage };
          updateCurrentAction('Set Tare Value failed');
        }
      } else {
        args.error = { message: 'The value must be provided in number format' };
        updateCurrentAction('The value must be provided in number format');
      }
    } else {
      args.error = { message: 'A value must be provided to set tare' };
      updateCurrentAction('A value must be provided to set tare');
    }
    console.log('🚀 ~ file: main.js:3000 ~ handle Set Tare value :', args);
    webSocketWorkerWindow.webContents.send(SET_TARE_VALUE, args);
  } catch (error) {
    console.error('An error occurred:', error);
  }
};
const handleSetTareValue = async (content) => {
  if (content.deviceConnection.deviceType === 'PRECISION_BALANCE') {
    handleSetTareValueInDevice(content);
  }
};
