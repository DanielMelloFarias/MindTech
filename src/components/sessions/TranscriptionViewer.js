// src/components/sessions/TranscriptionViewer.js
import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import {
    Download,
    MessageSquare,
    FileText,
    BrainCircuit,
    List,
    Loader,
    Search,
    Send
} from 'lucide-react';

const TranscriptionViewer = ({ patientId, sessionId }) => {
    //console.log('TranscriptionViewer montado com:', { patientId, sessionId });

    // Estados
    const [transcriptions, setTranscriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('transcription');
    const [summary, setSummary] = useState('');
    const [keyPoints, setKeyPoints] = useState('');
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [processingAI, setProcessingAI] = useState(false);


    // Antes do useEffect
    //console.log("TranscriptionViewer montado com:", { patientId, sessionId });
    // Função para buscar transcrições
    useEffect(() => {
        const fetchTranscriptions = async () => {
            //console.log('Iniciando fetchTranscriptions:', { patientId, sessionId });
            try {
                if (!patientId || !sessionId) {
                    console.error('IDs faltando:', { patientId, sessionId });
                    return;
                }

                const path = `patients/${patientId}/sessions/${sessionId}/transcriptions`;
                //console.log('Buscando em:', path);

                const transcriptionsRef = collection(db, 'patients', patientId, 'sessions', sessionId, 'transcriptions');
                const q = query(transcriptionsRef, orderBy('time_end', 'asc'));
                const querySnapshot = await getDocs(q);
                //console.log('Snapshot:', querySnapshot.size, 'documentos encontrados');


                const transcriptionsData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                //console.log('Transcrições encontradas:', transcriptionsData);

                if (transcriptionsData.length > 0) {
                    setTranscriptions(transcriptionsData);
                    // Gerar resumo e pontos-chave apenas se houver transcrições
                    await generateSummaryAndKeyPoints(transcriptionsData);
                } else {
                    console.log('Nenhuma transcrição encontrada');
                }
            } catch (error) {
                console.error('Erro detalhado:', error);
            } finally {
                setLoading(false);
            }
        };

        if (patientId && sessionId) {
            fetchTranscriptions();
        }
    }, [patientId, sessionId]);


    // Função helper para formatar o texto
    const formatText = (text) => {
        // Formata os títulos com **
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // Formata os pontos marcados com *
        text = text.replace(/^\*(.*?)$/gm, '• <strong>$1</strong>');

        return text;
    };

    // Função para gerar resumo e pontos-chave
    const generateSummaryAndKeyPoints = async (transcriptionsData) => {
        setProcessingAI(true);
        const fullText = transcriptionsData.map(t => t.transcription).join(' ');

        try {
            // Gerar Resumo
            const summaryResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer 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'
                },
                body: JSON.stringify({
                    messages: [
                        {
                            role: "system",
                            content: "Você é um assistente especializado em psicologia clínica. Faça um resumo conciso e profissional da sessão, destacando os principais temas abordados e o progresso do paciente."
                        },
                        {
                            role: "user",
                            content: `Resuma a seguinte sessão terapêutica:\n\n${fullText}`
                        }
                    ],
                    model: "llama3-8b-8192",
                    temperature: 0.5,
                    max_tokens: 1024
                })
            });

            const summaryData = await summaryResponse.json();
            setSummary(summaryData.choices[0]?.message?.content);

            // Gerar Pontos-chave
            const keyPointsResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer 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'
                },
                body: JSON.stringify({
                    messages: [
                        {
                            role: "system",
                            content: "Você é um psicólogo experiente. Identifique e liste os pontos-chave mais relevantes da sessão do ponto de vista clínico, incluindo: temas principais, insights do paciente, aspectos emocionais relevantes, possíveis padrões comportamentais e questões para acompanhamento."
                        },
                        {
                            role: "user",
                            content: `Analise a seguinte sessão terapêutica e liste os pontos-chave:\n\n${fullText}`
                        }
                    ],
                    model: "llama3-8b-8192",
                    temperature: 0.5,
                    max_tokens: 1024
                })
            });

            const keyPointsData = await keyPointsResponse.json();
            setKeyPoints(keyPointsData.choices[0]?.message?.content);
        } catch (error) {
            console.error('Erro ao processar IA:', error);
        } finally {
            setProcessingAI(false);
        }
    };

    // Função para processar perguntas
    const handleQuestionSubmit = async (e) => {
        e.preventDefault();
        if (!question.trim()) return;

        setProcessingAI(true);
        const fullText = transcriptions.map(t => t.transcription).join(' ');

        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer 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'
                },
                body: JSON.stringify({
                    messages: [
                        {
                            role: "system",
                            content: "Você é um assistente especializado em psicologia clínica. Responda perguntas sobre a sessão terapêutica de forma profissional e ética, mantendo a confidencialidade e focando em insights relevantes para o terapeuta."
                        },
                        {
                            role: "user",
                            content: `Contexto da sessão:\n${fullText}\n\nPergunta: ${question}`
                        }
                    ],
                    model: "llama3-8b-8192",
                    temperature: 0.5,
                    max_tokens: 1024
                })
            });

            const data = await response.json();
            setAnswer(data.choices[0]?.message?.content);
        } catch (error) {
            console.error('Erro ao processar pergunta:', error);
            setAnswer('Desculpe, ocorreu um erro ao processar sua pergunta.');
        } finally {
            setProcessingAI(false);
        }
    };

    // Função para baixar a transcrição completa como um arquivo .txt
    const handleDownload = () => {
        const fullText = transcriptions.map(t =>
            `[${t.time_end}] ${t.source}: ${t.transcription}`
        ).join('\n\n');

        const element = document.createElement('a');
        const file = new Blob([fullText], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = `transcricao_${sessionId}.txt`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="flex space-x-1 border-b border-gray-200 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('transcription')}
                    className={`px-2 py-2 -mb-px text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 whitespace-nowrap ${activeTab === 'transcription'
                            ? 'border-b-2 border-teal-500 text-teal-600'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>Transcrição</span>
                </button>
                <button
                    onClick={() => setActiveTab('summary')}
                    className={`px-2 py-2 -mb-px text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 whitespace-nowrap ${activeTab === 'summary'
                            ? 'border-b-2 border-teal-500 text-teal-600'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <BrainCircuit className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>Resumo</span>
                </button>
                <button
                    onClick={() => setActiveTab('keyPoints')}
                    className={`px-2 py-2 -mb-px text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 whitespace-nowrap ${activeTab === 'keyPoints'
                            ? 'border-b-2 border-teal-500 text-teal-600'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <List className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>Pontos-chave</span>
                </button>
                <button
                    onClick={() => setActiveTab('qa')}
                    className={`px-2 py-2 -mb-px text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 whitespace-nowrap ${activeTab === 'qa'
                            ? 'border-b-2 border-teal-500 text-teal-600'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>Perguntas</span>
                </button>
            </div>
            {/* Conteúdo */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                {/* Botão de Download */}
                <div className="p-4 border-b border-gray-200 flex justify-end">
                    <button
                        onClick={handleDownload}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Baixar Transcrição
                    </button>
                </div>

                {/* Área de Conteúdo Principal */}
                <div className="p-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader className="w-6 h-6 text-teal-500 animate-spin" />
                        </div>
                    ) : (
                        <>
                            {/* Transcrições */}
                            {activeTab === 'transcription' && (
                                <div className="space-y-4">
                                    {transcriptions.map((t, index) => (
                                        <div key={t.id} className="flex gap-4">
                                            <div className="w-20 flex-shrink-0 text-sm text-gray-500">
                                                {t.time_end}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm text-gray-900">{t.transcription}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Resumo */}
                            {activeTab === 'summary' && (
                                <div className="space-y-4">
                                    {processingAI ? (
                                        <div className="flex items-center justify-center py-12">
                                            <Loader className="w-6 h-6 text-teal-500 animate-spin" />
                                        </div>
                                    ) : (
                                        <div className="prose max-w-none">
                                            <p className="text-gray-700 whitespace-pre-line">{summary}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Pontos-chave */}
                            {activeTab === 'keyPoints' && (
                                <div className="space-y-4">
                                    {processingAI ? (
                                        <div className="flex items-center justify-center py-12">
                                            <Loader className="w-6 h-6 text-teal-500 animate-spin" />
                                        </div>
                                    ) : (
                                        <div className="prose max-w-none">
                                            <div
                                                className="text-gray-700 whitespace-pre-line"
                                                dangerouslySetInnerHTML={{
                                                    __html: formatText(keyPoints)
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Q&A */}
                            {activeTab === 'qa' && (
                                <div className="space-y-6">
                                    {/* Área de pergunta */}
                                    <form onSubmit={handleQuestionSubmit} className="space-y-4">
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={question}
                                                onChange={(e) => setQuestion(e.target.value)}
                                                placeholder="Faça uma pergunta sobre a sessão..."
                                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none transition-all"
                                            />
                                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={processingAI}
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                                        >
                                            {processingAI ? (
                                                <>
                                                    <Loader className="w-4 h-4 animate-spin" />
                                                    Processando...
                                                </>
                                            ) : (
                                                <>
                                                    <Send className="w-4 h-4" />
                                                    Perguntar
                                                </>
                                            )}
                                        </button>
                                    </form>

                                    {/* Área de resposta */}
                                    {answer && (
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <div className="prose max-w-none">
                                                <p className="text-gray-700 whitespace-pre-line">{answer}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TranscriptionViewer;