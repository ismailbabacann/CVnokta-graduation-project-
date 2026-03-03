import React from 'react';

function Body() {
  return (
    <main style={{padding: '20px'}}>
      <label>
        Ad Soyad:
        <input type="text" placeholder="Adınızı girin" style={{marginLeft: '10px'}} />
      </label>
      <br /><br />
      <label>
        E-posta:
        <input type="email" placeholder="E-posta adresinizi girin" style={{marginLeft: '10px'}} />
      </label>
      <br /><br />
      <label>
        Telefon:
        <input type="tel" placeholder="Telefon numaranızı girin" style={{marginLeft: '10px'}} />
      </label>
      <br /><br />
      <button>Başvur</button>
    </main>
  );
}

export default Body;
