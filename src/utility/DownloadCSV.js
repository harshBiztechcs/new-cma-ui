export const downloadCSV = (header, data) => {
  try {
    var csv = header.join(',') + '\n';

    data.forEach((row) => {
      csv += row.join(',') + '\n';
    });

    var hiddenElement = document.createElement('a');
    hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
    hiddenElement.target = '_blank';
    hiddenElement.download = 'measurement_samples.csv';
    hiddenElement.click();
    return true;
  } catch (error) {
    return false;
  }
};
