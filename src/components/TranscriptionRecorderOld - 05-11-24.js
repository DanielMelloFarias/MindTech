import React, { useState, useEffect, useRef } from 'react';
import RecordRTC from 'recordrtc';
import { jsPDF } from 'jspdf';
import '../styles/style.css';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const SAMPLE_RATE = 48000;

const TranscriptionRecorder = () => {
  // Estados do componente
  const [gladiaKey, setGladiaKey] = useState(process.env.REACT_APP_GLADIA_API_KEY || '');
  const [micDevices, setMicDevices] = useState([]);
  const [selectedMicDevice, setSelectedMicDevice] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [micTranscript, setMicTranscript] = useState('<h3>Microfone</h3>');
  const [audioTranscript, setAudioTranscript] = useState('<h3>Áudio do Sistema</h3>');
  const [partials, setPartials] = useState('...');
  const [summary, setSummary] = useState('');
  const [buttonsVisible, setButtonsVisible] = useState(false);

  // Referências para recursos que não se encaixam no ciclo de vida do React
  const micRecorderRef = useRef(null);
  const audioRecorderRef = useRef(null);
  const micSocketRef = useRef(null);
  const audioSocketRef = useRef(null);

  useEffect(() => {
    listAudioDevices();
  }, []);

  // Função para solicitar acesso ao microfone
  const requestMicrophoneAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.warn('Acesso ao microfone não foi concedido.', error);
    }
  };

  // Função para listar dispositivos de áudio
  const listAudioDevices = async () => {
    await requestMicrophoneAccess();
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter(device => device.kind === 'audioinput');

    if (audioInputs.length === 0) {
      window.alert('Nenhum dispositivo de entrada de áudio encontrado. Por favor, verifique as permissões e tente novamente.');
      return;
    }

    setMicDevices(audioInputs);
    setSelectedMicDevice(audioInputs[0].deviceId);
  };

  // Função para iniciar a gravação
  const startRecording = async (evt) => {
    evt.preventDefault();

    if (!gladiaKey) {
      alert('Por favor, insira a Gladia API key.');
      return;
    }

    setIsRecording(true);
    setMicTranscript('<h3>Microfone</h3>');
    setAudioTranscript('<h3>Áudio do Sistema</h3>');
    setPartials('...');
    setSummary('');
    setButtonsVisible(false);

    let micStream, screenStream, micRecorder, audioRecorder, micSocket, audioSocket;

    const stop = async () => {
      setIsRecording(false);

      micRecorderRef.current?.destroy();
      audioRecorderRef.current?.destroy();

      micStream?.getTracks().forEach((track) => track.stop());
      screenStream?.getTracks().forEach((track) => track.stop());

      if (micSocketRef.current) {
        micSocketRef.current.onopen = null;
        micSocketRef.current.onerror = null;
        micSocketRef.current.onclose = null;
        micSocketRef.current.onmessage = null;
        micSocketRef.current.close();
      }
      if (audioSocketRef.current) {
        audioSocketRef.current.onopen = null;
        audioSocketRef.current.onerror = null;
        audioSocketRef.current.onclose = null;
        audioSocketRef.current.onmessage = null;
        audioSocketRef.current.close();
      }

      await generateSummary(micTranscript + audioTranscript);
      setButtonsVisible(true);
    };

    // Tornar a função stop acessível fora do escopo de startRecording
    stopRecording.current = stop;

    try {
      const micSocketPromise = deferredPromise();
      const audioSocketPromise = deferredPromise();

      micSocket = new WebSocket('wss://api.gladia.io/audio/text/audio-transcription');
      micSocketRef.current = micSocket;

      micSocket.onopen = () => {
        const configuration = {
          x_gladia_key: gladiaKey,
          frames_format: 'bytes',
          language_behaviour: 'automatic single language',
          sample_rate: SAMPLE_RATE
        };
        micSocket.send(JSON.stringify(configuration));
      };
      micSocket.onerror = () => {
        micSocketPromise.reject(new Error('Não foi possível conectar ao servidor'));
      };
      micSocket.onclose = (event) => {
        micSocketPromise.reject(new Error(`Conexão recusada pelo servidor: [${event.code}] ${event.reason}`));
      };
      micSocket.onmessage = (event) => {
        let data;
        try {
          data = JSON.parse(event.data);
        } catch (err) {
          micSocketPromise.reject(new Error(`Não foi possível analisar a mensagem: ${event.data}`));
        }

        if (data?.event === 'connected') {
          micSocketPromise.resolve(true);
        } else {
          micSocketPromise.reject(new Error(`O servidor enviou uma mensagem inesperada: ${event.data}`));
        }
      };

      audioSocket = new WebSocket('wss://api.gladia.io/audio/text/audio-transcription');
      audioSocketRef.current = audioSocket;

      audioSocket.onopen = () => {
        const configuration = {
          x_gladia_key: gladiaKey,
          frames_format: 'bytes',
          language_behaviour: 'automatic single language',
          sample_rate: SAMPLE_RATE
        };
        audioSocket.send(JSON.stringify(configuration));
      };
      audioSocket.onerror = () => {
        audioSocketPromise.reject(new Error('Não foi possível conectar ao servidor'));
      };
      audioSocket.onclose = (event) => {
        audioSocketPromise.reject(new Error(`Conexão recusada pelo servidor: [${event.code}] ${event.reason}`));
      };
      audioSocket.onmessage = (event) => {
        let data;
        try {
          data = JSON.parse(event.data);
        } catch (err) {
          audioSocketPromise.reject(new Error(`Não foi possível analisar a mensagem: ${event.data}`));
        }

        if (data?.event === 'connected') {
          audioSocketPromise.resolve(true);
        } else {
          audioSocketPromise.reject(new Error(`O servidor enviou uma mensagem inesperada: ${event.data}`));
        }
      };

      micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: selectedMicDevice ? { exact: selectedMicDevice } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: SAMPLE_RATE
        }
      });

      if (navigator.mediaDevices.getDisplayMedia) {
        screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: {
            sampleRate: SAMPLE_RATE
          }
        });
      } else {
        screenStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: {
            sampleRate: SAMPLE_RATE
          }
        });
      }

      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const micDestination = audioContext.createMediaStreamDestination();
      const screenDestination = audioContext.createMediaStreamDestination();

      const micSource = audioContext.createMediaStreamSource(micStream);
      micSource.connect(micDestination);

      const screenAudioTrack = screenStream.getAudioTracks()[0];
      if (screenAudioTrack) {
        const screenAudioStream = new MediaStream([screenAudioTrack]);
        const screenSource = audioContext.createMediaStreamSource(screenAudioStream);
        screenSource.connect(screenDestination);
      }

      const combinedMicStream = micDestination.stream;
      const combinedAudioStream = screenDestination.stream;

      micRecorder = new RecordRTC(combinedMicStream, {
        type: 'audio',
        mimeType: 'audio/wav',
        recorderType: RecordRTC.StereoAudioRecorder,
        timeSlice: 1000,
        async ondataavailable(blob) {
          const buffer = await blob.arrayBuffer();
          const modifiedBuffer = buffer.slice(44);
          micSocket?.send(modifiedBuffer);
        },
        sampleRate: SAMPLE_RATE,
        desiredSampRate: SAMPLE_RATE,
        numberOfAudioChannels: 1
      });

      audioRecorder = new RecordRTC(combinedAudioStream, {
        type: 'audio',
        mimeType: 'audio/wav',
        recorderType: RecordRTC.StereoAudioRecorder,
        timeSlice: 1000,
        async ondataavailable(blob) {
          const buffer = await blob.arrayBuffer();
          const modifiedBuffer = buffer.slice(44);
          audioSocket?.send(modifiedBuffer);
        },
        sampleRate: SAMPLE_RATE,
        desiredSampRate: SAMPLE_RATE,
        numberOfAudioChannels: 1
      });

      micRecorderRef.current = micRecorder;
      audioRecorderRef.current = audioRecorder;

      await Promise.all([micSocketPromise.promise, audioSocketPromise.promise]);

      micRecorder.startRecording();
      audioRecorder.startRecording();

      micSocket.onopen = null;
      micSocket.onerror = null;
      micSocket.onclose = (event) => {
        const message = `Conexão perdida com o servidor: [${event.code}] ${event.reason}`;
        window.alert(message);
        console.error(message);
        stop();
      };
      micSocket.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        console.log("Dados: ", data);
        if (data?.event === 'transcript' && data.transcription) {
          if (data.type === 'final') {
            const correctedText = await correctAndSummarize(data.transcription);
            setMicTranscript((prev) => prev + `<p>${correctedText}</p>`);
            setPartials('');

            // Enviar a transcrição final para o Firebase
            saveTranscription(data.transcription);

          } else {
            setPartials(data.transcription);
          }
        }
      };

      audioSocket.onopen = null;
      audioSocket.onerror = null;
      audioSocket.onclose = (event) => {
        const message = `Conexão perdida com o servidor: [${event.code}] ${event.reason}`;
        window.alert(message);
        console.error(message);
        stop();
      };
      audioSocket.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        if (data?.event === 'transcript' && data.transcription) {
          if (data.type === 'final') {
            const correctedText = await correctAndSummarize(data.transcription);
            setAudioTranscript((prev) => prev + `<p>${correctedText}</p>`);
            setPartials('');

            // Enviar a transcrição final para o Firebase
            saveTranscription(data.transcription);

          } else {
            setPartials(data.transcription);
          }
        }
      };
    } catch (err) {
      window.alert(`Erro durante a inicialização: ${err?.message || err}`);
      console.error(err);
      stop();
    }
  };

  // Ref para a função stopRecording
  const stopRecording = useRef(null);

  const handleStopRecording = () => {
    if (stopRecording.current) {
      stopRecording.current();
    }
  };

  const saveTranscription = async (text) => {
    try {
      await addDoc(collection(db, 'transcriptions'), {
        transcription: text,
        createdAt: serverTimestamp(),
      });
      console.log('Transcrição salva no Firebase:', text);
    } catch (error) {
      console.error('Erro ao salvar a transcrição:', error);
    }
  };

  const deferredPromise = () => {
    const deferred = {};
    deferred.promise = new Promise((resolve, reject) => {
      deferred.resolve = resolve;
      deferred.reject = reject;
    });
    return deferred;
  };

  const generateSummary = async (transcription) => {
    try {
      const chatCompletion = await getGroqChatCompletion(transcription);
      const summaryContent = chatCompletion.choices[0]?.message?.content || "";
      setSummary(`<p>${summaryContent}</p>`);
    } catch (error) {
      console.error("Erro ao gerar resumo:", error);
      window.alert(`Erro ao gerar resumo: ${error.message}`);
    }
  };

  const getGroqChatCompletion = async (transcription) => {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.REACT_APP_GROQ_API_KEY}`
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: "Você é um assistente útil que resume transcrições de áudio."
          },
          {
            role: "user",
            content: `Resuma a seguinte transcrição de áudio:\n\n${transcription}`
          }
        ],
        model: "llama3-8b-8192",
        temperature: 0.5,
        max_tokens: 1024,
        top_p: 1,
        stop: null,
        stream: false
      })
    });
    if (!response.ok) {
      throw new Error(`Erro na API da Groq: ${response.statusText}`);
    }
    return await response.json();
  };

  const correctAndSummarize = async (text) => {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.REACT_APP_GROQ_API_KEY}`
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: "Você é um assistente útil que corrige e resume transcrições de áudio."
          },
          {
            role: "user",
            content: `Corrija e resuma a seguinte transcrição de áudio:\n\n${text}`
          }
        ],
        model: "llama3-8b-8192",
        temperature: 0.5,
        max_tokens: 1024,
        top_p: 1,
        stop: null,
        stream: false
      })
    });
    if (!response.ok) {
      throw new Error(`Erro na API da Groq: ${response.statusText}`);
    }
    const data = await response.json();
    return data.choices[0]?.message?.content || "";
  };

  const generatePDF = async (content, title) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 10;
    const textWidth = pageWidth - margin * 2;
    const text = doc.splitTextToSize(content, textWidth);

    doc.setFont("times", "normal");
    doc.setFontSize(12);

    let cursorY = 20;

    doc.text(title, margin, cursorY);
    cursorY += 10;

    text.forEach(line => {
      if (cursorY + 10 > doc.internal.pageSize.getHeight()) { // Se o texto exceder a altura da página, adicionar nova página
        doc.addPage();
        cursorY = 10; // resetar cursorY para nova página
      }
      doc.text(line, margin, cursorY);
      cursorY += 10;
    });

    doc.save(`${title}.pdf`);
  };

  const extractPoints = async () => {
    const content = micTranscript + audioTranscript;
    const points = await extractDataFromTranscription(content, "Extrair os pontos chaves da seguinte transcrição de áudio:");
    generatePDF(points, 'Pontos Chaves');
  };

  const extractTodoList = async () => {
    const content = micTranscript + audioTranscript;
    const todoList = await extractDataFromTranscription(content, "Extrair a lista de atividades da seguinte transcrição de áudio:");
    generatePDF(todoList, 'Lista de Atividades');
  };

  const generateMeetingAgenda = async () => {
    const content = micTranscript + audioTranscript;
    const agenda = await extractDataFromTranscription(content, "Gerar uma pauta da reunião da seguinte transcrição de áudio:");
    generatePDF(agenda, 'Pauta da Reunião');
  };

  const extractDataFromTranscription = async (content, prompt) => {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.REACT_APP_GROQ_API_KEY}`
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: "Você é um assistente útil que processa transcrições de áudio."
          },
          {
            role: "user",
            content: `${prompt}\n\n${content}`
          }
        ],
        model: "llama3-8b-8192",
        temperature: 0.5,
        max_tokens: 1024,
        top_p: 1,
        stop: null,
        stream: false
      })
    });
    if (!response.ok) {
      throw new Error(`Erro na API da Groq: ${response.statusText}`);
    }
    const data = await response.json();
    return data.choices[0]?.message?.content || "";
  };

  return (
    <div className="container">
      <header>
        <h1>Transcrição de Reunião</h1>
        <p className="subtitle">Inovação e Tecnologia para a Promotoria de Alagoas</p>
      </header>
      <main>
        <form id="form" onSubmit={startRecording}>
          <div className="input-group">
            <label htmlFor="mic_device">Dispositivo de entrada de áudio</label>
            <select
              id="mic_device"
              name="mic_device"
              required
              value={selectedMicDevice}
              onChange={(e) => setSelectedMicDevice(e.target.value)}
            >
              {micDevices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || 'Microfone sem nome'}
                </option>
              ))}
            </select>
          </div>
          <div className="button-group">
            <button type="submit" disabled={isRecording}>
              {isRecording ? 'Aguardando conexão...' : 'Iniciar gravação'}
            </button>
            <button type="button" id="stopButton" disabled={!isRecording} onClick={handleStopRecording}>
              Parar gravação
            </button>
          </div>
        </form>
        {(isRecording || micTranscript || audioTranscript) && (
          <div id="result" className="scrollable-content">
            <h2>Transcrição</h2>
            <div
              id="mic_transcript"
              dangerouslySetInnerHTML={{ __html: micTranscript }}
            ></div>
            <div
              id="audio_transcript"
              dangerouslySetInnerHTML={{ __html: audioTranscript }}
            ></div>
            <div id="partials">{partials}</div>
          </div>
        )}
        {summary && (
          <div id="summary-container" className="scrollable-content">
            <h2>Resumo</h2>
            <div dangerouslySetInnerHTML={{ __html: summary }}></div>
          </div>
        )}
        {buttonsVisible && (
          <div id="buttons-container">
            <button id="extractPointsButton" onClick={extractPoints}>
              Extrair Pontos Chaves
            </button>
            <button id="extractTodoListButton" onClick={extractTodoList}>
              Extrair Lista de Atividades
            </button>
            <button id="generateMeetingAgendaButton" onClick={generateMeetingAgenda}>
              Gerar Pauta da Reunião
            </button>
          </div>
        )}
        <div className="spacer"></div>
      </main>
    </div>
  );
};

export default TranscriptionRecorder;
