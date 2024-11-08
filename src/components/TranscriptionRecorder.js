// src/components/TranscriptionRecorder.js
import React, { useState, useEffect, useRef } from 'react';
import RecordRTC from 'recordrtc';
import { db } from '../firebase';
import '../styles/transcriptionRecorder.css'; // Import CSS atualizado
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, limit } from 'firebase/firestore';

const SAMPLE_RATE = 48000;

const TranscriptionRecorder = ({ patientId, sessionId }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [micDevices, setMicDevices] = useState([]);
  const [selectedMicDevice, setSelectedMicDevice] = useState('');
  const [micTranscript, setMicTranscript] = useState('');
  const [audioTranscript, setAudioTranscript] = useState('');
  const [partials, setPartials] = useState('...');
  const [meetingId, setMeetingId] = useState(null); // Estado para armazenar o meetingId da reunião atual
  const [showModal, setShowModal] = useState(true); // Estado para exibir o modal
  const [lastTimeEnd, setLastTimeEnd] = useState(0); // Armazena o último tempo de término da reunião anterior

  const micSocketRef = useRef(null);
  const audioSocketRef = useRef(null);
  const micRecorderRef = useRef(null);
  const audioRecorderRef = useRef(null);

  useEffect(() => {
    listAudioDevices();
    fetchLastTranscriptionEnd(); // Buscar último time_end
  }, []);

  const fetchLastTranscriptionEnd = async () => {
    try {
      const transcriptionsRef = collection(db, 'patients', patientId, 'sessions', sessionId, 'transcriptions');
      const lastTranscriptionQuery = query(transcriptionsRef, orderBy('createdAt', 'desc'), limit(1));
      const snapshot = await getDocs(lastTranscriptionQuery);
      if (!snapshot.empty) {
        const lastTranscription = snapshot.docs[0].data();
        if (lastTranscription.time_end) {
          setLastTimeEnd(convertToSeconds(lastTranscription.time_end)); // Convertendo para segundos
        }
      }
    } catch (error) {
      console.error('Erro ao buscar última transcrição:', error);
    }
  };


  // Pergunta ao usuário se quer continuar a reunião anterior ou iniciar uma nova
  const handleUserChoice = async (continuePrevious) => {
    setShowModal(false); // Fechar o modal
    if (continuePrevious) {
      const lastMeetingData = await getLastMeetingData();
      setMeetingId(lastMeetingData.id);
      setLastTimeEnd(lastMeetingData.timeEnd); // Configura o tempo final da última reunião
    } else {
      const newMeetingId = createNewMeetingId();
      setMeetingId(newMeetingId);
      setLastTimeEnd(0); // Nova reunião começa com tempo zerado
    }
  };


  // Função para obter o último ID de reunião e o último time_end
  const getLastMeetingData = async () => {
    const transcriptionsRef = collection(db, 'patients', patientId, 'sessions', sessionId, 'transcriptions');
    const q = query(transcriptionsRef, orderBy('createdAt', 'desc'), limit(1));
    const querySnapshot = await getDocs(q);
    const lastDoc = querySnapshot.docs[0];
    return {
      id: lastDoc?.id || createNewMeetingId(),
      timeEnd: lastDoc?.data().time_end ?? 0, // Obtém o último tempo de término
    };
  };

  // Função para criar um novo meetingId
  const createNewMeetingId = () => {
    return `${sessionId}-${Date.now()}`; // Combinação de sessionId com timestamp para garantir unicidade
  };

  const listAudioDevices = async () => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter(device => device.kind === 'audioinput');
    setMicDevices(audioInputs);
    if (audioInputs.length > 0) {
      setSelectedMicDevice(audioInputs[0].deviceId);
    }
  };

  const startRecording = async () => {
    setIsRecording(true);
    setMicTranscript('');
    setAudioTranscript('');
    setPartials('...');

    try {
      // Setup WebSocket connections for mic and audio
      const micSocketPromise = deferredPromise();
      const audioSocketPromise = deferredPromise();

      micSocketRef.current = new WebSocket('wss://api.gladia.io/audio/text/audio-transcription');
      audioSocketRef.current = new WebSocket('wss://api.gladia.io/audio/text/audio-transcription');

      setupWebSocket(micSocketRef.current, micSocketPromise, setMicTranscript, 'microfone');
      setupWebSocket(audioSocketRef.current, audioSocketPromise, setAudioTranscript, 'sistema');

      // Wait for WebSocket connections to be established
      await Promise.all([micSocketPromise.promise, audioSocketPromise.promise]);

      // Access microphone audio
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: selectedMicDevice ? { exact: selectedMicDevice } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: SAMPLE_RATE,
        },
      });

      let screenStream;
      // Attempt to capture system audio if supported
      if (navigator.mediaDevices.getDisplayMedia) {
        try {
          screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: false,
            audio: { sampleRate: SAMPLE_RATE },
          });
        } catch (error) {
          console.warn("System audio capture not supported or denied by the user. Recording only microphone.");
        }
      } else {
        console.warn("System audio capture not supported by the browser. Recording only microphone.");
      }

      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const micDestination = audioContext.createMediaStreamDestination();
      const screenDestination = audioContext.createMediaStreamDestination();

      const micSource = audioContext.createMediaStreamSource(micStream);
      micSource.connect(micDestination);

      if (screenStream) {
        const screenAudioTrack = screenStream.getAudioTracks()[0];
        const screenAudioStream = new MediaStream([screenAudioTrack]);
        const screenSource = audioContext.createMediaStreamSource(screenAudioStream);
        screenSource.connect(screenDestination);
      }

      const combinedMicStream = micDestination.stream;
      const combinedAudioStream = screenDestination?.stream;

      micRecorderRef.current = new RecordRTC(combinedMicStream, {
        type: 'audio',
        mimeType: 'audio/wav',
        recorderType: RecordRTC.StereoAudioRecorder,
        timeSlice: 1000,
        async ondataavailable(blob) {
          const buffer = await blob.arrayBuffer();
          micSocketRef.current.send(buffer.slice(44));
        },
        sampleRate: SAMPLE_RATE,
        desiredSampRate: SAMPLE_RATE,
        numberOfAudioChannels: 1,
      });

      if (combinedAudioStream) {
        audioRecorderRef.current = new RecordRTC(combinedAudioStream, {
          type: 'audio',
          mimeType: 'audio/wav',
          recorderType: RecordRTC.StereoAudioRecorder,
          timeSlice: 1000,
          async ondataavailable(blob) {
            const buffer = await blob.arrayBuffer();
            audioSocketRef.current.send(buffer.slice(44));
          },
          sampleRate: SAMPLE_RATE,
          desiredSampRate: SAMPLE_RATE,
          numberOfAudioChannels: 1,
        });

        audioRecorderRef.current.startRecording();
      }

      micRecorderRef.current.startRecording();
    } catch (error) {
      console.error('Error starting recording:', error);
      stopRecording();
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);

    // Parar as gravações
    micRecorderRef.current?.stopRecording();
    audioRecorderRef.current?.stopRecording();

    micSocketRef.current?.close();
    audioSocketRef.current?.close();

    // Esperar um pequeno delay para garantir que tudo foi salvo no Firebase antes de recarregar a página
    await new Promise(resolve => setTimeout(resolve, 500));

    // Recarregar a página para atualizar a interface
    //window.location.reload();
  };

  const setupWebSocket = (socket, socketPromise, setTranscript, audioSource) => {
    socket.onopen = () => {
      socket.send(
        JSON.stringify({
          x_gladia_key: process.env.REACT_APP_GLADIA_API_KEY,
          frames_format: 'bytes',
          language_behaviour: 'automatic single language',
          sample_rate: SAMPLE_RATE,
        })
      );
      socketPromise.resolve(true);
    };

    socket.onerror = () => socketPromise.reject(new Error('Failed to connect to WebSocket.'));
    socket.onmessage = (event) => handleSocketMessage(event, setTranscript, audioSource);
    socket.onclose = () => console.log('WebSocket disconnected.');
  };

  const handleSocketMessage = async (event, setTranscript, audioSource) => {
    const data = JSON.parse(event.data);
    console.log("Transcription data received:", data);

    if (data?.event === 'transcript' && data.transcription) {
      if (data.type === 'final') {
        setTranscript((prev) => prev + ` ${data.transcription}`);
        setPartials('');

        // Salvar a transcrição no Firebase
        await saveTranscriptionToFirebase(data, audioSource);
      } else {
        setPartials(data.transcription);
      }
    }
  };

    // Função para converter mm:ss para segundos
    const convertToSeconds = (timeString) => {
      const [minutes, seconds] = timeString.split(':').map(Number);
      return minutes * 60 + seconds;
    };
  
    // Função para converter segundos para mm:ss
    const formatTime = (seconds) => {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.floor(seconds % 60);
      return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
    };

  const saveTranscriptionToFirebase = async (data, audioSource) => {

    // Ajusta o tempo de início e fim da transcrição com base no último tempo de término
    const durationInSeconds = data.duration ?? 0;
    const adjustedTimeBegin = lastTimeEnd;
    const adjustedTimeEnd = lastTimeEnd + durationInSeconds;

    const transcriptionData = {
      confidence: data.confidence ?? null,
      createdAt: serverTimestamp(),
      duration: formatTime(durationInSeconds),
      event: data.event ?? null,
      inference_time: data.inference_time ?? null,
      language: data.language ?? null,
      request_id: data.request_id ?? null,
      time_begin: formatTime(adjustedTimeBegin), // Tempo ajustado
      time_end: formatTime(adjustedTimeEnd),     // Tempo ajustado
      transcription: data.transcription ?? "",
      type: data.type ?? null,
      source: audioSource,
      meetingId: meetingId, // Armazenar meetingId dentro do documento
    };

    setLastTimeEnd(adjustedTimeEnd); // Atualiza lastTimeEnd com o novo valor

    // Salvando o documento de transcrição no Firebase
    try {      
      await addDoc(collection(db, 'patients', patientId, 'sessions', sessionId, 'transcriptions'), transcriptionData);
      console.log('Transcrição salva no Firebase:', transcriptionData);
    } catch (error) {
      console.error('Erro ao salvar transcrição no Firebase:', error);
    }
  };

  const deferredPromise = () => {
    let resolve, reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };

  return (
    <div className="transcription-recorder">
      <h2>Transcrição Completa</h2>

      {/* Modal para perguntar ao usuário se quer continuar a última reunião */}
      {showModal && (
        <div className="modal-background">
          <div className="modal-content">
            <h3>Continuar Reunião ou Nova?</h3>
            <p>Deseja continuar a última reunião ou iniciar uma nova?</p>
            <button onClick={() => handleUserChoice(true)}>Continuar Última</button>
            <button onClick={() => handleUserChoice(false)}>Nova Reunião</button>
          </div>
        </div>
      )}

      {/* Configuração do Microfone e Botão de Gravação */}
      <select value={selectedMicDevice} onChange={(e) => setSelectedMicDevice(e.target.value)}>
        {micDevices.map(device => (
          <option key={device.deviceId} value={device.deviceId}>{device.label || 'Microfone sem nome'}</option>
        ))}
      </select>

      <button onClick={isRecording ? stopRecording : startRecording}>
        {isRecording ? 'Parar Gravação' : 'Iniciar Gravação'}
      </button>

      <div className="transcription-content">
        <h3>Microfone</h3>
        <div>{micTranscript}</div>

        <h3>Áudio do Sistema</h3>
        <div>{audioTranscript}</div>

        <h4>Transcrição Parcial</h4>
        <div id="partials">{partials}</div>
      </div>
    </div>
  );
};

export default TranscriptionRecorder;