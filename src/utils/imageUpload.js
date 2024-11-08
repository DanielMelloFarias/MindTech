// utils/imageUpload.js
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const uploadPatientImage = async (file, patientId) => {
  if (!file) return null;

  try {
    // Criar referência para o arquivo
    const storageRef = ref(storage, `patients/${patientId}/${file.name}`);
    
    // Upload do arquivo
    await uploadBytes(storageRef, file);
    
    // Obter URL do arquivo
    const downloadURL = await getDownloadURL(storageRef);
    
    return downloadURL;
  } catch (error) {
    console.error('Erro ao fazer upload da imagem:', error);
    throw error;
  }
};