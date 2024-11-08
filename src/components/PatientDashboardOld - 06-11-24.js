// src/components/PatientDashboard.js
import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import '../styles/patientDashboard.css';

const PatientDashboard = () => {
  const [patients, setPatients] = useState([]);
  const [newPatient, setNewPatient] = useState({ name: '', cpf: '', email: '', phone: '' });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const userId = auth.currentUser.uid;
        const patientsSnapshot = await getDocs(collection(db, 'users', userId, 'patients'));
        const patientsList = patientsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setPatients(patientsList);
      } catch (error) {
        console.error('Erro ao buscar pacientes:', error);
      }
    };
    fetchPatients();
  }, []);

  const handleAddPatient = async () => {
    if (!newPatient.name || !newPatient.cpf) {
      alert('Nome e CPF são obrigatórios.');
      return;
    }
    try {
      const userId = auth.currentUser.uid;
      await addDoc(collection(db, 'users', userId, 'patients'), {
        ...newPatient,
      });
      setNewPatient({ name: '', cpf: '', email: '', phone: '' });
      alert('Paciente adicionado com sucesso.');
      window.location.reload(); // Atualiza a página para mostrar os novos dados
    } catch (error) {
      console.error('Erro ao adicionar paciente:', error);
    }
  };

  const handleDeletePatient = async (patientId) => {
    try {
      const userId = auth.currentUser.uid;
      await deleteDoc(doc(db, 'users', userId, 'patients', patientId));
      setPatients(patients.filter((patient) => patient.id !== patientId));
      alert('Paciente removido com sucesso.');
    } catch (error) {
      console.error('Erro ao remover paciente:', error);
    }
  };

  const filteredPatients = patients.filter(
    (patient) =>
      patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.cpf.includes(searchTerm)
  );

  return (
    <div className="patient-dashboard-container">
      <h2>Gestão de Pacientes</h2>
      <div className="add-patient-form">
        <h3>Adicionar Paciente</h3>
        <input
          type="text"
          placeholder="Nome"
          value={newPatient.name}
          onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
        />
        <input
          type="text"
          placeholder="CPF"
          value={newPatient.cpf}
          onChange={(e) => setNewPatient({ ...newPatient, cpf: e.target.value })}
        />
        <input
          type="email"
          placeholder="Email"
          value={newPatient.email}
          onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
        />
        <input
          type="tel"
          placeholder="Telefone"
          value={newPatient.phone}
          onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
        />
        <button onClick={handleAddPatient}>Adicionar Paciente</button>
      </div>
      <div className="search-bar">
        <input
          type="text"
          placeholder="Buscar por nome ou CPF"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="patients-list">
        {filteredPatients.length > 0 ? (
          filteredPatients.map((patient) => (
            <div key={patient.id} className="patient-card">
              <p><strong>Nome:</strong> {patient.name}</p>
              <p><strong>CPF:</strong> {patient.cpf}</p>
              <p><strong>Email:</strong> {patient.email}</p>
              <p><strong>Telefone:</strong> {patient.phone}</p>
              <button onClick={() => handleDeletePatient(patient.id)}>Remover</button>
              <button onClick={() => alert('Função de editar em desenvolvimento')}>Editar</button>
            </div>
          ))
        ) : (
          <p>Nenhum paciente encontrado.</p>
        )}
      </div>
    </div>
  );
};

export default PatientDashboard;
