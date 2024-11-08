// src/components/sessions/EditSessionModal.js
import React, { useState, useEffect } from 'react';
import { X, Loader, Clock, Calendar, FileText, Tags, AlertCircle } from 'lucide-react';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';

const EditSessionModal = ({ isOpen, onClose, session, patientId, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    date: '',
    time: '',
    duration: '',
    type: 'followup',
    status: 'scheduled',
    notes: '',
    keyPoints: '',
  });

  // Preenche o formulário quando o modal abre
  useEffect(() => {
    if (session && isOpen) {
      const sessionDate = session.date.toDate();
      setFormData({
        date: sessionDate.toISOString().split('T')[0],
        time: sessionDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        duration: session.duration.toString(),
        type: session.type,
        status: session.status,
        notes: session.notes || '',
        keyPoints: session.keyPoints?.join(', ') || '',
      });
    }
  }, [session, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validações
      if (!formData.date || !formData.time || !formData.duration) {
        throw new Error('Por favor, preencha todos os campos obrigatórios.');
      }

      // Converte data e hora para Timestamp
      const [hours, minutes] = formData.time.split(':');
      const sessionDate = new Date(formData.date);
      sessionDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // Prepara os pontos-chave como array
      const keyPoints = formData.keyPoints
        .split(',')
        .map(point => point.trim())
        .filter(point => point !== '');

      const sessionData = {
        date: Timestamp.fromDate(sessionDate),
        duration: parseInt(formData.duration),
        type: formData.type,
        status: formData.status,
        notes: formData.notes,
        keyPoints,
        updatedAt: Timestamp.now(),
      };

      // Atualiza no Firestore
      const sessionRef = doc(db, 'patients', patientId, 'sessions', session.id);
      await updateDoc(sessionRef, sessionData);

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Erro ao atualizar sessão:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Editar Sessão
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Data e Hora */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data *
                </label>
                <div className="relative flex items-center">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none z-10" />
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    required
                    style={{
                      minHeight: '42px',  // Garante altura mínima
                      WebkitAppearance: 'none',  // Remove aparência nativa no iOS
                      MozAppearance: 'none',     // Remove aparência nativa no Firefox
                      appearance: 'none'          // Remove aparência nativa
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Horário *
                </label>
                <div className="relative flex items-center">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none z-10" />
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    required
                    style={{
                      minHeight: '42px',
                      WebkitAppearance: 'none',
                      MozAppearance: 'none',
                      appearance: 'none'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Tipo, Duração e Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Sessão
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="initial">Primeira Consulta</option>
                  <option value="followup">Retorno</option>
                  <option value="closing">Encerramento</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duração (minutos) *
                </label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  min="15"
                  max="180"
                  step="5"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="scheduled">Agendada</option>
                  <option value="completed">Realizada</option>
                  <option value="cancelled">Cancelada</option>
                </select>
              </div>
            </div>

            {/* Notas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas ou Observações
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 min-h-[100px]"
                  placeholder="Adicione notas ou observações importantes sobre a sessão..."
                />
              </div>
            </div>

            {/* Pontos-chave */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pontos-chave
              </label>
              <div className="relative">
                <Tags className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={formData.keyPoints}
                  onChange={(e) => setFormData({ ...formData, keyPoints: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Separe os pontos-chave por vírgula..."
                />
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Ex: ansiedade, relacionamento, trabalho
              </p>
            </div>

            {/* Aviso de Transcrição */}
            {formData.status === 'completed' && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>Nota:</strong> Ao marcar a sessão como realizada, você poderá adicionar
                  a transcrição e o resumo da sessão posteriormente.
                </p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-colors font-medium border border-gray-300"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors font-medium shadow-sm flex items-center justify-center gap-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Alterações'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditSessionModal;