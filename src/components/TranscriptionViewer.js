// src/components/TranscriptionViewer.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import '../styles/transcriptionViewer.css';


const TranscriptionViewer = () => {
    const { patientId, sessionId } = useParams();
    const navigate = useNavigate();
    const [transcriptions, setTranscriptions] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchTranscriptions = async () => {
            try {
                const transcriptionsSnapshot = await getDocs(
                    collection(db, 'patients', patientId, 'sessions', sessionId, 'transcriptions')
                );

                const transcriptionsList = transcriptionsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }));

                // Ordenar as transcrições por tempo inicial para garantir ordem cronológica
                transcriptionsList.sort((a, b) => (a.time_end > b.time_end ? 1 : -1));
                setTranscriptions(transcriptionsList);
            } catch (error) {
                console.error('Erro ao buscar transcrições:', error);
            }
        };

        fetchTranscriptions();
    }, [patientId, sessionId]);

    const filteredTranscriptions = transcriptions.filter((t) =>
        t.transcription.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="transcription-viewer">
            {/* Botão de Voltar */}
            <button className="back-button" onClick={() => navigate(-1)}>
                &larr; Voltar
            </button>

            <h2>Transcrição da Sessão</h2>

            {/* Barra de pesquisa */}
            <input
                type="text"
                placeholder="Buscar na transcrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-bar"
            />

            {/* Botões de ações */}
            <div className="actions-container">
                <button className="action-button">Resumo</button>
                <button className="action-button">Pontos Chave</button>
                <button className="action-button">Geração de Ações</button>
            </div>

            {/* Lista de transcrições em duas colunas */}
            <div className="transcriptions-list">
                {filteredTranscriptions.length > 0 ? (
                    filteredTranscriptions.map((transcription) => (
                        <div key={transcription.id} className="transcription-item">
                            <div className="time-stamp">⏱ {transcription.time_end}</div>
                            <div className="transcription-text">{transcription.transcription}</div>
                        </div>
                    ))
                ) : (
                    <p className="no-results">Nenhuma transcrição encontrada.</p>
                )}
            </div>
        </div>
    );
};

export default TranscriptionViewer;