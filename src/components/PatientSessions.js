// src/components/PatientSessions.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { ArrowLeft } from 'lucide-react';
import SessionsList from './sessions/SessionsList';

const PatientSessions = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPatient = async () => {
      try {
        const userId = auth.currentUser?.uid;
        if (!userId) {
          throw new Error('Usuário não autenticado');
        }

        // Busca o paciente usando o caminho correto: users/userId/patients/patientId
        const patientDoc = await getDoc(doc(db, 'users', userId, 'patients', patientId));
        
        if (patientDoc.exists()) {
          setPatient({ id: patientDoc.id, ...patientDoc.data() });
        } else {
          setError('Paciente não encontrado');
        }
      } catch (err) {
        console.error('Erro ao buscar paciente:', err);
        setError(err.message || 'Erro ao carregar dados do paciente');
      } finally {
        setLoading(false);
      }
    };

    fetchPatient();
  }, [patientId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-teal-600 hover:text-teal-700 font-medium"
          >
            Voltar para o Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Voltar para Dashboard</span>
            </button>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      {patient && <SessionsList patient={patient} />}
    </div>
  );
};

export default PatientSessions;