// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import UserDashboard from './components/UserDashboard';
import PatientSessions from './components/PatientSessions';
import { auth } from './firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import './index.css';

const App = () => {
  const [user] = useAuthState(auth);

  return (
    <Router>
      <Routes>
        <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={user ? <UserDashboard /> : <Navigate to="/" />} />
        <Route path="/patients/:patientId/sessions" element={user ? <PatientSessions /> : <Navigate to="/" />} 
        />
      </Routes>
    </Router>
  );
};

export default App;