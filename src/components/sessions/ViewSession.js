import React, { useState, useEffect, useRef } from 'react';
import TranscriptionViewer from './TranscriptionViewer';
import {
  X,
  Clock,
  Calendar,
  Edit2,
  Mic,
  FileText,
  Tag,
  ChevronDown,
  ChevronUp,
  PlayCircle,
  PauseCircle,
  Trash2
} from 'lucide-react';

import { db } from '../../firebase';
import { collection, getDocs } from 'firebase/firestore';
import TranscriptionRecorder from './TranscriptionRecorder';
import { useParams } from 'react-router-dom'; // Adicione este import no topo

const ViewSession = ({ session, onClose, onEdit, onDelete, patientName }) => {

  // Primeiro, declaramos os hooks
  const { patientId } = useParams();

  const [showTranscription, setShowTranscription] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTranscriptionModal, setShowTranscriptionModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hasTranscriptions, setHasTranscriptions] = useState(false);
  const patientIdRef = useRef(patientId);

  // Depois, podemos usar o console.log
  //console.log("ViewSession Props:", { patientId, sessionId: session?.id });


  // Atualiza o ref quando patientId mudar
  useEffect(() => {
    if (patientId) {
      patientIdRef.current = patientId;
    }
  }, [patientId]);


  useEffect(() => {
    const checkTranscriptions = async () => {
      if (!patientId || !session?.id) {
        console.log("IDs ausentes:", { patientId, sessionId: session?.id });
        return;
      }

      try {
        const transcriptionsRef = collection(
          db,
          'patients',
          patientId,
          'sessions',
          session.id,
          'transcriptions'
        );

        const transcriptionsSnapshot = await getDocs(transcriptionsRef);
        //console.log(`Encontradas ${transcriptionsSnapshot.size} transcrições`);
        setHasTranscriptions(transcriptionsSnapshot.size > 0);

      } catch (error) {
        console.error('Erro ao verificar transcrições:', error);
      }
    };

    checkTranscriptions();
  }, [patientId, session]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Realizada';
      case 'cancelled':
        return 'Cancelada';
      default:
        return 'Agendada';
    }
  };

  const getTypeText = (type) => {
    switch (type) {
      case 'initial':
        return 'Primeira Consulta';
      case 'followup':
        return 'Retorno';
      case 'closing':
        return 'Encerramento';
      default:
        return type;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Detalhes da Sessão
            </h2>
            <p className="text-sm text-gray-500">
              Paciente: {patientName}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowTranscriptionModal(true);
              }}
              className="p-2 text-teal-600 hover:text-teal-700 transition-colors"
              title="Iniciar transcrição"
            >
              <Mic className="w-5 h-5" />
            </button>

            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 text-red-400 hover:text-red-600 transition-colors"
              title="Excluir sessão"
            >
              <Trash2 className="w-5 h-5" />
            </button>

            <button
              onClick={onEdit}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Editar sessão"
            >
              <Edit2 className="w-5 h-5" />
            </button>

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Informações Básicas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Data</p>
                <p className="font-medium">
                  {session.date.toDate().toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Horário e Duração</p>
                <p className="font-medium">
                  {session.date.toDate().toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })} - {session.duration} minutos
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(session.status)}`}>
                {getTypeText(session.type)} - {getStatusText(session.status)}
              </div>
            </div>
          </div>

          {/* Notas e Pontos-chave */}
          <div className="space-y-6">
            {session.notes && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <h3 className="font-medium text-gray-900">Notas</h3>
                </div>
                <p className="text-gray-600 whitespace-pre-line">{session.notes}</p>
              </div>
            )}

            {session.keyPoints?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="w-5 h-5 text-gray-400" />
                  <h3 className="font-medium text-gray-900">Pontos-chave</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {session.keyPoints.map((point, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm"
                    >
                      {point}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Área de Transcrição */}
          <div className="space-y-4">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => hasTranscriptions && setShowTranscription(!showTranscription)}
            >
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <Mic className="w-5 h-5 text-gray-400" />
                Transcrição da Sessão
                {!hasTranscriptions && (
                  <span className="text-sm text-gray-500 font-normal ml-2">
                    (Clique no ícone do microfone para iniciar uma transcrição)
                  </span>
                )}
              </h3>
              {hasTranscriptions && (
                showTranscription ?
                  <ChevronUp className="w-5 h-5 text-gray-400" /> :
                  <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </div>

            {/*
            <div className="text-xs text-gray-500">
              Debug: hasTranscriptions={String(hasTranscriptions)},
              showTranscription={String(showTranscription)},
              urlPatientId={patientId}
            </div>
            */}

            {hasTranscriptions && showTranscription && (
              <div className="mt-4">
                <TranscriptionViewer
                  patientId={patientId}
                  sessionId={session.id}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Transcrição */}
      {showTranscriptionModal && (
        <TranscriptionRecorder patientId={patientId} sessionId={session.id} onClose={() => setShowTranscriptionModal(false)} />
      )}

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Confirmar Exclusão
            </h3>
            <p className="text-gray-500 mb-6">
              Tem certeza que deseja excluir esta sessão? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onDelete(session.id);
                  setShowDeleteConfirm(false);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
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

export default ViewSession;
