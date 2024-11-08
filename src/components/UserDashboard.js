import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';

import Header from './Header';
import PatientCard from './PatientCard';
import PatientModal from './PatientModal';

const UserDashboard = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState(null);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const navigate = useNavigate();

  // Buscar pacientes
  const fetchPatients = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        console.error('Usuário não autenticado');
        return;
      }

      const patientsSnapshot = await getDocs(
        collection(db, 'users', userId, 'patients')
      );

      const patientsData = patientsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setPatients(patientsData);
    } catch (error) {
      console.error('Erro ao buscar pacientes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  // Handler para logout
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  // Handlers para ações nos pacientes
  const handleAddPatient = () => {
    setEditingPatient(null); // Garante que não está no modo edição
    setShowPatientModal(true);
  };

  const handleEditPatient = (patient) => {
    setEditingPatient(patient);
    setShowPatientModal(true);
  };

  const handleCloseModal = () => {
    setShowPatientModal(false);
    setEditingPatient(null);
    fetchPatients(); // Recarrega a lista após adicionar/editar
  };

  const handleViewSessions = (patient) => {
    navigate(`/patients/${patient.id}/sessions`);
  };

  const handleDeleteClick = (patientId) => {
    setPatientToDelete(patientId);
    setShowConfirmDelete(true);
  };

  const handleDeleteConfirm = async () => {
    if (!patientToDelete) return;

    try {
      const userId = auth.currentUser.uid;
      await deleteDoc(doc(db, 'users', userId, 'patients', patientToDelete));
      setPatients(patients.filter(p => p.id !== patientToDelete));
      setShowConfirmDelete(false);
      setPatientToDelete(null);
    } catch (error) {
      console.error('Erro ao deletar paciente:', error);
    }
  };

  // Filtro de pacientes
  const filteredPatients = patients
    .sort((a, b) => a.name.localeCompare(b.name))
    .filter(patient => {
      const searchLower = searchTerm.toLowerCase();
      return (
        patient.name?.toLowerCase().includes(searchLower) ||
        patient.email?.toLowerCase().includes(searchLower)
      );
    });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onSignOut={handleSignOut} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Barra de Pesquisa e Botão Adicionar */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-8">
          <div className="relative flex-1 max-w-xl">
            <input
              type="text"
              placeholder="Buscar pacientes por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition-all"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          </div>

          <button
            onClick={handleAddPatient}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Adicionar Paciente</span>
          </button>
        </div>

        {/* Lista de Pacientes */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-teal-500 border-t-transparent"></div>
            <p className="mt-4 text-gray-500">Carregando pacientes...</p>
          </div>
        ) : filteredPatients.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredPatients.map(patient => (
              <PatientCard
                key={patient.id}
                patient={patient}
                onEdit={() => handleEditPatient(patient)}
                onDelete={() => handleDeleteClick(patient.id)}
                onViewSessions={() => handleViewSessions(patient)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500">
              {searchTerm
                ? "Nenhum paciente encontrado com esses termos."
                : "Você ainda não tem pacientes cadastrados."}
            </p>
          </div>
        )}
      </main>

      {/* Modal de Adicionar/Editar Paciente */}
      <PatientModal
        isOpen={showPatientModal}
        onClose={handleCloseModal}
        patient={editingPatient}
        userId={auth.currentUser?.uid}
      />

      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirmar Exclusão</h3>
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja excluir este paciente? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-colors font-medium border border-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium shadow-sm"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboard;