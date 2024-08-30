/* eslint-disable react/no-array-index-key */
/* eslint-disable react/button-has-type */
/* eslint-disable react/prop-types */
import React from 'react';
import Timeline from 'renderer/components/Timeline';
import { GET_APP_VERSION } from 'utility/constants';
import cmaConnectIcon from '../assets/image/cma-connect-icon.png';

const { ipcRenderer } = window.require('electron');

const currentAppVersion = ipcRenderer.sendSync(GET_APP_VERSION, null);
const styles = {
  updateNoteBox: {
    border: '1px solid #e4e7ec',
    boxSizing: 'border-box',
    boxShadow:
      '0px 4px 8px -2px rgb(16 24 40 / 10%), 0px 2px 4px -2px rgb(16 24 40 / 6%)',
    borderRadius: '8px',
    width: '100%',
    color: '#667085',
  },
  updateNoteList: {
    maxHeight: '200px',
    overflowY: 'auto',
    paddingRight: '20px',
  },
  updateNoteTitle: {
    borderBottom: '1px solid rgb(228, 231, 236)',
    padding: '8px 16px',
    textAlign: 'start',
  },
  progressBar: (progress) => ({
    width: `${progress}%`,
    marginTop: '0px',
  }),
  latestBadge: {
    display: 'inline-block',
    marginLeft: '10px',
    color: '#027a48',
    background: '#dff1e6',
  },
  updatableBadge: {
    display: 'inline-block',
    marginLeft: '10px',
    color: '#7f56d9',
    background: '#ede2ff',
  },
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
  const renderReleaseNotes = (releaseNotes) => {
    return (
      <div style={styles.updateNoteBox}>
        <div style={styles.updateNoteTitle}>
          {releaseNotes.length === 1
            ? `v${releaseNotes[0].version || ''} Release Notes`
            : 'Release Notes'}
        </div>
        <ul style={styles.updateNoteList}>
          {releaseNotes.map((release, index) => (
            <li
              key={index}
              style={{ textAlign: 'start', marginBottom: '10px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div>{`v${release.version}`}</div>
                {release.version === updateInfo.version && (
                  <>
                    <div className="badge" style={styles.latestBadge}>
                      Latest
                    </div>
                    <div className="badge" style={styles.updatableBadge}>
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
                {release.notes.map((note, noteIndex) => (
                  <li key={noteIndex}>{note}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    );
  };

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
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                  }}
                >
                  {!updateError &&
                    updateInfo?.releaseNotes &&
                    renderReleaseNotes(updateInfo.releaseNotes)}
                  {downloadStarted && !updateDownloaded && (
                    <div className="progress">
                      <span
                        className="progress-bar"
                        style={styles.progressBar(downloadProgress)}
                      />
                    </div>
                  )}
                  {updateError && (
                    <div>Error 404: occurred while updating the app</div>
                  )}
                </div>
                <div style={{ marginTop: '40px' }}>
                  {!isNewUpdateAvailable && !updateDownloaded && (
                    <button
                      className="btn-primary mr-12"
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
                        className="btn-primary mr-12"
                        onClick={handleDownloadUpdate}
                        disabled={downloadStarted}
                      >
                        Download
                      </button>
                    )}
                  {updateDownloaded && !updateError && (
                    <button
                      className="btn-primary mr-12"
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
