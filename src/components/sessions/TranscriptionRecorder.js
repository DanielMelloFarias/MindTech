// src/components/sessions/TranscriptionRecorder.js
import React, { useState, useEffect, useRef } from 'react';
import RecordRTC from 'recordrtc';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { AlertCircle, Mic, Settings } from 'lucide-react';
import { useParams } from 'react-router-dom';  // Importando useParams para pegar ID da URL

const SAMPLE_RATE = 48000;

const TranscriptionRecorder = ({ sessionId, onClose }) => {
    const { patientId } = useParams();  // Obtendo patientId da URL, se estiver lá
    //console.log("TranscriptionRecorder Params:", { patientId, sessionId });

    const [isRecording, setIsRecording] = useState(false);
    const [micDevices, setMicDevices] = useState([]);
    const [selectedMicDevice, setSelectedMicDevice] = useState('');
    const [micTranscript, setMicTranscript] = useState('');
    const [audioTranscript, setAudioTranscript] = useState('');
    const [partials, setPartials] = useState('');
    const [error, setError] = useState('');

    const micSocketRef = useRef(null);
    const audioSocketRef = useRef(null);
    const micRecorderRef = useRef(null);
    const audioRecorderRef = useRef(null);

    useEffect(() => {
        listAudioDevices();
    }, []);

    const listAudioDevices = async () => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioInputs = devices.filter(device => device.kind === 'audioinput');
            setMicDevices(audioInputs);
            if (audioInputs.length > 0) {
                setSelectedMicDevice(audioInputs[0].deviceId);
            }
        } catch (error) {
            setError('Erro ao listar dispositivos de áudio');
            console.error(error);
        }
    };

    const startRecording = async () => {
        setIsRecording(true);
        setMicTranscript('');
        setAudioTranscript('');
        setPartials('');
        setError('');

        try {
            const micSocketPromise = deferredPromise();
            const audioSocketPromise = deferredPromise();

            micSocketRef.current = new WebSocket('wss://api.gladia.io/audio/text/audio-transcription');
            audioSocketRef.current = new WebSocket('wss://api.gladia.io/audio/text/audio-transcription');

            setupWebSocket(micSocketRef.current, micSocketPromise, setMicTranscript, 'microfone');
            setupWebSocket(audioSocketRef.current, audioSocketPromise, setAudioTranscript, 'sistema');

            await Promise.all([micSocketPromise.promise, audioSocketPromise.promise]);

            const micStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId: selectedMicDevice ? { exact: selectedMicDevice } : undefined,
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: SAMPLE_RATE,
                },
            });

            let screenStream;
            if (navigator.mediaDevices.getDisplayMedia) {
                try {
                    screenStream = await navigator.mediaDevices.getDisplayMedia({
                        video: false,
                        audio: { sampleRate: SAMPLE_RATE },
                    });
                } catch (error) {
                    console.warn("Sistema de áudio não suportado ou negado pelo usuário.");
                }
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
                    micSocketRef.current?.send(buffer.slice(44));
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
                        audioSocketRef.current?.send(buffer.slice(44));
                    },
                    sampleRate: SAMPLE_RATE,
                    desiredSampRate: SAMPLE_RATE,
                    numberOfAudioChannels: 1,
                });

                audioRecorderRef.current.startRecording();
            }

            micRecorderRef.current.startRecording();
        } catch (error) {
            console.error('Erro ao iniciar gravação:', error);
            setError('Erro ao iniciar gravação. Verifique suas permissões de microfone.');
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

        socket.onerror = () => {
            socketPromise.reject(new Error('Falha ao conectar ao WebSocket.'));
            setError('Erro na conexão com o serviço de transcrição.');
        };

        socket.onmessage = (event) => handleSocketMessage(event, setTranscript, audioSource);
        socket.onclose = () => console.log('WebSocket desconectado.');
    };

    const handleSocketMessage = async (event, setTranscript, audioSource) => {
        const data = JSON.parse(event.data);

        if (data?.event === 'transcript' && data.transcription) {
            if (data.type === 'final') {
                setTranscript((prev) => prev + ` ${data.transcription}`);
                setPartials('');
                await saveTranscriptionToFirebase(data, audioSource);
            } else {
                setPartials(data.transcription);
            }
        }
    };

    // Função para converter segundos para mm:ss
    const formatTime = (timeInSeconds) => {
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };


    const calculateDuration = (timeBegin, timeEnd) => {
        const [beginMin, beginSec] = timeBegin.split(':').map(Number);
        const [endMin, endSec] = timeEnd.split(':').map(Number);

        const beginTotalSeconds = beginMin * 60 + beginSec;
        const endTotalSeconds = endMin * 60 + endSec;

        return endTotalSeconds - beginTotalSeconds;
    };

    const saveTranscriptionToFirebase = async (data, audioSource) => {
        if (!patientId || !sessionId) {
            console.error("IDs de paciente ou sessão ausentes, não é possível salvar a transcrição.");
            setError("Erro ao salvar transcrição. IDs de paciente ou sessão ausentes.");
            return;
        }

        const time_begin = data.time_begin ?? 0;
        const time_end = time_begin + (data.duration ?? 0);

        const transcriptionData = {
            confidence: data.confidence ?? null,
            createdAt: serverTimestamp(),
            duration: formatTime(data.duration ?? 0), // Duração formatada
            time_begin: formatTime(time_begin),
            time_end: formatTime(time_end),
            event: data.event ?? null,
            inference_time: data.inference_time ?? null,
            language: data.language ?? null,
            request_id: data.request_id ?? null,
            transcription: data.transcription ?? "",
            type: data.type ?? null,
            source: audioSource,
        };

        console.log('Salvando transcrição:', {
            path: `patients/${patientId}/sessions/${sessionId}/transcriptions`,
            data: transcriptionData
        });

        try {
            await addDoc(
                collection(db, 'patients', patientId, 'sessions', sessionId, 'transcriptions'),
                transcriptionData
            );
            
        } catch (error) {
            console.error('Erro ao salvar transcrição:', error);
            setError("Erro ao salvar transcrição no Firebase.");
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
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
                        {/* Seleção de Dispositivo */}
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
                                className={`px-6 py-2 rounded-lg font-medium flex items-center gap-2 ${isRecording
                                    ? 'bg-red-500 hover:bg-red-600 text-white'
                                    : 'bg-teal-600 hover:bg-teal-700 text-white'
                                    }`}
                            >
                                <Mic className={`w-5 h-5 ${isRecording ? 'animate-pulse' : ''}`} />
                                {isRecording ? 'Parar Gravação' : 'Iniciar Gravação'}
                            </button>
                        </div>

                        {/* Transcrições */}
                        <div className="space-y-4">
                            <div className="bg-gray-50 rounded-lg p-4">
                                <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                                    <Mic className="w-4 h-4" />
                                    Microfone
                                </h3>
                                <p className="text-gray-700 whitespace-pre-line">
                                    {micTranscript || 'Aguardando transcrição...'}
                                </p>
                                {partials && (
                                    <p className="text-gray-500 italic mt-2">{partials}</p>
                                )}
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
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TranscriptionRecorder;