import React, { useState, useEffect, useRef } from 'react';
import RecordRTC from 'recordrtc';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { Mic, Settings, AlertCircle } from 'lucide-react';

const SAMPLE_RATE = 48000;

// Função auxiliar para solicitar permissões
const requestPermissions = async () => {
  try {
    const streamTemp = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamTemp.getTracks().forEach(track => track.stop());
    
    // Verifica suporte a compartilhamento de tela
    if (!navigator.mediaDevices.getDisplayMedia) {
      throw new Error('Seu navegador não suporta compartilhamento de tela');
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao verificar permissões:', error);
    return false;
  }
};

const TranscriptionRecorder = ({ patientId, sessionId, onClose }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [micDevices, setMicDevices] = useState([]);
    const [selectedMicDevice, setSelectedMicDevice] = useState('');
    const [micTranscript, setMicTranscript] = useState('');
    const [audioTranscript, setAudioTranscript] = useState('');
    const [partials, setPartials] = useState('');
    const [error, setError] = useState('');
    const [lastTimeEnd, setLastTimeEnd] = useState(0);
    const [permissionsGranted, setPermissionsGranted] = useState(false);

    const micSocketRef = useRef(null);
    const audioSocketRef = useRef(null);
    const micRecorderRef = useRef(null);
    const audioRecorderRef = useRef(null);

        // Efeito para verificar permissões ao montar
    useEffect(() => {
      const checkPermissions = async () => {
          const hasPermissions = await requestPermissions();
          setPermissionsGranted(hasPermissions);
          if (hasPermissions) {
              await listAudioDevices();
              await fetchLastTranscriptionEnd();
          }
      };

      checkPermissions();
  }, []);

    useEffect(() => {
        listAudioDevices();
        fetchLastTranscriptionEnd();
    }, []);

    const fetchLastTranscriptionEnd = async () => {
        try {
            const transcriptionsRef = collection(db, 'patients', patientId, 'sessions', sessionId, 'transcriptions');
            const lastTranscriptionQuery = query(transcriptionsRef, orderBy('createdAt', 'desc'), limit(1));
            const snapshot = await getDocs(lastTranscriptionQuery);
            
            if (!snapshot.empty) {
                const lastTranscription = snapshot.docs[0].data();
                if (lastTranscription.time_end) {
                    const [minutes, seconds] = lastTranscription.time_end.split(':').map(Number);
                    setLastTimeEnd(minutes * 60 + seconds);
                }
            }
        } catch (error) {
            console.error('Erro ao buscar última transcrição:', error);
        }
    };

    const listAudioDevices = async () => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioInputs = devices.filter(device => device.kind === 'audioinput');
            setMicDevices(audioInputs);
            if (audioInputs.length > 0) {
                setSelectedMicDevice(audioInputs[0].deviceId);
            }
        } catch (error) {
            console.error('Erro ao listar dispositivos:', error);
            setError('Erro ao acessar dispositivos de áudio');
        }
    };

    // Modificar o startRecording para verificar permissões primeiro
    const startRecording = async () => {
      if (!permissionsGranted) {
          const hasPermissions = await requestPermissions();
          if (!hasPermissions) {
              setError('Por favor, conceda as permissões necessárias para gravação');
              return;
          }
          setPermissionsGranted(true);
      }

      setIsRecording(true);
      setMicTranscript('');
      setAudioTranscript('');
      setPartials('');
      setError('');

      try {
        // Primeiro pedir compartilhamento de tela
        let screenStream;
        try {
            screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    width: 1920,
                    height: 1080
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: SAMPLE_RATE
                }
            });

            // Adicionar listener para quando o usuário parar o compartilhamento
            screenStream.getVideoTracks()[0].onended = () => {
                console.log('Compartilhamento de tela encerrado');
                stopRecording();
            };

        } catch (error) {
            console.warn("Erro ao compartilhar tela:", error);
            setError("É necessário compartilhar a tela para capturar o áudio do sistema");
            setIsRecording(false);
            return;
        }

            // Depois pedir acesso ao microfone
            let micStream;
            try {
                micStream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        deviceId: selectedMicDevice ? { exact: selectedMicDevice } : undefined,
                        echoCancellation: true,
                        noiseSuppression: true,
                        sampleRate: SAMPLE_RATE
                    }
                });
            } catch (error) {
                console.warn("Erro ao acessar microfone:", error);
                screenStream?.getTracks().forEach(track => track.stop());
                setError("É necessário permitir acesso ao microfone");
                setIsRecording(false);
                return;
            }

            // Configurar WebSockets
            const micSocketPromise = deferredPromise();
            const audioSocketPromise = deferredPromise();

            micSocketRef.current = new WebSocket('wss://api.gladia.io/audio/text/audio-transcription');
            audioSocketRef.current = new WebSocket('wss://api.gladia.io/audio/text/audio-transcription');

            setupWebSocket(micSocketRef.current, micSocketPromise, setMicTranscript, 'microfone');
            setupWebSocket(audioSocketRef.current, audioSocketPromise, setAudioTranscript, 'sistema');

            await Promise.all([micSocketPromise.promise, audioSocketPromise.promise]);

            // Configurar contexto de áudio
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const micDestination = audioContext.createMediaStreamDestination();
            const screenDestination = audioContext.createMediaStreamDestination();

            // Configurar microfone
            const micSource = audioContext.createMediaStreamSource(micStream);
            micSource.connect(micDestination);

            // Configurar áudio do sistema
            const screenAudioTrack = screenStream.getAudioTracks()[0];
            if (screenAudioTrack) {
                const screenAudioStream = new MediaStream([screenAudioTrack]);
                const screenSource = audioContext.createMediaStreamSource(screenAudioStream);
                screenSource.connect(screenDestination);
            }

            // Configurar gravadores
            micRecorderRef.current = new RecordRTC(micDestination.stream, {
                type: 'audio',
                mimeType: 'audio/wav',
                recorderType: RecordRTC.StereoAudioRecorder,
                timeSlice: 1000,
                async ondataavailable(blob) {
                    const buffer = await blob.arrayBuffer();
                    micSocketRef.current?.send(buffer.slice(44));
                },
                sampleRate: SAMPLE_RATE,
                desiredSampRate: SAMPLE_RATE,
                numberOfAudioChannels: 1
            });

            if (screenAudioTrack) {
                audioRecorderRef.current = new RecordRTC(screenDestination.stream, {
                    type: 'audio',
                    mimeType: 'audio/wav',
                    recorderType: RecordRTC.StereoAudioRecorder,
                    timeSlice: 1000,
                    async ondataavailable(blob) {
                        const buffer = await blob.arrayBuffer();
                        audioSocketRef.current?.send(buffer.slice(44));
                    },
                    sampleRate: SAMPLE_RATE,
                    desiredSampRate: SAMPLE_RATE,
                    numberOfAudioChannels: 1
                });
            }

            // Iniciar gravação
            micRecorderRef.current.startRecording();
            audioRecorderRef.current?.startRecording();

            // Limpar quando a tela for fechada
            screenStream.getVideoTracks()[0].onended = () => {
                stopRecording();
            };

        } catch (error) {
            console.error('Erro ao iniciar gravação:', error);
            setError('Erro ao iniciar gravação. Verifique suas permissões.');
            stopRecording();
        }
    };

    const stopRecording = () => {
        setIsRecording(false);

        micRecorderRef.current?.stopRecording();
        audioRecorderRef.current?.stopRecording();

        micSocketRef.current?.close();
        audioSocketRef.current?.close();
    };

    const setupWebSocket = (socket, socketPromise, setTranscript, audioSource) => {
        socket.onopen = () => {
            socket.send(JSON.stringify({
                x_gladia_key: process.env.REACT_APP_GLADIA_API_KEY,
                frames_format: 'bytes',
                language_behaviour: 'automatic single language',
                sample_rate: SAMPLE_RATE
            }));
            socketPromise.resolve(true);
        };

        socket.onerror = () => socketPromise.reject(new Error('Falha ao conectar'));
        socket.onmessage = (event) => handleSocketMessage(event, setTranscript, audioSource);
        socket.onclose = () => console.log('WebSocket desconectado');
    };

    const handleSocketMessage = async (event, setTranscript, audioSource) => {
        const data = JSON.parse(event.data);

        if (data?.event === 'transcript' && data.transcription) {
            if (data.type === 'final') {
                setTranscript(prev => prev + ' ' + data.transcription);
                setPartials('');
                await saveTranscriptionToFirebase(data, audioSource);
            } else {
                setPartials(data.transcription);
            }
        }
    };

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
    };

    const saveTranscriptionToFirebase = async (data, audioSource) => {
        const transcriptionData = {
            confidence: data.confidence ?? null,
            createdAt: serverTimestamp(),
            duration: formatTime(data.duration ?? 0),
            event: data.event ?? null,
            inference_time: data.inference_time ?? null,
            language: data.language ?? null,
            request_id: data.request_id ?? null,
            time_begin: formatTime(lastTimeEnd),
            time_end: formatTime(lastTimeEnd + (data.duration ?? 0)),
            transcription: data.transcription ?? "",
            type: data.type ?? null,
            source: audioSource
        };

        setLastTimeEnd(prev => prev + (data.duration ?? 0));

        try {
            await addDoc(
                collection(db, 'patients', patientId, 'sessions', sessionId, 'transcriptions'),
                transcriptionData
            );
        } catch (error) {
            console.error('Erro ao salvar transcrição:', error);
            throw error;
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-semibold text-gray-900">
                            Transcrição em Tempo Real
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            ×
                        </button>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" />
                            <p>{error}</p>
                        </div>
                    )}

                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Selecionar Microfone
                                </label>
                                <select
                                    value={selectedMicDevice}
                                    onChange={(e) => setSelectedMicDevice(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                >
                                    {micDevices.map(device => (
                                        <option key={device.deviceId} value={device.deviceId}>
                                            {device.label || 'Microfone sem nome'}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <button
                                onClick={isRecording ? stopRecording : startRecording}
                                className={`px-6 py-2 rounded-lg font-medium flex items-center gap-2 ${
                                    isRecording
                                        ? 'bg-red-500 hover:bg-red-600 text-white'
                                        : 'bg-teal-600 hover:bg-teal-700 text-white'
                                }`}
                            >
                                <Mic className={`w-5 h-5 ${isRecording ? 'animate-pulse' : ''}`} />
                                {isRecording ? 'Parar Gravação' : 'Iniciar Gravação'}
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-gray-50 rounded-lg p-4">
                                <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                                    <Mic className="w-4 h-4" />
                                    Microfone
                                </h3>
                                <p className="text-gray-700 whitespace-pre-line">
                                    {micTranscript || 'Aguardando transcrição...'}
                                </p>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4">
                                <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                                    <Settings className="w-4 h-4" />
                                    Áudio do Sistema
                                </h3>
                                <p className="text-gray-700 whitespace-pre-line">
                                    {audioTranscript || 'Aguardando transcrição...'}
                                </p>
                            </div>

                            {partials && (
                                <p className="text-sm text-gray-500 italic">{partials}</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TranscriptionRecorder;