// No SessionCard, vamos adicionar o botão de transcrição junto com os outros botões
import React, { useState } from 'react';
import { Calendar, Clock, Edit2, Trash2, Mic } from 'lucide-react';
import TranscriptionRecorder from './TranscriptionRecorder';

const SessionCard = ({ session, patientId, onEdit, onDelete }) => {
    const [showTranscription, setShowTranscription] = useState(false);

    return (
        <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-100">
            {/* ... (resto do seu card permanece igual) ... */}

            {/* Ações */}
            <div className="mt-4 flex justify-end gap-2">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowTranscription(true);
                    }}
                    className="px-3 py-1.5 text-sm text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-md transition-colors inline-flex items-center gap-2"
                >
                    <Mic className="w-4 h-4" />
                    Transcrever
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onEdit(session);
                    }}
                    className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors inline-flex items-center gap-2"
                >
                    <Edit2 className="w-4 h-4" />
                    Editar
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(session.id);
                    }}
                    className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors inline-flex items-center gap-2"
                >
                    <Trash2 className="w-4 h-4" />
                    Remover
                </button>
            </div>

            {/* Modal de Transcrição */}
            {showTranscription && (
                <TranscriptionRecorder
                    patientId={patientId}
                    sessionId={session.id}
                    onClose={() => setShowTranscription(false)}
                />
            )}
        </div>
    );
};

export default SessionCard;