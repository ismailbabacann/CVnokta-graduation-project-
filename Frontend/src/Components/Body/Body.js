import React from 'react';

function Body() {
  return (
    <main style={{padding: '20px'}}>
      <label>
        Full Name:
        <input type="text" placeholder="Enter your name" style={{marginLeft: '10px'}} />
      </label>
      <br /><br />
      <label>
        Email:
        <input type="email" placeholder="Enter your email address" style={{marginLeft: '10px'}} />
      </label>
      <br /><br />
      <label>
        Phone:
        <input type="tel" placeholder="Enter your phone number" style={{marginLeft: '10px'}} />
      </label>
      <br /><br />
      <button>Apply</button>
    </main>
  );
}

export default Body;
