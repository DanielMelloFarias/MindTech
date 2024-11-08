// src/components/sessions/TranscriptionButton.js
import React from 'react';
import { Mic } from 'lucide-react';

const TranscriptionButton = ({ onClick, isRecording = false }) => {
  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center gap-2 px-4 py-2 rounded-lg
        transition-colors duration-200 font-medium
        ${isRecording 
          ? 'bg-red-500 hover:bg-red-600 text-white' 
          : 'bg-teal-600 hover:bg-teal-700 text-white'}
      `}
    >
      <Mic className={`w-4 h-4 ${isRecording ? 'animate-pulse' : ''}`} />
      <span>{isRecording ? 'Parar Gravação' : 'Iniciar Gravação'}</span>
    </button>
  );
};

export default TranscriptionButton;