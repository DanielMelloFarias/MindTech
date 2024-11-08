// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import UserDashboard from './components/UserDashboard';
import PatientDashboard from './components/PatientDashboard'; // Importar o componente para gestão de sessões
import SessionDetails from './components/SessionDetails';
import { auth } from './firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import TranscriptionViewer from './components/TranscriptionViewer';
import './index.css';  // ou './App.css' dependendo do nome do seu arquivo

const App = () => {
  const [user] = useAuthState(auth);

  return (
    <Router>
      <Routes>
        <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={user ? <UserDashboard /> : <Navigate to="/" />} />
        <Route path="/patients/:patientId/sessions" element={user ? <PatientDashboard /> : <Navigate to="/" />} /> {/* Adicione essa rota */}
        <Route path="/sessions/:sessionId" element={user ? <SessionDetails /> : <Navigate to="/" />} />        
        <Route path="/patient/:patientId" element={<PatientDashboard />} />
        <Route path="/patient/:patientId/session/:sessionId/transcription" element={<TranscriptionViewer />} />
      </Routes>
    </Router>
  );
};

export default App;
