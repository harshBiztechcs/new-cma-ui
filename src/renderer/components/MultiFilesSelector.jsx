import React, { useRef, useState } from 'react';

function MultiFilesSelector({
  onConfirm,
  onCancel,
  confirmBtnText,
  cancelBtnText,
  error,
  isLoading,
}) {
  const inputFileRef = useRef();
  const [files, setFiles] = useState([]);

  const crossSignStyle = {
    background: 'red',
    color: '#fff',
    border: '1px solid #7f56d9',
    padding: '10px 15px',
    boxShadow: '0px 1px 2px rgba(16, 24, 40, 0.05)',
    borderRadius: '8px',
    fontWeight: '500',
    fontSize: '18px',
    lineHeight: '10px',
    cursor: 'pointer',
    fontFamily: '"Inter", sans-serif',
  };

  const fileBarStyle = {
    display: 'flex',
    alignContent: 'center',
    justifyContent: 'space-between',
    background: 'whitesmoke',
    paddingLeft: '10px',
    borderRadius: '8px',
    marginTop: '5px',
    marginRight: '10px',
    width: '535px',
  };

  const onFileInputChange = (event) => {
    const fileList = Array.from(event.target.files);
    let newFileVal = null;
    if (fileList.length > 0) {
      newFileVal = fileList[0];
      if (files.some((f) => f.name == newFileVal.name)) return;
      setFiles((preFiles) => [...preFiles, newFileVal]);
    }
  };

  const onFileRemove = (index) => {
    let newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
  };

  const renderInputs = () => {
    if (files.length == 0)
      return (
        <div
          style={{
            display: 'flex',
            height: '100%',
            width: '535px',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <div>Please add at lease 2 files to combine</div>{' '}
        </div>
      );
    return files.map((file, i) => (
      <div
        key={i}
        style={
          i == 0
            ? { ...fileBarStyle, backgroundColor: '#BDBDBD' }
            : fileBarStyle
        }
      >
        <div style={{ paddingTop: '4px' }}>
          {file.name.length < 60 ? file.name : `${file.name.slice(0, 60)}...`}
        </div>
        <div>
          <input
            type="button"
            value="x"
            style={crossSignStyle}
            onClick={() => onFileRemove(i)}
          />
        </div>
      </div>
    ));
  };

  const onAddMoreFile = () => {
    inputFileRef.current.click();
  };

  return (
    <div className="modal" hidden={error || isLoading}>
      <div
        className="modal-content"
        style={{ maxWidth: '600px', paddingBottom: '0px' }}
      >
        <p
          style={{
            borderBottom: '1px solid rgb(228, 231, 236)',
            paddingBottom: '5px',
          }}
        >
          {files.length == 0
            ? 'No files added'
            : `${files.length} ${files.length > 1 ? 'files' : 'file'} added`}
        </p>
        <div style={{ height: '200px', overflowY: 'scroll' }}>
          {renderInputs()}
        </div>
        {(onConfirm || onCancel) && (
          <div
            className="row"
            style={{
              marginTop: '20px',
              justifyContent: 'end',
              padding: '10px',
              borderTop: '1px solid #e4e7ec',
            }}
          >
            <div style={{ paddingRight: '10px' }}>
              <input
                type="file"
                ref={inputFileRef}
                onChange={(e) => onFileInputChange(e)}
                hidden
              />
              <button
                className="btn-primary"
                style={{ maxWidth: '200px' }}
                onClick={onAddMoreFile}
              >
                Add File
              </button>
            </div>
            {onConfirm && (
              <div style={{ paddingRight: '10px' }}>
                <button
                  className="btn-primary"
                  style={{ maxWidth: '200px' }}
                  onClick={() => onConfirm(files)}
                >
                  {confirmBtnText}
                </button>
              </div>
            )}
            {onCancel && (
              <div>
                <button
                  className="btn-default"
                  style={{ maxWidth: '200px' }}
                  onClick={onCancel}
                >
                  {cancelBtnText}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default MultiFilesSelector;
