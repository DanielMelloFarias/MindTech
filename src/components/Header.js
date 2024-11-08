import React, { useState, useEffect } from 'react';
import { UserCircle, LogOut } from 'lucide-react';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

const Header = ({ onSignOut }) => {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const currentUser = auth.currentUser;
        
        if (currentUser) {
          // Busca os dados adicionais do usuário no Firestore
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          
          setUserData({
            ...userDoc.exists() ? userDoc.data() : {},
            name: currentUser.displayName || 'Usuário',
            email: currentUser.email,
            photoURL: currentUser.photoURL // Adiciona a URL da foto do Google
          });
        }
      } catch (error) {
        console.error('Erro ao buscar dados do usuário:', error);
      }
    };

    fetchUserData();
  }, []);

  return (
    <div className="w-full bg-gradient-to-r from-teal-600/90 to-cyan-600/90 shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo e Título */}
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-white">
              Mind Tech
            </h1>
          </div>

          {/* Área do Usuário */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
              <div className="hidden md:flex flex-col text-right">
                <span className="text-sm font-medium text-white">
                  {userData?.name || 'Carregando...'}
                </span>
                <span className="text-xs text-teal-100">
                  {userData?.email || 'Carregando...'}
                </span>
              </div>
              {userData?.photoURL ? (
                <div className="w-8 h-8 rounded-full overflow-hidden">
                  <img 
                    src={userData.photoURL} 
                    alt="Foto do perfil" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null; // Previne loop infinito
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'block';
                    }}
                  />
                  <UserCircle 
                    className="w-8 h-8 text-white hidden" 
                    style={{ display: 'none' }}
                  />
                </div>
              ) : (
                <UserCircle className="w-8 h-8 text-white" />
              )}
            </div>
            
            <button
              onClick={onSignOut}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              title="Sair"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;