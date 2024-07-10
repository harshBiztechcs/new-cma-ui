export default function downloadCSV(header, data) {
  try {
    const csv = [header.join(',')]
      .concat(data.map((row) => row.join(',')))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'measurement_samples.csv';
    link.click();
    return true;
  } catch (error) {
    return false;
  }
}
