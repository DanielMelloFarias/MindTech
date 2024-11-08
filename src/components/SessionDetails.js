// src/components/SessionDetails.js
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import '../styles/sessionDetails.css';

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const SessionDetails = () => {
  const { sessionId } = useParams();
  const [transcriptions, setTranscriptions] = useState([]);

  useEffect(() => {
    const fetchTranscriptions = async () => {
      try {
        const transcriptionsSnapshot = await getDocs(collection(db, 'sessions', sessionId, 'transcriptions'));
        const transcriptionsList = transcriptionsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Ordenar as transcrições pelo tempo de início (time_begin)
        transcriptionsList.sort((a, b) => a.time_begin - b.time_begin);
        setTranscriptions(transcriptionsList);
      } catch (error) {
        console.error('Erro ao buscar transcrições:', error);
      }
    };

    fetchTranscriptions();
  }, [sessionId]);

  return (
    <div className="session-details-container">
      <h2>Transcrição da Sessão</h2>
      {transcriptions.length > 0 ? (
        <div className="conversation-list">
          {transcriptions.map((transcription) => (
            <div key={transcription.id} className="conversation-item">
              <p className="time-stamp">{formatTime(transcription.time_begin)}</p>
              <p className="transcription-text">{transcription.transcription}</p>
            </div>
          ))}
        </div>
      ) : (
        <p>Sem transcrições disponíveis para esta sessão.</p>
      )}
      <button onClick={() => window.history.back()}>Voltar</button>
    </div>
  );
};

export default SessionDetails;
