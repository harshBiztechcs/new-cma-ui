import React from 'react';
import Timeline from 'renderer/components/Timeline';
import { GET_APP_VERSION } from 'utility/constants';
import cmaConnectIcon from '../assets/image/cma-connect-icon.png';


const currentAppVersion = window.electron.ipcRenderer.send(GET_APP_VERSION, null);
const updateNoteBoxStyle = {
  border: '1px solid #e4e7ec',
  boxSizing: 'border-box',
  boxShadow:
    '0px 4px 8px -2px rgb(16 24 40 / 10%), 0px 2px 4px -2px rgb(16 24 40 / 6%)',
  borderRadius: '8px',
  width: '100%',
  color: '#667085',
};

const updateNoteListStyle = {
  maxHeight: '200px',
  overflowY: 'auto',
  paddingRight: '20px',
};

const updateNoteTitleStyle = {
  borderBottom: '1px solid rgb(228, 231, 236)',
  padding: '8px 16px',
  textAlign: 'start',
};

function AutoUpdate({
  isNewUpdateAvailable,
  updateInfo,
  updateDownloaded,
  downloadStarted,
  updateStatus,
  updateError,
  checkUpdate,
  handleCheckUpdate,
  handleCheckUpdatePage,
  handleQuitAndInstall,
  handleDownloadUpdate,
  handleGoBack,
  downloadProgress,
}) {
  const progressBarStyle = { width: `${downloadProgress}%`, marginTop: '0px' };

  return (
    <div id="main" className="cma-connect-page">
      <div className="container-fluid">
        <div className="d-flex flex-wrap h-100">
          <Timeline
            currentStep={0}
            handleCheckUpdate={handleCheckUpdatePage}
            isNewUpdateAvailable={isNewUpdateAvailable}
          />
          <div className="right-side">
            <div className="center-section">
              <div className="server-connection-screen">
                <img src={cmaConnectIcon} alt="CMA Connect Icon" />
                <p>{`Current version v${currentAppVersion}`}</p>
                <div
                  style={{
                    marginTop: '30px',
                    flexDirection: 'column',
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  {!updateError &&
                    updateInfo &&
                    updateInfo.releaseNotes &&
                    updateInfo.releaseNotes.length == 1 && (
                      <div style={updateNoteBoxStyle}>
                        <div style={updateNoteTitleStyle}>
                          {updateInfo.version
                            ? `v${updateInfo.version} Release Notes`
                            : 'Release Notes'}{' '}
                        </div>
                        <ul style={updateNoteListStyle}>
                          {updateInfo.releaseNotes &&
                            updateInfo.releaseNotes[0] &&
                            updateInfo.releaseNotes[0].notes &&
                            updateInfo.releaseNotes[0].notes.map(
                              (note, index) => (
                                <li key={index} style={{ textAlign: 'start' }}>
                                  {note}
                                </li>
                              )
                            )}
                        </ul>
                      </div>
                    )}
                  {!updateError &&
                    updateInfo &&
                    updateInfo.releaseNotes &&
                    updateInfo.releaseNotes.length > 1 && (
                      <div style={updateNoteBoxStyle}>
                        <div style={updateNoteTitleStyle}>Release Notes</div>
                        <ul style={updateNoteListStyle}>
                          {updateInfo.releaseNotes.map((release, index) => (
                            <li
                              key={index}
                              style={{
                                textAlign: 'start',
                                marginBottom: '10px',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                }}
                              >
                                <div
                                  style={{ display: 'inline-block' }}
                                >{`v${release.version}`}</div>
                                {release.version === updateInfo.version && (
                                  <>
                                    <div
                                      className="badge"
                                      style={{
                                        display: 'inline-block',
                                        marginLeft: '10px',
                                        color: '#027a48',
                                        background: '#dff1e6',
                                      }}
                                    >
                                      Latest
                                    </div>
                                    <div
                                      className="badge"
                                      style={{
                                        display: 'inline-block',
                                        marginLeft: '10px',
                                        color: '#7f56d9',
                                        background: '#ede2ff',
                                      }}
                                    >
                                      Updatable
                                    </div>
                                  </>
                                )}
                              </div>
                              <ul
                                style={{
                                  textAlign: 'start',
                                  marginTop: '5px',
                                  marginBottom: '10px',
                                }}
                              >
                                {release.notes.map((note, index) => (
                                  <li key={index}>{note}</li>
                                ))}
                              </ul>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  {downloadStarted && !updateDownloaded && (
                    <div className="progress">
                      <span className="progress-bar" style={progressBarStyle} />
                    </div>
                  )}

                  {updateError && (
                    <div>
                      <div>Error occurred while updating app</div>
                      <div
                        style={{
                          overflowY: 'auto',
                          height: '100px',
                          marginTop: '10px',
                        }}
                      >
                        {updateError}
                      </div>
                    </div>
                  )}

                  {/* {updateError && (
                    <div>Error 404 : occurred while updating app </div>
                  )} */}
                </div>

                <div style={{ marginTop: '40px' }}>
                  {!(isNewUpdateAvailable || updateDownloaded) && (
                    <button
                      className="btn-primary  mr-12"
                      onClick={handleCheckUpdate}
                      disabled={checkUpdate}
                    >
                      Check for updates
                    </button>
                  )}
                  {isNewUpdateAvailable &&
                    !updateDownloaded &&
                    !updateError &&
                    !downloadStarted && (
                      <button
                        className="btn-primary  mr-12"
                        onClick={handleDownloadUpdate}
                        disabled={downloadStarted}
                      >
                        Download
                      </button>
                    )}
                  {updateDownloaded && !updateError && (
                    <button
                      className="btn-primary  mr-12"
                      onClick={handleQuitAndInstall}
                    >
                      Quit and install
                    </button>
                  )}
                  <button className="btn-secondary" onClick={handleGoBack}>
                    Go back
                  </button>
                </div>

                {!updateError && updateStatus && (
                  <p
                    style={{
                      marginTop: '40px',
                      fontWeight: '500',
                      color: '#101828',
                    }}
                  >
                    {updateStatus}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AutoUpdate;
