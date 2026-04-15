import React from 'react';

const GymLogo = () => (
  <div className="flex items-center justify-center gap-3 mb-2">
    <img src={process.env.PUBLIC_URL + '/gym-logo.png'} alt="GymTight Fitness Gym Logo" className="w-12 h-12 object-contain" />
    <h2 className="text-2xl font-bold text-primary">GymTight Fitness Admin</h2>
  </div>
);

export default GymLogo;


