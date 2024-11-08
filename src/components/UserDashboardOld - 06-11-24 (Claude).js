// src/components/UserDashboard.js
import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import '../styles/userDashboard.css';

const UserDashboard = () => {
  const [user, setUser] = useState(null);
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [newPatient, setNewPatient] = useState({ name: '', email: '', phone: '' });
  const [editingPatient, setEditingPatient] = useState(null);
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      setUser({
        name: currentUser.displayName || 'Usuário',
        email: currentUser.email,
      });
    }
  }, []);

  useEffect(() => {
    const fetchPatientsAndSessions = async () => {
      try {
        const userId = auth.currentUser.uid;
        const patientsSnapshot = await getDocs(collection(db, 'users', userId, 'patients'));
        
        const patientsList = await Promise.all(
          patientsSnapshot.docs.map(async (doc) => {
            const sessionsSnapshot = await getDocs(collection(db, 'patients', doc.id, 'sessions'));
            const sessionsList = sessionsSnapshot.docs.map((sessionDoc) => ({
              id: sessionDoc.id,
              ...sessionDoc.data(),
            }));
  
            // Adicione o console.log para verificar as sessões de cada paciente
            console.log(`Sessões do paciente ${doc.id}:`, sessionsList);
  
            const patientData = {
              id: doc.id,
              ...doc.data(),
              sessionsCount: sessionsSnapshot.size, // Contagem real de sessões do paciente
            };
  
            // Adicione o console.log para verificar os dados de cada paciente
            console.log('Paciente carregado:', patientData);
  
            return patientData;
          })
        );
  
        // Adicione um console.log para ver a lista completa de pacientes
        console.log('Lista de pacientes:', patientsList);
  
        setPatients(patientsList);
      } catch (error) {
        console.error('Erro ao buscar pacientes e contar sessões:', error);
      }
    };
  
    fetchPatientsAndSessions();
  }, []);
  
  
  

  const handleSignOut = () => {
    signOut(auth).catch((error) => console.error('Erro ao fazer logout:', error));
  };

  const handleAddPatient = async () => {
    const { name, email, phone } = newPatient;
  
    // Verificar se os campos estão preenchidos
    if (!name || !email || !phone) {
      alert("Por favor, preencha todos os campos.");
      return;
    }
  
    // Verificar se o email está no formato correto
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert("Por favor, insira um email válido.");
      return;
    }
  
    // Verificar se o telefone possui 11 dígitos
    const phoneDigits = phone.replace(/\D/g, ''); // Remove a formatação
    if (phoneDigits.length !== 11) {
      alert("O telefone deve ter 11 dígitos (ex: (12) 12345-6789).");
      return;
    }
  
    try {
      const userId = auth.currentUser.uid;
      await addDoc(collection(db, 'users', userId, 'patients'), {
        ...newPatient,
        sessions: 0,
        totalTranscriptionTime: '0s',
      });
      setNewPatient({ name: '', email: '', phone: '' });
      alert('Paciente adicionado com sucesso.');
      setShowAddPatientModal(false);
      window.location.reload();
    } catch (error) {
      console.error('Erro ao adicionar paciente:', error);
    }
  };
  
  

  const handleEditPatient = (patient) => {
    setEditingPatient(patient);
  };

  const handleUpdatePatient = async () => {
    try {
      const userId = auth.currentUser.uid;
      await updateDoc(doc(db, 'users', userId, 'patients', editingPatient.id), {
        ...editingPatient,
      });
      alert('Paciente atualizado com sucesso.');
      setEditingPatient(null);
      window.location.reload();
    } catch (error) {
      console.error('Erro ao atualizar paciente:', error);
    }
  };

  const handleDeletePatient = (patientId) => {
    setPatientToDelete(patientId);
    setShowConfirmModal(true);
  };

  const confirmDeletePatient = async () => {
    try {
      const userId = auth.currentUser.uid;
      await deleteDoc(doc(db, 'users', userId, 'patients', patientToDelete));
      setPatients(patients.filter((patient) => patient.id !== patientToDelete));
      alert('Paciente removido com sucesso.');
      setShowConfirmModal(false);
      setPatientToDelete(null);
    } catch (error) {
      console.error('Erro ao remover paciente:', error);
    }
  };

  const handleViewPatientSessions = (patient) => {
    setSelectedPatient(patient);
    navigate(`/patients/${patient.id}/sessions`);
  };

  const closeModal = () => {
    setEditingPatient(null);
    setShowAddPatientModal(false);
    setShowConfirmModal(false);
  };

  const handleOutsideClick = (e) => {
    if (e.target.className === 'edit-modal') {
      closeModal();
    }
  };

  const filteredPatients = patients.filter((patient) => {
    const searchValue = searchTerm.toLowerCase();
    return (
      patient.name.toLowerCase().includes(searchValue) || // Filtro por nome
      (patient.cpf && patient.cpf.includes(searchValue))  // Filtro por CPF
    );
  });
  

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="user-info">
          <h2>Gestão de Pacientes</h2>
          <p><strong>Nome:</strong> {user?.name}</p>
          <p><strong>Email:</strong> {user?.email}</p>
        </div>
        <div className="actions">
          <input
            type="text"
            placeholder="Buscar pacientes"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-bar"
          />
          <button className="sign-out-button" onClick={handleSignOut}>Sair</button>
        </div>
      </header>
      <button className="add-patient-button" onClick={() => setShowAddPatientModal(true)}>
        Adicionar Novo Paciente
      </button>
      <div className="patients-grid">
        {filteredPatients.length > 0 ? (
            filteredPatients.map((patient) => (
            <div
                key={patient.id}
                className="patient-card"
                onClick={() => handleViewPatientSessions(patient)}
            >
                <div className="patient-img-placeholder">
                <span role="img" aria-label="Paciente">👤</span>
                </div>
                <h3>{patient.name}</h3>
                <p><i className="fas fa-calendar-alt"></i> <strong>Sessões:</strong> {patient.sessionsCount || 0}</p>
                <p><i className="fas fa-clock"></i> <strong>Tempo de Transcrição:</strong> {patient.totalTranscriptionTime || '0s'}</p>
                <div className="card-actions">
                <button className="edit-button" onClick={(e) => { e.stopPropagation(); handleEditPatient(patient); }}>Editar</button>
                <button className="remove-button" onClick={(e) => { e.stopPropagation(); handleDeletePatient(patient.id); }}>Remover</button>
                <button className="view-button" onClick={(e) => { e.stopPropagation(); handleViewPatientSessions(patient); }}>Abrir Sessões</button>
                </div>
            </div>
            ))
        ) : (
            <p>Nenhum paciente encontrado.</p>
        )}
      </div>

      {showConfirmModal && (
        <div className="confirm-modal">
          <div className="modal-content">
            <h3>Confirmar Remoção</h3>
            <p>Tem certeza de que deseja remover este paciente?</p>
            <button className="confirm-button" onClick={confirmDeletePatient}>Sim</button>
            <button className="delet-button" onClick={closeModal}>Não</button>
          </div>
        </div>
      )}
    {showAddPatientModal && (
    <div className="edit-modal" onClick={(e) => { if (e.target.className === 'edit-modal') setShowAddPatientModal(false); }}>
        <div className="modal-content">
        <h3>Adicionar Paciente</h3>
        <input
            type="text"
            placeholder="Nome"
            value={newPatient.name}
            onChange={(e) => {
            const name = e.target.value.replace(/[^a-zA-ZÀ-ÿ\s]/g, ''); // Apenas letras e espaços
            setNewPatient({ ...newPatient, name });
            }}
        />
        <input
            type="email"
            placeholder="Email"
            value={newPatient.email}
            onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
        />
        <input
            type="tel"
            placeholder="Telefone (ex: (12) 12345-6789)"
            value={newPatient.phone}
            onChange={(e) => {
            let phone = e.target.value.replace(/\D/g, ''); // Remove tudo que não é dígito
            if (phone.length > 11) phone = phone.slice(0, 11); // Limita a 11 dígitos
            phone = phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3'); // Formata
            setNewPatient({ ...newPatient, phone });
            }}
        />
        <button onClick={handleAddPatient}>Adicionar</button>
        <button className="cancel-button" onClick={() => setShowAddPatientModal(false)}>Cancelar</button>
        </div>
    </div>
    )}
      {editingPatient && (
        <div className="edit-modal" onClick={(e) => e.target.className === 'edit-modal' && closeModal()}>
          <div className="modal-content">            
            <h3>Editar Paciente</h3>
            <input
              type="text"
              value={editingPatient.name}
              onChange={(e) => setEditingPatient({ ...editingPatient, name: e.target.value })}
            />
            <input
              type="email"
              value={editingPatient.email}
              onChange={(e) => setEditingPatient({ ...editingPatient, email: e.target.value })}
            />
            <input
              type="tel"
              value={editingPatient.phone}
              onChange={(e) => setEditingPatient({ ...editingPatient, phone: e.target.value })}
            />
            <button onClick={handleUpdatePatient}>Salvar</button>
            <button onClick={closeModal} className="cancel-button">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboard;
