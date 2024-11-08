// PatientModal.js
import React, { useState, useEffect } from 'react';
import { X, Upload, Loader } from 'lucide-react';
import { db } from '../firebase';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';

const CLOUDINARY_UPLOAD_URL = 'https://api.cloudinary.com/v1_1/dzgicycvf/image/upload';
const CLOUDINARY_UPLOAD_PRESET = 'MindTech';

const INITIAL_FORM_STATE = {
    name: '',
    email: '',
    phone: '',
    birthday: '',
};

const PatientModal = ({ isOpen, onClose, patient = null, userId }) => {
    const [formData, setFormData] = useState(INITIAL_FORM_STATE);
    const [photo, setPhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    // Reset form when opening modal
    useEffect(() => {
        if (isOpen) {
            if (patient) {
                // Se estiver editando, preenche com dados do paciente
                setFormData({
                    name: patient.name || '',
                    email: patient.email || '',
                    phone: patient.phone || '',
                    birthday: patient.birthday ? new Date(patient.birthday.seconds * 1000).toISOString().split('T')[0] : '',
                });
                setPhotoPreview(patient.photoURL || null);
            } else {
                // Se estiver criando novo, limpa o formulário
                setFormData(INITIAL_FORM_STATE);
                setPhoto(null);
                setPhotoPreview(null);
                setError('');
            }
        }
    }, [isOpen, patient]);

    const handleClose = () => {
        setFormData(INITIAL_FORM_STATE);
        setPhoto(null);
        setPhotoPreview(null);
        setError('');
        onClose();
    };

    const uploadImageToCloudinary = async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

        try {
            const response = await fetch(CLOUDINARY_UPLOAD_URL, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Erro no upload: ${errorData.error?.message || 'Falha desconhecida'}`);
            }

            const data = await response.json();
            return data.secure_url;
        } catch (error) {
            console.error('Erro detalhado:', error);
            throw new Error(`Falha no upload: ${error.message}`);
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setError('A imagem deve ter no máximo 5MB');
                return;
            }

            setPhoto(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setUploading(true);

        try {
            if (!formData.name || !formData.email || !formData.birthday) {
                throw new Error('Por favor, preencha todos os campos obrigatórios.');
            }

            let photoURL = null;
            if (photo) {
                try {
                    photoURL = await uploadImageToCloudinary(photo);
                } catch (uploadError) {
                    throw new Error(`Erro no upload da foto: ${uploadError.message}`);
                }
            }

            const patientData = {
                ...formData,
                birthday: new Date(formData.birthday),
                updatedAt: new Date(),
                ...(photoURL && { photoURL }) // Só inclui photoURL se houver uma nova foto
            };

            if (patient) {
                // Modo Edição
                await updateDoc(doc(db, 'users', userId, 'patients', patient.id), patientData);
            } else {
                // Modo Criação
                patientData.createdAt = new Date();
                await addDoc(collection(db, 'users', userId, 'patients'), patientData);
            }

            handleClose();
        } catch (error) {
            console.error('Erro detalhado ao salvar:', error);
            setError(error.message);
        } finally {
            setUploading(false);
        }
    };

    if (!isOpen) return null;


    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-semibold text-gray-900">
                            {patient ? 'Editar Paciente' : 'Novo Paciente'}
                        </h2>
                        <button
                            onClick={handleClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Upload de Foto */}
                        <div className="flex flex-col items-center space-y-2">
                            <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100">
                                {photoPreview ? (
                                    <img
                                        src={photoPreview}
                                        alt="Preview"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                        <Upload className="w-8 h-8 text-gray-400" />
                                    </div>
                                )}
                            </div>
                            <label className="cursor-pointer text-sm text-teal-600 hover:text-teal-700">
                                <span>Alterar foto</span>
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                />
                            </label>
                        </div>

                        {/* Campos do formulário */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nome completo *
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email *
                            </label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Telefone
                            </label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => {
                                    let phone = e.target.value.replace(/\D/g, '');
                                    if (phone.length > 11) phone = phone.slice(0, 11);
                                    phone = phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
                                    setFormData({ ...formData, phone });
                                }}
                                placeholder="(00) 00000-0000"
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Data de Nascimento *
                            </label>
                            <input
                                type="date"
                                value={formData.birthday}
                                onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                required
                            />
                        </div>
            
                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-colors font-medium border border-gray-300"
                                disabled={uploading}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="flex-1 px-4 py-2.5 text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors flex items-center justify-center gap-2 font-medium shadow-sm"
                                disabled={uploading}
                            >
                                {uploading ? (
                                    <>
                                        <Loader className="w-4 h-4 animate-spin" />
                                        Salvando...
                                    </>
                                ) : (
                                    'Salvar'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default PatientModal;