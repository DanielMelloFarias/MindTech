// src/components/PatientDashboard.js
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, serverTimestamp, doc } from 'firebase/firestore';
import '../styles/patientDashboard.css';
import TranscriptionRecorder from './TranscriptionRecorder';
import { useNavigate } from 'react-router-dom';

const PatientDashboard = () => {
  const { patientId } = useParams();
  const [sessions, setSessions] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [newSession, setNewSession] = useState({
    sessionDate: '',
    sessionTime: '',
    estimatedDuration: '',
    description: '',
    keyPoints: '',
    sessionType: 'Primeira Consulta',
    status: 'Agendada',
  });
  const [showAddSessionModal, setShowAddSessionModal] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showTranscriptionRecorder, setShowTranscriptionRecorder] = useState(false); // Novo estado para exibir TranscriptionRecorder
  const [sessionIdForRecording, setSessionIdForRecording] = useState(null); // Sessão ativa para gravação
  const navigate = useNavigate();

  useEffect(() => {
    fetchSessions();
  }, []);

  const openTranscriptionViewer = (sessionId) => {
    navigate(`/patient/${patientId}/session/${sessionId}/transcription`);
  };

  const fetchSessions = async () => {
    try {
      const sessionsSnapshot = await getDocs(collection(db, 'patients', patientId, 'sessions'));
      const sessionsList = await Promise.all(
        sessionsSnapshot.docs.map(async (doc) => {
          const sessionData = { id: doc.id, ...doc.data() };
          const transcriptionsSnapshot = await getDocs(collection(db, 'patients', patientId, 'sessions', doc.id, 'transcriptions'));
          sessionData.hasTranscription = !transcriptionsSnapshot.empty;
          return sessionData;
        })
      );
      sessionsList.sort((a, b) => {
        const dateA = new Date(`${a.sessionDate} ${a.sessionTime}`);
        const dateB = new Date(`${b.sessionDate} ${b.sessionTime}`);
        return dateB - dateA;
      });
      setSessions(sessionsList);
      setFilteredSessions(sessionsList);
    } catch (error) {
      console.error('Erro ao buscar sessões:', error);
    }
  };

  const handleSaveSession = async () => {
    if (!newSession.sessionDate || !newSession.sessionTime || !newSession.description) {
      alert('Por favor, preencha todos os campos.');
      return;
    }
    if (newSession.description.length > 150) {
      alert('Descrição deve ter no máximo 150 caracteres.');
      return;
    }
    if (newSession.keyPoints.length > 300) {
      alert('Resumo deve ter no máximo 300 caracteres.');
      return;
    }
    try {
      if (editingSession) {
        await updateDoc(doc(db, 'patients', patientId, 'sessions', editingSession.id), {
          ...newSession,
        });
        alert('Sessão atualizada com sucesso.');
      } else {
        const docRef = await addDoc(collection(db, 'patients', patientId, 'sessions'), {
          ...newSession,
          createdAt: serverTimestamp(),
        });
        alert('Sessão adicionada com sucesso.');
      }
      fetchSessions();
      closeModal();
    } catch (error) {
      console.error('Erro ao salvar sessão:', error);
    }
  };

  const handleDeleteSession = (sessionId) => {
    setSessionToDelete(sessionId);
    setShowConfirmDeleteModal(true);
  };

  const confirmDeleteSession = async () => {
    try {
      await deleteDoc(doc(db, 'patients', patientId, 'sessions', sessionToDelete));
      setSessions(sessions.filter((session) => session.id !== sessionToDelete));
      alert('Sessão excluída com sucesso.');
      setShowConfirmDeleteModal(false);
      setSessionToDelete(null);
      fetchSessions();
    } catch (error) {
      console.error('Erro ao excluir sessão:', error);
    }
  };

  const openEditModal = (session) => {
    setEditingSession(session);
    setNewSession(session);
    setShowAddSessionModal(true);
  };

  const closeModal = () => {
    setEditingSession(null);
    setShowAddSessionModal(false);
    setShowConfirmDeleteModal(false);
    setSessionToDelete(null);
    setNewSession({
      sessionDate: '',
      sessionTime: '',
      estimatedDuration: '',
      description: '',
      keyPoints: '',
      sessionType: 'Primeira Consulta',
      status: 'Agendada',
    });
  };

  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    const filtered = sessions.filter((session) =>
      session.keyPoints ? session.keyPoints.toLowerCase().includes(term) : false
    );
    setFilteredSessions(term ? filtered : sessions);
  };

  const startTranscription = (sessionId) => {
    setSessionIdForRecording(sessionId);
    setShowTranscriptionRecorder(true);
  };

  // Função para ir para a página anterior
  const handleBack = () => {
    navigate('/dashboard'); // Redireciona para a rota de pacientes
  };

  return (
    <div className="patient-dashboard-container">
      <button className="back-button" onClick={handleBack}>
        ← Voltar para Pacientes
      </button>
      <h2 className="dashboard-title">Gestão de Sessões</h2>

      <div className="filters">
        <input
          type="text"
          placeholder="Buscar por palavra no resumo..."
          value={searchTerm}
          onChange={handleSearch}
          className="search-bar"
        />
      </div>

      <button className="add-session-button" onClick={() => setShowAddSessionModal(true)}>
        Adicionar Sessão
      </button>

      {showAddSessionModal && (
        <div className="modal-background" onClick={(e) => e.target.className === 'modal-background' && closeModal()}>
          <div className="modal-content">
            <h3>{editingSession ? 'Editar Sessão' : 'Adicionar Sessão'}</h3>
            {showAddSessionModal && (
              <div className="modal-background" onClick={(e) => e.target.className === 'modal-background' && closeModal()}>
                <div className="modal-content">
                  <h3>{editingSession ? 'Editar Sessão' : 'Adicionar Sessão'}</h3>
                  <label>Data da Sessão</label>
                  <input
                    type="date"
                    value={newSession.sessionDate}
                    onChange={(e) => setNewSession({ ...newSession, sessionDate: e.target.value })}
                  />
                  <label>Hora da Sessão</label>
                  <input
                    type="time"
                    value={newSession.sessionTime}
                    onChange={(e) => setNewSession({ ...newSession, sessionTime: e.target.value })}
                  />
                  <label>Duração Estimada</label>
                  <input
                    type="text"
                    placeholder="Duração Estimada (ex: 1h, 1h30min)"
                    value={newSession.estimatedDuration}
                    onChange={(e) => setNewSession({ ...newSession, estimatedDuration: e.target.value })}
                  />
                  <label>Descrição (máx. 150 caracteres)</label>
                  <textarea
                    placeholder="Descrição ou Notas"
                    value={newSession.description}
                    onChange={(e) => {
                      const text = e.target.value.slice(0, 150);
                      setNewSession({ ...newSession, description: text });
                    }}
                  />
                  <label>Resumo ou Pontos Chave (máx. 300 caracteres)</label>
                  <textarea
                    placeholder="Resumo ou Pontos Chave"
                    value={newSession.keyPoints}
                    onChange={(e) => {
                      const text = e.target.value.slice(0, 300);
                      setNewSession({ ...newSession, keyPoints: text });
                    }}
                  />
                  <label>Tipo de Sessão</label>
                  <select
                    value={newSession.sessionType}
                    onChange={(e) => setNewSession({ ...newSession, sessionType: e.target.value })}
                  >
                    <option value="Primeira Consulta">Primeira Consulta</option>
                    <option value="Seguimento">Seguimento</option>
                    <option value="Encerramento">Encerramento</option>
                  </select>
                  <div className="modal-actions">
                    <button onClick={handleSaveSession} className="save-session-button">Salvar Sessão</button>
                    <button onClick={closeModal} className="cancel-button">Cancelar</button>
                  </div>
                </div>
              </div>
            )}

            <div className="modal-actions">
              <button onClick={handleSaveSession} className="save-session-button">Salvar Sessão</button>
              <button onClick={closeModal} className="cancel-button">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div className="sessions-list">
        {filteredSessions.length > 0 ? (
          filteredSessions.map((session) => (
            <div key={session.id} className="session-card">
              <div className="session-info">
                <p><strong>Data:</strong> {session.sessionDate}</p>
                <p><strong>Hora:</strong> {session.sessionTime}</p>
                <p><strong>Descrição:</strong> {session.description}</p>
              </div>
              <div className="session-keypoints">
                <p><strong>Resumo:</strong> {session.keyPoints}</p>
              </div>
              <div className="session-actions">
                <button className="edit-btn" onClick={() => openEditModal(session)}>Editar</button>
                <button className="record-btn" onClick={() => startTranscription(session.id)}>Gravar Sessão</button>
                <button
                  className={`transcription-btn ${session.hasTranscription ? 'active' : ''}`}
                  onClick={() => session.hasTranscription && openTranscriptionViewer(session.id)}
                  disabled={!session.hasTranscription}
                >
                  Transcrição
                </button>
                <button className="delete-btn" onClick={() => handleDeleteSession(session.id)}>Excluir</button>
              </div>
            </div>
          ))
        ) : (
          <p>Nenhuma sessão encontrada.</p>
        )}
      </div>

      {/* Exibir o TranscriptionRecorder se showTranscriptionRecorder estiver ativo */}
      {showTranscriptionRecorder && (
        <TranscriptionRecorder
          sessionId={sessionIdForRecording}
          patientId={patientId}
          onClose={() => setShowTranscriptionRecorder(false)} // Para fechar o TranscriptionRecorder
        />
      )}

      {showConfirmDeleteModal && (
        <div className="modal-background" onClick={(e) => e.target.className === 'modal-background' && closeModal()}>
          <div className="modal-content">
            <h3>Confirmar Remoção</h3>
            <p>Tem certeza de que deseja remover esta sessão?</p>
            <button className="confirm-button" onClick={confirmDeleteSession}>Sim</button>
            <button className="cancel-button" onClick={closeModal}>Não</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDashboard;
