// src/components/sessions/SessionsList.js
import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import {
  Plus,
  Calendar,
  Filter,
  Search,
  Clock,
  AlertCircle,
  Eye,
  Mic,
  Edit2,
  Trash2
} from 'lucide-react';

import AddSessionModal from './AddSessionModal';
import EditSessionModal from './EditSessionModal';
import ViewSession from './ViewSession';
import TranscriptionRecorder from './TranscriptionRecorder';

const SessionsList = ({ patient }) => {
  // Estados
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para modais
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewSession, setShowViewSession] = useState(false);
  const [showTranscriptionModal, setShowTranscriptionModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);

  // Buscar sessões
  const fetchSessions = async () => {
    try {
      setLoading(true);
      const sessionsRef = collection(db, 'patients', patient.id, 'sessions');
      const q = query(sessionsRef, orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);

      const sessionsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setSessions(sessionsData);
    } catch (error) {
      console.error('Erro ao buscar sessões:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [patient.id]);

  // Handlers
  const handleViewSession = (session) => {
    setSelectedSession(session);
    setShowViewSession(true);
  };

  const handleEditSession = (session) => {
    setSelectedSession(session);
    setShowEditModal(true);
  };

  const handleDeleteSession = (session) => {
    // Implementar lógica de exclusão
    console.log('Deletar sessão:', session.id);
  };

  const handleTranscription = (session) => {
    setSelectedSession(session);
    setShowTranscriptionModal(true);
  };

  const handleCloseModals = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setShowViewSession(false);
    setShowTranscriptionModal(false);
    setSelectedSession(null);
  };

  const handleSuccess = () => {
    fetchSessions();
    handleCloseModals();
  };

  // Helper para formatação de status
  const getStatusStyle = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  // Filtrar sessões
  const filteredSessions = sessions.filter(session => {
    const matchesStatus = statusFilter === 'all' || session.status === statusFilter;
    const matchesSearch =
      session.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.keyPoints?.some(point =>
        point.toLowerCase().includes(searchTerm.toLowerCase())
      );

    return matchesStatus && (searchTerm === '' || matchesSearch);
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header com Título e Botão Adicionar */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Sessões - {patient.name}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {sessions.length} {sessions.length === 1 ? 'sessão registrada' : 'sessões registradas'}
              </p>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Nova Sessão
            </button>
          </div>

          {/* Filtros e Busca */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="md:col-span-4 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar em resumos e anotações..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition-all"
              />
            </div>

            <div className="md:col-span-2 flex items-center gap-2">
              <Filter className="text-gray-400 w-5 h-5" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition-all"
              >
                <option value="all">Todos os status</option>
                <option value="scheduled">Agendadas</option>
                <option value="completed">Realizadas</option>
                <option value="cancelled">Canceladas</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lista de Sessões */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-500 border-t-transparent"></div>
          </div>
        ) : filteredSessions.length > 0 ? (
          <div className="space-y-4">
            {filteredSessions.map(session => (
              <div
                key={session.id}
                className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
              >
                {/* Info da Sessão */}
                <div
                  className="flex items-start justify-between cursor-pointer"
                  onClick={() => handleViewSession(session)}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      <Calendar className="w-8 h-8 text-teal-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {session.date.toDate().toLocaleDateString('pt-BR', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="w-4 h-4" />
                        {session.date.toDate().toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })} - {session.duration} minutos
                      </div>
                    </div>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusStyle(session.status)}`}>
                    {session.status === 'completed' ? 'Realizada' :
                      session.status === 'cancelled' ? 'Cancelada' : 'Agendada'}
                  </span>
                </div>

                {/* Botões de Ação */}
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTranscription(session);
                    }}
                    className="px-3 py-1.5 text-sm text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-md transition-colors inline-flex items-center gap-2"
                  >
                    <Mic className="w-4 h-4" />
                    Transcrever
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditSession(session);
                    }}
                    className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors inline-flex items-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    Editar
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewSession(session);
                    }}
                    className="px-3 py-1.5 text-sm text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-md transition-colors inline-flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Ver Detalhes
                  </button>
                </div>

                {/* Notas e Tags */}
                {(session.notes || session.keyPoints?.length > 0) && (
                  <div className="mt-4 border-t border-gray-100 pt-4">
                    {session.notes && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                        {session.notes}
                      </p>
                    )}
                    {session.keyPoints?.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {session.keyPoints.map((point, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 rounded-full bg-gray-100 text-gray-600 text-xs"
                          >
                            {point}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || statusFilter !== 'all' ? (
                <>
                  <AlertCircle className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                  Nenhuma sessão encontrada
                </>
              ) : (
                <>
                  <Calendar className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                  Nenhuma sessão registrada
                </>
              )}
            </h3>
            <p className="text-gray-500">
              {searchTerm || statusFilter !== 'all'
                ? 'Tente ajustar os filtros de busca'
                : 'Comece adicionando uma nova sessão'}
            </p>
          </div>
        )}
      </div>

      {/* Modais */}
      {showAddModal && (
        <AddSessionModal
          isOpen={showAddModal}
          onClose={handleCloseModals}
          patientId={patient.id}
          onSuccess={handleSuccess}
        />
      )}

      {showEditModal && selectedSession && (
        <EditSessionModal
          isOpen={showEditModal}
          onClose={handleCloseModals}
          session={selectedSession}
          patientId={patient.id}
          onSuccess={handleSuccess}
        />
      )}

      {showViewSession && selectedSession && (
        <ViewSession
          session={selectedSession}
          patientName={patient.name}
          patientId={patient.id}  // Certifique-se que esta linha existe
          onClose={handleCloseModals}
          onEdit={() => handleEditSession(selectedSession)}
          onDelete={handleDeleteSession}
        />
      )}

      {showViewSession && selectedSession && (
        <ViewSession
          session={selectedSession}
          patientName={patient.name}
          onClose={handleCloseModals}
          onEdit={() => {
            setShowViewSession(false);
            handleEditSession(selectedSession);
          }}
        />
      )}

      {showTranscriptionModal && selectedSession && (
        <TranscriptionRecorder
          patientId={patient.id}
          sessionId={selectedSession.id}
          onClose={handleCloseModals}
        />
      )}
    </div>
  );
};

export default SessionsList;