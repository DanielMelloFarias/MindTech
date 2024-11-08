// src/utils/transcriptionHelpers.js
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';

// Função para formatar tempo em MM:SS
export const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

// Função para calcular duração
export const calculateDuration = (timeBegin, timeEnd) => {
  const beginParts = timeBegin.split(':').map(Number);
  const endParts = timeEnd.split(':').map(Number);
  
  const beginSeconds = beginParts[0] * 60 + beginParts[1];
  const endSeconds = endParts[0] * 60 + endParts[1];
  
  return endSeconds - beginSeconds;
};   

// Função para salvar transcrição
export const saveTranscription = async (data, audioSource, patientId, sessionId, lastTimeEnd = 0) => {
  try {
    // Calcula os tempos baseado no último tempo registrado
    const timeBegin = formatTime(lastTimeEnd);
    const timeEnd = formatTime(lastTimeEnd + (data.duration || 0));

    const transcriptionData = {
      confidence: data.confidence ?? null,
      createdAt: new Date(),
      duration: calculateDuration(timeBegin, timeEnd),
      event: data.event ?? null,
      inference_time: data.inference_time ?? null,
      language: data.language ?? null,
      request_id: data.request_id ?? null,
      time_begin: timeBegin,
      time_end: timeEnd,
      transcription: data.transcription ?? "",
      type: data.type ?? null,
      source: audioSource
    };

    await addDoc(
      collection(db, 'patients', patientId, 'sessions', sessionId, 'transcriptions'),
      transcriptionData
    );

    return timeEnd; // Retorna o tempo final para ser usado como próximo início
  } catch (error) {
    console.error('Erro ao salvar transcrição:', error);
    throw error;
  }
};