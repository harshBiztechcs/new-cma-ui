import React from 'react';
import logo from '../assets/image/logo.png';

function Header() {
  return (
    <>
      <header className="logo-banner">
        <img src={logo} alt="Logo" />
      </header>
    </>
  );
}

export default Header;
